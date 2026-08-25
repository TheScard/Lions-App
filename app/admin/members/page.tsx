import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { changeRole, changeTeam, deleteMember } from "@/app/admin/members/actions";
import { ResetPinButton } from "@/components/admin/ResetPinButton";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { TeamBadge } from "@/components/TeamBadge";
import { CLUB_TIME_ZONE } from "@/lib/timezone";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: CLUB_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requireRole(["admin", "coach", "vorstand"]);

  const supabase = await createServerSupabaseClient();
  const { data: members } = await supabase
    .from("members")
    .select("id, name, role, team, created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl text-text">Mitgliederverwaltung</h1>
        <Link
          href="/admin/members/new"
          className="rounded-md bg-gradient-to-r from-primary-hover to-primary font-heading italic font-bold uppercase tracking-wide text-bg shadow-[0_4px_16px_-4px_var(--color-primary)] transition hover:brightness-105 hover:shadow-[0_4px_24px_-2px_var(--color-primary)] px-3 py-1.5 text-sm"
        >
          + Neu
        </Link>
      </div>

      {searchParams.error && (
        <p className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{searchParams.error}</p>
      )}

      <div className="flex flex-col gap-3">
        {(members ?? []).length === 0 && (
          <p className="text-sm text-text-muted">Noch keine Mitglieder angelegt.</p>
        )}
        {(members ?? []).map((member) => (
          <div key={member.id} className="rounded-lg border border-border border-l-4 border-l-primary bg-surface p-4 shadow-lg shadow-black/30">
            <div className="flex items-center justify-between">
              <p className="font-heading text-base italic font-bold uppercase tracking-wide text-text">{member.name}</p>
              <div className="flex items-center gap-2">
                {member.team && <TeamBadge team={member.team} />}
                <span className="rounded-full border border-primary/40 bg-gradient-to-r from-primary/25 to-primary/5 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-primary">
                  {member.role}
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs text-text-muted">Seit {formatDate(member.created_at)}</p>

            <div className="mt-3 flex flex-wrap items-center gap-4">
              <ResetPinButton memberId={member.id} />

              <form action={changeRole.bind(null, member.id)} className="flex items-center gap-2">
                <select
                  name="role"
                  defaultValue={member.role}
                  className="appearance-none rounded-lg border border-border bg-surface-2 px-2 py-1 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="member">Mitglied</option>
                  <option value="vorstand">Vorstand</option>
                  <option value="coach">Coach</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="submit" className="text-sm font-medium text-primary hover:underline">
                  Ändern
                </button>
              </form>

              <form action={changeTeam.bind(null, member.id)} className="flex items-center gap-2">
                <select
                  name="team"
                  defaultValue={member.team ?? ""}
                  className="appearance-none rounded-lg border border-border bg-surface-2 px-2 py-1 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Kein Team</option>
                  <option value="herren">Herren</option>
                  <option value="u16">U16</option>
                </select>
                <button type="submit" className="text-sm font-medium text-primary hover:underline">
                  Ändern
                </button>
              </form>

              <ConfirmSubmitButton
                action={deleteMember.bind(null, member.id)}
                label="Löschen"
                confirmMessage={`Mitglied "${member.name}" wirklich löschen?`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
