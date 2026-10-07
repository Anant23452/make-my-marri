import { familyRequest } from "@/modules/family/family.http";
import { FamilyError, manageInvite } from "@/modules/family/family.service";
export async function POST(request: Request, context: { params: Promise<{ weddingId: string; inviteId: string; action: string }> }) {
  const { weddingId, inviteId, action } = await context.params;
  return familyRequest(request, async user => { if (!["resend", "revoke"].includes(action)) throw new FamilyError(404, "Unknown action."); return manageInvite(user.id, weddingId, inviteId, action === "resend"); });
}
