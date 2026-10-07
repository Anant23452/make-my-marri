import { familyRequest } from "@/modules/family/family.http";
import { familyAccess, listFamily, sendFamilyInvite } from "@/modules/family/family.service";
type Context = { params: Promise<{ weddingId: string }> };
export async function GET(request: Request, context: Context) {
  const { weddingId } = await context.params;
  return familyRequest(request, async user => { await familyAccess(user.id, weddingId, true); return (await listFamily(user.id, weddingId)).invites; });
}
export async function POST(request: Request, context: Context) {
  const { weddingId } = await context.params;
  return familyRequest(request, async user => sendFamilyInvite(user.id, weddingId, await request.json()), 201);
}
