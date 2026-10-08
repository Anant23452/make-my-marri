import { getAuth } from "@/lib/auth/auth";
import { apiError, apiSuccess } from "@/lib/api/responses";
import { DashboardUnavailableError, getDashboard } from "@/modules/dashboard/dashboard.service";
export async function GET(request: Request, context: { params: Promise<{ weddingId: string }> }) {
  try {
    const session = await (await getAuth()).api.getSession({ headers: request.headers });
    if (!session) return apiError("AUTH_REQUIRED", "Sign in to view your wedding.", 401);
    if (!session.user.emailVerified) return apiError("EMAIL_NOT_VERIFIED", "Verify your email to continue.", 403);
    const { weddingId } = await context.params;
    return apiSuccess(await getDashboard(session.user.id, weddingId), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof DashboardUnavailableError) return apiError("RESOURCE_NOT_FOUND", "This wedding is unavailable.", 404);
    return apiError("INTERNAL_ERROR", "We couldn’t load your dashboard. Please try again.", 503);
  }
}
