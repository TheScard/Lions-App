import { requireSession } from "@/lib/auth/guards";
import { OnboardingStart } from "@/components/OnboardingStart";

export default async function OnboardingStartPage() {
  await requireSession();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl text-text">Willkommen bei Lions Adenau</h1>
        <p className="mt-1 text-sm text-text-muted">
          Drei kurze Schritte, damit du nichts verpasst.
        </p>
      </div>
      <OnboardingStart />
    </div>
  );
}
