import { formatInTimeZone } from "date-fns-tz";
import { CLUB_TIME_ZONE } from "@/lib/timezone";

/**
 * Situative Tageszeit-Anrede, basierend auf der aktuellen Uhrzeit in
 * Europe/Berlin (nicht der Server-Zeitzone -- gleicher Ansatz wie bei
 * parseLocalInputAsUtc/toLocalInputValue).
 */
export function getTimeOfDayGreeting(date: Date = new Date()): string {
  const hour = Number(formatInTimeZone(date, CLUB_TIME_ZONE, "H"));
  if (hour >= 5 && hour < 11) return "Guten Morgen";
  if (hour >= 11 && hour < 18) return "Guten Tag";
  return "Guten Abend";
}
