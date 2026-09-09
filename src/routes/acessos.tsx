import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { PageHeader } from "@/components/PageHeader";
import { RequerAdmin } from "@/components/RequerAdmin";
import { ResumoAcessos } from "@/components/admin/ResumoAcessos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { dataHoraLogin, statusUltimoLogin, useAcessos } from "@/lib/acessos";
import { listarUsuarios } from "@/lib/usuarios.functions";
import { usePrivacidade } from "@/lib/privacidade";

export const Route = createFileRoute("/acessos")({
  head: () => ({
    meta: [
      { title: "Histórico de Acessos | RECRUTA+" },
      {
        name: "description",
        content:
          "Monitore todos os logins do RECRUTA+: usuários ativos agora, último acesso e histórico completo com filtros por usuário e período.",
      },
      { property: "og:title", content: "Histórico de Acessos | RECRUTA+" },
      {
        property: "og:description",
        content: "Acompanhe os acessos dos usuários do RECRUTA+ com filtros por usuário e período.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequerAdmin area="Histórico de acessos">
      <Pagina />
    </RequerAdmin>
  ),
});

function Pagina() {
  const p = usePrivacidade();
  const listar = useServerFn(listarUsuarios);
  const usuarios = useQuery({ queryKey: ["admin-usuarios"], queryFn: () => listar({}) });

  const [usuarioId, setUsuarioId] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");

  const filtro = useMemo(
    () => ({ usuarioId: usuarioId || undefined, inicio: inicio || undefined, fim: fim || undefined }),
    [usuarioId, inicio, fim],
  );
  const acessos = useAcessos(filtro);

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="🔐 Histórico de acessos"
        descricao="Todos os logins realizados no RECRUTA+, do mais recente para o mais antigo."
      />

      <ResumoAcessos />

      <div className="surface-panel grid gap-3 rounded-2xl p-4 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="f-usuario">Usuário</Label>
          <select
            id="f-usuario"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            value={usuarioId}
            onChange={(e) => setUsuarioId(e.target.value)}
          >
            <option value="">Todos os usuários</option>
            {(usuarios.data ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {p.nome(u.nome)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-inicio">De</Label>
          <Input id="f-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-fim">Até</Label>
          <Input id="f-fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={() => {
              setUsuarioId("");
              setInicio("");
              setFim("");
            }}
          >
            Limpar filtros
          </Button>
        </div>
      </div>

      {acessos.isLoading && <Skeleton className="h-64 w-full" />}

      {!acessos.isLoading && (
        <div className="surface-panel overflow-x-auto rounded-2xl">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Data e hora</th>
                <th className="px-4 py-3">Quando</th>
                <th className="px-4 py-3">Dispositivo</th>
              </tr>
            </thead>
            <tbody>
              {(acessos.data ?? []).map((a) => (
                <tr key={a.id} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-2.5 font-medium">{p.nome(a.usuario_nome || "Usuário removido")}</td>
                  <td className="px-4 py-2.5">{dataHoraLogin(a.login_at)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{statusUltimoLogin(a.login_at)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {[a.navegador, a.sistema_operacional].filter(Boolean).join(" · ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(acessos.data ?? []).length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum acesso encontrado para este filtro.
            </p>
          )}
        </div>
      )}
    </div>
  );
}