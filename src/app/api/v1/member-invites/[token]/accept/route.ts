import { familyRequest } from "@/modules/family/family.http";
import { acceptInvitation } from "@/modules/family/family.service";
export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  return familyRequest(request, user => acceptInvitation(token, user));
}
