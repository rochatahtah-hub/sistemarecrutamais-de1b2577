import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  calcularTotalEstimado,
  ehDomingo,
  ehSabado,
  ITENS_CHECKLIST,
  MOTIVOS_DIVERGENCIA,
  STATUS_VALIDACAO_LABEL,
  TIPO_ADICIONAL_LABEL,
  useAbrirDivergencia,
  useDivergencias,
  useResolverDivergencia,
  useSalvarConferencia,
  useValidarConferencia,
  type JornadaCompleta,
  type RegistroAtendimento,
  type TipoAdicional,
} from "@/lib/atendimento";
import { fmtData } from "@/lib/metricas";
import { usePermissoes } from "@/lib/permissoes";
import { usePrivacidade } from "@/lib/privacidade";
import { STATUS_LABEL } from "@/lib/tipos";

export function FichaAtendimento({
  registro,
  aberto,
  onFechar,
}: {
  registro: RegistroAtendimento | null;
  aberto: boolean;
  onFechar: () => void;
}) {
  const priv = usePrivacidade();
  const { pode } = usePermissoes();
  const podeConferir = pode("atendimento", "conferir");
  const podeValidar = pode("atendimento", "validar");
  const podeApontar = pode("atendimento", "apontar_divergencia");
  const podeResolver = pode("atendimento", "resolver_divergencia");
  const podeEditarValores = pode("atendimento_valores", "editar");

  const salvar = useSalvarConferencia();
  const validar = useValidarConferencia();
  const abrirDivergencia = useAbrirDivergencia();
  const resolverDivergencia = useResolverDivergencia();
  const { data: divergencias = [] } = useDivergencias(registro?.vaga_id ?? null);

  const [entrada, setEntrada] = useState("");
  const [saida, setSaida] = useState("");
  const [jornadaCompleta, setJornadaCompleta] = useState<JornadaCompleta | "">("");
  const [horasTrabalhadas, setHorasTrabalhadas] = useState("");
  const [motivoParcial, setMotivoParcial] = useState("");
  const [valorDiaria, setValorDiaria] = useState("");
  const [temAjudaCusto, setTemAjudaCusto] = useState(false);
  const [ajudaCustoValor, setAjudaCustoValor] = useState("");
  const [tipoAdicional, setTipoAdicional] = useState<TipoAdicional>("NENHUM");
  const [adicionalPercentual, setAdicionalPercentual] = useState("");
  const [adicionalMotivo, setAdicionalMotivo] = useState("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [observacao, setObservacao] = useState("");

  const [motivoDivergencia, setMotivoDivergencia] = useState("");
  const [obsDivergencia, setObsDivergencia] = useState("");
  const [resultados, setResultados] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!registro) return;
    const c = registro.conferencia;
    setEntrada(c.horario_realizado_entrada);
    setSaida(c.horario_realizado_saida);
    setJornadaCompleta(c.jornada_completa ?? "");
    setHorasTrabalhadas(c.horas_trabalhadas != null ? String(c.horas_trabalhadas) : "");
    setMotivoParcial(c.motivo_jornada_parcial);
    setValorDiaria(c.valor_diaria != null ? String(c.valor_diaria) : "");
    setTemAjudaCusto(c.tem_ajuda_custo);
    setAjudaCustoValor(c.ajuda_custo_valor ? String(c.ajuda_custo_valor) : "");
    setTipoAdicional(c.tipo_adicional);
    setAdicionalPercentual(c.adicional_percentual ? String(c.adicional_percentual) : "");
    setAdicionalMotivo(c.adicional_motivo);
    setChecklist(c.checklist);
    setObservacao(c.observacao);
    setMotivoDivergencia("");
    setObsDivergencia("");
  }, [registro]);

  if (!registro) return null;

  const numero = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
  const totalEstimado = calcularTotalEstimado({
    valorDiaria: numero(valorDiaria),
    adicionalPercentual: numero(adicionalPercentual) ?? 0,
    ajudaCustoValor: temAjudaCusto ? (numero(ajudaCustoValor) ?? 0) : 0,
  });

  const divergenciaAberta = divergencias.find((d) => d.status === "ABERTA");
  const bloqueadoParaPagamento = registro.conferencia.status_validacao === "DIVERGENCIA";

  async function salvarFicha() {
    if (!registro) return;
    try {
      await salvar.mutateAsync({
        vagaId: registro.vaga_id,
        horarioRealizadoEntrada: entrada,
        horarioRealizadoSaida: saida,
        jornadaCompleta: jornadaCompleta || null,
        horasTrabalhadas: numero(horasTrabalhadas),
        motivoJornadaParcial: motivoParcial,
        valorDiaria: numero(valorDiaria),
        temAjudaCusto,
        ajudaCustoValor: numero(ajudaCustoValor) ?? 0,
        tipoAdicional,
        adicionalPercentual: numero(adicionalPercentual) ?? 0,
        adicionalMotivo,
        checklist,
        observacao,
      });
      toast.success("Conferência salva.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function validarFicha() {
    if (!registro) return;
    try {
      await validar.mutateAsync(registro.vaga_id);
      toast.success("Ficha validada — liberada para a Parede de Pagamentos.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function apontar() {
    if (!registro) return;
    try {
      await abrirDivergencia.mutateAsync({
        vagaId: registro.vaga_id,
        conferenciaId: registro.conferencia.id,
        tipo: motivoDivergencia,
        observacao: obsDivergencia,
      });
      toast.success("Divergência registrada. A ficha não será liberada até a resolução.");
      setMotivoDivergencia("");
      setObsDivergencia("");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function resolver(divergenciaId: string) {
    try {
      await resolverDivergencia.mutateAsync({
        divergenciaId,
        resultado: resultados[divergenciaId] ?? "",
      });
      toast.success("Divergência resolvida. A ficha voltou para conferência pendente.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Ficha de conferência</DialogTitle>
          <DialogDescription>
            {priv.empresa(registro.empresa)} · {fmtData(registro.data)} ·{" "}
            {STATUS_LABEL[registro.status_vaga] ?? registro.status_vaga}
            {registro.programadora_nome ? ` · Programado por ${registro.programadora_nome}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {STATUS_VALIDACAO_LABEL[registro.conferencia.status_validacao]}
          </Badge>
          {registro.conferencia.validado_por_nome && (
            <span className="text-xs text-muted-foreground">
              Validado por {priv.nome(registro.conferencia.validado_por_nome)}
              {registro.conferencia.validado_em
                ? ` em ${new Date(registro.conferencia.validado_em).toLocaleString("pt-BR")}`
                : ""}
            </span>
          )}
        </div>

        {bloqueadoParaPagamento && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Não liberado para pagamento — aguardando resolução da divergência.
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Colaborador</Label>
            <Input value={priv.nome(registro.nome)} readOnly />
          </div>
          <div className="space-y-1.5">
            <Label>Cargo / vaga</Label>
            <Input value={registro.cargo || "—"} readOnly />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Jornada
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Horário programado</Label>
              <Input value={registro.horario_programado || "—"} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label>Trabalhou o horário completo?</Label>
              <Select
                value={jornadaCompleta}
                onValueChange={(v) => setJornadaCompleta(v as JornadaCompleta)}
                disabled={!podeConferir}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SIM">Sim</SelectItem>
                  <SelectItem value="NAO">Não</SelectItem>
                  <SelectItem value="PARCIAL">Parcialmente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fa-entrada">Entrada realizada</Label>
              <Input
                id="fa-entrada"
                value={entrada}
                disabled={!podeConferir}
                onChange={(e) => setEntrada(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fa-saida">Saída realizada</Label>
              <Input
                id="fa-saida"
                value={saida}
                disabled={!podeConferir}
                onChange={(e) => setSaida(e.target.value)}
              />
            </div>
            {jornadaCompleta === "PARCIAL" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="fa-horas">Horas trabalhadas</Label>
                  <Input
                    id="fa-horas"
                    type="number"
                    value={horasTrabalhadas}
                    disabled={!podeConferir}
                    onChange={(e) => setHorasTrabalhadas(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="fa-motivo-parcial">Motivo</Label>
                  <Textarea
                    id="fa-motivo-parcial"
                    rows={2}
                    value={motivoParcial}
                    disabled={!podeConferir}
                    onChange={(e) => setMotivoParcial(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Conferência de valores
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fa-valor">Valor da diária (R$)</Label>
              <Input
                id="fa-valor"
                type="number"
                value={valorDiaria}
                disabled={!podeEditarValores}
                onChange={(e) => setValorDiaria(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center justify-between">
                Possui ajuda de custo?
                <Switch
                  checked={temAjudaCusto}
                  disabled={!podeEditarValores}
                  onCheckedChange={setTemAjudaCusto}
                />
              </Label>
              <Input
                type="number"
                placeholder="Valor da ajuda de custo"
                value={ajudaCustoValor}
                disabled={!podeEditarValores || !temAjudaCusto}
                onChange={(e) => setAjudaCustoValor(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Adicional
                {ehSabado(registro.data) && " · esta data é sábado"}
                {ehDomingo(registro.data) && " · esta data é domingo"}
              </Label>
              <Select
                value={tipoAdicional}
                onValueChange={(v) => setTipoAdicional(v as TipoAdicional)}
                disabled={!podeEditarValores}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPO_ADICIONAL_LABEL) as TipoAdicional[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TIPO_ADICIONAL_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fa-adicional-pct">Percentual do adicional (%)</Label>
              <Input
                id="fa-adicional-pct"
                type="number"
                value={adicionalPercentual}
                disabled={!podeEditarValores || tipoAdicional === "NENHUM"}
                onChange={(e) => setAdicionalPercentual(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="fa-adicional-motivo">Motivo do adicional</Label>
              <Input
                id="fa-adicional-motivo"
                value={adicionalMotivo}
                disabled={!podeEditarValores || tipoAdicional === "NENHUM"}
                onChange={(e) => setAdicionalMotivo(e.target.value)}
              />
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-border p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Total estimado / para conferência
            </p>
            <p className="font-display text-lg font-bold">
              {totalEstimado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Checklist da conferência
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ITENS_CHECKLIST.map((item) => (
              <label key={item.chave} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(checklist[item.chave])}
                  disabled={!podeConferir}
                  onCheckedChange={(v) =>
                    setChecklist((prev) => ({ ...prev, [item.chave]: v === true }))
                  }
                />
                {item.rotulo}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fa-obs">Observações</Label>
          <Textarea
            id="fa-obs"
            rows={2}
            value={observacao}
            disabled={!podeConferir}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </div>

        <div className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Divergências
          </p>
          {divergencias.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma divergência registrada.</p>
          )}
          {divergencias.map((d) => (
            <div key={d.id} className="space-y-2 rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{d.tipo}</span>
                <Badge
                  variant="outline"
                  className={
                    d.status === "ABERTA"
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                  }
                >
                  {d.status === "ABERTA" ? "Aberta" : "Resolvida"}
                </Badge>
              </div>
              {d.observacao && <p className="text-muted-foreground">{d.observacao}</p>}
              <p className="text-xs text-muted-foreground">
                Aberta por {priv.nome(d.aberta_por_nome)} em{" "}
                {new Date(d.aberta_em).toLocaleString("pt-BR")}
              </p>
              {d.status === "RESOLVIDA" ? (
                <p className="text-xs text-muted-foreground">
                  Resolvida por {priv.nome(d.resolvida_por_nome)} em{" "}
                  {d.resolvida_em ? new Date(d.resolvida_em).toLocaleString("pt-BR") : "—"} —{" "}
                  {d.resultado}
                </p>
              ) : (
                podeResolver && (
                  <div className="space-y-2">
                    <Textarea
                      rows={2}
                      placeholder="Como a divergência foi resolvida?"
                      value={resultados[d.id] ?? ""}
                      onChange={(e) =>
                        setResultados((prev) => ({ ...prev, [d.id]: e.target.value }))
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resolverDivergencia.isPending}
                      onClick={() => void resolver(d.id)}
                    >
                      Resolver divergência
                    </Button>
                  </div>
                )
              )}
            </div>
          ))}

          {podeApontar && !divergenciaAberta && (
            <div className="space-y-2 border-t border-border pt-3">
              <Label>Apontar nova divergência</Label>
              <Select value={motivoDivergencia} onValueChange={setMotivoDivergencia}>
                <SelectTrigger>
                  <SelectValue placeholder="Motivo" />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS_DIVERGENCIA.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                rows={2}
                placeholder="Observação (opcional)"
                value={obsDivergencia}
                onChange={(e) => setObsDivergencia(e.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!motivoDivergencia || abrirDivergencia.isPending}
                onClick={() => void apontar()}
              >
                <AlertTriangle className="mr-2 h-4 w-4" /> Apontar divergência
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onFechar}>
            Fechar
          </Button>
          {podeConferir && (
            <Button
              variant="secondary"
              disabled={salvar.isPending}
              onClick={() => void salvarFicha()}
            >
              <Save className="mr-2 h-4 w-4" /> Salvar conferência
            </Button>
          )}
          {podeValidar && (
            <Button
              disabled={validar.isPending || Boolean(divergenciaAberta)}
              onClick={() => void validarFicha()}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Validar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
