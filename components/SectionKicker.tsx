export function SectionKicker({ label, accent = false }: { label: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`accent-bar ${accent ? "" : "opacity-40 grayscale"}`}
        aria-hidden="true"
      />
      <h2
        className={`text-xs font-bold uppercase tracking-[0.15em] ${
          accent ? "text-primary" : "text-text-muted"
        }`}
      >
        {label}
      </h2>
    </div>
  );
}
