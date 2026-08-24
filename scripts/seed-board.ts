/**
 * Einmaliges Seed-Script: legt die 5 initialen Vorstandsmitglieder an.
 *
 * Kein Teil der App-Runtime -- wird manuell per tsx ausgefuehrt:
 *   npx tsx scripts/seed-board.ts
 * (oder `npm run seed:board`)
 *
 * Nutzt den Supabase Service-Role-Key aus .env.local, um RLS zu umgehen
 * (dieses Script laeuft ausserhalb eines eingeloggten Admin-Kontexts).
 * NIEMALS den Service-Role-Key in Client-/Server-Action-Code verwenden --
 * das ist hier bewusst ein separates, manuell auszufuehrendes Tool.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// .env.local laden (kein dotenv-Dependency noetig fuer ein einzelnes Script)
// ---------------------------------------------------------------------------
function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    console.error(`Fehler: ${envPath} nicht gefunden. Script muss aus dem Projekt-Root laufen.`);
    process.exit(1);
  }
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2];
    }
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Fehler: NEXT_PUBLIC_SUPABASE_URL und/oder SUPABASE_SERVICE_ROLE_KEY fehlen in .env.local."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Konfiguration
// ---------------------------------------------------------------------------
const BUCKET = "board-photos"; // derselbe Bucket wie beim manuellen Anlegen ueber /admin/board
const SOURCE_DIR = path.resolve(process.cwd(), "public", "Vorstand");
const MAX_DIMENSION = 1600; // px, laengste Kante -- gleicher Ansatz wie lib/image-compress.ts
const JPEG_QUALITY = 80; // %, gleicher Ansatz wie lib/image-compress.ts

interface SeedEntry {
  displayName: string;
  position: string;
  responsibilities: string;
  sourceFile: string;
  sortOrder: number;
}

const ENTRIES: SeedEntry[] = [
  {
    displayName: "Björn",
    position: "Head Coach Herrenmannschaft",
    responsibilities: "Taktik und Motivation sind seine Stärken.",
    sourceFile: "Björn.png",
    sortOrder: 1,
  },
  {
    displayName: "Heiko",
    position: "Coach Jugend und Herren, Kampfgericht",
    responsibilities: "Achtet immer auf die Technik.",
    sourceFile: "Heiko.png",
    sortOrder: 2,
  },
  {
    displayName: "Timon",
    position: "Junior Trainer",
    responsibilities: "Im Training und im Spiel mit Herzblut dabei.",
    sourceFile: "Timon.png",
    sortOrder: 3,
  },
  {
    displayName: "Benjamin",
    position: "Mannschaftskapitän und Vertrauensmann",
    responsibilities: "Weiß mit Bällen und Worten umzugehen.",
    sourceFile: "Benjamin.png",
    sortOrder: 4,
  },
  {
    displayName: "Patrick",
    position: "Schiedsrichteranwärter",
    responsibilities: "Hat immer ein offenes Ohr.",
    sourceFile: "Patrick.png",
    sortOrder: 5,
  },
];

/**
 * Findet eine Datei robust gegenueber unterschiedlicher Unicode-
 * Normalisierung von Dateinamen (z.B. "ö" als ein Codepoint (NFC) vs.
 * "o" + kombinierendes Trema (NFD) -- je nach Betriebssystem/Dateisystem,
 * mit dem die Datei urspruenglich angelegt wurde, kann das abweichen,
 * obwohl der Name visuell identisch aussieht). Node liest Dateinamen
 * grundsaetzlich byte-genau ein; ein direkter Pfadvergleich kann bei
 * abweichender Normalform fehlschlagen, obwohl die Datei existiert.
 * Erst den direkten Pfad probieren, sonst das Verzeichnis auflisten und
 * normalisiert vergleichen.
 */
function resolveSourceFile(dir: string, filename: string): string | null {
  const direct = path.join(dir, filename);
  if (existsSync(direct)) {
    return direct;
  }

  if (!existsSync(dir)) {
    return null;
  }

  const target = filename.normalize("NFC");
  const entries = readdirSync(dir);
  const match = entries.find((entry) => entry.normalize("NFC") === target);
  return match ? path.join(dir, match) : null;
}

async function compressToJpeg(filePath: string): Promise<Buffer> {
  return sharp(filePath)
    .rotate() // EXIF-Orientierung beruecksichtigen, bevor die Info verloren geht
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .flatten({ background: "#ffffff" }) // PNG-Transparenz -> weisser Hintergrund vor JPEG-Konvertierung
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
}

async function main(): Promise<void> {
  console.log(`Quellverzeichnis: ${SOURCE_DIR}\n`);

  // Schritt 1: ALLE Quelldateien pruefen, bevor irgendetwas hochgeladen
  // wird -- klare Fehlermeldung pro fehlender Datei statt Absturz mitten
  // in einem teilweise durchgefuehrten Lauf.
  const resolvedPaths = new Map<string, string>();
  const missing: string[] = [];

  for (const entry of ENTRIES) {
    const resolved = resolveSourceFile(SOURCE_DIR, entry.sourceFile);
    if (!resolved) {
      missing.push(`${entry.displayName}: erwartet unter ${path.join(SOURCE_DIR, entry.sourceFile)}`);
    } else {
      resolvedPaths.set(entry.displayName, resolved);
      if (path.basename(resolved) !== entry.sourceFile) {
        console.log(
          `Hinweis: "${entry.sourceFile}" ueber Unicode-Normalisierung gefunden als "${path.basename(resolved)}".`
        );
      }
    }
  }

  if (missing.length > 0) {
    console.error("Folgende Bilddateien wurden nicht gefunden:");
    for (const m of missing) console.error(`  - ${m}`);
    console.error(
      "\nBitte die fehlenden Dateien unter public/Vorstand/ ablegen und das Script erneut ausfuehren."
    );
    process.exit(1);
  }

  console.log(`Alle ${ENTRIES.length} Quellbilder gefunden (inkl. "Björn.png" mit Umlaut).\n`);

  const created: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const entry of ENTRIES) {
    const { data: existing, error: lookupError } = await supabase
      .from("board_members")
      .select("id")
      .eq("display_name", entry.displayName)
      .maybeSingle();

    if (lookupError) {
      failed.push(`${entry.displayName}: Lookup fehlgeschlagen (${lookupError.message})`);
      console.error(`✗ ${entry.displayName}: Lookup fehlgeschlagen -- ${lookupError.message}`);
      continue;
    }

    if (existing) {
      skipped.push(entry.displayName);
      console.log(`⏭  ${entry.displayName}: existiert bereits, wird übersprungen.`);
      continue;
    }

    const filePath = resolvedPaths.get(entry.displayName)!;
    console.log(`→ ${entry.displayName}: komprimiere ${path.basename(filePath)}...`);

    let jpegBuffer: Buffer;
    try {
      jpegBuffer = await compressToJpeg(filePath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push(`${entry.displayName}: Komprimierung fehlgeschlagen (${message})`);
      console.error(`  ✗ Fehler beim Komprimieren: ${message}`);
      continue;
    }

    const storagePath = `${randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, jpegBuffer, {
      contentType: "image/jpeg",
      upsert: false,
    });

    if (uploadError) {
      failed.push(`${entry.displayName}: Upload fehlgeschlagen (${uploadError.message})`);
      console.error(`  ✗ Fehler beim Upload: ${uploadError.message}`);
      continue;
    }

    const { error: insertError } = await supabase.from("board_members").insert({
      display_name: entry.displayName,
      member_id: null,
      position: entry.position,
      responsibilities: entry.responsibilities,
      photo_url: storagePath,
      sort_order: entry.sortOrder,
    });

    if (insertError) {
      // DB-Eintrag fehlgeschlagen -> bereits hochgeladene Datei wieder
      // entfernen, um keine verwaisten Storage-Objekte zu hinterlassen.
      await supabase.storage.from(BUCKET).remove([storagePath]);
      failed.push(`${entry.displayName}: Datenbank-Eintrag fehlgeschlagen (${insertError.message})`);
      console.error(`  ✗ Fehler beim Anlegen des Datenbank-Eintrags: ${insertError.message}`);
      continue;
    }

    created.push(entry.displayName);
    console.log(`  ✓ angelegt (Foto: ${storagePath}, ${(jpegBuffer.length / 1024).toFixed(0)} KB)`);
  }

  console.log("\n--- Zusammenfassung ---");
  console.log(`Angelegt (${created.length}): ${created.join(", ") || "–"}`);
  console.log(`Übersprungen, existierten bereits (${skipped.length}): ${skipped.join(", ") || "–"}`);
  if (failed.length > 0) {
    console.log(`Fehlgeschlagen (${failed.length}):`);
    for (const f of failed) console.log(`  - ${f}`);
  }

  if (failed.length > 0) {
    process.exitCode = 1;
    return;
  }

  if (created.length > 0) {
    console.log(
      `\nAlle Bilder liegen jetzt im Storage-Bucket "${BUCKET}". Der Ordner public/Vorstand/ wird ` +
        "von der App nicht mehr benötigt und kann manuell gelöscht werden (macht dieses Script " +
        "bewusst nicht automatisch)."
    );
  } else {
    console.log(
      "\nAlle 5 Einträge existierten bereits, es wurde nichts Neues angelegt. Falls die Bilder " +
        "bereits erfolgreich hochgeladen wurden, kann public/Vorstand/ bei Bedarf manuell gelöscht werden."
    );
  }
}

main().catch((err) => {
  console.error("Unerwarteter Fehler:", err);
  process.exit(1);
});
