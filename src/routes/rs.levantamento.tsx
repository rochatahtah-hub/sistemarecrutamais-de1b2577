import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { EstadoVazio } from "@/components/EstadoVazio";
import { RequerPermissao } from "@/components/RequerPermissao";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  diasDePermanencia,
  media,
  permanenciaTexto,
  useCandidatosCLT,
  useEmpresasCLT,
} from "@/lib/rs";

export const Route = createFileRoute("/rs/levantamento")({
  head: () => ({
    meta: [
      { title: "Levantamento R&S CLT | Recruta+" },
      {
        name: "description",
        content:
          "Levantamento detalhado do recrutamento e seleção CLT por período, empresa, cargo, recrutador e status.",
      },
      { property: "og:title", content: "Levantamento R&S CLT | Recruta+" },
      {
        property: "og:description",
        content: "Relatório detalhado de admissões, desligamentos e permanência no módulo CLT.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaProtegida,
});

function Bloco({
  titulo,
  linhas,
}: {
  titulo: string;
  linhas: { nome: string; total: number; ativos: number; desligados: number; mediaDias: number }[];
}) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{titulo}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Ativos</TableHead>
              <TableHead>Desligados</TableHead>
              <TableHead>Tempo médio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((l) => (
              <TableRow key={l.nome}>
                <TableCell className="font-medium">{l.nome}</TableCell>
                <TableCell>{l.total}</TableCell>
                <TableCell>{l.ativos}</TableCell>
                <TableCell>{l.desligados}</TableCell>
                <TableCell>{permanenciaTexto(l.mediaDias || null)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Pagina() {
  const { data: candidatos = [], isLoading } = useCandidatosCLT();
  const { data: empresas = [] } = useEmpresasCLT();

  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [empresa, setEmpresa] = useState("todas");
  const [cargo, setCargo] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [recrutador, setRecrutador] = useState("todos");

  const cargos = useMemo(
    () => [...new Set(candidatos.map((c) => c.cargo).filter(Boolean))].sort(),
    [candidatos],
  );
  const recrutadores = useMemo(
    () => [...new Set(candidatos.map((c) => c.recrutador_nome).filter(Boolean))].sort(),
    [candidatos],
  );

  const filtrados = useMemo(
    () =>
      candidatos.filter((c) => {
        const ref = c.data_admissao ?? c.created_at.slice(0, 10);
        if (de && ref < de) return false;
        if (ate && ref > ate) return false;
        if (empresa !== "todas" && c.empresa_id !== empresa) return false;
        if (cargo !== "todos" && c.cargo !== cargo) return false;
        if (status !== "todos" && c.status !== status) return false;
        if (recrutador !== "todos" && c.recrutador_nome !== recrutador) return false;
        return true;
      }),
    [candidatos, de, ate, empresa, cargo, status, recrutador],
  );

  const resumo = useMemo(() => {
    const dias = filtrados.map(diasDePermanencia).filter((d): d is number => d !== null);
    const agrupar = (fn: (c: (typeof filtrados)[number]) => string) => {
      const mapa = new Map<string, { total: number; ativos: number; desligados: number; dias: number[] }>();
      for (const c of filtrados) {
        const chave = fn(c) || "Não informado";
        const at = mapa.get(chave) ?? { total: 0, ativos: 0, desligados: 0, dias: [] };
        at.total += 1;
        if (c.status === "ativo") at.ativos += 1;
        else at.desligados += 1;
        const d = diasDePermanencia(c);
        if (d !== null) at.dias.push(d);
        mapa.set(chave, at);
      }
      return [...mapa.entries()]
        .map(([nome, v]) => ({ nome, total: v.total, ativos: v.ativos, desligados: v.desligados, mediaDias: v.dias.length ? media(v.dias) : 0 }))
        .sort((a, b) => b.total - a.total);
    };
    const porMes = new Map<string, { admissoes: number; desligamentos: number }>();
    for (const c of filtrados) {
      if (c.data_admissao) {
        const k = c.data_admissao.slice(0, 7);
        const at = porMes.get(k) ?? { admissoes: 0, desligamentos: 0 };
        at.admissoes += 1;
        porMes.set(k, at);
      }
      if (c.data_desligamento) {
        const k = c.data_desligamento.slice(0, 7);
        const at = porMes.get(k) ?? { admissoes: 0, desligamentos: 0 };
        at.desligamentos += 1;
        porMes.set(k, at);
      }
    }
    return {
      cadastrados: filtrados.length,
      admissoes: filtrados.filter((c) => c.data_admissao).length,
      ativos: filtrados.filter((c) => c.status === "ativo").length,
      desligados: filtrados.filter((c) => c.status === "desligado").length,
      mediaDias: dias.length ? media(dias) : null,
      empresas: agrupar((c) => c.rs_empresas?.nome ?? ""),
      cargos: agrupar((c) => c.cargo),
      meses: [...porMes.entries()].sort(([a], [b]) => a.localeCompare(b)),
    };
  }, [filtrados]);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Levantamento R&S"
        descricao="Levantamento detalhado dos processos de recrutamento e seleção CLT."
        icone={<ClipboardList className="h-5 w-5" />}
      />

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Período de</Label>
            <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Período até</Label>
            <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <Select value={empresa} onValueChange={setEmpresa}>
            <SelectTrigger><SelectValue placeholder="Empresa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as empresas</SelectItem>
              {empresas.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cargo} onValueChange={setCargo}>
            <SelectTrigger><SelectValue placeholder="Cargo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os cargos</SelectItem>
              {cargos.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="desligado">Desligados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={recrutador} onValueChange={setRecrutador}>
            <SelectTrigger><SelectValue placeholder="Recrutador" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os recrutadores</SelectItem>
              {recrutadores.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando levantamento…</p>
      ) : filtrados.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum registro no período"
          descricao="Ajuste os filtros ou cadastre candidatos CLT para gerar o levantamento."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Cadastrados", resumo.cadastrados],
              ["Admissões", resumo.admissoes],
              ["Ativos", resumo.ativos],
              ["Desligados", resumo.desligados],
              ["Tempo médio", permanenciaTexto(resumo.mediaDias)],
            ].map(([rotulo, valor]) => (
              <Card key={String(rotulo)}>
                <CardContent className="p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{rotulo}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight">{valor}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Admissões e desligamentos por mês</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead>Admissões</TableHead>
                    <TableHead>Desligamentos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumo.meses.map(([mes, v]) => (
                    <TableRow key={mes}>
                      <TableCell>{mes.split("-").reverse().join("/")}</TableCell>
                      <TableCell>{v.admissoes}</TableCell>
                      <TableCell>{v.desligamentos}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Bloco titulo="Por empresa" linhas={resumo.empresas} />
            <Bloco titulo="Por cargo" linhas={resumo.cargos} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Candidatos do levantamento</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidato</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Admissão</TableHead>
                      <TableHead>Desligamento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Permanência</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrados.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell>{c.rs_empresas?.nome ?? "—"}</TableCell>
                        <TableCell>{c.cargo || "—"}</TableCell>
                        <TableCell>{c.data_admissao ?? "—"}</TableCell>
                        <TableCell>{c.data_desligamento ?? "—"}</TableCell>
                        <TableCell>{c.status === "ativo" ? "Ativo" : "Desligado"}</TableCell>
                        <TableCell>{permanenciaTexto(diasDePermanencia(c))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function PaginaProtegida() {
  return (
    <RequerPermissao modulo="rs_levantamento" area="Levantamento R&S">
      <Pagina />
    </RequerPermissao>
  );
}
