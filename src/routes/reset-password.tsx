import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { CampoSenha } from "@/components/CampoSenha";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { RecruitaNetworkAnimation, type RecruitaAnimationState } from "@/components/RecruitaNetworkAnimation";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha | RECRUTA+" },
      { name: "description", content: "Redefina com segurança sua senha de acesso ao RECRUTA+." },
      { property: "og:title", content: "Redefinir senha | RECRUTA+" },
      { property: "og:description", content: "Redefina com segurança sua senha de acesso ao RECRUTA+." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Pagina,
});

function Pagina() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [autorizado, setAutorizado] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [campoAtivo, setCampoAtivo] = useState(false);
  const estadoAnimacao: RecruitaAnimationState = salvando || verificando ? "loading" : campoAtivo ? "password" : "idle";

  useEffect(() => {
    let ativo = true;
    const hashRecuperacao = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    const { data: listener } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (!ativo || evento !== "PASSWORD_RECOVERY") return;
      setAutorizado(Boolean(sessao));
      setVerificando(false);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setAutorizado(hashRecuperacao && Boolean(data.session));
      setVerificando(false);
    });
    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) {
      toast.error("Use uma senha com pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) {
      toast.error(`Não foi possível redefinir a senha: ${error.message}`);
      return;
    }
    const { data: usuario } = await supabase.auth.getUser();
    if (usuario.user) {
      await supabase.from("profiles").update({ troca_senha_obrigatoria: false }).eq("id", usuario.user.id);
    }
    await supabase.auth.signOut();
    toast.success("Senha redefinida. Entre novamente com sua nova senha.");
    void navigate({ to: "/acesso", replace: true });
  }

  return (
    <main className="malha-escura relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <RecruitaNetworkAnimation state={estadoAnimacao} className="absolute inset-6 hidden sm:block" />
      <section className="surface-panel filete-ouro relative z-10 w-full max-w-md rounded-2xl p-7 sm:p-8">
        <h1 className="text-2xl font-semibold text-foreground">Redefinir senha</h1>
        {verificando ? (
          <p className="mt-3 text-sm text-muted-foreground">Validando o link seguro...</p>
        ) : autorizado ? (
          <form className="mt-6 space-y-4" onSubmit={salvar}>
            <div className="space-y-1.5">
              <Label htmlFor="nova-senha">Nova senha</Label>
              <CampoSenha id="nova-senha" autoComplete="new-password" required value={senha} onChange={(e) => setSenha(e.target.value)} onFocus={() => setCampoAtivo(true)} onBlur={() => setCampoAtivo(false)} className="recruta-auth-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
              <CampoSenha id="confirmar-senha" autoComplete="new-password" required value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} onFocus={() => setCampoAtivo(true)} onBlur={() => setCampoAtivo(false)} className="recruta-auth-input" />
            </div>
            <Button type="submit" className="w-full" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-destructive">Este link de recuperação é inválido ou expirou.</p>
            <Button type="button" variant="outline" className="w-full" onClick={() => void navigate({ to: "/acesso" })}>
              Voltar ao login
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}