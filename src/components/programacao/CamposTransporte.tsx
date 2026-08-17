import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { TIPOS_TRANSPORTE, type DadosTransporte } from "@/lib/programacao";

/** Seção "Transporte e deslocamento" reutilizada no cadastro e na edição do candidato. */
export function CamposTransporte({
  valor,
  onChange,
  idPrefixo = "transporte",
  titulo = "Transporte e deslocamento",
}: {
  valor: DadosTransporte;
  onChange: (parcial: Partial<DadosTransporte>) => void;
  idPrefixo?: string;
  titulo?: string;
}) {
  const alternarTipo = (tipo: string, marcado: boolean) => {
    const atuais = new Set(valor.transporte_tipos);
    if (marcado) atuais.add(tipo);
    else atuais.delete(tipo);
    onChange({ transporte_tipos: Array.from(atuais) });
  };

  return (
    <section className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
      <h3 className="rotulo-secao">{titulo}</h3>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Possui transporte próprio?</Label>
          <RadioGroup
            className="flex gap-6"
            value={valor.transporte_proprio ? "sim" : "nao"}
            onValueChange={(v) =>
              onChange(
                v === "sim"
                  ? { transporte_proprio: true }
                  : { transporte_proprio: false, transporte_tipos: [] },
              )
            }
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="sim" id={`${idPrefixo}-proprio-sim`} />
              <Label htmlFor={`${idPrefixo}-proprio-sim`} className="font-normal">Sim</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="nao" id={`${idPrefixo}-proprio-nao`} />
              <Label htmlFor={`${idPrefixo}-proprio-nao`} className="font-normal">Não</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label>Precisa de transporte fretado?</Label>
          <RadioGroup
            className="flex gap-6"
            value={valor.precisa_fretado ? "sim" : "nao"}
            onValueChange={(v) => onChange({ precisa_fretado: v === "sim" })}
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="sim" id={`${idPrefixo}-fretado-sim`} />
              <Label htmlFor={`${idPrefixo}-fretado-sim`} className="font-normal">Sim</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="nao" id={`${idPrefixo}-fretado-nao`} />
              <Label htmlFor={`${idPrefixo}-fretado-nao`} className="font-normal">Não</Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      {valor.transporte_proprio && (
        <div className="space-y-2">
          <Label>Tipo de transporte (pode marcar mais de um)</Label>
          <div className="flex flex-wrap gap-4">
            {TIPOS_TRANSPORTE.map((t) => (
              <div key={t.valor} className="flex items-center gap-2">
                <Checkbox
                  id={`${idPrefixo}-${t.valor}`}
                  checked={valor.transporte_tipos.includes(t.valor)}
                  onCheckedChange={(c) => alternarTipo(t.valor, c === true)}
                />
                <Label htmlFor={`${idPrefixo}-${t.valor}`} className="font-normal">
                  {t.rotulo}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefixo}-obs`}>Observação sobre transporte (opcional)</Label>
        <Textarea
          id={`${idPrefixo}-obs`}
          rows={2}
          maxLength={500}
          value={valor.transporte_observacao}
          onChange={(e) => onChange({ transporte_observacao: e.target.value.slice(0, 500) })}
          placeholder="Ex.: usa moto apenas em dias de semana; precisa de fretado na zona sul."
        />
      </div>
    </section>
  );
}
