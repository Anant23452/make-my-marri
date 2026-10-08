import { familyRequest } from "@/modules/family/family.http";
import { acceptInvitation } from "@/modules/family/family.service";
export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  return familyRequest(request, async user => {
    const body = await request.text();
    return acceptInvitation(token, user, body ? JSON.parse(body) : {});
  });
}
