import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Send, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { salvarEmailBackup, testarEnvioBackup } from "@/lib/backup.functions";

const PADRAO = "rochatahtah@gmail.com";

export function PainelEmailBackup() {
  const salvar = useServerFn(salvarEmailBackup);
  const testar = useServerFn(testarEnvioBackup);
  const [email, setEmail] = useState(PADRAO);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [log, setLog] = useState<string>("");

  const { data: agenda, refetch } = useQuery({
    queryKey: ["backup-agendamento-email"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backup_agendamento")
        .select("email_destino,ultimo_envio_status,ultimo_envio_em,ultimo_envio_erro")
        .eq("id", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (agenda?.email_destino) setEmail(agenda.email_destino);
  }, [agenda?.email_destino]);

  const aoSalvar = async () => {
    setSalvando(true);
    try {
      await salvar({ data: { email } });
      toast.success(`Backups serão enviados para ${email}.`);
      void refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  const aoTestar = async () => {
    setTestando(true);
    setLog("");
    try {
      const r = await testar({ data: {} });
      if (r.enviado) {
        toast.success(`Backup enviado para ${r.destino}.`);
        setLog(`✅ Envio concluído para ${r.destino}.`);
      } else {
        toast.warning("Envio não concluído — veja o detalhe abaixo.");
        setLog(
          `⚠️ Destinatário: ${r.destino}\nMotivo: ${r.motivo ?? "não informado"}\n` +
            ("link" in r && r.link
              ? "O arquivo ficou disponível por link de download na área de notificações do administrador (válido por 7 dias)."
              : ""),
        );
      }
      void refetch();
    } catch (e) {
      toast.error((e as Error).message);
      setLog(`❌ ${(e as Error).message}`);
    } finally {
      setTestando(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="surface-panel space-y-4 rounded-xl p-4">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Mail className="h-4 w-4 text-primary" /> E-mail para recebimento dos backups
        </h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="email-backup">Destinatário</Label>
            <Input
              id="email-backup"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={PADRAO}
            />
            <p className="text-xs text-muted-foreground">
              Todo backup automático ou manual enviado será direcionado para este endereço.
            </p>
          </div>
          <Button onClick={aoSalvar} disabled={salvando}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar destinatário
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Button variant="outline" onClick={aoTestar} disabled={testando}>
            {testando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            📧 Testar envio de backup
          </Button>
          {agenda?.ultimo_envio_em && (
            <span className="text-xs text-muted-foreground">
              Último envio: {new Date(agenda.ultimo_envio_em).toLocaleString("pt-BR")} —{" "}
              {agenda.ultimo_envio_status || "—"}
            </span>
          )}
        </div>

        {log && (
          <pre className="whitespace-pre-wrap rounded-lg border border-border bg-secondary/30 p-3 text-xs">
            {log}
          </pre>
        )}
      </section>

      <section className="surface-panel space-y-2 rounded-xl border border-warning/40 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Info className="h-4 w-4 text-warning" /> Domínio de envio (configuração separada)
        </h3>
        <p className="text-sm text-muted-foreground">
          O endereço acima é apenas <strong>quem recebe</strong> os backups. Para que o sistema
          consiga <strong>disparar</strong> e-mails, é necessário configurar e verificar um domínio
          de envio próprio (por exemplo <code>notificacoes.seudominio.com.br</code>). Um endereço
          do Gmail não pode ser usado como domínio de envio.
        </p>
        <p className="text-sm text-muted-foreground">
          Enquanto o domínio de envio não estiver verificado, cada backup continua sendo gerado,
          armazenado com segurança e disponibilizado ao administrador por link de download válido
          por 7 dias — nenhum backup é perdido.
        </p>
      </section>
    </div>
  );
}
