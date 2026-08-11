import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MessageSquarePlus, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { AvatarUsuario } from "@/components/AvatarUsuario";
import { AvatarConversa } from "@/components/chat/AvatarConversa";
import { DialogoNovoGrupo } from "@/components/chat/DialogoNovoGrupo";
import { JanelaConversa } from "@/components/chat/JanelaConversa";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { usePrivacidade } from "@/lib/privacidade";
import {
  estaOnline,
  horaCurta,
  useAbrirConversaDireta,
  useChatRealtime,
  useConversas,
  usePresencaAtiva,
  usePresencas,
  useUsuariosChat,
} from "@/lib/chat";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat interno — RECRUTA+" },
      {
        name: "description",
        content:
          "Chat interno do RECRUTA+: conversas individuais, grupos e mensagens em tempo real entre a equipe de recrutamento.",
      },
      { property: "og:title", content: "Chat interno — RECRUTA+" },
      {
        property: "og:description",
        content: "Comunicação interna em tempo real entre os usuários do RECRUTA+.",
      },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { user } = useAuth();
  const { privado } = usePrivacidade();
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [novoGrupo, setNovoGrupo] = useState(false);

  usePresencaAtiva();
  useChatRealtime(selecionada);

  const { data: conversas = [], isLoading } = useConversas();
  const { data: usuarios = [] } = useUsuariosChat();
  const { data: presencas = {} } = usePresencas();
  const abrirDireta = useAbrirConversaDireta();

  const termo = busca.trim().toLowerCase();
  const listadas = useMemo(
    () => conversas.filter((c) => !termo || c.titulo.toLowerCase().includes(termo)),
    [conversas, termo],
  );

  const jaConversando = new Set(
    conversas.filter((c) => c.conversa.tipo === "direta").map((c) => c.outro?.id),
  );
  const novosContatos = useMemo(
    () =>
      usuarios.filter(
        (u) =>
          u.id !== user?.id &&
          !jaConversando.has(u.id) &&
          (!termo || u.nome.toLowerCase().includes(termo)),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [usuarios, conversas, termo, user],
  );

  const atual = conversas.find((c) => c.conversa.id === selecionada) ?? null;
  if (selecionada && !atual && !isLoading) {
    // Conversa encerrada (chat temporário) enquanto estava aberta.
    setSelecionada(null);
  }

  function iniciarCom(id: string) {
    abrirDireta.mutate(id, {
      onSuccess: (conversaId) => setSelecionada(conversaId),
      onError: (e) => toast.error((e as Error).message),
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Chat"
        descricao="Comunicação interna em tempo real. As conversas são temporárias: quando o último participante sai, o histórico é apagado."
      />

      <div className="grid h-[calc(100vh-15rem)] min-h-[520px] grid-cols-1 overflow-hidden rounded-xl border border-border bg-card md:grid-cols-[320px_1fr]">
        {/* Lista de conversas */}
        <aside
          className={`flex min-h-0 flex-col border-border md:border-r ${atual ? "hidden md:flex" : "flex"}`}
        >
          <div className="space-y-2 border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar usuários, grupos e conversas"
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => setNovoGrupo(true)}>
              <MessageSquarePlus className="mr-2 h-4 w-4" /> Novo grupo
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading && (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">Carregando...</p>
            )}
            {listadas.map((c) => {
              const presenca = c.outro ? presencas[c.outro.id] : undefined;
              return (
                <button
                  key={c.conversa.id}
                  type="button"
                  onClick={() => setSelecionada(c.conversa.id)}
                  className={`flex w-full items-center gap-3 border-b border-border/50 px-3 py-3 text-left transition-colors hover:bg-accent/50 ${
                    selecionada === c.conversa.id ? "bg-accent/70" : ""
                  }`}
                >
                  <span className="relative">
                    <AvatarConversa resumo={c} privado={privado} />
                    {c.conversa.tipo === "direta" && estaOnline(presenca) && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold text-foreground">
                        {c.titulo}
                      </span>
                      {c.ultima && (
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {horaCurta(c.ultima.created_at)}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">
                        {c.ultima
                          ? c.ultima.excluida
                            ? "Mensagem excluída"
                            : c.ultima.conteudo
                          : "Sem mensagens"}
                      </span>
                      {c.naoLidas > 0 && (
                        <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-gold px-1.5 text-[10px] font-bold text-primary">
                          {c.naoLidas > 99 ? "99+" : c.naoLidas}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}

            {novosContatos.length > 0 && (
              <>
                <p className="px-3 pb-1 pt-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Iniciar nova conversa
                </p>
                {novosContatos.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => iniciarCom(u.id)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
                  >
                    <span className="relative">
                      <AvatarUsuario
                        nome={u.nome}
                        caminho={u.avatar_url}
                        privado={privado}
                        className="h-8 w-8"
                      />
                      {estaOnline(presencas[u.id]) && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
                      )}
                    </span>
                    <span className="truncate text-[13px] text-foreground">{u.nome}</span>
                  </button>
                ))}
              </>
            )}

            {!isLoading && listadas.length === 0 && novosContatos.length === 0 && (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                Nenhuma conversa ou usuário encontrado.
              </p>
            )}
          </div>
        </aside>

        {/* Conversa */}
        <section className={`min-h-0 ${atual ? "block" : "hidden md:block"}`}>
          {atual ? (
            <JanelaConversa
              key={atual.conversa.id}
              resumo={atual}
              onVoltar={() => setSelecionada(null)}
              onSaiu={() => setSelecionada(null)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <Users className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-semibold text-foreground">Selecione uma conversa</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Escolha um usuário ou grupo na lista ao lado para começar a conversar em tempo real.
              </p>
            </div>
          )}
        </section>
      </div>

      <DialogoNovoGrupo
        aberto={novoGrupo}
        onOpenChange={setNovoGrupo}
        onCriado={(id) => setSelecionada(id)}
      />
    </div>
  );
}