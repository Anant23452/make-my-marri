import "server-only";
import { FamilyError, readInvitation } from "@/modules/family/family.service";
export async function invitedAccountEmail(returnTo: string) {
  if (!returnTo.startsWith("/family-invite/")) return "";
  try { return (await readInvitation(returnTo.split("/").pop()!)).invite.emailNormalized as string; }
  catch (error) { if (error instanceof FamilyError) return ""; throw error; }
}
