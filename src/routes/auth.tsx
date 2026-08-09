import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

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
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!carregando && session) void navigate({ to: "/", replace: true });
  }, [session, carregando, navigate]);

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

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (nome.trim().length < 2) {
      toast.error("Informe o nome da programadora.");
      return;
    }
    setEnviando(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: { data: { nome: nome.trim() }, emailRedirectTo: window.location.origin },
    });
    setEnviando(false);
    if (error) {
      toast.error(
        error.message.includes("already registered")
          ? "Este e-mail já possui acesso."
          : `Não foi possível criar o acesso: ${error.message}`,
      );
      return;
    }
    if (!data.session) {
      toast.success("Acesso criado. Confirme o e-mail para entrar.");
      return;
    }
    toast.success("Acesso criado com sucesso!");
    void navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <BarChart3 className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold text-gradient-gold">
            Sistema de Programação
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesso individual das programadoras
          </p>
        </div>

        <div className="surface-panel rounded-xl p-6">
          <Tabs defaultValue="entrar">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="entrar">Entrar</TabsTrigger>
              <TabsTrigger value="criar">Criar acesso</TabsTrigger>
            </TabsList>

            <TabsContent value="entrar">
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
                  <Input
                    id="senha"
                    type="password"
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
            </TabsContent>

            <TabsContent value="criar">
              <form className="space-y-4 pt-4" onSubmit={criar}>
                <div className="space-y-1.5">
                  <Label htmlFor="nome">Nome da programadora</Label>
                  <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email2">E-mail</Label>
                  <Input
                    id="email2"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="senha2">Senha</Label>
                  <Input
                    id="senha2"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={enviando}>
                  {enviando ? "Criando..." : "Criar acesso"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  O primeiro acesso criado no sistema recebe o perfil de administrador.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
