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

export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
