import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Briefcase, CalendarX2, CheckCircle2, Trophy, XCircle } from "lucide-react";

import { CardIndicador } from "./CardIndicador";
import { GraficoEvolucao } from "./Graficos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useVagas } from "@/lib/dados";
import {
  agregar,
  agregarPor,
  fmtData,
  fmtNum,
  fmtPct,
  serieTemporal,
  type Granularidade,
} from "@/lib/metricas";
import { STATUS_LABEL } from "@/lib/tipos";

export function DetalhePerfil({ tipo, nome }: { tipo: "colaborador" | "empresa"; nome: string }) {
  const { data: registros = [] } = useVagas();
  const [granularidade, setGranularidade] = useState<Granularidade>("quinzena");
  const [pagina, setPagina] = useState(0);
  const porPagina = 25;

  const meus = useMemo(
    () => registros.filter((r) => (tipo === "colaborador" ? r.colaborador : r.empresa) === nome),
    [registros, tipo, nome],
  );
  const total = useMemo(() => agregar(meus), [meus]);
  const ranking = useMemo(() => {
    const linhas = agregarPor(registros, tipo).sort((a, b) => b.pctPresenca - a.pctPresenca);
    return { posicao: linhas.findIndex((l) => l.nome === nome) + 1, totalLinhas: linhas.length };
  }, [registros, tipo, nome]);
  const relacionados = useMemo(
    () => agregarPor(meus, tipo === "colaborador" ? "empresa" : "colaborador"),
    [meus, tipo],
  );
  const serie = useMemo(() => serieTemporal(meus, granularidade), [meus, granularidade]);

  const ordenados = useMemo(() => [...meus].sort((a, b) => b.data.localeCompare(a.data)), [meus]);
  const paginados = ordenados.slice(pagina * porPagina, pagina * porPagina + porPagina);
  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / porPagina));

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to={tipo === "colaborador" ? "/colaboradores" : "/empresas"}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Link>
      </Button>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">{nome}</h1>
        <Badge variant="outline" className="border-primary/40 text-primary">
          <Trophy className="mr-1 h-3 w-3" />
          {ranking.posicao > 0
            ? `${ranking.posicao}º de ${ranking.totalLinhas} em % de presença`
            : "Sem ranking"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CardIndicador titulo="Total de vagas" valor={fmtNum(total.vagas)} icon={Briefcase} tom="ouro" />
        <CardIndicador
          titulo="Presenças"
          valor={fmtNum(total.presencas)}
          detalhe={fmtPct(total.pctPresenca)}
          icon={CheckCircle2}
          tom="positivo"
        />
        <CardIndicador
          titulo="Faltas"
          valor={fmtNum(total.faltas)}
          detalhe={fmtPct(total.pctFalta)}
          icon={XCircle}
          tom="negativo"
        />
        <CardIndicador
          titulo="Cancelamentos"
          valor={fmtNum(total.cancelamentos)}
          detalhe={fmtPct(total.pctCancelamento)}
          icon={CalendarX2}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="surface-panel rounded-xl p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Evolução
            </h2>
            <Select value={granularidade} onValueChange={(v) => setGranularidade(v as Granularidade)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dia">Por dia</SelectItem>
                <SelectItem value="semana">Por semana</SelectItem>
                <SelectItem value="quinzena">Por quinzena</SelectItem>
                <SelectItem value="mes">Por mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <GraficoEvolucao dados={serie} />
        </section>

        <section className="surface-panel rounded-xl p-4">
          <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {tipo === "colaborador" ? "Empresas atendidas" : "Colaboradores responsáveis"}
          </h2>
          <div className="max-h-[320px] overflow-y-auto pr-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Vagas</TableHead>
                  <TableHead className="text-right">% Presença</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relacionados.map((l) => (
                  <TableRow key={l.chave}>
                    <TableCell className="font-medium">{l.nome}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNum(l.vagas)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtPct(l.pctPresenca)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      <section className="surface-panel rounded-xl p-4">
        <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Vagas detalhadas ({fmtNum(ordenados.length)})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40">
                <TableHead>Data</TableHead>
                <TableHead>{tipo === "colaborador" ? "Empresa" : "Colaborador"}</TableHead>
                <TableHead>Vaga</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginados.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">{fmtData(r.data)}</TableCell>
                  <TableCell>{tipo === "colaborador" ? r.empresa : r.colaborador}</TableCell>
                  <TableCell>{r.descricao || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.quantidade}</TableCell>
                  <TableCell>{STATUS_LABEL[r.status] ?? r.status}</TableCell>
                  <TableCell className="max-w-[240px] truncate text-muted-foreground">
                    {r.observacao || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {totalPaginas > 1 && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <Button variant="outline" size="sm" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </Button>
            <span className="text-muted-foreground">
              Página {pagina + 1} de {totalPaginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagina >= totalPaginas - 1}
              onClick={() => setPagina((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}