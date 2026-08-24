import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-bg px-6">
      {/* Dezenter Spotlight-Glow im Hintergrund -- rein dekorativ. */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[120px]"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-[0_0_60px_-14px_var(--color-primary)]">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Image
            src="/logo.jpg"
            alt="Lions Adenau Logo"
            width={104}
            height={104}
            priority
            className="rounded-full ring-4 ring-primary shadow-[0_0_30px_-4px_var(--color-primary)]"
          />
          <h1 className="text-4xl text-text">Lions Adenau</h1>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-text-muted">
            Anmelden
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
