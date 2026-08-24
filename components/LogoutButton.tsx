"use client";

import { LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";

export function LogoutButton() {
  return (
    <button
      onClick={() => logout()}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-text-muted transition hover:bg-surface-2 hover:text-text"
      aria-label="Abmelden"
    >
      <LogOut size={16} />
      Abmelden
    </button>
  );
}
