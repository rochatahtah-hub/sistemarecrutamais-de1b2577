import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { acaoDeEntrada, usePermissoes, type Acao } from "@/lib/permissoes";

/** Restringe uma área conforme as permissões configuradas para o perfil do usuário. */
export function RequerPermissao({
  modulo,
  area,
  acao,
  children,
}: {
  modulo: string;
  area: string;
  acao?: Acao;
  children: ReactNode;
}) {
  const { carregando, pode } = usePermissoes();

  if (carregando) return <Skeleton className="h-64 w-full" />;

  if (!pode(modulo, acao ?? acaoDeEntrada(modulo))) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader className="items-center text-center">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <CardTitle>Acesso restrito</CardTitle>
          <CardDescription>
            Seu perfil não possui permissão para acessar <strong>{area}</strong>. Fale com um
            administrador master se precisar desse acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild variant="outline">
            <Link to="/">Voltar para o Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}