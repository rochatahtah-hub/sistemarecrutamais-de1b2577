import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function useSuperAdmin() {
  return useQuery({
    queryKey: ["eh-super-admin-atual"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("eh_super_admin_atual");
      if (error) throw error;
      return data === true;
    },
    staleTime: 5 * 60_000,
  });
}

export function RequerSuperAdmin({ children }: { children: ReactNode }) {
  const { data, isPending } = useSuperAdmin();
  if (isPending) return <Skeleton className="h-64 w-full" />;
  if (!data) return <Card className="mx-auto max-w-lg"><CardHeader className="items-center text-center"><ShieldAlert className="h-10 w-10 text-destructive" /><CardTitle>Acesso restrito</CardTitle><CardDescription>Esta área é exclusiva do Admin Master do RECRUTA+.</CardDescription></CardHeader><CardContent className="flex justify-center"><Button asChild variant="outline"><Link to="/">Voltar ao Dashboard</Link></Button></CardContent></Card>;
  return <>{children}</>;
}