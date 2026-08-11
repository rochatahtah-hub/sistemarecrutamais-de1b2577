import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Database, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

async function contar(tabela: string) {
  const { count, error } = await supabase
    .from(tabela as "vagas")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export interface Integridade {
  rotulo: string;
  quantidade: number;
}

export function usePanoramaBanco() {
  return useQuery({
    queryKey: ["admin-banco"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const desde = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
      const [colaboradores, vagas, empresas, usuarios, candidatos, auditoria, erros] = await Promise.all([
        contar("colaboradores"),
        contar("vagas"),
        contar("empresas"),
        contar("profiles"),
        contar("candidatos"),
        contar("auditoria"),
        supabase
          .from("erros_sistema")
          .select("categoria,mensagem,componente,ocorrencias,ultima_ocorrencia")
          .order("ultima_ocorrencia", { ascending: false })
          .limit(8),
      ]);

      const [{ count: noPeriodo }, { data: ultima }] = await Promise.all([
        supabase.from("vagas").select("id", { count: "exact", head: true }).gte("data", desde),
        supabase.from("vagas").select("updated_at").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      const listaErros = erros.data ?? [];
      const falhasBanco = listaErros.filter((e) => e.categoria === "banco").reduce((s, e) => s + e.ocorrencias, 0);
      const falhasAuth = listaErros.filter((e) => e.categoria === "autenticacao").reduce((s, e) => s + e.ocorrencias, 0);

      return {
        conectado: true,
        contagens: { colaboradores, vagas, empresas, usuarios, candidatos, auditoria },
        total: colaboradores + vagas + empresas + usuarios + candidatos + auditoria,
        noPeriodo: noPeriodo ?? 0,
        ultimaAtualizacao: ultima?.updated_at ?? null,
        erros: listaErros,
        falhasBanco,
        falhasAuth,
      };
    },
  });
}

export function PainelBanco() {
  const { data, isLoading, isError } = usePanoramaBanco();

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !data) {
    return (
      <div className="surface-panel flex items-center gap-3 rounded-2xl p-6 text-destructive">
        <XCircle className="h-5 w-5" /> 🔴 Não foi possível consultar o banco de dados.
      </div>
    );
  }

  const problemas = data.falhasBanco + data.falhasAuth;
  const saude =
    problemas === 0
      ? { rotulo: "🟢 BANCO DE DADOS NORMAL", cor: "text-emerald-500", Icone: CheckCircle2 }
      : problemas < 10
        ? { rotulo: "🟡 ATENÇÃO", cor: "text-amber-500", Icone: AlertTriangle }
        : { rotulo: "🔴 PROBLEMA", cor: "text-destructive", Icone: XCircle };

  const cards = [
    { rotulo: "Colaboradores", valor: data.contagens.colaboradores },
    { rotulo: "Programações", valor: data.contagens.vagas },
    { rotulo: "Empresas", valor: data.contagens.empresas },
    { rotulo: "Usuários", valor: data.contagens.usuarios },
    { rotulo: "Candidatos", valor: data.contagens.candidatos },
    { rotulo: "Registros (30 dias)", valor: data.noPeriodo },
    { rotulo: "Total de registros", valor: data.total },
  ];

  return (
    <div className="space-y-6">
      <div className="surface-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-primary" />
          <div>
            <p className={`font-display text-sm font-semibold ${saude.cor}`}>{saude.rotulo}</p>
            <p className="text-xs text-muted-foreground">
              Conexão ativa · Última atualização de dados:{" "}
              {data.ultimaAtualizacao
                ? new Date(data.ultimaAtualizacao).toLocaleString("pt-BR")
                : "sem registros"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">Falhas de gravação/leitura: {data.falhasBanco}</Badge>
          <Badge variant="outline">Falhas de autenticação: {data.falhasAuth}</Badge>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.rotulo} className="surface-panel rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">{c.rotulo}</p>
            <p className="font-display text-2xl font-bold">{c.valor.toLocaleString("pt-BR")}</p>
          </div>
        ))}
      </div>

      <div className="surface-panel space-y-2 rounded-2xl p-4">
        <h3 className="font-display text-sm font-semibold">Erros recentes</h3>
        {data.erros.length === 0 && <p className="text-sm text-muted-foreground">Nenhum erro registrado.</p>}
        {data.erros.map((e, i) => (
          <div key={i} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-xs">
            <span className="min-w-0 flex-1 truncate">
              <strong>{e.componente || e.categoria}</strong> — {e.mensagem}
            </span>
            <span className="text-muted-foreground">
              {e.ocorrencias}x · {new Date(e.ultima_ocorrencia).toLocaleString("pt-BR")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}