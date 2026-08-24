import type { Team } from "@/types/database";

const TEAM_LABELS: Record<Team, string> = {
  herren: "Herren",
  u16: "U16",
};

// Bewusst KEIN Orange (das ist im restlichen UI fuer CTAs/aktive Zustaende
// reserviert) -- zwei dezente, aber klar unterscheidbare Akzentfarben.
const TEAM_STYLES: Record<Team, string> = {
  herren: "border-slate-500/30 bg-slate-500/15 text-slate-300",
  u16: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
};

export function TeamBadge({ team }: { team: Team }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TEAM_STYLES[team]}`}
    >
      {TEAM_LABELS[team]}
    </span>
  );
}
