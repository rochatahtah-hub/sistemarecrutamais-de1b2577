import { Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CompartilharVaga({ link, titulo }: { link: string; titulo: string }) {
  return <div className="flex flex-wrap gap-2">
    <Button size="sm" variant="outline" onClick={async () => {
      try { await navigator.clipboard.writeText(link); toast.success("Link copiado."); }
      catch { toast.error("Não foi possível copiar o link. Tente novamente."); }
    }}><Copy className="mr-2 h-4 w-4" />Copiar link</Button>
    <Button size="sm" variant="outline" asChild>
      <a href={`https://wa.me/?text=${encodeURIComponent(`${titulo}\n${link}`)}`} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="mr-2 h-4 w-4" />WhatsApp
      </a>
    </Button>
  </div>;
}