import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { linkWhatsApp } from "@/lib/whatsapp";

/** Ícone discreto ao lado do telefone que abre o WhatsApp do número cadastrado. */
export function BotaoWhatsApp({ telefone, nome }: { telefone: string | null | undefined; nome?: string }) {
  const link = linkWhatsApp(telefone);
  if (!link) return null;
  return (
    <Button
      asChild
      size="icon"
      variant="ghost"
      className="h-8 w-8 shrink-0 text-emerald-500 hover:text-emerald-400"
      title={nome ? `Abrir WhatsApp de ${nome}` : "Abrir WhatsApp"}
    >
      <a href={link} target="_blank" rel="noreferrer" aria-label={nome ? `Abrir WhatsApp de ${nome}` : "Abrir WhatsApp"}>
        <MessageCircle className="h-4 w-4" />
      </a>
    </Button>
  );
}
