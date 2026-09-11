import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, QrCode, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { iniciarContratacao, listarPlanosPublicos } from "@/lib/comercial.functions";

export const Route = createFileRoute("/contratar")({
  validateSearch: (search: Record<string, unknown>) => ({ plano: typeof search.plano === "string" ? search.plano : "" }),
  head: () => ({ meta: [
    { title: "Contratar RECRUTA+ | Nova empresa" },
    { name: "description", content: "Escolha um plano e inicie com segurança a contratação do RECRUTA+ para sua empresa." },
    { property: "og:title", content: "Contratar RECRUTA+" },
    { property: "og:description", content: "Contratação segura para novas empresas." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ]}),
  component: PaginaContratar,
});

function PaginaContratar() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const iniciar = useServerFn(iniciarContratacao);
  const { data: planos = [], isPending } = useQuery({ queryKey: ["planos-publicos"], queryFn: () => listarPlanosPublicos() });
  const [planoId, setPlanoId] = useState(search.plano);
  const [empresaNome, setEmpresaNome] = useState(""); const [responsavelNome, setResponsavelNome] = useState("");
  const [email, setEmail] = useState(""); const [telefone, setTelefone] = useState(""); const [cnpj, setCnpj] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<"pix" | "cartao">("pix"); const [enviando, setEnviando] = useState(false);
  const plano = useMemo(() => planos.find((p) => p.id === planoId), [planos, planoId]);
  async function enviar(e: React.FormEvent) {
    e.preventDefault(); setEnviando(true);
    try {
      const resultado = await iniciar({ data: { planoId, empresaNome, responsavelNome, email, telefone, cnpj, formaPagamento, origem: "pagina_publica" } });
      window.location.assign(resultado.checkoutUrl);
    } catch (erro) { toast.error(erro instanceof Error ? erro.message : "Não foi possível iniciar a contratação."); }
    finally { setEnviando(false); }
  }
  return <div className="min-h-screen bg-background px-4 py-8 sm:py-14"><main className="mx-auto max-w-2xl">
    <Button asChild variant="ghost" size="sm"><Link to="/leads">← Voltar aos planos</Link></Button>
    <div className="mt-5 border-b border-border pb-6"><p className="rotulo-secao">Nova empresa</p><h1 className="mt-2 text-3xl">Contrate o RECRUTA+</h1><p className="mt-2 text-sm text-muted-foreground">O cadastro da empresa será liberado somente após a confirmação segura do pagamento.</p></div>
    <form onSubmit={enviar} className="mt-8 space-y-7">
      <section className="space-y-4"><h2 className="text-lg">Plano</h2><Select value={planoId} onValueChange={setPlanoId}><SelectTrigger><SelectValue placeholder={isPending ? "Carregando..." : "Selecione um plano"} /></SelectTrigger><SelectContent>{planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome} — {(p.preco_mensal_centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês</SelectItem>)}</SelectContent></Select>{plano && <p className="text-sm text-muted-foreground">{plano.descricao}</p>}</section>
      <section className="grid gap-4 sm:grid-cols-2"><h2 className="sm:col-span-2 text-lg">Empresa e responsável</h2><div className="space-y-1.5 sm:col-span-2"><Label htmlFor="empresa">Nome da empresa</Label><Input id="empresa" required value={empresaNome} onChange={(e) => setEmpresaNome(e.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="responsavel">Nome do responsável</Label><Input id="responsavel" required value={responsavelNome} onChange={(e) => setResponsavelNome(e.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="cnpj">CNPJ (opcional)</Label><Input id="cnpj" inputMode="numeric" value={cnpj} onChange={(e) => setCnpj(e.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="telefone">WhatsApp</Label><Input id="telefone" inputMode="tel" required value={telefone} onChange={(e) => setTelefone(e.target.value)} /></div></section>
      <section><h2 className="mb-3 text-lg">Pagamento mensal</h2><div className="grid grid-cols-2 gap-3">{(["pix", "cartao"] as const).map((forma) => <button key={forma} type="button" onClick={() => setFormaPagamento(forma)} className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors ${formaPagamento === forma ? "border-gold bg-gold-soft text-foreground" : "border-border bg-card text-muted-foreground"}`}>{forma === "pix" ? <QrCode /> : <CreditCard />}{forma === "pix" ? "PIX" : "Cartão"}</button>)}</div><p className="mt-3 flex gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0" />O pagamento é processado pelo Mercado Pago. O RECRUTA+ não armazena dados do cartão.</p></section>
      <Button className="w-full" size="lg" type="submit" disabled={enviando || !planoId}>{enviando ? "Preparando pagamento..." : "Ir para pagamento seguro"}</Button>
    </form>
  </main></div>;
}