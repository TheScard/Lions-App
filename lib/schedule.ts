export function isPast(dateIso: string): boolean {
  return new Date(dateIso).getTime() < Date.now();
}

// Erwartet `items` bereits aufsteigend nach dem Datumsfeld sortiert (z.B.
// via `.order("starts_at", { ascending: true })`). "Anstehend" behaelt
// diese Reihenfolge (naechster Termin zuerst), "Vergangen" wird umgedreht,
// damit dort der juengste Termin zuerst erscheint.
export function splitUpcomingPast<T, K extends keyof T>(items: T[], dateKey: K) {
  const now = Date.now();
  const upcoming: T[] = [];
  const past: T[] = [];
  for (const item of items) {
    (new Date(item[dateKey] as string).getTime() >= now ? upcoming : past).push(item);
  }
  past.reverse();
  return { upcoming, past };
}
