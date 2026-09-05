import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  IdCard,
  ShieldCheck,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

export type RecruitaAnimationState =
  "idle" | "people" | "documents" | "connection" | "password" | "loading" | "success";

interface RecruitaNetworkAnimationProps {
  state?: RecruitaAnimationState;
  compact?: boolean;
  /** "dark" (padrão, lado escuro) ou "light" — versão mínima (linha + silhuetas) para fundo claro. */
  tone?: "dark" | "light";
  className?: string;
}

type NodeId = Exclude<RecruitaAnimationState, "idle" | "loading" | "success"> | "resultado";

interface NetworkNode {
  id: NodeId;
  icon: LucideIcon;
  /** Rótulo curto, sempre visível — igual à referência (cards com ícone + texto). */
  rotulo: string;
  position: string;
}

/**
 * Cascata de cards descendo pelo lado direito do painel escuro, ligados por uma única
 * linha dourada — igual à referência: pessoa → vaga → agenda → confirmado → resultado.
 */
const NODES: NetworkNode[] = [
  { id: "people", icon: Users, rotulo: "Pessoas", position: "right-[14%] top-[8%]" },
  { id: "documents", icon: Briefcase, rotulo: "Nova vaga", position: "right-[6%] top-[27%]" },
  { id: "connection", icon: CalendarDays, rotulo: "Agenda", position: "right-[16%] top-[47%]" },
  { id: "password", icon: ShieldCheck, rotulo: "Confirmado", position: "right-[5%] bottom-[16%]" },
  { id: "resultado", icon: TrendingUp, rotulo: "Resultados", position: "right-[17%] bottom-[3%]" },
];

/** Uma única curva descendo ao lado dos cards, ligando-os em sequência. */
const PATHS = [
  "M 82 10 C 68 18, 92 24, 78 32 C 64 40, 90 44, 82 52 C 74 60, 92 66, 80 78 C 72 86, 90 90, 84 94",
];

const PATHS_LIGHT = ["M 6 88 C 32 62, 66 46, 96 12"];

/** Silhuetas discretas ao fundo — só textura, sem estado nem rótulo. */
const FANTASMAS_ESCUROS = [
  { icon: Users, position: "left-[22%] top-[14%]" },
  { icon: Users, position: "left-[30%] bottom-[22%]" },
  { icon: IdCard, position: "left-[12%] top-[55%]" },
];

const FANTASMAS_CLAROS = [
  { icon: Users, position: "right-[16%] top-[10%]" },
  { icon: IdCard, position: "right-[6%] bottom-[8%]" },
];

function ativo(node: NodeId, state: RecruitaAnimationState) {
  if (state === "success") return node === "password" || node === "resultado";
  if (state === "loading") return true;
  return node === state;
}

/**
 * Camada decorativa "conexões em movimento": uma linha dourada orgânica com pontos de luz
 * percorrendo-a lentamente, cards com ícone + rótulo contando a jornada pessoa → vaga →
 * agenda → confirmação → resultado, e silhuetas discretas ao fundo. Puramente visual
 * (aria-hidden) — não representa nem altera nenhum dado do formulário.
 */
export function RecruitaNetworkAnimation({
  state = "idle",
  compact = false,
  tone = "dark",
  className = "",
}: RecruitaNetworkAnimationProps) {
  if (tone === "light") {
    return (
      <div aria-hidden="true" className={`recruta-network recruta-network-light ${className}`}>
        <svg className="recruta-network-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path className="recruta-network-path" d={PATHS_LIGHT[0]} pathLength="100" />
          <path
            className="recruta-network-signal recruta-network-signal-1"
            d={PATHS_LIGHT[0]}
            pathLength="100"
          />
        </svg>
        {FANTASMAS_CLAROS.map((f, i) => {
          const Icon = f.icon;
          return (
            <span
              key={i}
              className={`recruta-network-ghost recruta-network-ghost-${i + 1} ${f.position}`}
            >
              <Icon />
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      data-state={state}
      className={`recruta-network pointer-events-none select-none ${compact ? "recruta-network-compact" : ""} ${className}`}
    >
      <svg className="recruta-network-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        {PATHS.map((path, index) => (
          <g key={path}>
            <path className="recruta-network-path" d={path} pathLength="100" />
            <path
              className={`recruta-network-signal recruta-network-signal-${index + 1}`}
              d={path}
              pathLength="100"
            />
          </g>
        ))}
      </svg>

      {!compact &&
        FANTASMAS_ESCUROS.map((f, i) => {
          const Icon = f.icon;
          return (
            <span
              key={i}
              className={`recruta-network-ghost recruta-network-ghost-${i + 1} ${f.position}`}
            >
              <Icon />
            </span>
          );
        })}

      {NODES.map((node, index) => {
        const Icon = node.icon;
        return (
          <span
            key={node.id}
            className={`recruta-network-node recruta-network-node-${index + 1} ${node.position} ${ativo(node.id, state) ? "is-active" : ""}`}
          >
            <span className="recruta-network-node-icon">
              <Icon />
            </span>
            <span className="recruta-network-node-label">{node.rotulo}</span>
          </span>
        );
      })}

      {state === "success" ? (
        <div className="recruta-network-success">
          <CheckCircle2 />
        </div>
      ) : null}
    </div>
  );
}
