import "server-only";

import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

import { getMongoClient, getDatabase } from "@/lib/db/mongodb";
import { emailService } from "@/lib/email";
import { getAuthEnv } from "@/lib/validation/env";

async function createAuth() {
  const [{ BETTER_AUTH_SECRET, BETTER_AUTH_URL }, client, database] =
    await Promise.all([getAuthEnv(), getMongoClient(), getDatabase()]);

  return betterAuth({
    appName: "Make My Marriage",
    baseURL: BETTER_AUTH_URL,
    secret: BETTER_AUTH_SECRET,
    database: mongodbAdapter(database, { client }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? async ({ user, url }) => {
        await emailService.send({
          to: user.email,
          subject: "Reset your Make My Marriage password",
          html: `<p>Use the secure link below to reset your password.</p><p><a href="${url}">Reset password</a></p>`,
          text: `Reset your password: ${url}`,
        });
      } : undefined,
    },
    emailVerification: {
      // Allow account creation while local email setup is incomplete, but keep
      // verification mandatory for sign-in. Users can request an email later.
      sendOnSignUp: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
      sendVerificationEmail: async ({ user, url }) => {
        await emailService.send({
          to: user.email,
          subject: "Verify your Make My Marriage email",
          html: `<p>Confirm your email address to finish creating your account.</p><p><a href="${url}">Verify email</a></p>`,
          text: `Verify your email: ${url}`,
        });
      },
    },
  });
}

type AuthInstance = Awaited<ReturnType<typeof createAuth>>;

let authInstance: AuthInstance | undefined;

export async function getAuth(): Promise<AuthInstance> {
  authInstance ??= await createAuth();
  return authInstance;
}

export type Auth = Awaited<ReturnType<typeof getAuth>>;
