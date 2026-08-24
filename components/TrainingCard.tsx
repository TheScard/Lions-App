import Link from "next/link";
import { Users } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { setRsvp } from "@/app/dashboard/trainings/actions";
import { TeamBadge } from "@/components/TeamBadge";
import type { Database, RsvpStatus } from "@/types/database";

type Training = Database["public"]["Tables"]["trainings"]["Row"];

export function TrainingCard({
  training,
  yesCount,
  myStatus,
  canViewRsvps = false,
}: {
  training: Training;
  yesCount: number;
  myStatus: RsvpStatus | null;
  canViewRsvps?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface py-4 pl-5 pr-4 shadow-lg shadow-black/30">
      <span
        className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-primary-active"
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/dashboard/trainings/${training.id}`}
          className="font-heading text-base italic font-bold uppercase tracking-wide text-text hover:text-primary"
        >
          {training.title}
        </Link>
        <TeamBadge team={training.team} />
      </div>
      <p className="mt-1 text-sm text-text-muted">{formatDateTime(training.starts_at)}</p>
      {training.location && <p className="mt-1 text-sm text-text-muted">{training.location}</p>}
      <p className="mt-1 text-sm text-text-muted">{yesCount} Zusagen</p>

      {canViewRsvps && (
        <Link
          href={`/admin/trainings/${training.id}/rsvps`}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <Users size={16} />
          Wer hat zugesagt?
        </Link>
      )}

      <div className="mt-3 flex items-center gap-2">
        <form action={setRsvp.bind(null, training.id, "yes")}>
          <button
            type="submit"
            className={`rounded-md px-3 py-1.5 text-sm font-bold uppercase tracking-wide transition ${
              myStatus === "yes"
                ? "bg-gradient-to-r from-primary-hover to-primary text-bg shadow-[0_4px_14px_-4px_var(--color-primary)]"
                : "border border-border text-text-muted hover:border-primary/50 hover:text-text"
            }`}
          >
            Zusagen
          </button>
        </form>
        <form action={setRsvp.bind(null, training.id, "no")}>
          <button
            type="submit"
            className={`rounded-md px-3 py-1.5 text-sm font-bold uppercase tracking-wide transition ${
              myStatus === "no"
                ? "border border-danger/40 bg-danger-bg text-danger"
                : "border border-border text-text-muted hover:border-primary/50 hover:text-text"
            }`}
          >
            Absagen
          </button>
        </form>
      </div>
    </div>
  );
}
