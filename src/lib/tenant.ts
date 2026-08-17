import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface Tenant {
  id: string;
  nome: string;
  slug: string;
  status: string;
  ativo: boolean;
}

/**
 * Empresa (tenant) do usuário autenticado.
 * Origem única: profiles.tenant_id -> tabela tenants (protegida por RLS).
 */
export function useTenantAtual() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tenant-atual", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Tenant | null> => {
      const { data: perfil, error: erroPerfil } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user!.id)
        .maybeSingle();
      if (erroPerfil) throw erroPerfil;
      const tenantId = perfil?.tenant_id;
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from("tenants")
        .select("id,nome,slug,status,ativo")
        .eq("id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return (data as Tenant | null) ?? null;
    },
  });
}
