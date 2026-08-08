import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useConfiguracoes, useImportacoes } from "@/lib/dados";
import {
  CAMPOS,
  camposFaltando,
  detectarColunas,
  processarLinhas,
  type Mapeamento,
  type LinhaProcessada,
} from "@/lib/importacao";
import { fmtData, fmtNum } from "@/lib/metricas";
import { MAPEAMENTO_PADRAO, STATUS_LABEL } from "@/lib/tipos";

export const Route = createFileRoute("/importar")({
  head: () => ({
    meta: [
      { title: "Importar Excel | Gestão de Vagas" },
      {
        name: "description",
        content: "Envie sua planilha .xlsx ou .xls, valide os dados e atualize o dashboard.",
      },
      { property: "og:title", content: "Importar Excel | Gestão de Vagas" },
      {
        property: "og:description",
        content: "Envie sua planilha .xlsx ou .xls, valide os dados e atualize o dashboard.",
      },
    ],
  }),
  component: Pagina,
});

interface AbaLida {
  nome: string;
  cabecalhos: string[];
  linhas: Record<string, unknown>[];
  mapa: Mapeamento;
  motivo: string | null;
}

function Pagina() {
  const qc = useQueryClient();
  const { data: config } = useConfiguracoes();
  const { data: importacoes = [] } = useImportacoes();

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [abas, setAbas] = useState<AbaLida[]>([]);
  const [salvando, setSalvando] = useState(false);

  const mapeamentoStatus = config?.mapeamento ?? MAPEAMENTO_PADRAO;

  const abasValidas = abas.filter((a) => !a.motivo);
  const abasIgnoradas = abas.filter((a) => a.motivo);

  const processadas: LinhaProcessada[] = useMemo(() => {
    const vistos = new Set<string>();
    return abas
      .filter((a) => !a.motivo)
      .flatMap((a) =>
        processarLinhas(a.linhas, a.mapa, mapeamentoStatus, {
          aba: a.nome,
          colaboradorPadrao: a.nome,
          vistos,
        }),
      );
  }, [abas, mapeamentoStatus]);

  const validas = processadas.filter((l) => l.problemas.length === 0 && !l.duplicada);
  const comProblema = processadas.filter((l) => l.problemas.length > 0);
  const duplicadas = processadas.filter((l) => l.duplicada && l.problemas.length === 0);

  const resumoAbas = useMemo(() => {
    const mapaResumo = new Map<string, number>();
    for (const l of processadas) mapaResumo.set(l.aba, (mapaResumo.get(l.aba) ?? 0) + 1);
    return abasValidas.map((a) => ({ nome: a.nome, linhas: mapaResumo.get(a.nome) ?? 0 }));
  }, [processadas, abas]);

  async function aoSelecionar(file: File) {
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { cellDates: true });
      if (wb.SheetNames.length === 0) throw new Error("Planilha vazia");
      const lidas: AbaLida[] = wb.SheetNames.map((nome) => {
        const sheet = wb.Sheets[nome];
        const json = sheet
          ? XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })
          : [];
        const heads = json.length ? Object.keys(json[0]!) : [];
        const mapa = detectarColunas(heads);
        const faltando = camposFaltando(mapa);
        const motivo =
          json.length === 0
            ? "Aba sem linhas de dados"
            : faltando.length > 0
              ? `Colunas obrigatórias não encontradas: ${faltando.map((c) => c.label).join(", ")}`
              : null;
        return { nome, cabecalhos: heads, linhas: json, mapa, motivo };
      });
      const validas = lidas.filter((a) => !a.motivo);
      setArquivo(file);
      setAbas(lidas);
      if (validas.length === 0) {
        toast.error("Nenhuma aba do arquivo tem as colunas mínimas (Data, Empresa, Vaga, Status).");
      } else {
        toast.success(
          `${validas.length} aba(s) lidas de ${file.name}: ${validas
            .map((a) => `${a.nome} (${a.linhas.length})`)
            .join(", ")}`,
        );
      }
    } catch (e) {
      toast.error(`Não foi possível ler o arquivo: ${(e as Error).message}`);
    }
  }

  function cancelar() {
    setArquivo(null);
    setAbas([]);
  }

  async function confirmar() {
    if (validas.length === 0) {
      toast.error("Nenhum registro válido para importar.");
      return;
    }
    setSalvando(true);
    try {
      const nomesColab = Array.from(new Set(validas.map((l) => l.colaborador)));
      const nomesEmp = Array.from(new Set(validas.map((l) => l.empresa)));

      const colabRes = await supabase
        .from("colaboradores")
        .upsert(nomesColab.map((nome) => ({ nome })), { onConflict: "nome" })
        .select("id,nome");
      if (colabRes.error) throw colabRes.error;
      const empRes = await supabase
        .from("empresas")
        .upsert(nomesEmp.map((nome) => ({ nome })), { onConflict: "nome" })
        .select("id,nome");
      if (empRes.error) throw empRes.error;

      const idColab = new Map((colabRes.data ?? []).map((c) => [c.nome, c.id]));
      const idEmp = new Map((empRes.data ?? []).map((e) => [e.nome, e.id]));

      const impRes = await supabase
        .from("importacoes")
        .insert({
          nome_arquivo: arquivo?.name ?? "planilha.xlsx",
          quantidade_registros: processadas.length,
          registros_ignorados: duplicadas.length,
          erros: comProblema.length,
          status: "processando",
        })
        .select("id")
        .single();
      if (impRes.error) throw impRes.error;
      const importacaoId = impRes.data.id;

      let adicionados = 0;
      const lote = 500;
      for (let i = 0; i < validas.length; i += lote) {
        const parte = validas.slice(i, i + lote).map((l) => ({
          data: l.data!,
          colaborador_id: idColab.get(l.colaborador) ?? null,
          empresa_id: idEmp.get(l.empresa) ?? null,
          descricao: l.descricao,
          quantidade: l.quantidade,
          status: l.status!,
          observacao: l.observacao,
          importacao_id: importacaoId,
          hash_registro: l.hash,
        }));
        const { data, error } = await supabase
          .from("vagas")
          .upsert(parte, { onConflict: "hash_registro", ignoreDuplicates: true })
          .select("id");
        if (error) throw error;
        adicionados += data?.length ?? 0;
      }

      await supabase
        .from("importacoes")
        .update({
          status: "concluida",
          registros_adicionados: adicionados,
          registros_ignorados: duplicadas.length + (validas.length - adicionados),
        })
        .eq("id", importacaoId);

      await qc.invalidateQueries();
      toast.success(`Importação concluída: ${adicionados} registros adicionados.`);
      cancelar();
    } catch (e) {
      toast.error(`Falha na importação: ${(e as Error).message}`);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Importar dados</h1>
        <p className="text-sm text-muted-foreground">
          Envie a planilha de controle de vagas (.xlsx ou .xls). Os indicadores são recalculados
          automaticamente após a confirmação.
        </p>
      </div>

      {!arquivo && (
        <label className="surface-panel flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-dashed p-10 text-center transition-colors hover:border-primary/50">
          <Upload className="h-8 w-8 text-primary" />
          <div>
            <p className="font-semibold">Clique para selecionar sua planilha</p>
            <p className="text-xs text-muted-foreground">Formatos aceitos: .xlsx e .xls</p>
          </div>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void aoSelecionar(f);
            }}
          />
        </label>
      )}

      {arquivo && (
        <>
          <div className="surface-panel flex flex-wrap items-center justify-between gap-3 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">{arquivo.name}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtNum(processadas.length)} linhas · {cabecalhos.length} colunas detectadas
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={cancelar} disabled={salvando}>
                <X className="mr-2 h-4 w-4" /> Cancelar
              </Button>
              <Button
                onClick={confirmar}
                disabled={salvando || validas.length === 0 || faltandoObrigatorio.length > 0}
              >
                {salvando ? "Importando..." : `Confirmar importação (${fmtNum(validas.length)})`}
              </Button>
            </div>
          </div>

          <div className="surface-panel rounded-xl p-4">
            <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Mapeamento de colunas
            </h2>
            <div className="grid gap-3 md:grid-cols-3">
              {CAMPOS.map((c) => (
                <div key={c.campo}>
                  <Label className="mb-1.5 block text-xs">
                    {c.label}{" "}
                    {c.obrigatorio && <span className="text-destructive">*</span>}
                  </Label>
                  <Select
                    value={mapa[c.campo] ?? "__nenhuma__"}
                    onValueChange={(v) =>
                      setMapa((m) => ({ ...m, [c.campo]: v === "__nenhuma__" ? undefined : v }))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Selecionar coluna" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__nenhuma__">Não utilizar</SelectItem>
                      {cabecalhos.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            {faltandoObrigatorio.length > 0 && (
              <p className="mt-3 flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                Campos obrigatórios não mapeados:{" "}
                {faltandoObrigatorio.map((c) => c.label).join(", ")}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="surface-panel rounded-xl p-4">
              <p className="text-xs uppercase text-muted-foreground">Registros válidos</p>
              <p className="font-display text-2xl font-bold text-success">{fmtNum(validas.length)}</p>
            </div>
            <div className="surface-panel rounded-xl p-4">
              <p className="text-xs uppercase text-muted-foreground">Com problemas</p>
              <p className="font-display text-2xl font-bold text-destructive">
                {fmtNum(comProblema.length)}
              </p>
            </div>
            <div className="surface-panel rounded-xl p-4">
              <p className="text-xs uppercase text-muted-foreground">Duplicados no arquivo</p>
              <p className="font-display text-2xl font-bold text-warning">
                {fmtNum(duplicadas.length)}
              </p>
            </div>
          </div>

          <Tabs defaultValue="previa" className="surface-panel rounded-xl p-4">
            <TabsList>
              <TabsTrigger value="previa">Prévia</TabsTrigger>
              <TabsTrigger value="problemas">Problemas ({comProblema.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="previa" className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Linha</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Vaga</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processadas.slice(0, 50).map((l) => (
                    <TableRow key={l.linha}>
                      <TableCell className="text-muted-foreground">{l.linha}</TableCell>
                      <TableCell>{l.data ? fmtData(l.data) : "—"}</TableCell>
                      <TableCell>{l.colaborador || "—"}</TableCell>
                      <TableCell>{l.empresa || "—"}</TableCell>
                      <TableCell>{l.descricao || "—"}</TableCell>
                      <TableCell className="text-right">{l.quantidade}</TableCell>
                      <TableCell>{l.status ? STATUS_LABEL[l.status] : "—"}</TableCell>
                      <TableCell>
                        {l.problemas.length > 0 ? (
                          <Badge variant="destructive">Erro</Badge>
                        ) : l.duplicada ? (
                          <Badge variant="secondary">Duplicada</Badge>
                        ) : (
                          <Badge variant="outline" className="border-success/40 text-success">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> OK
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {processadas.length > 50 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Exibindo as 50 primeiras de {fmtNum(processadas.length)} linhas.
                </p>
              )}
            </TabsContent>
            <TabsContent value="problemas" className="mt-4 overflow-x-auto">
              {comProblema.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum problema encontrado.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Linha</TableHead>
                      <TableHead>Problemas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comProblema.slice(0, 200).map((l) => (
                      <TableRow key={l.linha}>
                        <TableCell>{l.linha}</TableCell>
                        <TableCell className="text-destructive">
                          {l.problemas.join(" · ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      <div className="surface-panel rounded-xl p-4">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Histórico de importações
        </h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arquivo</TableHead>
                <TableHead>Data / hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead className="text-right">Registros</TableHead>
                <TableHead className="text-right">Adicionados</TableHead>
                <TableHead className="text-right">Ignorados</TableHead>
                <TableHead className="text-right">Erros</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importacoes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                    Nenhuma importação realizada ainda.
                  </TableCell>
                </TableRow>
              )}
              {importacoes.map((imp) => (
                <TableRow key={imp.id}>
                  <TableCell className="font-medium">{imp.nome_arquivo}</TableCell>
                  <TableCell>{new Date(imp.data_importacao).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{imp.usuario}</TableCell>
                  <TableCell className="text-right">{imp.quantidade_registros}</TableCell>
                  <TableCell className="text-right text-success">
                    {imp.registros_adicionados}
                  </TableCell>
                  <TableCell className="text-right">{imp.registros_ignorados}</TableCell>
                  <TableCell className="text-right text-destructive">{imp.erros}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{imp.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}