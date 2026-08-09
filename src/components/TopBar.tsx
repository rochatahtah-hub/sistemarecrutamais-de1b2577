import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useConfiguracoes } from "@/lib/dados";
import { useMarcarNotificacoesLidas, useNotificacoes } from "@/lib/programacao";

function dentroDoExpediente(inicio: string, fim: string) {
  const agora = new Date();
  const hhmm = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
  const diaUtil = agora.getDay() >= 1 && agora.getDay() <= 5;
  return diaUtil && hhmm >= inicio && hhmm <= fim;
}

export function TopBar() {
  const navigate = useNavigate();
  const { perfil, user, isAdmin, sair } = useAuth();
  const { data: config } = useConfiguracoes();
  const { data: notificacoes = [] } = useNotificacoes();
  const marcarLidas = useMarcarNotificacoesLidas();

  const naoLidas = useMemo(() => notificacoes.filter((n) => !n.lida), [notificacoes]);

  // Alerta de inatividade dentro do horario de trabalho configurado.
  useEffect(() => {
    if (!user || !perfil || !config) return;
    const horas = config.inatividadeHoras || 2;
    const checar = async () => {
      if (!dentroDoExpediente(config.expedienteInicio, config.expedienteFim)) return;
      const ultimo = perfil.ultimo_preenchimento ? new Date(perfil.ultimo_preenchimento) : null;
      const limite = horas * 3_600_000;
      if (ultimo && Date.now() - ultimo.getTime() < limite) return;
      const bucket = new Date();
      const chave = `inatividade-${bucket.toISOString().slice(0, 13)}`;
      const mensagem = `Você está há ${horas} hora(s) sem atualizar suas programações.`;
      const { error } = await supabase.from("notificacoes").upsert(
        { user_id: user.id, tipo: "inatividade", titulo: "Inatividade", mensagem, chave },
        { onConflict: "user_id,chave", ignoreDuplicates: true },
      );
      if (!error) {
        await supabase.from("notificacoes").upsert(
          {
            user_id: user.id,
            para_admin: true,
            tipo: "inatividade-admin",
            titulo: `${perfil.nome} sem atualizar`,
            mensagem: `${perfil.nome} está há ${horas} hora(s) sem inserir programações.`,
            chave: `${chave}-admin`,
          },
          { onConflict: "user_id,chave", ignoreDuplicates: true },
        );
      }
    };
    void checar();
    const id = window.setInterval(() => void checar(), 15 * 60_000);
    return () => window.clearInterval(id);
  }, [user, perfil, config]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-3 backdrop-blur md:px-6">
      <SidebarTrigger />
      <span className="font-display text-sm font-semibold tracking-tight">
        Sistema de Programação e Controle de Vagas
      </span>
      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu
          onOpenChange={(aberto) => {
            if (!aberto && naoLidas.length > 0) marcarLidas.mutate(naoLidas.map((n) => n.id));
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
              <Bell className="h-4 w-4" />
              {naoLidas.length > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notificações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notificacoes.length === 0 && (
              <DropdownMenuItem disabled>Nenhuma notificação.</DropdownMenuItem>
            )}
            {notificacoes.slice(0, 12).map((n) => (
              <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5">
                <span className="text-xs font-semibold">{n.titulo}</span>
                <span className="text-xs text-muted-foreground">{n.mensagem}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <span className="max-w-[10rem] truncate text-sm">{perfil?.nome ?? "Conta"}</span>
              {isAdmin && <Badge variant="secondary">Admin</Badge>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {perfil?.email ?? user?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                void sair().then(() => {
                  toast.success("Sessão encerrada.");
                  void navigate({ to: "/auth", replace: true });
                });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
