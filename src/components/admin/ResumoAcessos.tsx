import { Activity, Clock, LogIn, Users } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { dataHoraLogin, statusUltimoLogin, useResumoAcessos } from "@/lib/acessos";
import { usePrivacidade } from "@/lib/privacidade";

export function ResumoAcessos() {
  const p = usePrivacidade();
  const resumo = useResumoAcessos();

  if (resumo.isLoading) return <Skeleton className="h-24 w-full" />;
  const d = resumo.data;

  const cards = [
    { icone: Activity, rotulo: "Ativos agora", valor: d ? String(d.online) : "—", detalhe: "Login nos últimos 15 min" },
    {
      icone: Users,
      rotulo: "Último usuário",
      valor: d?.ultimoUsuario ? p.nome(d.ultimoUsuario) : "—",
      detalhe: d?.ultimoAcesso ? statusUltimoLogin(d.ultimoAcesso) : "Sem acessos",
    },
    {
      icone: Clock,
      rotulo: "Horário do último acesso",
      valor: d?.ultimoAcesso ? dataHoraLogin(d.ultimoAcesso) : "—",
      detalhe: "Fuso do seu dispositivo",
    },
    {
      icone: LogIn,
      rotulo: "Acessos recentes",
      valor: d ? String(d.acessos24h) : "—",
      detalhe: d ? `${d.acessos7d} nos últimos 7 dias` : "",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.rotulo} className="surface-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <c.icone className="h-4 w-4 text-gold" strokeWidth={1.75} /> {c.rotulo}
          </div>
          <p className="mt-3 truncate text-xl font-semibold tracking-tight">{c.valor}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{c.detalhe}</p>
        </div>
      ))}
    </div>
  );
}