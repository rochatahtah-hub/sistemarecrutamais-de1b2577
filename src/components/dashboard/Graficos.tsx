import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LinhaAgregada, Agregado } from "@/lib/metricas";
import { usePrivacidade } from "@/lib/privacidade";

const COR_PRESENCA = "oklch(0.7 0.14 158)";
const COR_FALTA = "oklch(0.62 0.2 25)";
const COR_CANCEL = "oklch(0.78 0.15 65)";
const COR_OURO = "oklch(0.79 0.135 85)";

const eixo = { stroke: "oklch(0.68 0.005 285)", fontSize: 11 };

const tooltipStyle = {
  contentStyle: {
    background: "oklch(0.19 0.004 285)",
    border: "1px solid oklch(0.3 0.005 285)",
    borderRadius: 8,
    fontSize: 12,
    color: "oklch(0.96 0.003 285)",
  },
  labelStyle: { color: "oklch(0.79 0.135 85)" },
};

export function GraficoBarrasStatus({
  linhas,
  sensivel = false,
}: {
  linhas: LinhaAgregada[];
  sensivel?: boolean;
}) {
  const priv = usePrivacidade();
  const dados = sensivel ? linhas.map((l) => ({ ...l, nome: priv.nome(l.nome) })) : linhas;
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={dados} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.005 285)" vertical={false} />
        <XAxis dataKey="nome" tick={eixo} interval={0} angle={-25} textAnchor="end" height={70} />
        <YAxis tick={eixo} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "oklch(0.24 0.004 285)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="presencas" name="Presenças" fill={COR_PRESENCA} radius={[3, 3, 0, 0]} />
        <Bar dataKey="faltas" name="Faltas" fill={COR_FALTA} radius={[3, 3, 0, 0]} />
        <Bar dataKey="cancelamentos" name="Cancelamentos" fill={COR_CANCEL} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GraficoBarraMetrica({
  linhas,
  metrica,
  rotulo,
  sensivel = false,
}: {
  linhas: LinhaAgregada[];
  metrica: keyof LinhaAgregada;
  rotulo: string;
  sensivel?: boolean;
}) {
  const priv = usePrivacidade();
  const dados = sensivel ? linhas.map((l) => ({ ...l, nome: priv.nome(l.nome) })) : linhas;
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={dados} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.005 285)" horizontal={false} />
        <XAxis type="number" tick={eixo} />
        <YAxis type="category" dataKey="nome" tick={eixo} width={130} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "oklch(0.24 0.004 285)" }} />
        <Bar dataKey={metrica as string} name={rotulo} fill={COR_OURO} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GraficoDistribuicao({ agregado }: { agregado: Agregado }) {
  const dados = [
    { name: "Presenças", value: agregado.presencas, cor: COR_PRESENCA },
    { name: "Faltas", value: agregado.faltas, cor: COR_FALTA },
    { name: "Cancelamentos", value: agregado.cancelamentos, cor: COR_CANCEL },
  ].filter((d) => d.value > 0);

  if (dados.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
        Sem dados no período.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie data={dados} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={2}>
          {dados.map((d) => (
            <Cell key={d.name} fill={d.cor} stroke="oklch(0.19 0.004 285)" />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function GraficoEvolucao({
  dados,
}: {
  dados: { periodo: string; presencas: number; faltas: number; cancelamentos: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={dados} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.005 285)" vertical={false} />
        <XAxis dataKey="periodo" tick={eixo} />
        <YAxis tick={eixo} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="presencas" name="Presenças" stroke={COR_PRESENCA} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="faltas" name="Faltas" stroke={COR_FALTA} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="cancelamentos" name="Cancelamentos" stroke={COR_CANCEL} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}