import {
  CalendarDays,
  CheckCircle2,
  FileText,
  IdCard,
  ShieldCheck,
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

interface NetworkNode {
  id: Exclude<RecruitaAnimationState, "idle" | "loading" | "success">;
  icon: LucideIcon;
  /** Rótulo curto, só aparece enquanto o card está ativo. */
  rotulo: string;
  position: string;
}

/**
 * Poucos elementos, nos cantos/espaços vazios — nunca sobre o título ou o formulário.
 * Cada um representa uma etapa do Recruta+: pessoa → vaga → calendário → confirmação.
 */
const NODES: NetworkNode[] = [
  { id: "people", icon: Users, rotulo: "Pessoas", position: "right-[12%] top-[6%]" },
  { id: "connection", icon: CalendarDays, rotulo: "Agenda", position: "right-[6%] top-[40%]" },
  { id: "password", icon: ShieldCheck, rotulo: "Confirmado", position: "right-[14%] bottom-[18%]" },
  { id: "documents", icon: FileText, rotulo: "Nova vaga", position: "left-[6%] bottom-[14%]" },
];

/** Curvas suaves e esparsas — não um fluxograma. */
const PATHS = [
  "M 88 10 C 68 22, 90 32, 84 44",
  "M 84 44 C 62 56, 74 74, 86 84",
  "M 10 82 C 34 66, 55 58, 84 44",
];

const PATHS_LIGHT = ["M 6 88 C 32 62, 66 46, 96 12"];

/** Silhuetas bem discretas ao fundo — só textura, sem estado nem rótulo. */
const FANTASMAS_ESCUROS = [
  { icon: Users, position: "left-[24%] top-[16%]" },
  { icon: Users, position: "right-[26%] top-[70%]" },
  { icon: IdCard, position: "left-[15%] top-[62%]" },
];

const FANTASMAS_CLAROS = [
  { icon: Users, position: "right-[16%] top-[10%]" },
  { icon: IdCard, position: "right-[6%] bottom-[8%]" },
];

function ativo(node: NetworkNode["id"], state: RecruitaAnimationState) {
  if (state === "success") return node === "password";
  if (state === "loading") return true;
  return node === state;
}

/**
 * Camada decorativa "conexões em movimento": linhas douradas orgânicas com pontos de luz
 * percorrendo-as lentamente, cards pequenos com ícone (+ rótulo só quando ativos) contando
 * a jornada pessoa → vaga → calendário → confirmação, e silhuetas discretas ao fundo.
 * Puramente visual (aria-hidden) — não representa nem altera nenhum dado do formulário.
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
        <>
          <div className="recruta-network-success">
            <CheckCircle2 />
          </div>
          <div className="recruta-network-result" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </>
      ) : null}
    </div>
  );
}
