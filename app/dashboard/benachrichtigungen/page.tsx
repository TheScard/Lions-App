import { requireSession } from "@/lib/auth/guards";
import { NotificationSettings } from "@/components/NotificationSettings";

export default async function NotificationsPage() {
  await requireSession();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl text-text">Benachrichtigungen</h1>
      <NotificationSettings />
    </div>
  );
}
