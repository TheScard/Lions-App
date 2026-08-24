import "server-only";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";

const SALT_ROUNDS = 10;

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

/**
 * Erzeugt einen zufaelligen 6-stelligen PIN (kryptographisch sicherer
 * Zufall via node:crypto, nicht Math.random). Admins koennen den PIN nicht
 * frei eingeben -- verhindert schwache PINs wie "123456".
 */
export function generatePin(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function verifyPin(pin: string, pinHash: string): Promise<boolean> {
  return bcrypt.compare(pin, pinHash);
}
