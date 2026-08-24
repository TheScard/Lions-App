import { requireSession } from "@/lib/auth/guards";
import { ChangePinForm } from "@/components/ChangePinForm";

export default async function AccountPage() {
  await requireSession();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl text-text">Eigene PIN ändern</h1>
      <ChangePinForm />
    </div>
  );
}
