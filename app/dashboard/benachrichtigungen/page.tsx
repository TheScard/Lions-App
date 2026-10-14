import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { NotificationSettings } from "@/components/NotificationSettings";

export default async function NotificationsPage() {
  await requireSession();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-3xl text-text">Benachrichtigungen</h1>
        <Link href="/dashboard/start" className="text-sm font-medium text-primary hover:underline">
          Anleitung ansehen
        </Link>
      </div>
      <NotificationSettings />
    </div>
  );
}
