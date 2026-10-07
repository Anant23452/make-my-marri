import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { MongoClient } from "mongodb";
import { createEmailVerificationToken } from "better-auth/api";

const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const base = process.env.BETTER_AUTH_URL;
assert.ok(base, "Authentication URL must be configured");
// Restrict this data-creating smoke test to the local development server.
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
assert.ok(!process.env.RESEND_API_KEY, "Run without email delivery to avoid sending test emails");
const email = `auth-test-${randomUUID()}@example.invalid`;
const password = `Test-${randomUUID()}!`;
const client = new MongoClient(process.env.MONGODB_URI);
let userId;
let passed = 0;
const check = (label, condition) => {
  assert.ok(condition, label);
  passed++;
  console.log(`PASS ${label}`);
};
async function request(path, body, cookie, origin = base) {
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", Origin: origin, ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    redirect: "manual",
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}
function cookies(response) {
  return response.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
}
try {
  await client.connect();
  for (const path of ["/", "/login", "/register", "/reset-password"]) {
    const response = await fetch(`${base}${path}`);
    const html = await response.text();
    check(`${path} renders`, response.status === 200);
    if (path === "/login") check("Login links to registration and labels both fields", html.includes('href="/register"') && html.includes('id="login-email"') && html.includes('id="login-password"'));
  }
  let result = await request("/api/auth/get-session");
  check("Anonymous session is empty", result.response.status === 200 && result.data === null);
  result = await request("/api/auth/sign-in/email", { email: "bad-email", password });
  check("Malformed email rejected", result.response.status === 400);
  result = await request("/api/auth/sign-in/email", { email, password });
  check("Unknown account rejected", result.response.status === 401 && result.data.code === "INVALID_EMAIL_OR_PASSWORD");
  result = await request("/api/auth/sign-up/email", { name: "Temporary Auth Test", email, password });
  userId = result.data?.user?.id;
  check("Registration creates an unverified account", result.response.status === 200 && userId && result.data.user.emailVerified === false);
  result = await request("/api/auth/sign-in/email", { email, password });
  check("Unverified account cannot sign in", result.response.status === 403 && result.data.code === "EMAIL_NOT_VERIFIED");
  // Use the installed library's token generator only for this fabricated account.
  // This exercises verification without changing application verification policy.
  const token = await createEmailVerificationToken(process.env.BETTER_AUTH_SECRET, email);
  result = await request(`/api/auth/verify-email?token=${encodeURIComponent(token)}&callbackURL=${encodeURIComponent(`${base}/login`)}`);
  check("Valid verification token accepted", [200, 302].includes(result.response.status));
  result = await request("/api/auth/sign-in/email", { email, password: "Wrong-password-123!" });
  check("Wrong password rejected", result.response.status === 401 && result.data.code === "INVALID_EMAIL_OR_PASSWORD");
  result = await request("/api/auth/sign-in/email", { email, password }, undefined, "https://untrusted.example");
  check("Untrusted origin rejected", result.response.status === 403);
  for (const rememberMe of [false, true]) {
    result = await request("/api/auth/sign-in/email", { email, password, rememberMe });
    const cookie = cookies(result.response);
    check(`Verified sign-in succeeds (remember=${rememberMe})`, result.response.status === 200 && Boolean(cookie));
    const session = await request("/api/auth/get-session", undefined, cookie);
    check(`Session returns correct user (remember=${rememberMe})`, session.data?.user?.id === userId);
    const sessionCookie = result.response.headers.getSetCookie().find(value => value.startsWith("better-auth.session_token="));
    check(`Cookie persistence matches remember=${rememberMe}`, Boolean(sessionCookie) && /HttpOnly/i.test(sessionCookie) && /SameSite=Lax/i.test(sessionCookie) && /Max-Age=/i.test(sessionCookie) === rememberMe);
    const logout = await request("/api/auth/sign-out", {}, cookie);
    check(`Sign-out succeeds (remember=${rememberMe})`, logout.response.status === 200);
    const expired = await request("/api/auth/get-session", undefined, cookie);
    check(`Signed-out session is invalid (remember=${rememberMe})`, expired.data === null);
  }
  result = await request("/api/auth/reset-password", { token: "invalid-test-token", newPassword: password });
  check("Invalid reset token rejected", result.response.status === 400 && result.data.code === "INVALID_TOKEN");
  result = await request("/api/auth/request-password-reset", { email, redirectTo: "/reset-password" });
  check("Missing email configuration disables recovery clearly", result.response.status === 400 && result.data.code === "RESET_PASSWORD_DISABLED");
  result = await request("/api/auth/sign-in/email", { email, password, rememberMe: true });
  const priorCookie = cookies(result.response);
  check("Session exists before password reset", (await request("/api/auth/get-session", undefined, priorCookie)).data?.user?.id === userId);
  // Seed only the fabricated account's token to test reset semantics without email.
  const resetToken = randomUUID();
  await client.db(process.env.MONGODB_DB_NAME || "make_my_marriage").collection("verification").insertOne({
    identifier: `reset-password:${resetToken}`, value: userId,
    expiresAt: new Date(Date.now() + 60_000), createdAt: new Date(), updatedAt: new Date(),
  });
  const newPassword = `Reset-${randomUUID()}!`;
  result = await request("/api/auth/reset-password", { token: resetToken, newPassword });
  check("Valid password reset succeeds", result.response.status === 200);
  check("Password reset revokes existing sessions", (await request("/api/auth/get-session", undefined, priorCookie)).data === null);
  result = await request("/api/auth/reset-password", { token: resetToken, newPassword });
  check("Reset token cannot be reused", result.response.status === 400 && result.data.code === "INVALID_TOKEN");
  result = await request("/api/auth/sign-in/email", { email, password });
  check("Old password no longer works", result.response.status === 401);
  result = await request("/api/auth/sign-in/email", { email, password: newPassword });
  check("New password signs in", result.response.status === 200);
  console.log(`${passed} checks passed. Email delivery and browser interactions were not tested.`);
} finally {
  const db = client.db(process.env.MONGODB_DB_NAME || "make_my_marriage");
  const user = await db.collection("user").findOne({ email });
  if (user) {
    const references = [userId, user._id, String(user._id)].filter(Boolean);
    await db.collection("session").deleteMany({ userId: { $in: references } });
    await db.collection("account").deleteMany({ userId: { $in: references } });
    await db.collection("verification").deleteMany({ value: { $in: references }, identifier: /^reset-password:/ });
    await db.collection("user").deleteOne({ _id: user._id, email });
    console.log("Temporary account and associated sessions/accounts removed.");
  }
  await client.close();
}
