"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Car, Dumbbell, PartyPopper, Image as ImageIcon, Users } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/matches", label: "Kalender", icon: Calendar },
  { href: "/dashboard/carpools", label: "Fahrten", icon: Car },
  { href: "/dashboard/trainings", label: "Training", icon: Dumbbell },
  { href: "/dashboard/events", label: "Events", icon: PartyPopper },
  { href: "/dashboard/gallery", label: "Galerie", icon: ImageIcon },
  { href: "/dashboard/board", label: "Vorstand", icon: Users },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgba(240,96,8,0.25)]">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between overflow-x-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          // "/dashboard" braucht einen exakten Match, sonst waere es wegen
          // startsWith() auf jeder Dashboard-Unterseite mit-aktiv.
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link href={href} aria-label={label} className="flex items-center justify-center py-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                    active
                      ? "bg-gradient-to-br from-primary-hover to-primary shadow-[0_0_14px_-2px_var(--color-primary)]"
                      : ""
                  }`}
                >
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.5 : 2}
                    className={active ? "text-bg" : "text-text-muted"}
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
