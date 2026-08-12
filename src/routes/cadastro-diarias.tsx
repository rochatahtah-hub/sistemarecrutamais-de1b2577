import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, HandHeart, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import logoLockup from "@/assets/recruta-lockup.png.asset.json";
import {
  DIAS_SEMANA,
  PERIODOS,
  cadastrarColaboradorPublico,
  cpfValido,
  formatarCpf,
  formatarTelefone,
  soDigitosTelefone,
} from "@/lib/diarias";

export const Route = createFileRoute("/cadastro-diarias")({
  head: () => ({
    meta: [
      { title: "Cadastro de Diárias | Recruta+" },
      {
        name: "description",
        content:
          "Cadastre-se gratuitamente no banco de colaboradores do Recruta+ e receba oportunidades de trabalho por diária na sua região.",
      },
      { property: "og:title", content: "Cadastro de Diárias | Recruta+" },
      {
        property: "og:description",
        content: "Preencha seus dados e entre no banco de colaboradores para oportunidades de diária.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pagina,
});

function alternar(lista: string[], valor: string) {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

function Pagina() {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const [disponivel, setDisponivel] = useState(true);
  const [dias, setDias] = useState<string[]>([]);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [funcao, setFuncao] = useState("");
  const [consentimento, setConsentimento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  const valido =
    nome.trim().length >= 3 &&
    soDigitosTelefone(telefone).length >= 10 &&
    cpfValido(cpf) &&
    cidade.trim().length >= 2 &&
    bairro.trim().length >= 2 &&
    consentimento;

  async function enviar() {
    if (!valido || enviando) return;
    setEnviando(true);
    try {
      await cadastrarColaboradorPublico({
        full_name: nome.trim().slice(0, 120),
        phone: telefone,
        cpf,
        city: cidade.trim().slice(0, 80),
        neighborhood: bairro.trim().slice(0, 80),
        available_for_daily: disponivel,
        available_days: dias,
        available_periods: periodos,
        desired_role: funcao.trim().slice(0, 120),
      });
      setConcluido(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível concluir o cadastro.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="malha-escura min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 flex justify-center">
          <img src={logoLockup.url} alt="Recruta+" className="h-12 w-auto object-contain" />
        </div>

        {concluido ? (
          <Card>
            <CardHeader className="items-center text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl border border-gold/25 bg-gold-soft text-accent-foreground">
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <CardTitle>Cadastro realizado com sucesso!</CardTitle>
              <CardDescription>
                Seus dados foram registrados no banco de colaboradores do Recruta+. Quando surgir uma
                oportunidade compatível com sua disponibilidade, nossa equipe poderá entrar em contato.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-gold/25 bg-gold-soft text-accent-foreground">
                <HandHeart className="h-5 w-5" />
              </span>
              <CardTitle>Quero trabalhar por diária</CardTitle>
              <CardDescription>
                Preencha o formulário abaixo para entrar no banco de colaboradores. É gratuito e leva
                menos de dois minutos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nome">Nome completo *</Label>
                  <Input id="nome" value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tel">Telefone / WhatsApp *</Label>
                  <Input
                    id="tel"
                    inputMode="tel"
                    value={formatarTelefone(telefone)}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    inputMode="numeric"
                    value={formatarCpf(cpf)}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                  {cpf.length > 0 && !cpfValido(cpf) && (
                    <p className="text-xs text-destructive">Informe um CPF válido.</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cidade">Cidade *</Label>
                  <Input id="cidade" value={cidade} maxLength={80} onChange={(e) => setCidade(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bairro">Bairro *</Label>
                  <Input id="bairro" value={bairro} maxLength={80} onChange={(e) => setBairro(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/70 px-3.5 py-3">
                <div>
                  <p className="text-sm font-medium">Tenho disponibilidade para diárias</p>
                  <p className="text-xs text-muted-foreground">Você pode alterar isso a qualquer momento com a equipe.</p>
                </div>
                <Switch checked={disponivel} onCheckedChange={setDisponivel} />
              </div>

              <div className="space-y-2">
                <Label>Dias disponíveis</Label>
                <div className="flex flex-wrap gap-2">
                  {DIAS_SEMANA.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDias((a) => alternar(a, d))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${dias.includes(d) ? "border-gold/50 bg-gold-soft text-accent-foreground" : "border-border/70 text-muted-foreground hover:bg-accent"}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Períodos disponíveis</Label>
                <div className="flex flex-wrap gap-2">
                  {PERIODOS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPeriodos((a) => alternar(a, p))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${periodos.includes(p) ? "border-gold/50 bg-gold-soft text-accent-foreground" : "border-border/70 text-muted-foreground hover:bg-accent"}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="funcao">Função de interesse</Label>
                <Input
                  id="funcao"
                  value={funcao}
                  maxLength={120}
                  onChange={(e) => setFuncao(e.target.value)}
                  placeholder="Ex.: auxiliar de produção, repositor, garçom"
                />
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={() => setConsentimento((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setConsentimento((v) => !v);
                  }
                }}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 px-3.5 py-3 text-left text-sm"
              >
                <Checkbox
                  checked={consentimento}
                  tabIndex={-1}
                  className="pointer-events-none mt-0.5"
                />
                <span className="text-muted-foreground">
                  Li e concordo com o uso dos meus dados para cadastro e contato referente a oportunidades
                  de trabalho/diárias. *
                </span>
              </div>

              <Button className="w-full" disabled={!valido || enviando} onClick={enviar}>
                {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar cadastro
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}