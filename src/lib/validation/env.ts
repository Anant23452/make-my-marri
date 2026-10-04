import "server-only";

import { z } from "zod";

const nonEmpty = z.string().trim().min(1);

const mongoEnvSchema = z.object({
  MONGODB_URI: nonEmpty,
  MONGODB_DB_NAME: nonEmpty.default("make_my_marriage"),
});

const authEnvSchema = z.object({
  BETTER_AUTH_SECRET: nonEmpty.min(32),
  BETTER_AUTH_URL: z.url(),
});

const emailEnvSchema = z.object({
  RESEND_API_KEY: nonEmpty,
  EMAIL_FROM: nonEmpty,
});

const storageEnvSchema = z.object({
  R2_ACCOUNT_ID: nonEmpty,
  R2_ACCESS_KEY_ID: nonEmpty,
  R2_SECRET_ACCESS_KEY: nonEmpty,
  R2_BUCKET_NAME: nonEmpty,
});

function parseEnvironment<T extends z.ZodType>(schema: T): z.output<T> {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    const names = result.error.issues
      .map((issue) => issue.path.join("."))
      .filter(Boolean)
      .join(", ");

    throw new Error(`Missing or invalid server configuration: ${names}`);
  }

  return result.data;
}

export const getMongoEnv = () => parseEnvironment(mongoEnvSchema);
export const getAuthEnv = () => parseEnvironment(authEnvSchema);
export const getEmailEnv = () => parseEnvironment(emailEnvSchema);
export const getStorageEnv = () => parseEnvironment(storageEnvSchema);
