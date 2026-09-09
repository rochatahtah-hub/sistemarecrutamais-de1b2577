import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAtualizarVaga, useRegistrarConfirmacao } from "@/lib/dados";
import { usePrivacidade } from "@/lib/privacidade";
import { usePermissoes } from "@/lib/permissoes";
import { useEmpresas } from "@/lib/programacao";
import { agregar, fmtData, fmtNum, fmtPct } from "@/lib/metricas";
import {
  formatarResumoVaga,
  GENERO_LABEL,
  GENEROS,
  SITUACOES,
  SITUACAO_LABEL,
  STATUS_LABEL,
  TRANSPORTE_VAGA_LABEL,
  type VagaRegistro,
} from "@/lib/tipos";

const STATUS = ["AGUARDANDO", "PRESENCA", "FALTA", "CANCELAMENTO"] as const;

/** Ficha completa de uma vaga: dados, candidatos, confirmações e situação. */
export function FichaVaga({
  vaga,
  registros,
  aberto,
  onFechar,
}: {
  vaga: VagaRegistro | null;
  registros: VagaRegistro[];
  aberto: boolean;
  onFechar: () => void;
}) {
  const atualizar = useAtualizarVaga();
  const confirmar = useRegistrarConfirmacao();
  const priv = usePrivacidade();
  const { pode } = usePermissoes();
  const { data: empresas = [] } = useEmpresas();
  const [cargo, setCargo] = useState("");
  const [horario, setHorario] = useState("");
  const [local, setLocal] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [situacao, setSituacao] = useState("ABERTA");
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [genero, setGenero] = useState("");
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const [horarioInicio, setHorarioInicio] = useState("");
  const [horarioFim, setHorarioFim] = useState("");
  const [intervaloInicio, setIntervaloInicio] = useState("");
  const [intervaloFim, setIntervaloFim] = useState("");
  const [transporteTipo, setTransporteTipo] = useState("");
  const [transporteDetalhes, setTransporteDetalhes] = useState("");

  useEffect(() => {
    if (!vaga) return;
    setCargo(vaga.cargo || vaga.descricao);
    setHorario(vaga.horario);
    setLocal(vaga.local);
    setResponsavel(vaga.responsavel || vaga.colaborador);
    setSituacao(vaga.situacao || "ABERTA");
    setQuantidade(vaga.quantidade);
    setObservacao(vaga.observacao);
    setEmpresaId(vaga.empresa_id ?? "");
    setDataInicio(vaga.data);
    setGenero(vaga.genero);
    setCidade(vaga.cidade);
    setBairro(vaga.bairro);
    setHorarioInicio(vaga.horario_inicio);
    setHorarioFim(vaga.horario_fim);
    setIntervaloInicio(vaga.intervalo_inicio);
    setIntervaloFim(vaga.intervalo_fim);
    setTransporteTipo(vaga.transporte_tipo);
    setTransporteDetalhes(vaga.transporte_detalhes);
  }, [vaga]);

  const editavel =
    vaga?.status === "AGUARDANDO" &&
    pode("programacao", "editar_aguardando_confirmacao") &&
    !priv.privado;

  /** Demais registros da mesma vaga (empresa + cargo + data) para somar candidatos. */
  const grupo = useMemo(() => {
    if (!vaga) return [] as VagaRegistro[];
    const chave = (r: VagaRegistro) =>
      `${r.empresa}|${(r.cargo || r.descricao).toLowerCase()}|${r.data}`;
    return registros.filter((r) => chave(r) === chave(vaga));
  }, [registros, vaga]);
  const total = useMemo(() => agregar(grupo), [grupo]);

  if (!vaga) return null;

  async function salvar() {
    if (!vaga) return;
    if (Boolean(horarioInicio) !== Boolean(horarioFim)) {
      toast.error("Informe início e fim do horário, ou deixe os dois em branco.");
      return;
    }
    if (horarioInicio && horarioFim && horarioFim <= horarioInicio) {
      toast.error("O horário de término deve ser depois do horário de início.");
      return;
    }
    if (Boolean(intervaloInicio) !== Boolean(intervaloFim)) {
      toast.error("Informe início e fim do intervalo, ou deixe os dois em branco.");
      return;
    }
    const horarioTexto =
      horarioInicio && horarioFim ? `${horarioInicio} às ${horarioFim}` : horario.trim();
    try {
      await atualizar.mutateAsync({
        id: vaga.id,
        cargo: cargo.trim(),
        horario: horarioTexto,
        local: local.trim(),
        responsavel: responsavel.trim(),
        situacao,
        quantidade: Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 1,
        observacao: observacao.trim(),
        genero: genero || null,
        cidade: cidade.trim() || null,
        bairro: bairro.trim() || null,
        horario_inicio: horarioInicio || null,
        horario_fim: horarioFim || null,
        intervalo_inicio: intervaloInicio || null,
        intervalo_fim: intervaloFim || null,
        transporte_tipo: transporteTipo || null,
        transporte_detalhes: transporteTipo === "FRETADO" ? transporteDetalhes.trim() || null : null,
        ...(editavel ? { empresa_id: empresaId, data: dataInicio } : {}),
      });
      toast.success("Ficha da vaga atualizada.");
      onFechar();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function registrar(status: string) {
    if (!vaga) return;
    try {
      await confirmar.mutateAsync({ id: vaga.id, status });
      toast.success("Confirmação registrada — indicadores atualizados.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const indicadores = [
    { label: "Candidatos", valor: fmtNum(grupo.length) },
    { label: "Confirmados", valor: fmtNum(total.confirmadas) },
    { label: "Presenças", valor: `${fmtNum(total.presencas)} · ${fmtPct(total.pctPresenca)}` },
    { label: "Faltas", valor: `${fmtNum(total.faltas)} · ${fmtPct(total.pctFalta)}` },
    { label: "Cancelamentos", valor: fmtNum(total.cancelamentos) },
    { label: "Aguardando", valor: fmtNum(total.pendentes) },
  ];
  const valorProtegido = (valor: string) => (priv.privado ? priv.texto(valor) : valor);

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Ficha completa da vaga</DialogTitle>
          <DialogDescription>
            {priv.empresa(vaga.empresa)} · {fmtData(vaga.data)} ·{" "}
            {SITUACAO_LABEL[vaga.situacao] ?? vaga.situacao}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fv-empresa">Empresa</Label>
            {editavel ? (
              <Select value={empresaId} onValueChange={setEmpresaId}>
                <SelectTrigger id="fv-empresa"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={priv.empresa(vaga.empresa)} readOnly />
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fv-cargo">Cargo</Label>
            <Input id="fv-cargo" value={valorProtegido(cargo)} readOnly={priv.privado} onChange={(e) => setCargo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fv-qtd">Quantidade de vagas</Label>
            <Input
              id="fv-qtd"
              type="number"
              min={1}
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fv-data">Data</Label>
            {editavel ? (
              <Input
                id="fv-data"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            ) : (
              <Input value={fmtData(vaga.data)} readOnly />
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fv-hora">Horário (anotação livre)</Label>
            <Input
              id="fv-hora"
              value={
                horarioInicio && horarioFim
                  ? valorProtegido(`${horarioInicio} às ${horarioFim}`)
                  : valorProtegido(horario)
              }
              readOnly={priv.privado || Boolean(horarioInicio && horarioFim)}
              placeholder="ex.: 08:00 às 17:00"
              onChange={(e) => setHorario(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fv-local">Local</Label>
            <Input id="fv-local" value={valorProtegido(local)} readOnly={priv.privado} onChange={(e) => setLocal(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fv-resp">Responsável</Label>
            <Input
              id="fv-resp"
              value={priv.nome(responsavel)}
              readOnly={priv.privado}
              onChange={(e) => setResponsavel(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Colaborador responsável</Label>
            <Input value={priv.nome(vaga.colaborador)} readOnly />
          </div>
          <div className="space-y-1.5">
            <Label>Candidato</Label>
            <Input
              value={
                vaga.candidato
                  ? priv.nome(vaga.candidato)
                  : vaga.descricao
                    ? priv.texto(vaga.descricao)
                    : "—"
              }
              readOnly
            />
          </div>
          <div className="space-y-1.5">
            <Label>Situação</Label>
            <Select value={situacao} onValueChange={setSituacao}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SITUACOES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SITUACAO_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <section className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
          <h3 className="rotulo-secao">Perfil e transporte</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Gênero</Label>
              <RadioGroup className="flex flex-wrap gap-4" value={genero} onValueChange={setGenero}>
                {GENEROS.map((g) => (
                  <div key={g} className="flex items-center gap-2">
                    <RadioGroupItem value={g} id={`fv-genero-${g}`} />
                    <Label htmlFor={`fv-genero-${g}`} className="font-normal">
                      {GENERO_LABEL[g]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Transporte</Label>
              <RadioGroup
                className="flex flex-wrap gap-4"
                value={transporteTipo}
                onValueChange={(v) => {
                  setTransporteTipo(v);
                  if (v !== "FRETADO") setTransporteDetalhes("");
                }}
              >
                {(Object.keys(TRANSPORTE_VAGA_LABEL) as (keyof typeof TRANSPORTE_VAGA_LABEL)[]).map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <RadioGroupItem value={t} id={`fv-transporte-${t}`} />
                    <Label htmlFor={`fv-transporte-${t}`} className="font-normal">
                      {TRANSPORTE_VAGA_LABEL[t]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
          {transporteTipo === "FRETADO" && (
            <div className="space-y-1.5">
              <Label htmlFor="fv-transporte-detalhes">Detalhes do fretado (opcional)</Label>
              <Textarea
                id="fv-transporte-detalhes"
                rows={2}
                value={transporteDetalhes}
                onChange={(e) => setTransporteDetalhes(e.target.value)}
                placeholder="Ex.: embarque às 6h na praça central, ônibus fretado, observações..."
              />
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
          <h3 className="rotulo-secao">Local e horário</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fv-cidade">Cidade</Label>
              <Input id="fv-cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fv-bairro">Bairro</Label>
              <Input id="fv-bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fv-hora-inicio">Horário de início</Label>
              <Input
                id="fv-hora-inicio"
                type="time"
                value={horarioInicio}
                onChange={(e) => setHorarioInicio(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fv-hora-fim">Horário de término</Label>
              <Input
                id="fv-hora-fim"
                type="time"
                value={horarioFim}
                onChange={(e) => setHorarioFim(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fv-intervalo-inicio">Intervalo — início (opcional)</Label>
              <Input
                id="fv-intervalo-inicio"
                type="time"
                value={intervaloInicio}
                onChange={(e) => setIntervaloInicio(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fv-intervalo-fim">Intervalo — fim (opcional)</Label>
              <Input
                id="fv-intervalo-fim"
                type="time"
                value={intervaloFim}
                onChange={(e) => setIntervaloFim(e.target.value)}
              />
            </div>
          </div>
        </section>

        {(() => {
          const linhasResumo = formatarResumoVaga({
            cidade,
            bairro,
            horario_inicio: horarioInicio,
            horario_fim: horarioFim,
            genero,
            transporte_tipo: transporteTipo,
            transporte_detalhes: transporteDetalhes,
          });
          return linhasResumo.length > 0 ? (
            <div className="space-y-1 rounded-xl border border-gold/25 bg-gold-soft/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Resumo — como aparecerá para o candidato
              </p>
              {linhasResumo.map((linha) => (
                <p key={linha} className="text-sm">
                  {linha}
                </p>
              ))}
            </div>
          ) : null;
        })()}

        <div className="space-y-1.5">
          <Label htmlFor="fv-obs">Observações</Label>
          <Textarea
            id="fv-obs"
            rows={3}
            value={valorProtegido(observacao)}
            readOnly={priv.privado}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {indicadores.map((i) => (
            <div key={i.label} className="rounded-lg border border-border p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{i.label}</p>
              <p className="font-display text-lg font-bold">{i.valor}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Confirmação deste registro — atual: {STATUS_LABEL[vaga.status] ?? vaga.status}
          </p>
          <div className="flex flex-wrap gap-2">
            {STATUS.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={vaga.status === s ? "default" : "outline"}
                disabled={confirmar.isPending}
                onClick={() => void registrar(s)}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {STATUS_LABEL[s]}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onFechar}>
            Fechar
          </Button>
          <Button onClick={() => void salvar()} disabled={atualizar.isPending || priv.privado}>
            <Save className="mr-2 h-4 w-4" /> Salvar ficha
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
