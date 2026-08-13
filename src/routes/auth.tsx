import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
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

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | Sistema de Programação de Vagas" },
      {
        name: "description",
        content: "Acesso individual das programadoras ao sistema de programação e controle de vagas.",
      },
      { property: "og:title", content: "Entrar | Sistema de Programação de Vagas" },
      {
        property: "og:description",
        content: "Acesso individual das programadoras ao sistema de programação e controle de vagas.",
      },
    ],
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
          className="h-14 w-auto select-none object-contain object-left opacity-95"
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
            Ambiente privado · Acesso individual e monitorado · F9
        </p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center lg:hidden">
          <img
            src={logoMarca.url}
            alt="RECRUTA+"
            className="h-14 w-auto select-none object-contain"
          />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Sistema de Programação
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesso individual das programadoras
          </p>
        </div>

        <div className="surface-panel filete-ouro entrada-suave rounded-2xl p-7 sm:p-8">
          <div className="mb-6 hidden lg:block">
            <h1 className="text-2xl font-semibold tracking-tight">Sistema de Programação</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Acesso individual das programadoras
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="mb-4 w-full gap-2"
            disabled={enviando}
            onClick={() => void abrirAcessoAdmin()}
          >
            <ShieldCheck className="h-4 w-4" />
            🔐 ADMINISTRADOR
          </Button>
          <p className="mb-4 text-center text-xs text-muted-foreground">
            Acesso administrativo protegido por PIN.
          </p>
          <form className="space-y-4 pt-4" onSubmit={entrar}>
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

          <div className="mt-6 border-t border-border pt-6">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Ainda não possui acesso?
            </p>
            <Link
              to="/cadastro-diarias"
              className="inline-flex w-full items-center justify-center rounded-md border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary ring-offset-background transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Cadastre-se para trabalhar em diárias
            </Link>
            <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
              Cadastro público para oportunidades de trabalho. Não cria uma conta
              de acesso ao sistema.
            </p>
          </div>
        </div>
        </div>
      </main>

      <Dialog open={abrirPin} onOpenChange={setAbrirPin}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>🔐 Acesso do administrador</DialogTitle>
            <DialogDescription>
              {jaTemPin
                ? "Informe o PIN administrativo (4 a 8 dígitos)."
                : "Nenhum PIN cadastrado. Defina agora o PIN administrativo (4 a 8 dígitos) — ele será exigido nos próximos acessos."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="pin">PIN</Label>
            <CampoSenha
              id="pin"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
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
          <DialogFooter>
            <Button
              type="button"
              className="w-full"
              disabled={enviando || pin.length < 4}
              onClick={() => void entrarComoAdmin()}
            >
              {enviando ? "Verificando..." : jaTemPin ? "Entrar" : "Definir PIN e entrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
