import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password."),
  rememberMe: z.boolean(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Use at least 8 characters.").max(128, "Use at most 128 characters."),
  confirmation: z.string(),
}).refine(input => input.password === input.confirmation, { message: "The passwords don’t match." });

export const registrationSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120),
  email: z.string().trim().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(8, "Use at least 8 characters.").max(128),
  confirmation: z.string(),
}).refine(input => input.password === input.confirmation, { message: "The passwords don’t match." });

export function accountError(code?: string) {
  if (code === "RESET_PASSWORD_DISABLED") return "Password recovery is unavailable while email delivery is being set up. Please try again later.";
  if (code === "EMAIL_NOT_VERIFIED") return "Verify your email before signing in. Check your inbox for the verification link.";
  if (code === "INVALID_EMAIL_OR_PASSWORD") return "The email or password is incorrect. Please try again.";
  if (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") return "An account already exists for this email. Sign in or reset your password.";
  if (code === "TOO_MANY_REQUESTS") return "Too many attempts. Please wait a little before trying again.";
  if (code === "AUTH_SERVICE_UNAVAILABLE") return "Sign-in is temporarily unavailable. Please try again shortly.";
  if (code === "INVALID_ORIGIN") return "Open this website at its configured address and try signing in again.";
  return "We couldn’t complete that request. Please try again shortly.";
}
