import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CornerUpLeft, Info, LogOut, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { AvatarUsuario } from "@/components/AvatarUsuario";
import { AvatarConversa } from "@/components/chat/AvatarConversa";
import { DialogoGerenciarGrupo } from "@/components/chat/DialogoGerenciarGrupo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { usePrivacidade } from "@/lib/privacidade";
import {
  diaLegivel,
  estaOnline,
  horaCurta,
  textoPresenca,
  useEnviarMensagem,
  useExcluirMensagem,
  useMapaUsuarios,
  useMarcarLida,
  useMensagens,
  usePresencas,
  useSairDaConversa,
  type Mensagem,
  type ResumoConversa,
} from "@/lib/chat";

interface Props {
  resumo: ResumoConversa;
  onVoltar: () => void;
  onSaiu: () => void;
}

/** Painel de mensagens da conversa selecionada. */
export function JanelaConversa({ resumo, onVoltar, onSaiu }: Props) {
  const { user } = useAuth();
  const { privado } = usePrivacidade();
  const usuarios = useMapaUsuarios();
  const { data: presencas = {} } = usePresencas();
  const { data: mensagens = [], isLoading } = useMensagens(resumo.conversa.id);
  const enviar = useEnviarMensagem();
  const excluir = useExcluirMensagem();
  const marcarLida = useMarcarLida();
  const sair = useSairDaConversa();

  const [texto, setTexto] = useState("");
  const [respondendo, setRespondendo] = useState<Mensagem | null>(null);
  const [infoAberta, setInfoAberta] = useState(false);
  const fim = useRef<HTMLDivElement>(null);

  const porId = useMemo(() => new Map(mensagens.map((m) => [m.id, m])), [mensagens]);

  // Abrir a conversa marca as mensagens como lidas.
  useEffect(() => {
    marcarLida.mutate(resumo.conversa.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumo.conversa.id, mensagens.length]);

  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [mensagens.length, resumo.conversa.id]);

  const presencaOutro = resumo.outro ? presencas[resumo.outro.id] : undefined;

  function submeter() {
    const conteudo = texto.trim();
    if (!conteudo) return;
    enviar.mutate(
      { conversaId: resumo.conversa.id, conteudo, respondeA: respondendo?.id ?? null },
      {
        onSuccess: () => {
          setTexto("");
          setRespondendo(null);
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  let ultimoDia = "";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-border px-3 py-2.5">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onVoltar}
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <AvatarConversa resumo={resumo} privado={privado} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{resumo.titulo}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {resumo.conversa.tipo === "grupo" ? (
              `${resumo.participantes.length} participante(s)`
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${estaOnline(presencaOutro) ? "bg-emerald-500" : "bg-muted-foreground/50"}`}
                />
                {textoPresenca(presencaOutro)}
              </span>
            )}
          </p>
        </div>
        {resumo.conversa.tipo === "grupo" ? (
          <Button
            variant="ghost"
            size="icon"
            title="Informações do grupo"
            onClick={() => setInfoAberta(true)}
          >
            <Info className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            title="Sair da conversa (chat temporário)"
            onClick={() =>
              sair.mutate(resumo.conversa.id, {
                onSuccess: () => {
                  toast.success("Você saiu da conversa.");
                  onSaiu();
                },
              })
            }
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {isLoading && <p className="text-center text-xs text-muted-foreground">Carregando...</p>}
        {!isLoading && mensagens.length === 0 && (
          <p className="py-10 text-center text-xs text-muted-foreground">
            Nenhuma mensagem ainda. Diga olá!
          </p>
        )}
        {mensagens.map((m) => {
          const meu = m.autor_id === user?.id;
          const autor = m.autor_id ? usuarios.get(m.autor_id) : undefined;
          const original = m.responde_a ? porId.get(m.responde_a) : null;
          const dia = diaLegivel(m.created_at);
          const mostrarDia = dia !== ultimoDia;
          ultimoDia = dia;
          return (
            <div key={m.id}>
              {mostrarDia && (
                <p className="my-3 text-center text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {dia}
                </p>
              )}
              <div
                className={`group flex items-end gap-2 ${meu ? "justify-end" : "justify-start"}`}
              >
                {!meu && (
                  <AvatarUsuario
                    nome={autor?.nome}
                    caminho={autor?.avatar_url}
                    privado={privado}
                    className="h-7 w-7 text-[9px]"
                  />
                )}
                <div
                  className={`max-w-[78%] rounded-2xl border px-3 py-2 text-sm ${
                    meu
                      ? "rounded-br-sm border-gold/25 bg-primary text-primary-foreground"
                      : "rounded-bl-sm border-border bg-card text-foreground"
                  }`}
                >
                  {!meu && resumo.conversa.tipo === "grupo" && (
                    <p className="mb-0.5 text-[11px] font-semibold text-gold">
                      {autor?.nome ?? "Usuário"}
                    </p>
                  )}
                  {original && (
                    <div
                      className={`mb-1 border-l-2 pl-2 text-[11px] leading-snug ${
                        meu
                          ? "border-gold/60 text-primary-foreground/75"
                          : "border-gold/60 text-muted-foreground"
                      }`}
                    >
                      <span className="block font-semibold">
                        {original.autor_id === user?.id
                          ? "Você"
                          : (usuarios.get(original.autor_id ?? "")?.nome ?? "Usuário")}
                      </span>
                      <span className="line-clamp-2">
                        {original.excluida ? "Mensagem excluída" : original.conteudo}
                      </span>
                    </div>
                  )}
                  <p
                    className={`whitespace-pre-wrap break-words ${m.excluida ? "italic opacity-70" : ""}`}
                  >
                    {m.excluida ? "Mensagem excluída" : m.conteudo}
                  </p>
                  <p
                    className={`mt-1 text-right text-[10px] ${meu ? "text-primary-foreground/65" : "text-muted-foreground"}`}
                  >
                    {horaCurta(m.created_at)}
                  </p>
                </div>
                {!m.excluida && (
                  <div className="flex shrink-0 flex-col opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      title="Responder"
                      onClick={() => setRespondendo(m)}
                    >
                      <CornerUpLeft className="h-3.5 w-3.5" />
                    </Button>
                    {(meu || resumo.souAdmin) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        title="Excluir mensagem"
                        onClick={() => excluir.mutate({ id: m.id, conversaId: resumo.conversa.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={fim} />
      </div>

      <div className="border-t border-border p-3">
        {respondendo && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border-l-2 border-gold bg-muted/40 px-3 py-2 text-xs">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gold">
                Respondendo{" "}
                {respondendo.autor_id === user?.id
                  ? "você mesmo"
                  : (usuarios.get(respondendo.autor_id ?? "")?.nome ?? "usuário")}
              </p>
              <p className="truncate text-muted-foreground">{respondendo.conteudo}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setRespondendo(null)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            rows={1}
            value={texto}
            placeholder="Escreva uma mensagem..."
            className="max-h-32 min-h-[42px] resize-none"
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submeter();
              }
            }}
          />
          <Button
            size="icon"
            className="h-[42px] w-[42px] shrink-0"
            disabled={enviar.isPending || !texto.trim()}
            onClick={submeter}
            aria-label="Enviar mensagem"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {resumo.conversa.tipo === "grupo" && (
        <DialogoGerenciarGrupo
          resumo={resumo}
          aberto={infoAberta}
          onOpenChange={setInfoAberta}
          onSaiu={onSaiu}
        />
      )}
    </div>
  );
}
