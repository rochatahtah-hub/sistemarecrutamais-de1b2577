import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, DatabaseBackup, Download, Loader2, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { RequerAdmin } from "@/components/RequerAdmin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  excluirBackup,
  gerarBackup,
  linkDownloadBackup,
  salvarAgendamento,
} from "@/lib/backup.functions";

export const Route = createFileRoute("/backups")({
  head: () => ({
    meta: [
      { title: "Backups e Exportações | RECRUTA+" },
      {
        name: "description",
        content:
          "Gere, agende e baixe backups completos do sistema em SQL ou CSV, com histórico de execuções.",
      },
      { property: "og:title", content: "Backups e Exportações | RECRUTA+" },
      {
        property: "og:description",
        content:
          "Gere, agende e baixe backups completos do sistema em SQL ou CSV, com histórico de execuções.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaProtegida,
});

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function fmtTamanho(bytes: number) {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function fmtData(valor: string | null) {
  if (!valor) return "—";
  return new Date(valor).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

interface Agenda {
  ativo: boolean;
  frequencia: "diaria" | "semanal" | "mensal";
  hora: number;
  dia_semana: number;
  dia_mes: number;
  formato: "sql" | "csv";
  retencao_dias: number;
  ultima_execucao: string | null;
  proxima_execucao: string | null;
  email_destino: string;
  ultimo_envio_em: string | null;
  ultimo_envio_status: string;
  ultimo_envio_erro: string;
}

function Pagina() {
  const qc = useQueryClient();
  const [formato, setFormato] = useState<"sql" | "csv">("sql");

  const historico = useQuery({
    queryKey: ["backups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backups")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    refetchInterval: (q) =>
      (q.state.data ?? []).some((b) => b.status === "processando") ? 4000 : false,
  });

  const agendamento = useQuery({
    queryKey: ["backup-agendamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backup_agendamento")
        .select("*")
        .eq("id", true)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as Agenda | null;
    },
  });

  const gerar = useServerFn(gerarBackup);
  const baixar = useServerFn(linkDownloadBackup);
  const excluir = useServerFn(excluirBackup);
  const salvar = useServerFn(salvarAgendamento);

  const mGerar = useMutation({
    mutationFn: () => gerar({ data: { formato, enviarEmail: true } }),
    onSuccess: (r) => {
      toast.success(`Backup gerado: ${r.nome}`, {
        description: r.envio?.enviado
          ? `Enviado para ${agendaEmail}`
          : "Envio por e-mail pendente: configure o domínio de e-mail do projeto.",
      });
      void qc.invalidateQueries({ queryKey: ["backups"] });
      void qc.invalidateQueries({ queryKey: ["backup-agendamento"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const mBaixar = useMutation({
    mutationFn: (id: string) => baixar({ data: { id } }),
    onSuccess: (r) => window.open(r.url, "_blank", "noopener"),
    onError: (e) => toast.error((e as Error).message),
  });

  const mExcluir = useMutation({
    mutationFn: (id: string) => excluir({ data: { id } }),
    onSuccess: () => {
      toast.success("Backup removido.");
      void qc.invalidateQueries({ queryKey: ["backups"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const agenda: Agenda = agendamento.data ?? {
    ativo: false,
    frequencia: "diaria",
    hora: 3,
    dia_semana: 1,
    dia_mes: 1,
    formato: "sql",
    retencao_dias: 30,
    ultima_execucao: null,
    proxima_execucao: null,
    email_destino: "rochatahtah@gmail.com",
    ultimo_envio_em: null,
    ultimo_envio_status: "",
    ultimo_envio_erro: "",
  };
  const agendaEmail = agenda.email_destino;

  const mSalvar = useMutation({
    mutationFn: (novo: Partial<Agenda>) => {
      const merged = { ...agenda, ...novo };
      return salvar({
        data: {
          ativo: merged.ativo,
          frequencia: merged.frequencia,
          hora: merged.hora,
          dia_semana: merged.dia_semana,
          dia_mes: merged.dia_mes,
          formato: merged.formato,
          retencao_dias: merged.retencao_dias,
          email_destino: merged.email_destino,
        },
      });
    },
    onSuccess: () => {
      toast.success("Agendamento salvo. Rotina automática programada.");
      void qc.invalidateQueries({ queryKey: ["backup-agendamento"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Backups e Exportações"
        descricao="Cópias completas dos dados do sistema, sob o seu controle."
        icone={<DatabaseBackup className="h-5 w-5" />}
        acoes={
          <div className="flex items-center gap-2">
            <Select value={formato} onValueChange={(v) => setFormato(v as "sql" | "csv")}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sql">SQL (.sql)</SelectItem>
                <SelectItem value="csv">CSV (.zip)</SelectItem>
              </SelectContent>
            </Select>
            <Button disabled={mGerar.isPending} onClick={() => mGerar.mutate()}>
              {mGerar.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <DatabaseBackup className="mr-2 h-4 w-4" />
              )}
              Fazer backup agora
            </Button>
          </div>
        }
      />

      <section className="surface-panel space-y-4 rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold">
                {agenda.ativo ? "🟢 BACKUP ATIVO" : "🔴 BACKUP DESATIVADO"}
              </p>
              <p className="text-sm text-muted-foreground">
                Última execução: {fmtData(agenda.ultima_execucao)} · Próxima:{" "}
                {agenda.ativo ? fmtData(agenda.proxima_execucao) : "desativada"} (horário de
                Brasília)
              </p>
              <p className="text-xs text-muted-foreground">
                Envio por e-mail: {agendaEmail} ·{" "}
                {agenda.ultimo_envio_status === "enviado"
                  ? `enviado em ${fmtData(agenda.ultimo_envio_em)}`
                  : agenda.ultimo_envio_status === "falhou"
                    ? `falhou (${agenda.ultimo_envio_erro})`
                    : "aguardando configuração do domínio de e-mail"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="ativo">Ativa</Label>
            <Switch
              id="ativo"
              checked={agenda.ativo}
              disabled={mSalvar.isPending}
              onCheckedChange={(v) => mSalvar.mutate({ ativo: v })}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label>Frequência</Label>
            <Select
              value={agenda.frequencia}
              onValueChange={(v) => mSalvar.mutate({ frequencia: v as Agenda["frequencia"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diaria">Diária</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Hora (Brasília)</Label>
            <Input
              type="number"
              min={0}
              max={23}
              defaultValue={agenda.hora}
              onBlur={(e) => {
                const hora = Number(e.target.value);
                if (hora !== agenda.hora) mSalvar.mutate({ hora });
              }}
            />
          </div>

          {agenda.frequencia === "semanal" && (
            <div className="space-y-1.5">
              <Label>Dia da semana</Label>
              <Select
                value={String(agenda.dia_semana)}
                onValueChange={(v) => mSalvar.mutate({ dia_semana: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIAS.map((d, i) => (
                    <SelectItem key={d} value={String(i)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {agenda.frequencia === "mensal" && (
            <div className="space-y-1.5">
              <Label>Dia do mês</Label>
              <Input
                type="number"
                min={1}
                max={28}
                defaultValue={agenda.dia_mes}
                onBlur={(e) => {
                  const dia_mes = Number(e.target.value);
                  if (dia_mes !== agenda.dia_mes) mSalvar.mutate({ dia_mes });
                }}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Formato</Label>
            <Select
              value={agenda.formato}
              onValueChange={(v) => mSalvar.mutate({ formato: v as "sql" | "csv" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sql">SQL (.sql)</SelectItem>
                <SelectItem value="csv">CSV (.zip)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Retenção (dias)</Label>
            <Input
              type="number"
              min={0}
              max={365}
              defaultValue={agenda.retencao_dias}
              onBlur={(e) => {
                const retencao_dias = Number(e.target.value);
                if (retencao_dias !== agenda.retencao_dias) mSalvar.mutate({ retencao_dias });
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Enviar para
            </Label>
            <Input
              type="email"
              defaultValue={agenda.email_destino}
              onBlur={(e) => {
                const email_destino = e.target.value.trim();
                if (email_destino && email_destino !== agenda.email_destino) {
                  mSalvar.mutate({ email_destino });
                }
              }}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          A rotina roda no servidor (não depende do navegador estar aberto) e é executada uma vez
          por dia, no horário escolhido. O backup manual continua disponível a qualquer momento.
          Backups mais antigos que a retenção são apagados automaticamente; use retenção 0 para
          nunca apagar.
        </p>
      </section>

      <section className="surface-panel rounded-2xl p-5">
        <p className="mb-3 font-display text-lg font-semibold">Histórico de execuções</p>
        {historico.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (historico.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum backup gerado ainda. Clique em “Gerar backup agora”.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Registros</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(historico.data ?? []).map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="whitespace-nowrap">{fmtData(b.created_at)}</TableCell>
                    <TableCell className="uppercase">{b.formato}</TableCell>
                    <TableCell>{b.origem === "agendado" ? "Automático" : "Manual"}</TableCell>
                    <TableCell>{fmtTamanho(b.tamanho_bytes)}</TableCell>
                    <TableCell>
                      {b.total_registros} em {b.total_tabelas} tabelas
                    </TableCell>
                    <TableCell>
                      {b.status === "concluido" ? (
                        <Badge variant="secondary">Concluído</Badge>
                      ) : b.status === "processando" ? (
                        <Badge variant="outline">Processando…</Badge>
                      ) : (
                        <Badge variant="destructive" title={b.erro}>
                          Falhou
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {b.envio_status === "enviado" ? (
                        <Badge variant="secondary">Enviado</Badge>
                      ) : b.envio_status ? (
                        <Badge variant="outline" title={b.envio_email}>
                          Pendente
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={b.status !== "concluido" || mBaixar.isPending}
                          onClick={() => mBaixar.mutate(b.id)}
                        >
                          <Download className="h-4 w-4" />
                          <span className="sr-only">Baixar</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={mExcluir.isPending}
                          onClick={() => mExcluir.mutate(b.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="sr-only">Excluir</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}

function PaginaProtegida() {
  return (
    <RequerAdmin area="Backups e Exportações">
      <Pagina />
    </RequerAdmin>
  );
}