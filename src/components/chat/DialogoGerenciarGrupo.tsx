import { useEffect, useRef, useState } from "react";
import { ImagePlus, LogOut, UserMinus, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { AvatarUsuario } from "@/components/AvatarUsuario";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import {
  useAtualizarGrupo,
  useFotoChat,
  useGerenciarParticipantes,
  useSairDaConversa,
  useUsuariosChat,
  type ResumoConversa,
} from "@/lib/chat";

interface Props {
  resumo: ResumoConversa;
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  onSaiu: () => void;
}

/** Administração do grupo: dados, participantes e saída. */
export function DialogoGerenciarGrupo({ resumo, aberto, onOpenChange, onSaiu }: Props) {
  const { user } = useAuth();
  const { data: usuarios = [] } = useUsuariosChat();
  const atualizar = useAtualizarGrupo();
  const gerenciar = useGerenciarParticipantes();
  const sair = useSairDaConversa();
  const inputFoto = useRef<HTMLInputElement>(null);
  const fotoAtual = useFotoChat(resumo.conversa.foto_url);

  const [nome, setNome] = useState(resumo.conversa.nome);
  const [descricao, setDescricao] = useState(resumo.conversa.descricao);
  const [foto, setFoto] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);

  useEffect(() => {
    setNome(resumo.conversa.nome);
    setDescricao(resumo.conversa.descricao);
  }, [resumo.conversa.id, resumo.conversa.nome, resumo.conversa.descricao]);

  const souAdmin = resumo.souAdmin;
  const membrosIds = new Set(resumo.participantes.map((p) => p.user_id));
  const membros = resumo.participantes;
  const fora = usuarios.filter((u) => !membrosIds.has(u.id));

  function escolherFoto(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    if (previa) URL.revokeObjectURL(previa);
    setFoto(file);
    setPrevia(URL.createObjectURL(file));
  }

  async function salvar() {
    try {
      await atualizar.mutateAsync({
        conversaId: resumo.conversa.id,
        nome: nome.trim(),
        descricao: descricao.trim(),
        foto,
      });
      setFoto(null);
      toast.success("Grupo atualizado.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Informações do grupo</DialogTitle>
          <DialogDescription>
            {souAdmin
              ? "Você é administrador deste grupo."
              : "Somente administradores podem alterar as configurações."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-gold/35 bg-primary/90 text-primary-foreground">
              {previa || fotoAtual ? (
                <img src={previa ?? fotoAtual!} alt={resumo.titulo} className="h-full w-full object-cover" />
              ) : (
                <Users className="h-5 w-5" />
              )}
            </span>
            {souAdmin && (
              <>
                <input
                  ref={inputFoto}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => escolherFoto(e.target.files?.[0])}
                />
                <Button variant="outline" size="sm" onClick={() => inputFoto.current?.click()}>
                  <ImagePlus className="mr-2 h-4 w-4" /> Alterar foto
                </Button>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-nome">Nome</Label>
            <Input
              id="g-nome"
              value={nome}
              disabled={!souAdmin}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-desc">Descrição</Label>
            <Textarea
              id="g-desc"
              rows={2}
              value={descricao}
              disabled={!souAdmin}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Participantes ({membros.length})</Label>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
              {membros.map((p) => {
                const u = usuarios.find((x) => x.id === p.user_id);
                return (
                  <div key={p.id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                    <AvatarUsuario nome={u?.nome} caminho={u?.avatar_url} className="h-7 w-7" />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {u?.nome ?? "Usuário"}
                      {p.admin && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-gold">
                          admin
                        </span>
                      )}
                    </span>
                    {souAdmin && p.user_id !== user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        title="Remover do grupo"
                        onClick={() =>
                          gerenciar.mutate({
                            conversaId: resumo.conversa.id,
                            remover: [p.user_id],
                          })
                        }
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {souAdmin && fora.length > 0 && (
            <div className="space-y-1.5">
              <Label>Adicionar participantes</Label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
                {fora.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                    <AvatarUsuario nome={u.nome} caminho={u.avatar_url} className="h-7 w-7" />
                    <span className="min-w-0 flex-1 truncate text-sm">{u.nome}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Adicionar ao grupo"
                      onClick={() =>
                        gerenciar.mutate({ conversaId: resumo.conversa.id, adicionar: [u.id] })
                      }
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              sair.mutate(resumo.conversa.id, {
                onSuccess: () => {
                  toast.success("Você saiu do grupo.");
                  onSaiu();
                  onOpenChange(false);
                },
              });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sair do grupo
          </Button>
          {souAdmin && (
            <Button disabled={atualizar.isPending} onClick={() => void salvar()}>
              Salvar alterações
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}