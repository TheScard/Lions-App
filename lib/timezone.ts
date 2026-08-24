import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

// Der Verein ist ausschliesslich in Deutschland aktiv, daher fest verdrahtet
// statt konfigurierbar.
export const CLUB_TIME_ZONE = "Europe/Berlin";

/**
 * Interpretiert einen <input type="datetime-local">-Wert (z.B.
 * "2026-09-15T18:30", ohne Zeitzoneninfo) als Ortszeit im Verein
 * (Europe/Berlin) und gibt den entsprechenden UTC-Zeitpunkt zurueck.
 * Dadurch bleibt starts_at unabhaengig von der Zeitzone des
 * Server-/Deploy-Prozesses immer korrekt (statt vom naiven `new Date(...)`
 * abzuhaengen, das die Server-Zeitzone annimmt).
 */
export function parseLocalInputAsUtc(localValue: string): Date {
  return fromZonedTime(localValue, CLUB_TIME_ZONE);
}

/**
 * Kehrt parseLocalInputAsUtc um: erzeugt aus einem UTC-ISO-Timestamp
 * (starts_at) den Wert fuer ein <input type="datetime-local"> in
 * Europe/Berlin-Ortszeit, zum Vorbefuellen von Bearbeiten-Formularen.
 */
export function toLocalInputValue(iso?: string): string {
  if (!iso) return "";
  return formatInTimeZone(new Date(iso), CLUB_TIME_ZONE, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Addiert `weeks` Wochen auf den Datumsanteil eines <input
 * type="datetime-local">-Werts (z.B. "2026-09-15T18:30"), ohne die Uhrzeit
 * zu veraendern. Reine Kalenderrechnung ueber Date.UTC (keine Interpretation
 * als Berlin-Ortszeit noetig), damit die Uhrzeit bei woechentlich
 * wiederholten Terminen ueber DST-Wechsel hinweg stabil bleibt (z.B. "immer
 * dienstags 18:00", nicht "immer 18:00 UTC+X").
 */
/**
 * Vergleicht zwei UTC-ISO-Timestamps auf Kalendertag-Gleichheit in
 * Europe/Berlin (nicht UTC) -- "am selben Tag" ist ein Ortszeit-Konzept,
 * ein reiner UTC-Datumsvergleich koennte abends/nachts um Mitternacht
 * herum einen falschen Tag liefern.
 */
export function isSameLocalDay(aIso: string, bIso: string): boolean {
  const format = (iso: string) => formatInTimeZone(new Date(iso), CLUB_TIME_ZONE, "yyyy-MM-dd");
  return format(aIso) === format(bIso);
}

export function addWeeksToLocalInputValue(localValue: string, weeks: number): string {
  const [datePart, timePart] = localValue.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  return `${date.toISOString().slice(0, 10)}T${timePart}`;
}
