import Image from "next/image";
import Link from "next/link";
import { Bell, FileText, KeyRound, Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { BottomNav } from "@/components/BottomNav";
import { LogoutButton } from "@/components/LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const canManage =
    session.role === "admin" || session.role === "vorstand" || session.role === "coach";

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="relative flex items-center justify-between border-b border-primary/30 bg-gradient-to-b from-surface to-bg px-4 py-3 shadow-[0_1px_0_0_rgba(240,96,8,0.35)]">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo.jpg"
            alt="Lions Adenau"
            width={34}
            height={34}
            className="rounded-full ring-2 ring-primary/60"
          />
          <div>
            <p className="font-heading text-sm italic font-bold uppercase leading-none tracking-wide text-text">
              Lions Adenau
            </p>
            <p className="mt-1 text-xs text-text-muted">Hallo, {session.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/dashboard/benachrichtigungen"
            aria-label="Benachrichtigungen"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-text-muted transition hover:bg-surface-2 hover:text-primary"
          >
            <Bell size={18} />
          </Link>
          <Link
            href="/dashboard/documents"
            aria-label="Dokumente"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-text-muted transition hover:bg-surface-2 hover:text-primary"
          >
            <FileText size={18} />
          </Link>
          <Link
            href="/dashboard/account"
            aria-label="Eigene PIN ändern"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-text-muted transition hover:bg-surface-2 hover:text-primary"
          >
            <KeyRound size={18} />
          </Link>
          {canManage && (
            <Link
              href="/admin"
              aria-label="Verwaltung"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-text-muted transition hover:bg-surface-2 hover:text-primary"
            >
              <Settings size={18} />
            </Link>
          )}
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 px-4 py-4 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
