import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTenantAtual, useTenantsDisponiveis, useTrocarTenant } from "@/lib/tenant";

/**
 * Seletor de empresa ativa. Só aparece para quem enxerga mais de uma empresa (CEO).
 * Usuários comuns continuam vendo apenas o selo com a própria empresa.
 */
export function SeletorEmpresa() {
  const { data: atual } = useTenantAtual();
  const { data: empresas = [] } = useTenantsDisponiveis();
  const trocar = useTrocarTenant();

  if (!atual) return null;

  if (empresas.length <= 1) {
    return (
      <span
        className="inline-flex max-w-[9rem] items-center gap-1.5 truncate rounded-md border border-border px-2 py-1 text-xs text-muted-foreground sm:max-w-[16rem]"
        title={`Empresa: ${atual.nome}`}
      >
        <Building2 className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{atual.nome}</span>
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 max-w-[10rem] gap-1.5 px-2 sm:max-w-[18rem]"
          disabled={trocar.isPending}
          title={`Empresa ativa: ${atual.nome}`}
        >
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate text-xs">{atual.nome}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Trocar de empresa</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {empresas.map((empresa) => (
          <DropdownMenuItem
            key={empresa.id}
            disabled={trocar.isPending}
            onSelect={(evento) => {
              evento.preventDefault();
              if (empresa.id === atual.id) return;
              trocar.mutate(empresa.id, {
                onError: (erro) =>
                  toast.error(erro instanceof Error ? erro.message : "Não foi possível trocar de empresa."),
              });
            }}
          >
            <span className="min-w-0 flex-1 truncate">{empresa.nome}</span>
            {empresa.id === atual.id && <Check className="ml-2 h-4 w-4 text-gold" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
