import {
  CalendarDays,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type RecruitaAnimationState =
  "idle" | "people" | "documents" | "connection" | "password" | "loading" | "success";

interface RecruitaNetworkAnimationProps {
  state?: RecruitaAnimationState;
  compact?: boolean;
  /** "dark" (padrão, lado escuro) ou "light" — versão mínima (só linha + ponto) para fundo claro. */
  tone?: "dark" | "light";
  className?: string;
}

interface NetworkNode {
  id: Exclude<RecruitaAnimationState, "idle" | "loading" | "success">;
  icon: LucideIcon;
  position: string;
}

/**
 * Poucos elementos, nos cantos/espaços vazios — nunca sobre o título ou o formulário.
 * Cada um representa uma etapa do Recruta+: pessoa → vaga → calendário → confirmação.
 */
const NODES: NetworkNode[] = [
  { id: "people", icon: Users, position: "right-[10%] top-[6%]" },
  { id: "connection", icon: CalendarDays, position: "right-[6%] top-[42%]" },
  { id: "password", icon: ShieldCheck, position: "right-[12%] bottom-[18%]" },
  { id: "documents", icon: FileText, position: "left-[6%] bottom-[14%]" },
];

/** Curvas suaves e esparsas — não um fluxograma. */
const PATHS = [
  "M 88 10 C 68 22, 90 32, 84 44",
  "M 84 44 C 62 56, 74 74, 86 84",
  "M 10 82 C 34 66, 55 58, 84 44",
];

const PATHS_LIGHT = ["M 6 88 C 32 62, 66 46, 96 12"];

function ativo(node: NetworkNode["id"], state: RecruitaAnimationState) {
  if (state === "success") return node === "password";
  if (state === "loading") return true;
  return node === state;
}

/**
 * Camada decorativa "conexões em movimento": linhas douradas orgânicas com pontos de luz
 * percorrendo-as lentamente, e poucos ícones flutuando de forma independente e discreta.
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

      {NODES.map((node, index) => {
        const Icon = node.icon;
        return (
          <span
            key={node.id}
            className={`recruta-network-node recruta-network-node-${index + 1} ${node.position} ${ativo(node.id, state) ? "is-active" : ""}`}
          >
            <Icon />
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
