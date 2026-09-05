import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FileText,
  Link2,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type RecruitaAnimationState =
  | "idle"
  | "people"
  | "documents"
  | "connection"
  | "password"
  | "loading"
  | "success";

interface RecruitaNetworkAnimationProps {
  state?: RecruitaAnimationState;
  compact?: boolean;
  className?: string;
}

interface NetworkNode {
  id: Exclude<RecruitaAnimationState, "idle" | "loading" | "success"> | "schedule" | "results";
  label: string;
  icon: LucideIcon;
  position: string;
}

const NODES: NetworkNode[] = [
  { id: "people", label: "Pessoas", icon: Users, position: "left-[5%] top-[11%]" },
  { id: "schedule", label: "Programações", icon: CalendarDays, position: "right-[4%] top-[25%]" },
  { id: "documents", label: "Documentos", icon: FileText, position: "left-[10%] top-[48%]" },
  { id: "connection", label: "Conexão", icon: Link2, position: "right-[9%] top-[59%]" },
  { id: "password", label: "Confiança", icon: ShieldCheck, position: "left-[18%] bottom-[8%]" },
  { id: "results", label: "Resultados", icon: BarChart3, position: "right-[4%] bottom-[4%]" },
];

const PATHS = [
  "M 17 17 C 35 8, 52 22, 79 30",
  "M 17 17 C 7 38, 15 45, 20 52",
  "M 20 52 C 44 47, 55 57, 75 63",
  "M 79 30 C 91 43, 83 53, 75 63",
  "M 20 52 C 16 65, 21 76, 30 84",
  "M 30 84 C 50 74, 65 86, 82 88",
  "M 75 63 C 81 72, 82 80, 82 88",
];

function ativo(node: NetworkNode["id"], state: RecruitaAnimationState) {
  if (state === "success") return node === "results" || node === "password";
  if (state === "loading") return true;
  return node === state;
}

export function RecruitaNetworkAnimation({
  state = "idle",
  compact = false,
  className = "",
}: RecruitaNetworkAnimationProps) {
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
          <div
            key={node.id}
            className={`recruta-network-node ${node.position} ${ativo(node.id, state) ? "is-active" : ""}`}
            style={{ animationDelay: `${index * -0.7}s` }}
          >
            <span className="recruta-network-icon"><Icon /></span>
            <span className="recruta-network-label">{node.label}</span>
          </div>
        );
      })}

      <span className="recruta-network-particle left-[31%] top-[25%]" />
      <span className="recruta-network-particle right-[22%] top-[48%] [animation-delay:-2.1s]" />
      <span className="recruta-network-particle bottom-[19%] left-[47%] [animation-delay:-4.2s]" />

      {state === "success" ? (
        <div className="recruta-network-success">
          <CheckCircle2 />
        </div>
      ) : null}
    </div>
  );
}