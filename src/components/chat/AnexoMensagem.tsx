import { useState } from "react";
import { Download, FileText, ImageOff } from "lucide-react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatarDuracao, formatarTamanho, useFotoChat, type Mensagem } from "@/lib/chat";

interface Props {
  mensagem: Mensagem;
  meu: boolean;
}

/** Renderiza imagem, arquivo ou áudio de uma mensagem, com URL assinada temporária. */
export function AnexoMensagem({ mensagem, meu }: Props) {
  const url = useFotoChat(mensagem.anexo_path || null);
  const [aberta, setAberta] = useState(false);

  if (mensagem.tipo === "imagem") {
    return (
      <>
        <button
          type="button"
          onClick={() => url && setAberta(true)}
          className="block overflow-hidden rounded-lg border border-border/50 bg-muted/40"
        >
          {url ? (
            <img
              src={url}
              alt={mensagem.anexo_nome || "Imagem enviada no chat"}
              loading="lazy"
              className="max-h-64 w-full max-w-[260px] object-cover"
            />
          ) : (
            <span className="flex h-32 w-[220px] items-center justify-center text-muted-foreground">
              <ImageOff className="h-5 w-5 animate-pulse" />
            </span>
          )}
        </button>
        <Dialog open={aberta} onOpenChange={setAberta}>
          <DialogContent className="max-w-3xl border-border bg-card p-2">
            {url && (
              <img
                src={url}
                alt={mensagem.anexo_nome || "Imagem ampliada"}
                className="max-h-[80vh] w-full rounded-md object-contain"
              />
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (mensagem.tipo === "audio") {
    return (
      <div className="flex min-w-[210px] flex-col gap-1">
        {url ? (
          <audio controls preload="metadata" src={url} className="h-9 w-full max-w-[240px]" />
        ) : (
          <span className="text-[11px] opacity-70">Carregando áudio...</span>
        )}
        {mensagem.duracao_ms > 0 && (
          <span className={`text-[10px] ${meu ? "opacity-70" : "text-muted-foreground"}`}>
            {formatarDuracao(mensagem.duracao_ms)}
          </span>
        )}
      </div>
    );
  }

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noreferrer"
      download={mensagem.anexo_nome}
      className={`flex max-w-[260px] items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
        meu
          ? "border-primary-foreground/25 hover:bg-primary-foreground/10"
          : "border-border hover:bg-accent/60"
      }`}
    >
      <FileText className="h-5 w-5 shrink-0 text-gold" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold">
          {mensagem.anexo_nome || "Arquivo"}
        </span>
        <span className={`block text-[10px] ${meu ? "opacity-70" : "text-muted-foreground"}`}>
          {[mensagem.anexo_mime.split("/").pop()?.toUpperCase(), formatarTamanho(mensagem.anexo_tamanho)]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <Download className="h-4 w-4 shrink-0 opacity-70" />
    </a>
  );
}