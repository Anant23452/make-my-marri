import { familyRequest } from "@/modules/family/family.http";
import { familyAccess, listFamily } from "@/modules/family/family.service";
export async function GET(request: Request, context: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await context.params;
  return familyRequest(request, async user => {
    await familyAccess(user.id, weddingId, true);
    return (await listFamily(user.id, weddingId)).members.map(member => ({ memberId: member.id, user: { id: member.userId, name: member.name, email: member.email }, role: member.role, financeAccess: member.financeAccess, status: "ACTIVE" }));
  });
}
