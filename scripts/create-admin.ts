/**
 * Einmaliges Hilfs-Script: legt ein neues Admin-Konto an und gibt die
 * generierte PIN im Klartext auf der Konsole aus.
 *
 * Kein Teil der App-Runtime -- wird manuell per tsx ausgefuehrt:
 *   npx tsx scripts/create-admin.ts "<Name>" [PIN]
 *
 * PIN ist optional (4-6 Ziffern) -- wird sie weggelassen, wird eine
 * zufaellige 6-stellige PIN generiert.
 *
 * Nutzt den Supabase Service-Role-Key aus .env.local, um RLS zu umgehen
 * (dieses Script laeuft ausserhalb eines eingeloggten Admin-Kontexts).
 * NIEMALS den Service-Role-Key in Client-/Server-Action-Code verwenden --
 * das ist hier bewusst ein separates, manuell auszufuehrendes Tool.
 *
 * Voraussetzung: Migration 20260824170000_pin_change.sql muss bereits
 * gegen die Datenbank ausgefuehrt sein (must_change_pin-Spalte).
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

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

function generatePin(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

async function main(): Promise<void> {
  const name = process.argv[2]?.trim();
  if (!name) {
    console.error('Bitte einen Namen angeben: npx tsx scripts/create-admin.ts "<Name>" [PIN]');
    process.exit(1);
  }

  const customPin = process.argv[3]?.trim();
  if (customPin && !/^\d{4,6}$/.test(customPin)) {
    console.error("Die PIN muss aus 4 bis 6 Ziffern bestehen.");
    process.exit(1);
  }

  const { data: existing, error: lookupError } = await supabase
    .from("members")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (lookupError) {
    console.error(`Fehler bei der Existenzpruefung: ${lookupError.message}`);
    process.exit(1);
  }
  if (existing) {
    console.error(`Ein Mitglied mit dem Namen "${name}" existiert bereits.`);
    process.exit(1);
  }

  const pin = customPin || generatePin();
  const pinHash = await bcrypt.hash(pin, 10);

  const { error: insertError } = await supabase.from("members").insert({
    name,
    pin_hash: pinHash,
    role: "admin",
    must_change_pin: true,
  });

  if (insertError) {
    console.error(`Fehler beim Anlegen: ${insertError.message}`);
    process.exit(1);
  }

  console.log(`\nAdmin-Konto angelegt: ${name}`);
  console.log(`PIN: ${pin}`);
  console.log("\nDiese PIN jetzt notieren -- sie wird nicht erneut angezeigt.");
}

main().catch((err) => {
  console.error("Unerwarteter Fehler:", err);
  process.exit(1);
});
