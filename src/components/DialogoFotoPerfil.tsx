import { useRef, useState } from "react";
import { Camera, Trash2, Upload } from "lucide-react";
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
import { enviarFotoPerfil, removerFotoPerfil } from "@/lib/avatar";
import { useAuth } from "@/lib/auth";

interface Props {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
}

/** Permite que o usuário autenticado escolha, visualize e confirme a própria foto. */
export function DialogoFotoPerfil({ aberto, onOpenChange }: Props) {
  const { user, perfil, recarregarPerfil } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const fechar = (v: boolean) => {
    if (!v) {
      setArquivo(null);
      if (previa) URL.revokeObjectURL(previa);
      setPrevia(null);
    }
    onOpenChange(v);
  };

  function escolher(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter até 5 MB.");
      return;
    }
    if (previa) URL.revokeObjectURL(previa);
    setArquivo(file);
    setPrevia(URL.createObjectURL(file));
  }

  async function confirmar() {
    if (!user || !arquivo) return;
    setSalvando(true);
    try {
      await enviarFotoPerfil(user.id, arquivo);
      await recarregarPerfil();
      toast.success("Foto de perfil atualizada.");
      fechar(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  async function remover() {
    if (!user) return;
    setSalvando(true);
    try {
      await removerFotoPerfil(user.id, perfil?.avatar_url);
      await recarregarPerfil();
      toast.success("Foto removida.");
      fechar(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar foto de perfil</DialogTitle>
          <DialogDescription>
            A foto fica vinculada apenas à sua conta e aparece no menu e no cabeçalho.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {previa ? (
            <img
              src={previa}
              alt="Prévia da nova foto"
              className="h-28 w-28 rounded-full border border-gold/40 object-cover"
            />
          ) : (
            <AvatarUsuario
              nome={perfil?.nome}
              caminho={perfil?.avatar_url}
              className="h-28 w-28 text-2xl"
            />
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => escolher(e.target.files?.[0])}
          />
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Escolher imagem
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            className="text-destructive"
            disabled={salvando || !perfil?.avatar_url}
            onClick={() => void remover()}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Remover foto
          </Button>
          <Button disabled={salvando || !arquivo} onClick={() => void confirmar()}>
            <Camera className="mr-2 h-4 w-4" /> Confirmar foto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
