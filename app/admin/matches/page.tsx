import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { isPast } from "@/lib/schedule";
import { deleteMatch } from "@/app/admin/matches/actions";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { TeamBadge } from "@/components/TeamBadge";

export default async function AdminMatchesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("starts_at", { ascending: true });

  const rows = matches ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl text-text">Spiele verwalten</h1>
        <Link
          href="/admin/matches/new"
          className="rounded-md bg-gradient-to-r from-primary-hover to-primary font-heading italic font-bold uppercase tracking-wide text-bg shadow-[0_4px_16px_-4px_var(--color-primary)] transition hover:brightness-105 hover:shadow-[0_4px_24px_-2px_var(--color-primary)] px-3 py-1.5 text-sm"
        >
          + Neu
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {rows.length === 0 && (
          <p className="text-sm text-text-muted">Noch keine Spiele angelegt.</p>
        )}
        {rows.map((match) => (
          <div key={match.id} className="rounded-lg border border-border border-l-4 border-l-primary bg-surface p-4 shadow-lg shadow-black/30">
            <div className="flex items-start justify-between gap-2">
              <p className="font-heading text-base italic font-bold uppercase tracking-wide text-text">
                {match.title}
              </p>
              <TeamBadge team={match.team} />
            </div>
            <p className="mt-1 text-sm text-text-muted">{formatDateTime(match.starts_at)}</p>
            <p className="mt-1 text-sm text-text-muted">{match.location_name}</p>
            {isPast(match.starts_at) && (
              <p className="mt-1 text-sm text-primary">Ergebnis: {match.result ?? "—"}</p>
            )}
            <div className="mt-3 flex items-center gap-4">
              <Link
                href={`/admin/matches/${match.id}/edit`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Bearbeiten
              </Link>
              <ConfirmSubmitButton
                action={deleteMatch.bind(null, match.id)}
                label="Löschen"
                confirmMessage="Spiel wirklich löschen?"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
