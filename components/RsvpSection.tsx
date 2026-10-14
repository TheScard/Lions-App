import { RsvpButtons } from "@/components/RsvpButtons";
import type { RsvpResult } from "@/lib/rsvp";
import type { RsvpStatus, Team } from "@/types/database";

/**
 * Vereinheitlicht die Abstimmungs-Regeln an jeder Stelle, an der Zusagen/
 * Absagen-Buttons fuer Trainings oder Spiele angezeigt werden (Startseite,
 * Listen, Detailseiten):
 * - Kein eigenes Team (myTeam = null) -> gar nichts, auch kein Hinweistext.
 * - Termin bereits begonnen -> gar nichts (Abstimmung ist vorbei).
 * - Eigenes Team passt nicht zum Termin-Team -> nur ein kurzer Hinweis
 *   (betrifft v.a. admin/vorstand/coach, die Termine beider Teams sehen).
 * - Sonst: die eigentlichen Zusagen/Absagen-Buttons.
 */
export function RsvpSection({
  myTeam,
  eventTeam,
  started,
  myStatus,
  yesAction,
  noAction,
}: {
  myTeam: Team | null;
  eventTeam: Team;
  started: boolean;
  myStatus: RsvpStatus | null;
  yesAction: () => Promise<RsvpResult>;
  noAction: () => Promise<RsvpResult>;
}) {
  if (!myTeam || started) {
    return null;
  }

  if (myTeam !== eventTeam) {
    return <p className="text-xs italic text-text-muted">Abstimmung nur für das eigene Team.</p>;
  }

  return <RsvpButtons myStatus={myStatus} yesAction={yesAction} noAction={noAction} />;
}
