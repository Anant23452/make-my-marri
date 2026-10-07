import { z } from "zod";
import { getAuth } from "@/lib/auth/auth";
import { getAuthEnv } from "@/lib/validation/env";
import { apiError, apiSuccess } from "@/lib/api/responses";
import { weddingService } from "@/modules/weddings/wedding.service";

async function handle(request: Request, create: boolean) {
  try {
    if (create && request.headers.get("origin") !== new URL(getAuthEnv().BETTER_AUTH_URL).origin) return apiError("FORBIDDEN", "Request origin is not allowed.", 403);
    const session = await (await getAuth()).api.getSession({ headers: request.headers });
    if (!session) return apiError("AUTH_REQUIRED", "Sign in to create or view a wedding.", 401);
    if (!session.user.emailVerified) return apiError("EMAIL_NOT_VERIFIED", "Verify your email to continue.", 403);
    if (!create) return apiSuccess(await weddingService.list(session.user.id));
    let input: unknown;
    try { input = await request.json(); } catch { return apiError("VALIDATION_ERROR", "Provide a valid JSON request.", 400); }
    return apiSuccess(await weddingService.create(session.user.id, input), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return apiError("VALIDATION_ERROR", error.issues[0].message, 422);
    return apiError("INTERNAL_ERROR", "We couldn’t load or save your wedding. Please try again.", 503);
  }
}
export function GET(request: Request) { return handle(request, false); }
export function POST(request: Request) { return handle(request, true); }
