import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronDown, Lock, UserCog } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { CampoSenha } from "@/components/CampoSenha";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { entrarComPin, pinDefinido } from "@/lib/pin.functions";
import logoLockup from "@/assets/recruta-lockup.png.asset.json";
import logoMarca from "@/assets/recruta-mark.png.asset.json";
import { RecruitaNetworkAnimation, type RecruitaAnimationState } from "@/components/RecruitaNetworkAnimation";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | RECRUTA+" },
      {
        name: "description",
        content: "Acesse o RECRUTA+ — gestão inteligente de recrutamento e seleção.",
      },
      { property: "og:title", content: "Entrar | RECRUTA+" },
      {
        property: "og:description",
        content: "Acesse o RECRUTA+ — gestão inteligente de recrutamento e seleção.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "/auth" }],
  }),
  component: Pagina,
});

function Pagina() {
  const navigate = useNavigate();
  const { session, carregando } = useAuth();
  const acessoAdmin = useServerFn(entrarComPin);
  const consultarPin = useServerFn(pinDefinido);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [acessoAberto, setAcessoAberto] = useState(false);
  const [abrirPin, setAbrirPin] = useState(false);
  const [pin, setPin] = useState("");
  const [jaTemPin, setJaTemPin] = useState(true);
  const [erroPin, setErroPin] = useState("");
  const [recuperando, setRecuperando] = useState(false);
  const [campoAtivo, setCampoAtivo] = useState<"email" | "senha" | null>(null);

  const estadoAnimacao: RecruitaAnimationState = enviando
    ? "loading"
    : campoAtivo === "senha" || senha
      ? "password"
      : campoAtivo === "email" || email
        ? "people"
        : "idle";

  useEffect(() => {
    if (!carregando && session) void navigate({ to: "/", replace: true });
  }, [session, carregando, navigate]);

  async function abrirAcessoAdmin() {
    setPin("");
    setErroPin("");
    setAbrirPin(true);
    try {
      const r = await consultarPin({});
      setJaTemPin(r.definido);
    } catch {
      setJaTemPin(true);
    }
  }

  async function entrarComoAdmin() {
    if (enviando) return;
    setEnviando(true);
    setErroPin("");
    try {
      const tokens = await acessoAdmin({ data: { pin } });
      const { error } = await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
      if (error) throw error;
      toast.success(
        tokens.primeiroAcesso ? "PIN cadastrado e acesso liberado." : "Acesso administrativo liberado.",
      );
      setAbrirPin(false);
      setPin("");
      void navigate({ to: "/", replace: true });
    } catch (e) {
      const msg =
        e instanceof Error && e.message
          ? e.message
          : "Não foi possível acessar como administrador. Tente novamente.";
      setErroPin(msg);
      setPin("");
      toast.error(msg);
      try {
        const r = await consultarPin({});
        setJaTemPin(r.definido);
      } catch {
        /* mantém o estado atual do PIN */
      }
    } finally {
      setEnviando(false);
    }
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEnviando(false);
    if (error) {
      toast.error(
        error.message.includes("Invalid login")
          ? "E-mail ou senha incorretos."
          : `Não foi possível entrar: ${error.message}`,
      );
      return;
    }
    toast.success("Bem-vinda de volta!");
    void navigate({ to: "/", replace: true });
  }

  async function recuperarSenha() {
    const emailLimpo = email.trim();
    if (!emailLimpo) {
      toast.error("Informe seu e-mail para recuperar a senha.");
      return;
    }
    setRecuperando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setRecuperando(false);
    if (error) {
      toast.error(`Não foi possível enviar a recuperação: ${error.message}`);
      return;
    }
    toast.success("Enviamos um link seguro para redefinir sua senha.");
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      <aside className="malha-escura relative hidden overflow-hidden p-12 text-sidebar-foreground lg:block">
        <RecruitaNetworkAnimation state={estadoAnimacao} className="absolute inset-x-8 top-[14%] bottom-[12%]" />
        <div className="relative z-10 flex h-full flex-col justify-between">
        <img
          src={logoLockup.url}
          alt="RECRUTA+ — Gestão inteligente de recrutamento"
          className="h-14 w-auto select-none object-contain object-left"
        />
        <p className="text-xs text-sidebar-foreground/45">
            Ambiente privado · Acesso individual e monitorado
        </p>
        </div>
        {/* Posicionamento absoluto: centraliza o bloco de texto sem contar na altura da
            página (um `flex-1` normal aqui infla o grid da tela toda além da viewport). */}
        <div className="absolute inset-0 z-10 flex items-center p-12">
        <div className="max-w-md">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-sidebar-primary">
            Plataforma corporativa
          </p>
          <h2 className="text-[34px] font-semibold leading-[1.15] tracking-tight">
            Gestão inteligente de recrutamento e seleção.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-sidebar-foreground/65">
            Programações, confirmações, metas e indicadores da operação reunidos em uma única
            plataforma corporativa.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-sidebar-border pt-6 text-xs text-sidebar-foreground/60">
            <span>Programação diária</span>
            <span>Indicadores em tempo real</span>
            <span>Histórico auditável</span>
          </div>
        </div>
        </div>
      </aside>

      <main className="relative flex items-center justify-center overflow-hidden px-4 py-10 sm:px-8 max-lg:malha-escura max-lg:text-sidebar-foreground">
        <RecruitaNetworkAnimation tone="light" className="absolute inset-0 hidden lg:block" />
        {/* Marca d'água + linha dourada — só no celular; substitui a rede de cards nesta tela. */}
        <img
          src={logoMarca.url}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 select-none opacity-[0.06] lg:hidden"
        />
        <img
          src={logoMarca.url}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-14 -left-10 h-56 w-56 select-none opacity-[0.05] lg:hidden"
        />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full lg:hidden"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path
            className="recruta-network-path"
            d="M 70 4 C 40 14, 96 34, 60 46 C 30 56, 14 72, 42 88"
            pathLength="100"
          />
          <path
            className="recruta-network-signal recruta-network-signal-1"
            d="M 70 4 C 40 14, 96 34, 60 46 C 30 56, 14 72, 42 88"
            pathLength="100"
          />
        </svg>
        <div className="relative z-10 w-full max-w-md">
          <h1 className="sr-only">Entrar no RECRUTA+</h1>

          <div className="mb-8 flex flex-col items-center text-center">
            <div className="malha-escura flex w-full max-w-[320px] items-center justify-center rounded-2xl px-6 py-5 shadow-sm max-lg:auth-mobile-logo max-lg:shadow-none">
              <img
                src={logoLockup.url}
                alt="RECRUTA+ — Gestão inteligente de recrutamento"
                className="h-12 w-auto select-none object-contain sm:h-14"
              />
            </div>
            <p className="mt-4 text-sm font-medium tracking-wide text-muted-foreground max-lg:text-sidebar-foreground/70">
              Gestão inteligente de recrutamento.
            </p>
            {/* Destaque exclusivo do celular — mesma informação, apresentação premium. */}
            <div className="mt-8 w-full text-left lg:hidden">
              <p className="text-2xl font-semibold uppercase leading-tight tracking-[0.12em] text-sidebar-foreground">
                Grandes
                <br />
                Talentos
              </p>
              <p className="mt-1 text-2xl italic text-sidebar-primary">começam aqui.</p>
              <span className="mt-4 block h-px w-10 bg-sidebar-primary/70" />
            </div>
          </div>

          <div className="surface-panel filete-ouro entrada-suave rounded-2xl p-7 sm:p-8 max-lg:auth-mobile-panel">
            <button
              type="button"
              aria-expanded={acessoAberto}
              aria-controls="form-programador"
              onClick={() => setAcessoAberto((v) => !v)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-left transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-lg:auth-mobile-btn max-lg:hover:brightness-125"
            >
              <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                <Lock className="h-4 w-4 text-primary max-lg:text-sidebar-primary" />
                Acesso do programador
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform max-lg:text-sidebar-primary ${acessoAberto ? "rotate-180" : ""}`}
              />
            </button>

            {acessoAberto && (
            <form id="form-programador" className="mt-5 space-y-4" onSubmit={entrar}>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setCampoAtivo("email")}
                  onBlur={() => setCampoAtivo(null)}
                  className="recruta-auth-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="senha">Senha</Label>
                <CampoSenha
                  id="senha"
                  autoComplete="current-password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                   onFocus={() => setCampoAtivo("senha")}
                   onBlur={() => setCampoAtivo(null)}
                   className="recruta-auth-input"
                />
              </div>
              <Button type="submit" className="w-full" disabled={enviando}>
                {enviando ? "Entrando..." : "Entrar"}
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full"
                disabled={recuperando}
                onClick={() => void recuperarSenha()}
              >
                {recuperando ? "Enviando..." : "Esqueci minha senha"}
              </Button>
            </form>
            )}

            <button
              type="button"
              onClick={() => void abrirAcessoAdmin()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-lg:auth-mobile-btn max-lg:hover:brightness-125"
            >
              <span className="max-lg:hidden">🔐</span>
              <UserCog className="hidden h-4 w-4 max-lg:inline" />
              Administrador
            </button>
          </div>
        </div>
      </main>

      <Dialog open={abrirPin} onOpenChange={setAbrirPin}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>🔐 Acesso do administrador</DialogTitle>
            <DialogDescription>
              {jaTemPin
                ? "Informe o PIN administrativo."
                : "Nenhum PIN cadastrado. Por segurança, o PIN só pode ser definido por um administrador já autenticado, dentro do sistema, em Configurações › Cadastrar/Alterar PIN administrativo."}
            </DialogDescription>
          </DialogHeader>
          {jaTemPin ? (
          <div className="space-y-1.5">
            <Label htmlFor="pin">PIN</Label>
            <CampoSenha
              id="pin"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") void entrarComoAdmin();
              }}
            />
            {erroPin ? (
              <p role="alert" className="text-xs font-medium text-destructive">
                {erroPin}
              </p>
            ) : null}
          </div>
          ) : null}
          <DialogFooter>
            {jaTemPin ? (
            <Button
              type="button"
              className="w-full"
              disabled={enviando || pin.length < 4}
              onClick={() => void entrarComoAdmin()}
            >
              {enviando ? "Verificando..." : "Entrar"}
            </Button>
            ) : (
              <Button type="button" variant="outline" className="w-full" onClick={() => setAbrirPin(false)}>
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
