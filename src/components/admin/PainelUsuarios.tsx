import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CampoSenha } from "@/components/CampoSenha";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  criarUsuario,
  definirPermissao,
  definirSenha,
  type PapelUsuario,
} from "@/lib/admin.functions";
import { PAPEIS_ROTULO, SeletorPapel } from "@/components/SeletorPapel";
import {
  atualizarUsuario,
  definirStatusUsuario,
  excluirUsuario,
  listarUsuarios,
} from "@/lib/usuarios.functions";
import { usePrivacidade } from "@/lib/privacidade";
import { dataHoraLogin, statusUltimoLogin } from "@/lib/acessos";

function quando(valor: string | null) {
  if (!valor) return "—";
  return new Date(valor).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function PainelUsuarios() {
  const qc = useQueryClient();
  const p = usePrivacidade();
  const listar = useServerFn(listarUsuarios);
  const criar = useServerFn(criarUsuario);
  const senhaFn = useServerFn(definirSenha);
  const permissaoFn = useServerFn(definirPermissao);
  const statusFn = useServerFn(definirStatusUsuario);
  const editarFn = useServerFn(atualizarUsuario);
  const excluirFn = useServerFn(excluirUsuario);

  const usuarios = useQuery({ queryKey: ["admin-usuarios"], queryFn: () => listar({}) });
  const recarregar = async () => {
    await qc.invalidateQueries({ queryKey: ["admin-usuarios"] });
    await usuarios.refetch();
    await qc.invalidateQueries({ queryKey: ["programadoras"] });
  };

  const [novo, setNovo] = useState<{
    nome: string;
    email: string;
    senha: string;
    papel: PapelUsuario;
  }>({ nome: "", email: "", senha: "", papel: "programadora" });
  const [editando, setEditando] = useState<{ id: string; nome: string; email: string } | null>(null);
  const [trocaSenha, setTrocaSenha] = useState<{ id: string; nome: string; senha: string } | null>(null);
  const [excluindo, setExcluindo] = useState<{ id: string; nome: string } | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "ativos" | "desativados">("todos");
  const [busca, setBusca] = useState("");

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (usuarios.data ?? []).filter((u) => {
      if (filtro === "ativos" && !u.ativo) return false;
      if (filtro === "desativados" && u.ativo) return false;
      if (!termo) return true;
      return `${u.nome} ${u.email ?? ""}`.toLowerCase().includes(termo);
    });
  }, [usuarios.data, filtro, busca]);

  const acao = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: async () => { await recarregar(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <form
        className="surface-panel grid gap-3 rounded-2xl p-4 md:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          acao.mutate(
            async () => {
              await criar({ data: novo });
              toast.success("Usuário cadastrado.");
              setNovo({ nome: "", email: "", senha: "", papel: "programadora" });
            },
          );
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="nv-nome">Nome</Label>
          <Input id="nv-nome" required value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="nv-email">E-mail</Label>
          <Input
            id="nv-email"
            type="email"
            required
            value={novo.email}
            onChange={(e) => setNovo({ ...novo, email: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nv-senha">Senha</Label>
          <CampoSenha
            id="nv-senha"
            minLength={6}
            required
            autoComplete="new-password"
            value={novo.senha}
            onChange={(e) => setNovo({ ...novo, senha: e.target.value })}
          />
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="nv-papel">Perfil</Label>
            <SeletorPapel
              id="nv-papel"
              valor={novo.papel}
              onChange={(papel) => setNovo({ ...novo, papel })}
              className="h-9 w-40"
            />
          </div>
          <Button type="submit" disabled={acao.isPending}>
            <Plus className="mr-2 h-4 w-4" /> Criar
          </Button>
        </div>
      </form>

      {usuarios.isLoading && <Skeleton className="h-48 w-full" />}

      <div className="flex flex-wrap items-center gap-2">
        {(["todos", "ativos", "desativados"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filtro === f ? "default" : "outline"}
            onClick={() => setFiltro(f)}
          >
            {f === "todos" ? "Todos" : f === "ativos" ? "Ativos" : "Inativos"}
            {" "}
            (
            {f === "todos"
              ? (usuarios.data ?? []).length
              : (usuarios.data ?? []).filter((u) => (f === "ativos" ? u.ativo : !u.ativo)).length}
            )
          </Button>
        ))}
        <Input
          className="h-9 w-full sm:w-64"
          placeholder="Buscar por nome ou e-mail"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {lista.map((u) => (
          <div key={u.id} className="surface-panel grid gap-3 rounded-2xl p-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold">{p.nome(u.nome)}</p>
                <Badge variant={u.admin ? "default" : "secondary"}>{PAPEIS_ROTULO[u.papel]}</Badge>
                <Badge variant={u.ativo ? "outline" : "destructive"}>{u.ativo ? "Ativo" : "Inativo"}</Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">{p.privado ? "•••••••" : u.email}</p>
              <p className="text-[11px] text-muted-foreground">
                Último acesso: {quando(u.ultimo_acesso)} · Última atividade: {quando(u.ultima_atividade)}
              </p>
              <p className="text-[11px]">
                <span className="text-muted-foreground">Último login: </span>
                <span className={u.ultimo_login ? "font-medium text-foreground" : "text-muted-foreground"}>
                  {u.ultimo_login ? `${dataHoraLogin(u.ultimo_login)} · ${statusUltimoLogin(u.ultimo_login)}` : "Nunca acessou"}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SeletorPapel
                valor={u.papel}
                className="h-8 w-40 text-xs"
                onChange={(papel) =>
                  acao.mutate(async () => {
                    await permissaoFn({ data: { userId: u.id, papel } });
                    toast.success("Permissão atualizada.");
                  })
                }
              />
              <label className="flex items-center gap-2 text-xs">
                <Switch
                  checked={u.ativo}
                  onCheckedChange={(v) =>
                    acao.mutate(async () => {
                      await statusFn({ data: { userId: u.id, ativo: v } });
                      toast.success(v ? "Usuário ativado." : "Usuário desativado.");
                    })
                  }
                />
                Ativo
              </label>
              <Button size="sm" variant="secondary" onClick={() => setTrocaSenha({ id: u.id, nome: u.nome, senha: "" })}>
                Senha
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditando({ id: u.id, nome: u.nome, email: u.email ?? "" })}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setExcluindo({ id: u.id, nome: u.nome })}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {!usuarios.isLoading && lista.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum usuário encontrado para este filtro.
          </p>
        )}
      </div>

      <Dialog open={Boolean(editando)} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ed-nome">Nome</Label>
              <Input
                id="ed-nome"
                value={editando?.nome ?? ""}
                onChange={(e) => setEditando((s) => (s ? { ...s, nome: e.target.value } : s))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-email">E-mail</Label>
              <Input
                id="ed-email"
                type="email"
                value={editando?.email ?? ""}
                onChange={(e) => setEditando((s) => (s ? { ...s, email: e.target.value } : s))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={acao.isPending}
              onClick={() =>
                editando &&
                acao.mutate(async () => {
                  await editarFn({ data: { userId: editando.id, nome: editando.nome, email: editando.email } });
                  toast.success("Usuário atualizado.");
                  setEditando(null);
                })
              }
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(trocaSenha)} onOpenChange={(o) => !o && setTrocaSenha(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="tr-senha">Nova senha de {p.nome(trocaSenha?.nome ?? "usuário")}</Label>
            <CampoSenha
              id="tr-senha"
              autoComplete="new-password"
              value={trocaSenha?.senha ?? ""}
              onChange={(e) => setTrocaSenha((s) => (s ? { ...s, senha: e.target.value } : s))}
            />
          </div>
          <DialogFooter>
            <Button
              disabled={acao.isPending}
              onClick={() =>
                trocaSenha &&
                acao.mutate(async () => {
                  await senhaFn({ data: { userId: trocaSenha.id, senha: trocaSenha.senha } });
                  toast.success("Senha alterada.");
                  setTrocaSenha(null);
                })
              }
            >
              Definir senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(excluindo)} onOpenChange={(o) => !o && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja remover este usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              O acesso de <strong>{p.nome(excluindo?.nome ?? "usuário")}</strong> será excluído. As vagas, presenças, faltas,
              cancelamentos e relatórios já registrados permanecem no sistema. Sempre que possível, prefira
              apenas <strong>desativar</strong> o usuário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                excluindo &&
                acao.mutate(async () => {
                  await excluirFn({ data: { userId: excluindo.id } });
                  qc.setQueryData(
                    ["admin-usuarios"],
                    (antigo: { id: string }[] | undefined) =>
                      (antigo ?? []).filter((x) => x.id !== excluindo.id),
                  );
                  toast.success("Cadastro excluído. O histórico foi mantido.");
                  setExcluindo(null);
                })
              }
            >
              Excluir usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}