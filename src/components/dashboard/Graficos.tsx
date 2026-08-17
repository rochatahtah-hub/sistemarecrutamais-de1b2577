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
import { primeiroNome } from "@/lib/utils";

const COR_PRESENCA = "oklch(0.62 0.13 158)";
const COR_FALTA = "oklch(0.6 0.19 26)";
const COR_CANCEL = "oklch(0.75 0.14 72)";
const COR_OURO = "oklch(0.72 0.075 82)";
const COR_GRADE = "oklch(0.925 0.006 258)";

const eixo = {
  stroke: "oklch(0.575 0.018 265)",
  fontSize: 11,
  fontWeight: 500,
};
const eixoLinha = { stroke: COR_GRADE };

const tooltipStyle = {
  contentStyle: {
    background: "oklch(1 0 0)",
    border: "1px solid oklch(0.925 0.006 258)",
    borderRadius: 12,
    fontSize: 12,
    padding: "10px 12px",
    boxShadow: "0 24px 48px -28px oklch(0.205 0.032 265 / 0.45)",
    color: "oklch(0.205 0.032 265)",
  },
  labelStyle: {
    color: "oklch(0.205 0.032 265)",
    fontWeight: 600,
    marginBottom: 4,
  },
  itemStyle: { padding: "1px 0" },
};

const legenda = {
  wrapperStyle: { fontSize: 12, paddingTop: 8 },
  iconType: "circle" as const,
  iconSize: 8,
};

export function GraficoBarrasStatus({
  linhas,
  sensivel = false,
}: {
  linhas: LinhaAgregada[];
  sensivel?: boolean;
}) {
  const priv = usePrivacidade();
  const dados = linhas.map((l) => ({
    ...l,
    nome: sensivel ? primeiroNome(priv.nome(l.nome)) : priv.empresa(l.nome),
  }));
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={dados} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
        <CartesianGrid strokeDasharray="4 4" stroke={COR_GRADE} vertical={false} />
        <XAxis
          dataKey="nome"
          tick={eixo}
          interval={0}
          angle={-25}
          textAnchor="end"
          height={70}
          axisLine={eixoLinha}
          tickLine={false}
        />
        <YAxis tick={eixo} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "oklch(0.963 0.005 258)" }} />
        <Legend {...legenda} />
        <Bar dataKey="presencas" name="Presenças" fill={COR_PRESENCA} radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Bar dataKey="faltas" name="Faltas" fill={COR_FALTA} radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Bar dataKey="cancelamentos" name="Cancelamentos" fill={COR_CANCEL} radius={[4, 4, 0, 0]} maxBarSize={26} />
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
  const dados = linhas.map((l) => ({
    ...l,
    nome: sensivel ? primeiroNome(priv.nome(l.nome)) : priv.empresa(l.nome),
  }));
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={dados} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="4 4" stroke={COR_GRADE} horizontal={false} />
        <XAxis type="number" tick={eixo} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="nome"
          tick={eixo}
          width={130}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip {...tooltipStyle} cursor={{ fill: "oklch(0.963 0.005 258)" }} />
        <Bar
          dataKey={metrica as string}
          name={rotulo}
          fill={COR_OURO}
          radius={[0, 4, 4, 0]}
          maxBarSize={20}
        />
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
        <Pie
          data={dados}
          dataKey="value"
          nameKey="name"
          innerRadius={76}
          outerRadius={112}
          paddingAngle={3}
          cornerRadius={6}
        >
          {dados.map((d) => (
            <Cell key={d.name} fill={d.cor} stroke="oklch(1 0 0)" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} />
        <Legend {...legenda} />
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
        <CartesianGrid strokeDasharray="4 4" stroke={COR_GRADE} vertical={false} />
        <XAxis dataKey="periodo" tick={eixo} axisLine={eixoLinha} tickLine={false} />
        <YAxis tick={eixo} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} cursor={{ stroke: COR_GRADE }} />
        <Legend {...legenda} />
        <Line type="monotone" dataKey="presencas" name="Presenças" stroke={COR_PRESENCA} strokeWidth={2.25} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        <Line type="monotone" dataKey="faltas" name="Faltas" stroke={COR_FALTA} strokeWidth={2.25} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        <Line type="monotone" dataKey="cancelamentos" name="Cancelamentos" stroke={COR_CANCEL} strokeWidth={2.25} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}