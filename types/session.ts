import type { MemberRole } from "@/types/database";

export interface SessionPayload {
  memberId: string;
  name: string;
  role: MemberRole;
}
