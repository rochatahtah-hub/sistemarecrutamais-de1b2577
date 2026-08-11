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
import { agregar, fmtData, fmtNum, fmtPct } from "@/lib/metricas";
import { SITUACOES, SITUACAO_LABEL, STATUS_LABEL, type VagaRegistro } from "@/lib/tipos";

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
  const [cargo, setCargo] = useState("");
  const [horario, setHorario] = useState("");
  const [local, setLocal] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [situacao, setSituacao] = useState("ABERTA");
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    if (!vaga) return;
    setCargo(vaga.cargo || vaga.descricao);
    setHorario(vaga.horario);
    setLocal(vaga.local);
    setResponsavel(vaga.responsavel || vaga.colaborador);
    setSituacao(vaga.situacao || "ABERTA");
    setQuantidade(vaga.quantidade);
    setObservacao(vaga.observacao);
  }, [vaga]);

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
    try {
      await atualizar.mutateAsync({
        id: vaga.id,
        cargo: cargo.trim(),
        horario: horario.trim(),
        local: local.trim(),
        responsavel: responsavel.trim(),
        situacao,
        quantidade: Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 1,
        observacao: observacao.trim(),
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
            <Label>Empresa</Label>
            <Input value={priv.empresa(vaga.empresa)} readOnly />
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
            <Label>Data</Label>
            <Input value={fmtData(vaga.data)} readOnly />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fv-hora">Horário</Label>
            <Input
              id="fv-hora"
              value={valorProtegido(horario)}
              readOnly={priv.privado}
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
