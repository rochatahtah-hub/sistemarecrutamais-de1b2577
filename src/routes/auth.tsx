import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronDown, Lock } from "lucide-react";
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

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      <aside className="malha-escura hidden flex-col justify-between p-12 text-sidebar-foreground lg:flex">
        <img
          src={logoLockup.url}
          alt="RECRUTA+ — Gestão inteligente de recrutamento"
          className="h-14 w-auto select-none object-contain object-left"
        />
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
        <p className="text-xs text-sidebar-foreground/45">
            Ambiente privado · Acesso individual e monitorado
        </p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <h1 className="sr-only">Entrar no RECRUTA+</h1>

          <div className="mb-8 flex flex-col items-center text-center">
            <div className="malha-escura flex w-full max-w-[320px] items-center justify-center rounded-2xl px-6 py-5 shadow-sm">
              <img
                src={logoLockup.url}
                alt="RECRUTA+ — Gestão inteligente de recrutamento"
                className="h-12 w-auto select-none object-contain sm:h-14"
              />
            </div>
            <p className="mt-4 text-sm font-medium tracking-wide text-muted-foreground">
              Gestão inteligente de recrutamento.
            </p>
          </div>

          <div className="surface-panel filete-ouro entrada-suave rounded-2xl p-7 sm:p-8">
            <button
              type="button"
              aria-expanded={acessoAberto}
              aria-controls="form-programador"
              onClick={() => setAcessoAberto((v) => !v)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-left transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                <Lock className="h-4 w-4 text-primary" />
                Acesso do programador
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${acessoAberto ? "rotate-180" : ""}`}
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
                />
              </div>
              <Button type="submit" className="w-full" disabled={enviando}>
                {enviando ? "Entrando..." : "Entrar"}
              </Button>
            </form>
            )}

            <button
              type="button"
              onClick={() => void abrirAcessoAdmin()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              🔐 Administrador
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
