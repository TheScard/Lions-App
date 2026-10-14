import { CLUB_TIME_ZONE } from "@/lib/timezone";

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: CLUB_TIME_ZONE,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// Fuer Push-Benachrichtigungstexte, z.B. "Sa., 17.10.2026, 18:00 Uhr".
export function formatPushDateTime(iso: string): string {
  return `${formatDateTime(iso)} Uhr`;
}

export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
