import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDateTime, mapsUrl } from "@/lib/format";
import { isPast } from "@/lib/schedule";
import { TeamBadge } from "@/components/TeamBadge";

export default async function MatchDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!match) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl text-text">{match.title}</h1>
          <TeamBadge team={match.team} />
        </div>
        <p className="mt-1 text-sm text-text-muted">{formatDateTime(match.starts_at)}</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-wide text-text-muted">Ort</p>
        <p className="mt-1 font-medium text-text">{match.location_name}</p>
        <a
          href={mapsUrl(match.location_address)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-sm text-primary underline underline-offset-2"
        >
          {match.location_address}
        </a>
      </div>

      {isPast(match.starts_at) && match.result && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Ergebnis</p>
          <p className="mt-1 font-medium text-text">{match.result}</p>
        </div>
      )}

      <Link
        href={`/dashboard/carpools?match_id=${match.id}`}
        className="rounded-xl border border-dashed border-primary/40 bg-surface p-4 text-center text-sm font-medium text-primary"
      >
        Fahrgemeinschaften zu diesem Spiel ansehen
      </Link>
    </div>
  );
}
