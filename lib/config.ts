// Standardwerte fuer das optionale "Mindestanzahl Zusagen"-Feld bei
// Trainings/Spielen -- werden beim Anlegen vorbelegt, aendern bestehende
// Termine aber nicht.
export const DEFAULT_MIN_TRAINING = 8;
export const DEFAULT_MIN_MATCH = 8;

export const MIN_PARTICIPANTS_LOWER_BOUND = 1;
export const MIN_PARTICIPANTS_UPPER_BOUND = 30;

/**
 * Parst das optionale "Mindestanzahl Zusagen"-Feld (leer = kein Minimum).
 * Gemeinsam von Trainings- und Spiel-Actions verwendet, damit die
 * Validierung (ganze Zahl 1-30) an beiden Stellen identisch ist.
 */
export function parseMinParticipants(raw: string): { value: number | null } | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null };

  const value = Number(trimmed);
  if (
    !Number.isInteger(value) ||
    value < MIN_PARTICIPANTS_LOWER_BOUND ||
    value > MIN_PARTICIPANTS_UPPER_BOUND
  ) {
    return {
      error: `Mindestanzahl muss eine ganze Zahl von ${MIN_PARTICIPANTS_LOWER_BOUND} bis ${MIN_PARTICIPANTS_UPPER_BOUND} sein (oder leer).`,
    };
  }
  return { value };
}
