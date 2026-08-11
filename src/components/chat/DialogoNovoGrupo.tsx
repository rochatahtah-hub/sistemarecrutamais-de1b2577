import { useRef, useState } from "react";
import { ImagePlus, Users } from "lucide-react";
import { toast } from "sonner";

import { AvatarUsuario } from "@/components/AvatarUsuario";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useCriarGrupo, useUsuariosChat } from "@/lib/chat";

interface Props {
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  onCriado: (conversaId: string) => void;
}

/** Fluxo de criação de grupo: nome, foto opcional, descrição e participantes reais. */
export function DialogoNovoGrupo({ aberto, onOpenChange, onCriado }: Props) {
  const { user } = useAuth();
  const { data: usuarios = [] } = useUsuariosChat();
  const criar = useCriarGrupo();
  const inputFoto = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [membros, setMembros] = useState<string[]>([]);
  const [foto, setFoto] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);

  const disponiveis = usuarios.filter((u) => u.id !== user?.id);

  function limpar() {
    setNome("");
    setDescricao("");
    setMembros([]);
    setFoto(null);
    if (previa) URL.revokeObjectURL(previa);
    setPrevia(null);
  }

  function fechar(v: boolean) {
    if (!v) limpar();
    onOpenChange(v);
  }

  function escolherFoto(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Selecione um arquivo de imagem.");
    if (file.size > 5 * 1024 * 1024) return toast.error("A imagem deve ter até 5 MB.");
    if (previa) URL.revokeObjectURL(previa);
    setFoto(file);
    setPrevia(URL.createObjectURL(file));
  }

  async function confirmar() {
    if (!nome.trim()) return toast.error("Informe o nome do grupo.");
    if (membros.length === 0) return toast.error("Selecione ao menos um participante.");
    try {
      const id = await criar.mutateAsync({
        nome: nome.trim(),
        descricao: descricao.trim(),
        membros,
        foto,
      });
      toast.success("Grupo criado.");
      onCriado(id);
      fechar(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo grupo</DialogTitle>
          <DialogDescription>
            Crie um grupo com os usuários cadastrados no Recruta+.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-gold/35 bg-primary/90 text-primary-foreground">
              {previa ? (
                <img src={previa} alt="Prévia" className="h-full w-full object-cover" />
              ) : (
                <Users className="h-5 w-5" />
              )}
            </span>
            <input
              ref={inputFoto}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => escolherFoto(e.target.files?.[0])}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => inputFoto.current?.click()}>
              <ImagePlus className="mr-2 h-4 w-4" /> Foto do grupo
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="grupo-nome">Nome do grupo</Label>
            <Input
              id="grupo-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Equipe de Programação"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="grupo-desc">Descrição (opcional)</Label>
            <Textarea
              id="grupo-desc"
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Participantes</Label>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
              {disponiveis.length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  Nenhum outro usuário ativo cadastrado.
                </p>
              )}
              {disponiveis.map((u) => (
                <label
                  key={u.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-accent/60"
                >
                  <Checkbox
                    checked={membros.includes(u.id)}
                    onCheckedChange={(v) =>
                      setMembros((atual) =>
                        v ? [...atual, u.id] : atual.filter((id) => id !== u.id),
                      )
                    }
                  />
                  <AvatarUsuario nome={u.nome} caminho={u.avatar_url} className="h-7 w-7" />
                  <span className="truncate text-sm">{u.nome}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => fechar(false)}>
            Cancelar
          </Button>
          <Button disabled={criar.isPending} onClick={() => void confirmar()}>
            Criar grupo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}