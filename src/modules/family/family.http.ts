import "server-only";
import { z } from "zod";
import { getAuth } from "@/lib/auth/auth";
import { getAuthEnv } from "@/lib/validation/env";
import { apiError, apiSuccess } from "@/lib/api/responses";
import { FamilyError } from "./family.service";

export async function familyRequest(request: Request, operation: (user: { id: string; email: string; emailVerified: boolean }) => Promise<unknown>, status = 200) {
  try {
    if (request.method !== "GET" && request.headers.get("origin") !== new URL(getAuthEnv().BETTER_AUTH_URL).origin) return apiError("FORBIDDEN", "Request origin is not allowed.", 403);
    const session = await (await getAuth()).api.getSession({ headers: request.headers });
    if (!session) return apiError("AUTH_REQUIRED", "Sign in to continue.", 401);
    if (!session.user.emailVerified) return apiError("EMAIL_NOT_VERIFIED", "Verify your email to continue.", 403);
    return apiSuccess(await operation(session.user), { status });
  } catch (error) {
    if (error instanceof z.ZodError) return apiError("VALIDATION_ERROR", error.issues[0].message, 422);
    if (error instanceof FamilyError) return apiError(error.status === 403 ? "FORBIDDEN" : "CONFLICT", error.message, error.status);
    if (error instanceof SyntaxError) return apiError("VALIDATION_ERROR", "Invalid request data.", 400);
    return apiError("INTERNAL_ERROR", "We couldn’t complete this family request. Please try again.", 503);
  }
}
