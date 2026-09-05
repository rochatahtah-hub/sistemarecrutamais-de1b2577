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

type NodeId =
  Exclude<RecruitaAnimationState, "idle" | "loading" | "success" | "people"> | "resultado";

interface NetworkNode {
  id: NodeId;
  icon: LucideIcon;
  /** Rótulo curto — só os cards com informação de verdade mostram texto. */
  rotulo?: string;
  position: string;
}

/**
 * Sequência que sobe de baixo para cima, uma etapa aparecendo (pop-up) de cada vez, em loop
 * contínuo: nova vaga → agenda → candidato confirmado → resultado.
 */
const NODES: NetworkNode[] = [
  {
    id: "documents",
    icon: Briefcase,
    rotulo: "Nova oportunidade",
    position: "right-[10%] bottom-[8%]",
  },
  { id: "connection", icon: CalendarDays, position: "right-[19%] bottom-[30%]" },
  {
    id: "password",
    icon: CheckCircle2,
    rotulo: "Candidato confirmado",
    position: "right-[7%] bottom-[52%]",
  },
  { id: "resultado", icon: TrendingUp, position: "right-[18%] bottom-[74%]" },
];

/** Curva única em zigue-zague ligando as 4 etapas, de baixo para cima. */
const PATHS = ["M 84 92 C 68 84, 92 76, 78 66 C 64 56, 90 48, 76 38 C 62 28, 88 20, 74 10"];

/** Ramo curto até o card de "pessoa", ao fundo. */
const PATH_PESSOA = "M 74 10 C 56 4, 40 8, 26 16";

const PATH_LIGHT_1 = "M 6 90 C 30 66, 55 58, 62 40 C 68 24, 88 18, 94 8";
const PATH_LIGHT_2 = "M 62 40 C 48 46, 30 48, 20 62";

/** Cards discretos do lado claro — mesma linguagem visual do lado escuro, tom mais suave. */
const NODES_CLAROS: { icon: LucideIcon; position: string }[] = [
  { icon: Users, position: "right-[9%] top-[7%]" },
  { icon: CheckCircle2, position: "left-[10%] top-[46%]" },
  { icon: IdCard, position: "left-[6%] bottom-[9%]" },
];

function ativo(node: NodeId, state: RecruitaAnimationState) {
  if (state === "success") return node === "password" || node === "resultado";
  if (state === "loading") return true;
  return node === state;
}

/**
 * Camada decorativa "conexões em movimento": uma linha dourada em zigue-zague com pontos de
 * luz percorrendo-a lentamente, e cards que aparecem em pop-up um de cada vez (de baixo para
 * cima, em loop) contando a jornada nova vaga → agenda → confirmação → resultado. Ao fundo,
 * borrado, um card de "pessoa" ligado por um ramo da mesma linha. Puramente visual
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
          <g>
            <path className="recruta-network-path" d={PATH_LIGHT_1} pathLength="100" />
            <path
              className="recruta-network-signal recruta-network-signal-1"
              d={PATH_LIGHT_1}
              pathLength="100"
            />
          </g>
          <g>
            <path className="recruta-network-path" d={PATH_LIGHT_2} pathLength="100" />
            <path
              className="recruta-network-signal recruta-network-signal-2"
              d={PATH_LIGHT_2}
              pathLength="100"
            />
          </g>
        </svg>
        {NODES_CLAROS.map((node, i) => {
          const Icon = node.icon;
          return (
            <span
              key={i}
              className={`recruta-network-node recruta-network-node-light recruta-network-node-${i + 1} ${node.position}`}
            >
              <span className="recruta-network-node-icon">
                <Icon />
              </span>
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
        {!compact && (
          <g>
            <path className="recruta-network-path" d={PATH_PESSOA} pathLength="100" />
            <path
              className="recruta-network-signal recruta-network-signal-pessoa"
              d={PATH_PESSOA}
              pathLength="100"
            />
          </g>
        )}
      </svg>

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
            {node.rotulo ? <span className="recruta-network-node-label">{node.rotulo}</span> : null}
          </span>
        );
      })}

      {!compact && (
        <span className="recruta-network-node recruta-network-node-pessoa left-[18%] top-[10%]">
          <span className="recruta-network-node-icon">
            <Users />
          </span>
        </span>
      )}

      {state === "success" ? (
        <div className="recruta-network-success">
          <CheckCircle2 />
        </div>
      ) : null}
    </div>
  );
}
