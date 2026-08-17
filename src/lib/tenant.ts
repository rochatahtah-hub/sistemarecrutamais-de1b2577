import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface Tenant {
  id: string;
  nome: string;
  slug: string;
  status: string;
  ativo: boolean;
}

/** Empresa ativa: contexto escolhido pela CEO ou, para os demais, a empresa do perfil. */
async function idDaEmpresaAtiva(userId: string): Promise<string | null> {
  const { data: contexto } = await supabase
    .from("tenant_contexto")
    .select("tenant_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (contexto?.tenant_id) return contexto.tenant_id;

  const { data: perfil, error } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return perfil?.tenant_id ?? null;
}

/**
 * Empresa (tenant) ativa do usuário autenticado.
 * Origem: tenant_contexto (CEO) -> profiles.tenant_id -> tabela tenants (protegida por RLS).
 */
export function useTenantAtual() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tenant-atual", user?.id],
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async (): Promise<Tenant | null> => {
      if (!user) return null;
      const tenantId = await idDaEmpresaAtiva(user.id);
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

/** A conta é super admin (CEO) e pode trocar de empresa? */
export function useEhSuperAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["super-admin", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<boolean> => {
      if (!user) return false;
      // Somente a CEO enxerga mais de uma empresa (RLS de tenants).
      const { data, error } = await supabase.from("tenants").select("id").limit(2);
      if (error) throw error;
      return (data ?? []).length > 1;
    },
  });
}

/** Todas as empresas visíveis para a conta (uma para usuários comuns, todas para a CEO). */
export function useTenantsDisponiveis() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tenants-disponiveis", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<Tenant[]> => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id,nome,slug,status,ativo")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Tenant[];
    },
  });
}

/** Troca a empresa ativa e zera todo o cache para não vazar dados da empresa anterior. */
export function useTrocarTenant() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tenantId: string) => {
      if (!user) throw new Error("Sessão expirada.");
      const { error } = await supabase
        .from("tenant_contexto")
        .upsert({ user_id: user.id, tenant_id: tenantId }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.cancelQueries();
      qc.clear();
      if (typeof window !== "undefined") window.location.reload();
    },
  });
}
