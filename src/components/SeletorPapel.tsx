import type { PapelUsuario } from "@/lib/admin.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Papéis disponíveis e seus rótulos no Recruta+. */
export const PAPEIS_ROTULO: Record<PapelUsuario, string> = {
  admin: "Administrador",
  programadora: "Programadora",
  supervisor: "Supervisor",
  coordenador: "Coordenador",
  comercial: "Comercial",
};

export const PAPEIS_LISTA = Object.keys(PAPEIS_ROTULO) as PapelUsuario[];

/** Perfis que enxergam somente o Dashboard. */
export const PAPEIS_SOMENTE_DASHBOARD: PapelUsuario[] = [
  "supervisor",
  "coordenador",
  "comercial",
];

export function SeletorPapel({
  valor,
  onChange,
  id,
  className,
}: {
  valor: PapelUsuario;
  onChange: (papel: PapelUsuario) => void;
  id?: string;
  className?: string;
}) {
  return (
    <Select value={valor} onValueChange={(v) => onChange(v as PapelUsuario)}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder="Perfil" />
      </SelectTrigger>
      <SelectContent>
        {PAPEIS_LISTA.map((papel) => (
          <SelectItem key={papel} value={papel}>
            {PAPEIS_ROTULO[papel]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
