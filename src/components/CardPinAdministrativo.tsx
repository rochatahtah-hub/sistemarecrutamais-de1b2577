import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { alterarPin, pinDefinido } from "@/lib/pin.functions";

/** Cadastro/alteração do PIN administrativo. Renderize apenas para administradores. */
export function CardPinAdministrativo() {
  const consultarPin = useServerFn(pinDefinido);
  const trocarPin = useServerFn(alterarPin);
  const qc = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ["admin-pin-definido"],
    queryFn: () => consultarPin(),
  });
  const definido = status?.definido ?? false;

  const [novo, setNovo] = useState("");
  const [confirma, setConfirma] = useState("");
  const [salvando, setSalvando] = useState(false);

  const iguais = novo.length >= 6 && novo === confirma;

  async function salvar() {
    if (!iguais) {
      toast.error("Os PINs digitados não coincidem.");
      return;
    }
    setSalvando(true);
    try {
      await trocarPin({ data: { novo } });
      setNovo("");
      setConfirma("");
      await qc.invalidateQueries({ queryKey: ["admin-pin-definido"] });
      toast.success("PIN administrativo salvo com segurança.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="surface-panel space-y-4 rounded-2xl p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-primary">
          <KeyRound className="h-4 w-4" /> Cadastrar/Alterar PIN administrativo
        </h2>
        <Badge variant={definido ? "default" : "destructive"}>
          {definido ? (
            <>
              <ShieldCheck className="mr-1 h-3 w-3" /> PIN cadastrado
            </>
          ) : (
            <>
              <ShieldAlert className="mr-1 h-3 w-3" /> Nenhum PIN cadastrado
            </>
          )}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        O PIN é guardado de forma cifrada e nunca é exibido. Use de 6 a 10 dígitos, sem sequências
        (123456) nem dígitos repetidos (111111). Após 5 tentativas incorretas o acesso fica
        bloqueado por 15 minutos, e cada nova falha dobra a espera (até 24 horas).
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pin-novo">{definido ? "Novo PIN" : "PIN"} (6 a 10 dígitos)</Label>
          <Input
            id="pin-novo"
            type="password"
            autoComplete="new-password"
            inputMode="numeric"
            maxLength={10}
            className="w-48"
            value={novo}
            onChange={(e) => setNovo(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pin-confirma">Confirmar PIN</Label>
          <Input
            id="pin-confirma"
            type="password"
            autoComplete="new-password"
            inputMode="numeric"
            maxLength={10}
            className="w-48"
            value={confirma}
            onChange={(e) => setConfirma(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <Button disabled={!iguais || salvando} onClick={() => void salvar()}>
          {definido ? "Alterar PIN" : "Cadastrar PIN"}
        </Button>
      </div>
    </div>
  );
}
