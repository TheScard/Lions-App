"use client";

import { useRouter } from "next/navigation";
import { formatDateTime, mapsUrl } from "@/lib/format";
import { isPast } from "@/lib/schedule";
import { TeamBadge } from "@/components/TeamBadge";
import { RsvpSection } from "@/components/RsvpSection";
import { RsvpCount } from "@/components/RsvpCount";
import { setMatchRsvp } from "@/app/dashboard/matches/actions";
import type { Database, RsvpStatus, Team } from "@/types/database";

type Match = Database["public"]["Tables"]["matches"]["Row"];

// Kein <Link>, da die Adresse selbst ein separater klickbarer Link (Google
// Maps) ist -- verschachtelte <a>-Elemente sind ungueltiges HTML. Die Karte
// navigiert stattdessen per Klick/Enter, der Maps-Link stoppt die
// Propagation, damit er die Karten-Navigation nicht mit ausloest.
export function MatchCard({
  match,
  yesCount,
  myStatus,
  myTeam,
  canSeeMin = false,
}: {
  match: Match;
  yesCount: number;
  myStatus: RsvpStatus | null;
  myTeam: Team | null;
  canSeeMin?: boolean;
}) {
  const router = useRouter();
  const href = `/dashboard/matches/${match.id}`;
  const upcoming = !isPast(match.starts_at);

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(event) => {
        if (event.key === "Enter") router.push(href);
      }}
      className="group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-surface py-4 pl-5 pr-4 shadow-lg shadow-black/30 transition hover:border-primary/50"
    >
      <span
        className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-primary-active"
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-2">
        <p className="font-heading text-base italic font-bold uppercase tracking-wide text-text">
          {match.title}
        </p>
        <TeamBadge team={match.team} />
      </div>
      <p className="mt-1 text-sm text-text-muted">{formatDateTime(match.starts_at)}</p>
      <p className="mt-1 text-sm text-text-muted">{match.location_name}</p>
      <a
        href={mapsUrl(match.location_address)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        className="mt-1 inline-block text-sm text-primary underline underline-offset-2"
      >
        {match.location_address}
      </a>
      {isPast(match.starts_at) && match.result && (
        <p className="mt-2 inline-block rounded-full border border-primary/40 bg-gradient-to-r from-primary/25 to-primary/5 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-primary shadow-[0_0_10px_-4px_var(--color-primary)]">
          Ergebnis: {match.result}
        </p>
      )}

      {upcoming && (
        <>
          <div className="mt-1">
            <RsvpCount
              count={yesCount}
              min={match.min_participants}
              canSeeMin={canSeeMin}
              isFuture={upcoming}
            />
          </div>
          <div className="mt-3" onClick={(event) => event.stopPropagation()}>
            <RsvpSection
              myTeam={myTeam}
              eventTeam={match.team}
              started={false}
              myStatus={myStatus}
              yesAction={setMatchRsvp.bind(null, match.id, "yes")}
              noAction={setMatchRsvp.bind(null, match.id, "no")}
            />
          </div>
        </>
      )}
    </div>
  );
}
