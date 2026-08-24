import Link from "next/link";

const LINKS = [
  { href: "/admin/matches", label: "Spiele verwalten" },
  { href: "/admin/events", label: "Events verwalten" },
  { href: "/admin/trainings", label: "Trainings verwalten" },
  { href: "/admin/board", label: "Vorstand verwalten" },
  { href: "/admin/members", label: "Mitglieder verwalten" },
] as const;

export default function AdminOverviewPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl text-text">Verwaltung</h1>
      <div className="flex flex-col gap-3">
        {LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg border border-border border-l-4 border-l-primary bg-surface p-4 font-heading text-base italic font-bold uppercase tracking-wide text-text shadow-lg shadow-black/30 transition hover:border-l-primary-hover hover:bg-surface-2"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
