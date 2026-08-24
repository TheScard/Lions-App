import "server-only";
import { readdirSync } from "node:fs";
import path from "node:path";

export interface DocumentFile {
  filename: string;
  displayName: string;
}

/**
 * Leitet aus einem Dateinamen einen lesbaren Anzeigenamen ab: entfernt
 * einen fuehrenden Zeitstempel-Prefix (z.B. "1759824150_"), ersetzt
 * Unterstriche durch Leerzeichen und formatiert in Title Case. Liefert die
 * Heuristik kein sinnvolles Ergebnis (leer oder ohne Buchstaben -- z.B. bei
 * einem rein numerischen Dateinamen), wird stattdessen der
 * Original-Dateiname ohne Endung gezeigt.
 */
function toDisplayName(filename: string): string {
  const withoutExt = filename.replace(/\.pdf$/i, "");
  const spaced = withoutExt.replace(/^\d+_/, "").replace(/_/g, " ").trim();

  if (!spaced || !/[a-zA-ZäöüÄÖÜß]/.test(spaced)) {
    return withoutExt;
  }

  return spaced
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Listet alle PDF-Dateien, die DIREKT im public/-Ordner liegen (keine
 * Unterordner wie public/Vorstand/), zur Request-Zeit -- neue PDFs
 * erscheinen dadurch automatisch, ohne dass Code angepasst werden muss.
 */
export function listPublicDocuments(): DocumentFile[] {
  const publicDir = path.resolve(process.cwd(), "public");
  const entries = readdirSync(publicDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
    .map((entry) => ({
      filename: entry.name,
      displayName: toDisplayName(entry.name),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "de"));
}
