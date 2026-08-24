import Link from "next/link";
import { TeamBadge } from "@/components/TeamBadge";
import type { Team } from "@/types/database";

export function NextUpCard({
  href,
  kicker,
  title,
  dateTime,
  location,
  team,
  children,
}: {
  href: string;
  kicker: string;
  title: string;
  dateTime?: string;
  location?: string | null;
  team?: Team;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface py-4 pl-5 pr-4 shadow-lg shadow-black/30">
      <span
        className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-primary-active"
        aria-hidden="true"
      />
      <Link href={href} className="block">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">{kicker}</p>
          {team && <TeamBadge team={team} />}
        </div>
        <p className="mt-1 font-heading text-lg italic font-bold uppercase tracking-wide text-text">
          {title}
        </p>
        {dateTime && <p className="mt-1 text-sm text-text-muted">{dateTime}</p>}
        {location && <p className="mt-1 text-sm text-text-muted">{location}</p>}
      </Link>
      {children}
    </div>
  );
}
