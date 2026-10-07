import { familyRequest } from "@/modules/family/family.http";
import { changeMember } from "@/modules/family/family.service";
type Context = { params: Promise<{ weddingId: string; memberId: string }> };
export async function PATCH(request: Request, context: Context) {
  const { weddingId, memberId } = await context.params;
  return familyRequest(request, async user => changeMember(user.id, weddingId, memberId, await request.json(), false));
}
export async function DELETE(request: Request, context: Context) {
  const { weddingId, memberId } = await context.params;
  return familyRequest(request, async user => changeMember(user.id, weddingId, memberId, null, true));
}
