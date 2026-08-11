import { User } from "lucide-react";

import { useFotoPerfil } from "@/lib/avatar";
import { cn } from "@/lib/utils";

export function iniciaisNome(nome?: string | null) {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "R+";
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "R+";
}

interface Props {
  nome?: string | null | undefined;
  caminho?: string | null | undefined;
  privado?: boolean | undefined;
  className?: string | undefined;
  textoClassName?: string | undefined;
}

/** Avatar circular padrão do Recruta+: foto do usuário ou iniciais em dourado. */
export function AvatarUsuario({ nome, caminho, privado, className, textoClassName }: Props) {
  const url = useFotoPerfil(privado ? null : caminho);

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-gold/35 bg-primary/90 text-[11px] font-bold text-primary-foreground shadow-[0_4px_14px_-8px_oklch(0.78_0.082_82/0.9)]",
        "h-9 w-9",
        className,
      )}
    >
      {privado ? (
        <User className="h-4 w-4" />
      ) : url ? (
        <img src={url} alt={nome ? `Foto de ${nome}` : "Foto de perfil"} className="h-full w-full object-cover" />
      ) : (
        <span className={cn("leading-none", textoClassName)}>{iniciaisNome(nome)}</span>
      )}
    </span>
  );
}
