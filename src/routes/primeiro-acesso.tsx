import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { CampoSenha } from "@/components/CampoSenha";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/primeiro-acesso")({
  head: () => ({ meta: [
    { title: "Primeiro acesso | RECRUTA+" },
    { name: "description", content: "Defina sua senha pessoal para acessar o RECRUTA+." },
    { property: "og:title", content: "Primeiro acesso | RECRUTA+" },
    { property: "og:description", content: "Defina sua senha pessoal para acessar o RECRUTA+." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: PrimeiroAcesso,
});

function PrimeiroAcesso() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [verificando, setVerificando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;
    const verificar = async () => {
      const { data } = await supabase.auth.getSession();
      if (!ativo) return;
      setAutorizado(Boolean(data.session));
      setVerificando(false);
    };
    const { data: listener } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (!ativo || !sessao) return;
      setAutorizado(true);
      setVerificando(false);
    });
    void verificar();
    return () => { ativo = false; listener.subscription.unsubscribe(); };
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) { toast.error("Use uma senha com pelo menos 8 caracteres."); return; }
    if (senha !== confirmacao) { toast.error("As senhas não coincidem."); return; }
    setSalvando(true);
    const { error: erroSenha } = await supabase.auth.updateUser({ password: senha });
    if (erroSenha) { setSalvando(false); toast.error(`Não foi possível salvar a senha: ${erroSenha.message}`); return; }
    const { data: usuario } = await supabase.auth.getUser();
    if (!usuario.user) { setSalvando(false); toast.error("Sessão inválida. Abra novamente o link recebido por e-mail."); return; }
    const { error: erroPerfil } = await supabase.from("profiles").update({ troca_senha_obrigatoria: false }).eq("id", usuario.user.id);
    setSalvando(false);
    if (erroPerfil) { toast.error("A senha foi alterada, mas não foi possível concluir o primeiro acesso."); return; }
    toast.success("Senha pessoal definida. Bem-vindo ao RECRUTA+.");
    void navigate({ to: "/", replace: true });
  }

  return <main className="malha-escura grid min-h-screen place-items-center px-4 py-10"><section className="surface-panel filete-ouro w-full max-w-md rounded-2xl p-7 sm:p-8"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-gold-soft text-gold"><KeyRound /></div><h1 className="text-2xl font-semibold text-foreground">Crie sua senha de acesso</h1><p className="mt-2 text-sm text-muted-foreground">Por segurança, defina uma senha pessoal antes de entrar na plataforma.</p>{verificando ? <p className="mt-6 text-sm text-muted-foreground">Validando seu acesso...</p> : autorizado ? <form className="mt-6 space-y-4" onSubmit={salvar}><div className="space-y-1.5"><Label htmlFor="senha-nova">Nova senha</Label><CampoSenha id="senha-nova" autoComplete="new-password" required value={senha} onChange={(e) => setSenha(e.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="senha-confirmacao">Confirmar nova senha</Label><CampoSenha id="senha-confirmacao" autoComplete="new-password" required value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} /></div><Button type="submit" className="w-full" disabled={salvando}>{salvando ? "Salvando..." : "Definir senha e acessar"}</Button></form> : <div className="mt-6 space-y-4"><p className="text-sm text-destructive">Este link é inválido ou expirou.</p><Button className="w-full" variant="outline" onClick={() => void navigate({ to: "/acesso" })}>Ir para o acesso</Button></div>}<p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-success" />Sua senha não será enviada nem armazenada em texto aberto.</p></section></main>;
}