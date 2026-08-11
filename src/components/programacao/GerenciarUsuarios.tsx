import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CampoSenha } from "@/components/CampoSenha";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { criarUsuario, definirPermissao, definirSenha } from "@/lib/admin.functions";
import { excluirUsuario } from "@/lib/usuarios.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { useProgramadoras } from "@/lib/programacao";
import { usePrivacidade } from "@/lib/privacidade";

function useRoles() {
  return useQuery({
    queryKey: ["user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id,role");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export function GerenciarUsuarios() {
  const qc = useQueryClient();
  const priv = usePrivacidade();
  const { data: perfis = [] } = useProgramadoras();
  const { data: roles = [] } = useRoles();
  const criar = useServerFn(criarUsuario);
  const senhaFn = useServerFn(definirSenha);
  const permissaoFn = useServerFn(definirPermissao);
  const excluirFn = useServerFn(excluirUsuario);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [admin, setAdmin] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [novaSenha, setNovaSenha] = useState<Record<string, string>>({});
  const [excluindo, setExcluindo] = useState<string | null>(null);

  async function excluir(id: string) {
    setExcluindo(id);
    try {
      await excluirFn({ data: { userId: id } });
      toast.success("Login excluído. O histórico foi preservado.");
      void qc.invalidateQueries({ queryKey: ["programadoras"] });
      void qc.invalidateQueries({ queryKey: ["user-roles"] });
      void qc.invalidateQueries({ queryKey: ["usuarios"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao excluir o login.");
    } finally {
      setExcluindo(null);
    }
  }

  const ehAdmin = (id: string) => roles.some((r) => r.user_id === id && r.role === "admin");

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await criar({ data: { nome, email, senha, admin } });
      toast.success("Usuário cadastrado.");
      setNome("");
      setEmail("");
      setSenha("");
      setAdmin(false);
      void qc.invalidateQueries({ queryKey: ["programadoras"] });
      void qc.invalidateQueries({ queryKey: ["user-roles"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao cadastrar usuário.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-5">
      <form className="surface-panel grid gap-3 rounded-xl p-4 md:grid-cols-5" onSubmit={cadastrar}>
        <div className="space-y-1.5 md:col-span-1">
          <Label htmlFor="u-nome">Nome</Label>
          <Input id="u-nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="u-email">E-mail</Label>
          <Input
            id="u-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="u-senha">Senha</Label>
          <CampoSenha
            id="u-senha"
            minLength={6}
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>
        <div className="flex items-end justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={admin} onCheckedChange={setAdmin} /> Admin
          </label>
          <Button type="submit" disabled={enviando}>
            {enviando ? "Salvando..." : "Cadastrar"}
          </Button>
        </div>
      </form>

      <div className="surface-panel space-y-3 rounded-xl p-4">
        <h2 className="font-display text-sm font-semibold">Usuários e permissões</h2>
        {perfis.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
            <div className="min-w-[12rem] flex-1">
              <p className="text-sm font-medium">{priv.nome(p.nome)}</p>
              <p className="text-xs text-muted-foreground">{priv.texto(p.email)}</p>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <Switch
                checked={ehAdmin(p.id)}
                onCheckedChange={(v) => {
                  void permissaoFn({ data: { userId: p.id, admin: v } })
                    .then(() => {
                      toast.success("Permissão atualizada.");
                      void qc.invalidateQueries({ queryKey: ["user-roles"] });
                    })
                    .catch((err: Error) => toast.error(err.message));
                }}
              />
              Administrador
            </label>
            <div className="flex items-center gap-2">
              <CampoSenha
                placeholder="Nova senha"
                className="h-8 w-40"
                value={novaSenha[p.id] ?? ""}
                onChange={(e) => setNovaSenha((s) => ({ ...s, [p.id]: e.target.value }))}
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const valor = novaSenha[p.id] ?? "";
                  void senhaFn({ data: { userId: p.id, senha: valor } })
                    .then(() => {
                      toast.success("Senha alterada.");
                      setNovaSenha((s) => ({ ...s, [p.id]: "" }));
                    })
                    .catch((err: Error) => toast.error(err.message));
                }}
              >
                Definir senha
              </Button>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={excluindo === p.id}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  {excluindo === p.id ? "Excluindo..." : "Excluir login"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir login de programador?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O acesso de <strong>{priv.nome(p.nome)}</strong> será removido
                    definitivamente. As vagas, candidatos e o histórico continuam no sistema.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void excluir(p.id)}>
                    Excluir login
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
        {perfis.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhum usuário ainda.</p>
        )}
      </div>
    </div>
  );
}