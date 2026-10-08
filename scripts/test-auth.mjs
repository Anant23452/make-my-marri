import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { request as httpRequest } from "node:http";
import { MongoClient } from "mongodb";
import { loginSchema, registrationSchema, resetPasswordSchema } from "../src/modules/accounts/account.schema.ts";

const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const base = process.env.BETTER_AUTH_URL;
assert.ok(base, "Authentication URL must be configured");
// Restrict this data-creating smoke test to the local development server.
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
assert.ok(process.env.EMAIL_DELIVERY_MODE === "preview" || !process.env.RESEND_API_KEY, "Use local preview mode to avoid sending test emails");
const email = `auth-test-${randomUUID()}@example.invalid`;
const password = `Test-${randomUUID()}!`;
const client = new MongoClient(process.env.MONGODB_URI);
let userId;
let passed = 0;
let completed = false;
const keepDemo = process.argv.includes("--keep-demo");
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
async function inboxLink(route) {
  const response = await fetch(`${base}/dev/mailbox`);
  const html = await response.text();
  check("Local testing inbox available", response.status === 200);
  const article = [...html.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/g)].find(match => match[1].includes(`To: <!-- -->${email}`) || match[1].includes(`To: ${email}`));
  assert.ok(article, "Inbox includes this test account's recipient");
  const links = [...article[1].matchAll(/href="([^"]+)"/g)].map(match => match[1].replaceAll("&amp;", "&"));
  const link = links.find(value => value.startsWith(`${base}/api/auth/${route}`));
  assert.ok(link, `Inbox contains ${route} link`);
  return link;
}
try {
  console.log(`Temporary test credentials: ${email} / ${password}`);
  const mailbox = await fetch(`${base}/dev/mailbox`);
  assert.ok((await mailbox.text()).includes("<h1>Local testing inbox</h1>"), "Live server must have local preview enabled before creating test accounts");
  check("Blank email rejected", !loginSchema.safeParse({ email: "", password, rememberMe: false }).success);
  check("Blank password rejected", !loginSchema.safeParse({ email, password: "", rememberMe: false }).success);
  check("Email whitespace normalized", loginSchema.parse({ email: ` ${email} `, password, rememberMe: false }).email === email);
  const registration = { name: "Test Account", email, password, confirmation: password };
  check("Short registration password rejected", !registrationSchema.safeParse({ ...registration, password: "short", confirmation: "short" }).success);
  check("Long registration password rejected", !registrationSchema.safeParse({ ...registration, password: "x".repeat(129), confirmation: "x".repeat(129) }).success);
  check("Mismatched registration passwords rejected", !registrationSchema.safeParse({ ...registration, confirmation: "different" }).success);
  check("Blank name rejected", !registrationSchema.safeParse({ ...registration, name: "  " }).success);
  check("Mismatched reset passwords rejected", !resetPasswordSchema.safeParse({ password, confirmation: "different" }).success);
  await client.connect();
  for (const path of ["/", "/login", "/register", "/reset-password"]) {
    const response = await fetch(`${base}${path}`);
    const html = await response.text();
    check(`${path} renders`, response.status === 200);
    if (path === "/login") check("Login links to registration and labels both fields", /href="\/register(?:\?[^\"]*)?"/.test(html) && html.includes('id="login-email"') && html.includes('id="login-password"'));
  }
  let result = await request("/api/auth/get-session");
  check("Anonymous session is empty", result.response.status === 200 && result.data === null);
  result = await request("/api/auth/sign-in/email", { email });
  check("Server rejects missing password", result.response.status === 400);
  result = await request("/api/auth/sign-up/email", { name: "Test Account", email, password: "short" });
  check("Server rejects short registration password", result.response.status === 400);
  const remoteInbox = await new Promise((resolve, reject) => {
    const req = httpRequest(`${base}/dev/mailbox`, { headers: { Host: "untrusted.example" } }, response => {
      let html = "";
      response.on("data", chunk => { html += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, html }));
    });
    req.on("error", reject); req.end();
  });
  check("Testing inbox rejects nonlocal Host", !remoteInbox.html.includes("<h1>Local testing inbox</h1>") && (remoteInbox.status === 404 || remoteInbox.html.includes("NEXT_HTTP_ERROR_FALLBACK;404")));
  result = await request("/api/auth/sign-in/email", { email: "bad-email", password });
  check("Malformed email rejected", result.response.status === 400);
  result = await request("/api/auth/sign-in/email", { email, password });
  check("Unknown account rejected", result.response.status === 401 && result.data.code === "INVALID_EMAIL_OR_PASSWORD");
  result = await request("/api/auth/sign-up/email", { name: "Temporary Auth Test", email, password });
  userId = result.data?.user?.id;
  check("Registration creates an unverified account", result.response.status === 200 && userId && result.data.user.emailVerified === false);
  result = await request("/api/auth/sign-in/email", { email, password });
  check("Unverified account cannot sign in", result.response.status === 403 && result.data.code === "EMAIL_NOT_VERIFIED");
  const verificationLink = await inboxLink("verify-email");
  result = await request(verificationLink.slice(base.length));
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
  if (result.response.status !== 200) console.log(`Recovery request failure: status=${result.response.status}, code=${result.data?.code ?? "unknown"}`);
  check("Local password recovery request succeeds", result.response.status === 200);
  result = await request("/api/auth/sign-in/email", { email, password, rememberMe: true });
  const priorCookie = cookies(result.response);
  check("Session exists before password reset", (await request("/api/auth/get-session", undefined, priorCookie)).data?.user?.id === userId);
  const resetLink = await inboxLink("reset-password/");
  const resetRedirect = await request(resetLink.slice(base.length));
  const resetToken = new URL(resetRedirect.response.headers.get("location"), base).searchParams.get("token");
  check("Delivered reset link redirects with token", Boolean(resetToken));
  const newPassword = `Reset-${randomUUID()}!`;
  console.log(`Temporary reset password: ${newPassword}`);
  result = await request("/api/auth/reset-password", { token: resetToken, newPassword });
  check("Valid password reset succeeds", result.response.status === 200);
  check("Password reset revokes existing sessions", (await request("/api/auth/get-session", undefined, priorCookie)).data === null);
  result = await request("/api/auth/reset-password", { token: resetToken, newPassword });
  check("Reset token cannot be reused", result.response.status === 400 && result.data.code === "INVALID_TOKEN");
  result = await request("/api/auth/sign-in/email", { email, password });
  check("Old password no longer works", result.response.status === 401);
  result = await request("/api/auth/sign-in/email", { email, password: newPassword });
  check("New password signs in", result.response.status === 200);
  completed = true;
  console.log(`${passed} checks passed. Local email preview tested; external delivery and browser interactions were not tested.`);
  if (keepDemo) console.log(`Local dummy account retained for manual browser testing:\nEmail: ${email}\nPassword: ${newPassword}`);
} finally {
  const db = client.db(process.env.MONGODB_DB_NAME || "make_my_marriage");
  const user = await db.collection("user").findOne({ email });
  if (user && !(keepDemo && completed)) {
    const references = [userId, user._id, String(user._id)].filter(Boolean);
    await db.collection("session").deleteMany({ userId: { $in: references } });
    await db.collection("account").deleteMany({ userId: { $in: references } });
    await db.collection("verification").deleteMany({ value: { $in: references }, identifier: /^reset-password:/ });
    await db.collection("user").deleteOne({ _id: user._id, email });
    console.log("Temporary account and associated sessions/accounts removed.");
  }
  await client.close();
}
