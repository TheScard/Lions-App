import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Basis-Zugriff: admin + vorstand. Einzelne Unterseiten (z.B.
  // /admin/members) pruefen bei Bedarf zusaetzlich strenger.
  await requireRole(["admin", "vorstand"]);

  return (
    <div className="min-h-dvh bg-bg">
      <header className="flex items-center justify-between border-b border-primary/30 bg-gradient-to-b from-surface to-bg px-4 py-3 shadow-[0_1px_0_0_rgba(240,96,8,0.35)]">
        <Link
          href="/admin"
          className="font-heading text-sm italic font-bold uppercase tracking-wide text-text"
        >
          Verwaltung
        </Link>
        <Link href="/dashboard" className="text-sm text-text-muted transition hover:text-primary">
          Zur App
        </Link>
      </header>
      <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
    </div>
  );
}
