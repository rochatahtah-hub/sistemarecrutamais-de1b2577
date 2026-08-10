import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";

/** Restringe uma área ao perfil administrador. */
export function RequerAdmin({ area, children }: { area: string; children: ReactNode }) {
  const { isAdmin, carregando } = useAuth();

  if (carregando) return <Skeleton className="h-64 w-full" />;

  if (!isAdmin) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader className="items-center text-center">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <CardTitle>Acesso restrito</CardTitle>
          <CardDescription>
            A área <strong>{area}</strong> é exclusiva do perfil administrador. Fale com a
            administração se precisar desse acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild variant="outline">
            <Link to="/minha-programacao">Voltar para minha programação</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
