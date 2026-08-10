import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, Clock, Save, Target, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { FichaCandidato } from "@/components/programacao/FichaCandidato";
import { CardIndicador } from "@/components/dashboard/CardIndicador";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { useAuth } from "@/lib/auth";
import { fmtData, fmtNum, fmtPct } from "@/lib/metricas";
import { STATUS_LABEL } from "@/lib/tipos";
import { hojeISO, quinzenaAtual } from "@/lib/quinzena";
import {
  formatarCPF,
  useConfirmarProgramacao,
  useCriarProgramacao,
  useEmpresas,
  useExcluirProgramacao,
  useMinhasProgramacoes,
  type Candidato,
} from "@/lib/programacao";
import type { Bloqueio } from "@/lib/bloqueios";

export const Route = createFileRoute("/minha-programacao")({
  head: () => ({
    meta: [
      { title: "Minha Programação | Sistema de Vagas" },
      {
        name: "description",
        content: "Registre candidatos, empresas e situações da quinzena e acompanhe sua meta.",
      },
      { property: "og:title", content: "Minha Programação | Sistema de Vagas" },
      {
        property: "og:description",
        content: "Registre candidatos, empresas e situações da quinzena e acompanhe sua meta.",
      },
    ],
  }),
  component: Pagina,
});

function Pagina() {
  const { user, perfil } = useAuth();
  const q = quinzenaAtual();
  const { data: empresas = [] } = useEmpresas();
  const { data: registros = [] } = useMinhasProgramacoes(user?.id);
  const criar = useCriarProgramacao();
  const excluir = useExcluirProgramacao();
  const confirmar = useConfirmarProgramacao();

  const [candidato, setCandidato] = useState<Candidato | null>(null);
  const [bloqueio, setBloqueio] = useState<Bloqueio | null>(null);
  const [data, setData] = useState(hojeISO());
  const [empresaId, setEmpresaId] = useState("");
  const [status, setStatus] = useState<"AGUARDANDO" | "PRESENCA" | "FALTA" | "CANCELAMENTO">(
    "AGUARDANDO",
  );
  const [resetSinal, setResetSinal] = useState(0);

  /** Limpa o formulário para um novo registro (não afeta o registro já salvo). */
  function limparFormulario() {
    setCandidato(null);
    setBloqueio(null);
    setData(hojeISO());
    setEmpresaId("");
    setStatus("AGUARDANDO");
    setResetSinal((n) => n + 1);
  }

  const daQuinzena = useMemo(
    () => registros.filter((r) => r.data >= q.inicio && r.data <= q.fim),
    [registros, q.inicio, q.fim],
  );

  const total = daQuinzena.length;
  const pendentes = daQuinzena.filter((r) => r.status === "AGUARDANDO").length;
  const presencas = daQuinzena.filter((r) => r.status === "PRESENCA").length;
  const faltas = daQuinzena.filter((r) => r.status === "FALTA").length;
  const cancelamentos = daQuinzena.filter((r) => r.status === "CANCELAMENTO").length;
  const confirmadas = presencas + faltas + cancelamentos;
  const pct = (v: number) => (confirmadas ? (v / confirmadas) * 100 : 0);
  const meta = perfil?.meta_quinzena ?? 0;
  const pctMeta = meta > 0 ? (presencas / meta) * 100 : 0;

  async function salvar() {
    if (bloqueio) {
      toast.error("🚫 COLABORADOR BLOQUEADO — não é possível fechar a vaga.");
      return;
    }
    if (!candidato) {
      toast.error("Selecione ou cadastre o candidato pela ficha.");
      return;
    }
    if (!empresaId) {
      toast.error("Selecione a empresa.");
      return;
    }
    if (!data) {
      toast.error("Informe a data.");
      return;
    }
    try {
      const r = await criar.mutateAsync({ candidato, data, empresa_id: empresaId, status });
      toast.success(
        status === "AGUARDANDO"
          ? "Vaga programada como ⏳ Aguardando confirmação."
          : "Programação registrada. Resultados atualizados.",
      );
      if (r?.metaAtingida) toast.success(r.mensagem, { duration: 8000 });
      limparFormulario();
      toast.info("Formulário limpo — pronto para o próximo colaborador.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function confirmarVaga(id: string, novo: string) {
    try {
      const r = await confirmar.mutateAsync({ id, status: novo as typeof status });
      toast.success("Situação confirmada. Resultados atualizados.");
      if (r?.metaAtingida) toast.success(r.mensagem, { duration: 8000 });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Minha programação</h1>
        <p className="text-sm text-muted-foreground">
          {perfil?.nome ?? "Programadora"} · {q.rotulo} ({fmtData(q.inicio)} a {fmtData(q.fim)})
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <CardIndicador titulo="Vagas programadas" valor={fmtNum(total)} icon={CalendarDays} />
        <CardIndicador
          titulo="Aguardando confirmação"
          valor={fmtNum(pendentes)}
          detalhe="Não contabilizadas"
          icon={Clock}
        />
        <CardIndicador
          titulo="Presenças"
          valor={fmtNum(presencas)}
          detalhe={fmtPct(pct(presencas))}
          icon={CheckCircle2}
        />
        <CardIndicador
          titulo="Faltas"
          valor={fmtNum(faltas)}
          detalhe={fmtPct(pct(faltas))}
          icon={XCircle}
        />
        <CardIndicador
          titulo="Cancelamentos"
          valor={fmtNum(cancelamentos)}
          detalhe={fmtPct(pct(cancelamentos))}
          icon={Trash2}
        />
      </div>

      <div className="surface-panel rounded-xl p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Minha meta da quinzena</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {meta > 0
              ? `Meta ${fmtNum(meta)} · Realizado ${fmtNum(presencas)} · Faltam ${fmtNum(Math.max(meta - presencas, 0))} · ${fmtPct(pctMeta)}`
              : "Nenhuma meta individual definida."}
          </span>
        </div>
        {meta > 0 && (
          <>
            <Progress value={Math.min(pctMeta, 100)} className="mt-3" />
            {presencas >= meta && (
              <p className="mt-2 text-sm font-semibold text-primary">
                {presencas > meta ? "META SUPERADA" : "META ATINGIDA"}
              </p>
            )}
          </>
        )}
      </div>

      <div className="surface-panel space-y-5 rounded-xl p-4">
        <h2 className="font-display text-lg font-semibold">Novo registro</h2>
        <FichaCandidato
          candidato={candidato}
          onCandidato={setCandidato}
          onBloqueio={setBloqueio}
          resetSinal={resetSinal}
        />

        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="p-data">Data</Label>
            <Input
              id="p-data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Select value={empresaId} onValueChange={setEmpresaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas
                  .filter((e) => e.ativo)
                  .map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Situação</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AGUARDANDO">⏳ Aguardando confirmação</SelectItem>
                <SelectItem value="PRESENCA">Presença</SelectItem>
                <SelectItem value="FALTA">Falta</SelectItem>
                <SelectItem value="CANCELAMENTO">Cancelamento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={() => void salvar()}
              disabled={criar.isPending || Boolean(bloqueio)}
            >
              <Save className="mr-2 h-4 w-4" />
              {bloqueio ? "Bloqueado" : criar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Programar uma vaga não confirma presença: com ⏳ Aguardando confirmação a vaga fica
          pendente e só entra nos resultados após você definir a situação na tabela abaixo.
        </p>
      </div>

      <div className="surface-panel rounded-xl p-4">
        <h2 className="mb-3 font-display text-lg font-semibold">
          Programações da quinzena atual ({fmtNum(daQuinzena.length)})
        </h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Candidato</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {daQuinzena.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{fmtData(r.data)}</TableCell>
                  <TableCell className="font-medium">{r.candidato_nome}</TableCell>
                  <TableCell>{r.candidato_cpf ? formatarCPF(r.candidato_cpf) : "—"}</TableCell>
                  <TableCell>{r.candidato_telefone ?? "—"}</TableCell>
                  <TableCell>{r.empresa}</TableCell>
                  <TableCell>
                    <Select
                      value={r.status}
                      onValueChange={(v) => void confirmarVaga(r.id, v)}
                    >
                      <SelectTrigger className="h-8 w-[210px]">
                        <SelectValue>{STATUS_LABEL[r.status] ?? r.status}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AGUARDANDO">⏳ Aguardando confirmação</SelectItem>
                        <SelectItem value="PRESENCA">✓ Presença</SelectItem>
                        <SelectItem value="FALTA">✕ Falta</SelectItem>
                        <SelectItem value="CANCELAMENTO">⚠ Cancelamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => excluir.mutate(r.id)}
                      aria-label="Excluir registro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {daQuinzena.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Nenhum registro nesta quinzena ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
