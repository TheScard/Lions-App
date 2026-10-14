import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { CLUB_TIME_ZONE } from "@/lib/timezone";

// Saison: 1. August bis 31. Juli, in Europe/Berlin (nicht UTC) bestimmt --
// z.B. ist der 15. Juli 2027 (Ortszeit) noch Teil der Saison 2026/27.
export function seasonYearOf(iso: string): number {
  const [yearStr, monthStr] = formatInTimeZone(new Date(iso), CLUB_TIME_ZONE, "yyyy-MM").split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  return month >= 8 ? year : year - 1;
}

export function currentSeasonYear(): number {
  return seasonYearOf(new Date().toISOString());
}

export function seasonLabel(seasonYear: number): string {
  const endYearShort = String((seasonYear + 1) % 100).padStart(2, "0");
  return `Saison ${seasonYear}/${endYearShort}`;
}

/**
 * [start, end) als UTC-ISO-Timestamps: Beginn 1. August 00:00 Europe/Berlin
 * des Saisonjahres, Ende 1. August 00:00 Europe/Berlin des Folgejahres
 * (exklusiv) -- deckt damit exakt bis einschliesslich 31. Juli ab.
 */
export function seasonRange(seasonYear: number): { start: string; end: string } {
  return {
    start: fromZonedTime(`${seasonYear}-08-01T00:00`, CLUB_TIME_ZONE).toISOString(),
    end: fromZonedTime(`${seasonYear + 1}-08-01T00:00`, CLUB_TIME_ZONE).toISOString(),
  };
}
