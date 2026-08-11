import { Users } from "lucide-react";

import { AvatarUsuario } from "@/components/AvatarUsuario";
import { useFotoChat, type ResumoConversa } from "@/lib/chat";
import { cn } from "@/lib/utils";

interface Props {
  resumo: ResumoConversa;
  privado?: boolean;
  className?: string;
}

/** Avatar da conversa: foto do usuário (individual) ou foto/ícone do grupo. */
export function AvatarConversa({ resumo, privado, className }: Props) {
  const fotoGrupo = useFotoChat(resumo.conversa.tipo === "grupo" ? resumo.conversa.foto_url : null);

  if (resumo.conversa.tipo === "direta") {
    return (
      <AvatarUsuario
        nome={resumo.outro?.nome}
        caminho={resumo.outro?.avatar_url}
        privado={privado}
        className={className}
      />
    );
  }

  return (
    <span
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-gold/35 bg-primary/90 text-primary-foreground",
        className,
      )}
    >
      {fotoGrupo && !privado ? (
        <img src={fotoGrupo} alt={resumo.titulo} className="h-full w-full object-cover" />
      ) : (
        <Users className="h-4 w-4" />
      )}
    </span>
  );
}