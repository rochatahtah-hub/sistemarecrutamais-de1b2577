import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Crown, Plus, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { RequerPermissao } from "@/components/RequerPermissao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { ACAO_ROTULO, MODULOS, type Acao } from "@/lib/permissoes";
import {
  useCriarPerfil,
  useDefinirMaster,
  useDefinirPerfilDoUsuario,
  useExcecoesUsuario,
  useExcluirPerfil,
  usePerfisAcesso,
  usePermissoesPerfil,
  useSalvarExcecaoUsuario,
  useSalvarPermissaoPerfil,
  useUsuariosPermissao,
} from "@/lib/perfis";

export const Route = createFileRoute("/perfis")({
  head: () => ({
    meta: [
      { title: "Perfis e Permissões | Recruta+" },
      {
        name: "description",
        content: "Crie perfis de acesso e defina, módulo a módulo, o que cada usuário pode ver e fazer.",
      },
      { property: "og:title", content: "Perfis e Permissões | Recruta+" },
      {
        property: "og:description",
        content: "Controle granular de permissões por perfil e por usuário no Recruta+.",
      },
    ],
  }),
  component: () => (
    <RequerPermissao modulo="perfis" area="Perfis e Permissões">
      <Pagina />
    </RequerPermissao>
  ),
});

function Pagina() {
  const { user } = useAuth();
  const { data: perfis = [], isLoading } = usePerfisAcesso();
  const [perfilId, setPerfilId] = useState<string | null>(null);
  useEffect(() => {
    if (!perfilId && perfis.length) setPerfilId(perfis[0]!.id);
  }, [perfis, perfilId]);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Perfis e Permissões"
        descricao="Defina o que cada perfil pode ver e fazer. As alterações valem imediatamente, sem precisar mexer no código."
        icone={<ShieldCheck className="h-5 w-5" />}
      />

      <Tabs defaultValue="perfis">
        <TabsList>
          <TabsTrigger value="perfis">Perfis</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
        </TabsList>

        <TabsContent value="perfis" className="mt-4 space-y-4">
          {isLoading ? (
            <Skeleton className="h-80 w-full" />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
              <ListaPerfis perfis={perfis} perfilId={perfilId} onSelecionar={setPerfilId} />
              {perfilId && <MatrizPerfil perfilId={perfilId} />}
            </div>
          )}
        </TabsContent>

        <TabsContent value="usuarios" className="mt-4">
          <AbaUsuarios meuId={user?.id ?? null} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ListaPerfis({
  perfis,
  perfilId,
  onSelecionar,
}: {
  perfis: { id: string; nome: string; descricao: string; sistema: boolean; ativo: boolean }[];
  perfilId: string | null;
  onSelecionar: (id: string) => void;
}) {
  const criar = useCriarPerfil();
  const excluir = useExcluirPerfil();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [duplicarDe, setDuplicarDe] = useState<string>("");

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="space-y-1 pt-4">
          {perfis.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${p.id === perfilId ? "border-gold/40 bg-gold-soft" : "border-transparent hover:bg-accent"}`}
            >
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelecionar(p.id)}>
                <p className="truncate text-sm font-medium">{p.nome}</p>
                <p className="truncate text-xs text-muted-foreground">{p.descricao || "Sem descrição"}</p>
              </button>
              {!p.ativo && (
                <Badge variant="secondary" className="shrink-0 text-[10px]">Inativo</Badge>
              )}
              {p.sistema ? (
                <Badge variant="outline" className="shrink-0 text-[10px]">Sistema</Badge>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Excluir o perfil ${p.nome}`}
                  title="Excluir perfil"
                  onClick={() => {
                    if (!window.confirm(`Excluir o perfil ${p.nome}?`)) return;
                    excluir.mutate(p.id, {
                      onSuccess: () => toast.success("Perfil excluído."),
                      onError: () => toast.error("Não foi possível excluir o perfil."),
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Novo perfil</CardTitle>
          <CardDescription>Crie do zero ou duplique um perfil existente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="np">Nome</Label>
            <Input id="np" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nd">Descrição</Label>
            <Input id="nd" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <Select value={duplicarDe} onValueChange={setDuplicarDe}>
            <SelectTrigger><SelectValue placeholder="Duplicar permissões de..." /></SelectTrigger>
            <SelectContent>
              {perfis.map((p) => (<SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>))}
            </SelectContent>
          </Select>
          <Button
            className="w-full"
            disabled={nome.trim().length < 3 || criar.isPending}
            onClick={() =>
              criar.mutate(
                { nome, descricao, duplicarDe: duplicarDe || null },
                {
                  onSuccess: (id) => {
                    toast.success("Perfil criado.");
                    setNome("");
                    setDescricao("");
                    setDuplicarDe("");
                    onSelecionar(id);
                  },
                  onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao criar perfil."),
                },
              )
            }
          >
            {duplicarDe ? <Copy className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            Criar perfil
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function MatrizPerfil({ perfilId }: { perfilId: string }) {
  const { data: mapa, isLoading } = usePermissoesPerfil(perfilId);
  const salvar = useSalvarPermissaoPerfil();

  if (isLoading || !mapa) return <Skeleton className="h-80 w-full" />;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Permissões do perfil</CardTitle>
        <CardDescription>Ative apenas o que este perfil deve enxergar e executar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {MODULOS.map((m) => (
          <div key={m.chave} className="rounded-xl border border-border/70 px-3.5 py-3">
            <p className="text-sm font-medium">{m.nome}</p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
              {m.acoes.map((a) => {
                const chave = `${m.chave}:${a}`;
                const ativo = mapa.get(chave) ?? false;
                return (
                  <label key={chave} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={ativo}
                      onCheckedChange={(v) =>
                        salvar.mutate(
                          { perfilId, modulo: m.chave, acao: a as Acao, permitido: v },
                          { onError: () => toast.error("Não foi possível salvar a permissão.") },
                        )
                      }
                    />
                    {ACAO_ROTULO[a]}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AbaUsuarios({ meuId }: { meuId: string | null }) {
  const { data: usuarios = [], isLoading } = useUsuariosPermissao();
  const { data: perfis = [] } = usePerfisAcesso();
  const definirPerfil = useDefinirPerfilDoUsuario();
  const definirMaster = useDefinirMaster();
  const [selecionado, setSelecionado] = useState<string | null>(null);

  if (isLoading) return <Skeleton className="h-80 w-full" />;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Usuários</CardTitle>
          <CardDescription>
            Vincule a função/perfil do usuário e defina quem é administrador master. Cada função
            cadastrada em Programações da Equipe aparece aqui como perfil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {usuarios.map((u) => (
            <div key={u.id} className="rounded-xl border border-border/70 px-3.5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setSelecionado(u.id)}
                >
                  <p className="truncate text-sm font-medium">
                    {u.nome} {u.master && <Crown className="ml-1 inline h-3.5 w-3.5 text-gold" />}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{u.email ?? "—"}</p>
                </button>
                {!u.ativo && <Badge variant="secondary">Inativo</Badge>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Select
                  value={u.perfil_id ?? "auto"}
                  onValueChange={(v) =>
                    definirPerfil.mutate(
                      { userId: u.id, perfilId: v === "auto" ? null : v },
                      {
                        onSuccess: () => toast.success("Perfil atualizado."),
                        onError: () => toast.error("Não foi possível atualizar o perfil."),
                      },
                    )
                  }
                >
                  <SelectTrigger className="h-8 w-[210px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Perfil pelo papel atual</SelectItem>
                    {perfis
                      .filter((p) => p.ativo || p.id === u.perfil_id)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                          {p.ativo ? "" : " (inativo)"}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch
                    checked={u.master}
                    disabled={u.id === meuId && u.master}
                    onCheckedChange={(v) =>
                      definirMaster.mutate(
                        { userId: u.id, master: v },
                        {
                          onSuccess: () => toast.success("Acesso master atualizado."),
                          onError: (e) =>
                            toast.error(
                              e instanceof Error && e.message.includes("master")
                                ? "É necessário manter pelo menos um administrador master ativo."
                                : "Não foi possível atualizar.",
                            ),
                        },
                      )
                    }
                  />
                  Administrador master
                </label>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ExcecoesUsuario userId={selecionado} />
    </div>
  );
}

function ExcecoesUsuario({ userId }: { userId: string | null }) {
  const { data: mapa } = useExcecoesUsuario(userId);
  const salvar = useSalvarExcecaoUsuario();

  if (!userId) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-gold/25 bg-gold-soft text-accent-foreground">
            <UserCog className="h-5 w-5" />
          </span>
          <CardTitle className="text-base">Exceções individuais</CardTitle>
          <CardDescription>
            Selecione um usuário à esquerda para conceder ou remover permissões pontuais, sem alterar o
            perfil dele.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Exceções individuais</CardTitle>
        <CardDescription>
          "Herdado" segue o perfil. "Permitir" e "Bloquear" sobrescrevem apenas para este usuário.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {MODULOS.map((m) => (
          <div key={m.chave} className="rounded-xl border border-border/70 px-3.5 py-3">
            <p className="text-sm font-medium">{m.nome}</p>
            <div className="mt-2 space-y-2">
              {m.acoes.map((a) => {
                const chave = `${m.chave}:${a}`;
                const atual = mapa?.get(chave);
                const valor = atual === undefined ? "herdado" : atual ? "permitir" : "bloquear";
                return (
                  <div key={chave} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">{ACAO_ROTULO[a]}</span>
                    <Select
                      value={valor}
                      onValueChange={(v) =>
                        salvar.mutate(
                          {
                            userId,
                            modulo: m.chave,
                            acao: a as Acao,
                            permitido: v === "herdado" ? null : v === "permitir",
                          },
                          { onError: () => toast.error("Não foi possível salvar a exceção.") },
                        )
                      }
                    >
                      <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="herdado">Herdado</SelectItem>
                        <SelectItem value="permitir">Permitir</SelectItem>
                        <SelectItem value="bloquear">Bloquear</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}