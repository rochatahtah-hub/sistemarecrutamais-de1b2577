import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { consultarStatusContratacao } from "@/lib/comercial.functions";

export const Route = createFileRoute("/contratacao-status")({
  validateSearch: (s: Record<string, unknown>) => ({ pedido: typeof s["pedido"] === "string" ? s["pedido"] : "" }),
  head: () => ({ meta: [{ title: "Status da contratação | RECRUTA+" }, { name: "description", content: "Acompanhe a confirmação da contratação do RECRUTA+." }, { property: "og:title", content: "Status da contratação | RECRUTA+" }, { property: "og:description", content: "Confirmação segura da contratação." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: PaginaStatus,
});
function PaginaStatus() {
  const { pedido } = Route.useSearch();
  const { data, isPending } = useQuery({ queryKey: ["status-contratacao", pedido], queryFn: () => consultarStatusContratacao({ data: { pedidoId: pedido } }), enabled: !!pedido, refetchInterval: 5000 });
  const aprovado = data?.status === "aprovado"; const falhou = ["recusado", "cancelado", "estornado", "nao_encontrado"].includes(data?.status ?? "");
  const Icone = aprovado ? CheckCircle2 : falhou ? XCircle : Clock3;
  return <main className="grid min-h-screen place-items-center bg-background px-4"><div className="max-w-lg text-center"><Icone className={`mx-auto h-12 w-12 ${aprovado ? "text-success" : falhou ? "text-destructive" : "text-gold"}`} /><h1 className="mt-5 text-3xl">{isPending ? "Consultando pagamento" : aprovado ? "Pagamento confirmado" : falhou ? "Pagamento não concluído" : "Aguardando confirmação"}</h1><p className="mt-3 text-muted-foreground">{aprovado ? "Sua empresa foi criada. Enviamos ao e-mail cadastrado um link seguro para definir a senha e acessar a plataforma." : falhou ? "Você pode voltar aos planos e iniciar novamente quando desejar." : "A confirmação é feita diretamente pelo Mercado Pago. Esta página será atualizada automaticamente."}</p>{aprovado ? <Button asChild className="mt-7"><Link to="/acesso">Ir para o acesso</Link></Button> : <Button asChild className="mt-7" variant="outline"><Link to="/leads">Voltar aos planos</Link></Button>}</div></main>;
}