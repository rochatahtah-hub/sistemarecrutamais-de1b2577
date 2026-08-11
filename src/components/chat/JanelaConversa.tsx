import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  CornerUpLeft,
  Info,
  Loader2,
  LogOut,
  Mic,
  Paperclip,
  Send,
  SmilePlus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AvatarUsuario } from "@/components/AvatarUsuario";
import { AnexoMensagem } from "@/components/chat/AnexoMensagem";
import { AvatarConversa } from "@/components/chat/AvatarConversa";
import { DialogoGerenciarGrupo } from "@/components/chat/DialogoGerenciarGrupo";
import { SeletorEmoji } from "@/components/chat/SeletorEmoji";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useGravadorAudio } from "@/lib/gravacao-audio";
import { usePrivacidade } from "@/lib/privacidade";
import {
  diaLegivel,
  estaOnline,
  formatarDuracao,
  horaCurta,
  textoPresenca,
  useEnviarMensagem,
  useExcluirMensagem,
  useMapaUsuarios,
  useMarcarLida,
  useMensagens,
  usePresencas,
  resumoMensagem,
  useReacoes,
  useReagir,
  useSairDaConversa,
  type Mensagem,
  type ResumoConversa,
} from "@/lib/chat";

const REACOES = ["👍", "❤️", "😂", "😮", "😢", "🙏", "✅"];
const LIMITE_ARQUIVO = 15 * 1024 * 1024;

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
  const { data: reacoes = [] } = useReacoes(resumo.conversa.id);
  const enviar = useEnviarMensagem();
  const excluir = useExcluirMensagem();
  const marcarLida = useMarcarLida();
  const reagir = useReagir();
  const sair = useSairDaConversa();
  const gravador = useGravadorAudio();

  const [texto, setTexto] = useState("");
  const [respondendo, setRespondendo] = useState<Mensagem | null>(null);
  const [infoAberta, setInfoAberta] = useState(false);
  const [destacada, setDestacada] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const inputImagem = useRef<HTMLInputElement>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);
  const baloes = useRef(new Map<string, HTMLDivElement>());

  const porId = useMemo(() => new Map(mensagens.map((m) => [m.id, m])), [mensagens]);

  const reacoesPorMensagem = useMemo(() => {
    const mapa = new Map<string, { emoji: string; nomes: string[]; meu: boolean }[]>();
    for (const r of reacoes) {
      const lista = mapa.get(r.mensagem_id) ?? [];
      const existente = lista.find((i) => i.emoji === r.emoji);
      const nome =
        r.user_id === user?.id ? "Você" : (usuarios.get(r.user_id)?.nome ?? "Usuário");
      if (existente) {
        existente.nomes.push(nome);
        existente.meu = existente.meu || r.user_id === user?.id;
      } else {
        lista.push({ emoji: r.emoji, nomes: [nome], meu: r.user_id === user?.id });
      }
      mapa.set(r.mensagem_id, lista);
    }
    return mapa;
  }, [reacoes, usuarios, user]);

  const minhaReacao = (mensagemId: string) =>
    reacoes.find((r) => r.mensagem_id === mensagemId && r.user_id === user?.id)?.emoji ?? null;

  // Menor horário de leitura dos outros participantes (status de leitura).
  const lidoPorTodos = useMemo(() => {
    const outros = resumo.participantes.filter((p) => p.user_id !== user?.id);
    if (outros.length === 0) return 0;
    return Math.min(...outros.map((p) => new Date(p.last_read_at).getTime()));
  }, [resumo.participantes, user]);

  // Abrir a conversa marca as mensagens como lidas.
  useEffect(() => {
    marcarLida.mutate(resumo.conversa.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumo.conversa.id, mensagens.length]);

  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [mensagens.length, resumo.conversa.id]);

  const presencaOutro = resumo.outro ? presencas[resumo.outro.id] : undefined;

  function irParaOriginal(id: string) {
    const alvo = baloes.current.get(id);
    if (!alvo) return;
    alvo.scrollIntoView({ behavior: "smooth", block: "center" });
    setDestacada(id);
    window.setTimeout(() => setDestacada(null), 1600);
  }

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

  function enviarArquivo(arquivo: File, tipo: "imagem" | "arquivo") {
    if (arquivo.size > LIMITE_ARQUIVO) {
      toast.error("O arquivo excede o limite de 15 MB.");
      return;
    }
    enviar.mutate(
      {
        conversaId: resumo.conversa.id,
        conteudo: "",
        tipo,
        arquivo,
        nomeArquivo: arquivo.name,
        respondeA: respondendo?.id ?? null,
      },
      {
        onSuccess: () => setRespondendo(null),
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  async function iniciarGravacao() {
    try {
      await gravador.iniciar();
    } catch {
      toast.error("Não foi possível acessar o microfone. Verifique a permissão do navegador.");
    }
  }

  async function finalizarGravacao() {
    const audio = await gravador.parar();
    if (!audio || audio.blob.size === 0) return;
    enviar.mutate(
      {
        conversaId: resumo.conversa.id,
        conteudo: "",
        tipo: "audio",
        arquivo: audio.blob,
        nomeArquivo: `audio-${Date.now()}.${audio.blob.type.includes("mp4") ? "m4a" : "webm"}`,
        duracaoMs: audio.duracaoMs,
        respondeA: respondendo?.id ?? null,
      },
      {
        onSuccess: () => setRespondendo(null),
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  function inserirEmoji(emoji: string) {
    setTexto((t) => t + emoji);
    campo.current?.focus();
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
        {resumo.conversa.tipo === "grupo" && (
          <Button
            variant="ghost"
            size="icon"
            title="Informações do grupo"
            onClick={() => setInfoAberta(true)}
          >
            <Info className="h-4 w-4" />
          </Button>
        )}
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-4">
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
          const lista = reacoesPorMensagem.get(m.id) ?? [];
          const lida = meu && new Date(m.created_at).getTime() <= lidoPorTodos;
          return (
            <div key={m.id}>
              {mostrarDia && (
                <p className="my-3 text-center text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {dia}
                </p>
              )}
              <div
                ref={(el) => {
                  if (el) baloes.current.set(m.id, el);
                  else baloes.current.delete(m.id);
                }}
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
                <div className="max-w-[82%]">
                  <div
                    className={`rounded-2xl border px-3 py-2 text-sm transition-shadow ${
                      meu
                        ? "rounded-br-sm border-gold/25 bg-primary text-primary-foreground"
                        : "rounded-bl-sm border-border bg-card text-foreground"
                    } ${destacada === m.id ? "ring-2 ring-gold" : ""}`}
                  >
                    {!meu && resumo.conversa.tipo === "grupo" && (
                      <p className="mb-0.5 text-[11px] font-semibold text-gold">
                        {autor?.nome ?? "Usuário"}
                      </p>
                    )}
                    {original && (
                      <button
                        type="button"
                        onClick={() => irParaOriginal(original.id)}
                        className={`mb-1 block w-full border-l-2 pl-2 text-left text-[11px] leading-snug ${
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
                          {original.excluida ? "Mensagem excluída" : resumoMensagem(original)}
                        </span>
                      </button>
                    )}
                    {!m.excluida && m.tipo !== "texto" && m.anexo_path && (
                      <div className="mb-1">
                        <AnexoMensagem mensagem={m} meu={meu} />
                      </div>
                    )}
                    {(m.excluida || m.conteudo) && (
                      <p
                        className={`whitespace-pre-wrap break-words ${m.excluida ? "italic opacity-70" : ""}`}
                      >
                        {m.excluida ? "Mensagem excluída" : m.conteudo}
                      </p>
                    )}
                    <p
                      className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${meu ? "text-primary-foreground/65" : "text-muted-foreground"}`}
                    >
                      {horaCurta(m.created_at)}
                      {meu &&
                        !m.excluida &&
                        (lida ? (
                          <CheckCheck className="h-3 w-3 text-gold" aria-label="Lida" />
                        ) : (
                          <Check className="h-3 w-3" aria-label="Enviada" />
                        ))}
                    </p>
                  </div>
                  {lista.length > 0 && (
                    <div className={`mt-1 flex flex-wrap gap-1 ${meu ? "justify-end" : ""}`}>
                      {lista.map((r) => (
                        <button
                          key={r.emoji}
                          type="button"
                          title={r.nomes.join(", ")}
                          onClick={() =>
                            reagir.mutate({
                              mensagemId: m.id,
                              conversaId: resumo.conversa.id,
                              emoji: r.emoji,
                              atual: minhaReacao(m.id),
                            })
                          }
                          className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors ${
                            r.meu
                              ? "border-gold/60 bg-gold/15 text-foreground"
                              : "border-border bg-card text-muted-foreground hover:bg-accent/60"
                          }`}
                        >
                          <span>{r.emoji}</span>
                          <span>{r.nomes.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {!m.excluida && (
                  <div className="flex shrink-0 flex-col opacity-60 transition-opacity group-hover:opacity-100">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Reagir">
                          <SmilePlus className="h-3.5 w-3.5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align={meu ? "end" : "start"} className="w-auto p-1">
                        <div className="flex gap-0.5">
                          {REACOES.map((e) => (
                            <button
                              key={e}
                              type="button"
                              onClick={() =>
                                reagir.mutate({
                                  mensagemId: m.id,
                                  conversaId: resumo.conversa.id,
                                  emoji: e,
                                  atual: minhaReacao(m.id),
                                })
                              }
                              className="rounded-md p-1 text-lg leading-none transition-colors hover:bg-accent"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
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

      <div className="sticky bottom-0 border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {respondendo && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border-l-2 border-gold bg-muted/40 px-3 py-2 text-xs">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gold">
                Respondendo{" "}
                {respondendo.autor_id === user?.id
                  ? "você mesmo"
                  : (usuarios.get(respondendo.autor_id ?? "")?.nome ?? "usuário")}
              </p>
              <p className="truncate text-muted-foreground">{resumoMensagem(respondendo)}</p>
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

        {enviar.isPending && (
          <p className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" /> Enviando...
          </p>
        )}

        {gravador.gravando ? (
          <div className="flex items-center gap-2 rounded-xl border border-gold/40 bg-muted/40 px-3 py-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
            <span className="flex-1 text-xs font-semibold text-foreground">
              Gravando áudio · {formatarDuracao(gravador.segundos * 1000)}
            </span>
            <Button variant="ghost" size="sm" onClick={() => gravador.cancelar()}>
              Cancelar
            </Button>
            <Button size="sm" onClick={() => void finalizarGravacao()}>
              <Send className="mr-1.5 h-3.5 w-3.5" /> Enviar
            </Button>
          </div>
        ) : (
          <div className="flex items-end gap-1.5">
            <SeletorEmoji onSelecionar={inserirEmoji} />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 text-muted-foreground"
                  aria-label="Anexar"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-48 p-1">
                <button
                  type="button"
                  className="w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                  onClick={() => inputImagem.current?.click()}
                >
                  Enviar imagem
                </button>
                <button
                  type="button"
                  className="w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                  onClick={() => inputArquivo.current?.click()}
                >
                  Enviar arquivo
                </button>
              </PopoverContent>
            </Popover>
            <input
              ref={inputImagem}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) enviarArquivo(f, "imagem");
                e.target.value = "";
              }}
            />
            <input
              ref={inputArquivo}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) enviarArquivo(f, "arquivo");
                e.target.value = "";
              }}
            />
            <Textarea
              ref={campo}
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
            {texto.trim() ? (
              <Button
                size="icon"
                className="h-[42px] w-[42px] shrink-0"
                disabled={enviar.isPending}
                onClick={submeter}
                aria-label="Enviar mensagem"
              >
                <Send className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="h-[42px] w-[42px] shrink-0"
                disabled={enviar.isPending}
                onClick={() => void iniciarGravacao()}
                aria-label="Gravar áudio"
              >
                <Mic className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
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
