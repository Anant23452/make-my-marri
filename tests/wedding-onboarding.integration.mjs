// Run against a local dev server: node --env-file=.env.local tests/wedding-onboarding.integration.mjs
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";

const base = "http://localhost:3000";
assert.ok(!process.env.RESEND_API_KEY, "Run without external email delivery to avoid sending test emails");
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const accounts = [];
await client.connect();
const db = client.db(process.env.MONGODB_DB_NAME || "make_my_marriage");
async function request(path, method = "GET", body, cookie) {
  const response = await fetch(base + path, { method, headers: { Origin: base, "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { response, payload: await response.json() };
}
async function fixture() {
  const email = `wedding-test-${randomUUID()}@example.invalid`;
  const password = randomUUID() + "Aa1!";
  const signup = await request("/api/auth/sign-up/email", "POST", { name: "Wedding test", email, password });
  assert.equal(signup.response.status, 200);
  const user = await db.collection("user").findOne({ email });
  assert.ok(user);
  accounts.push(user);
  const unverifiedSignin = await request("/api/auth/sign-in/email", "POST", { email, password });
  assert.equal(unverifiedSignin.response.status, 403);
  // Only the fabricated test account is verified, to exercise protected routes.
  await db.collection("user").updateOne({ _id: user._id, email }, { $set: { emailVerified: true } });
  const signin = await request("/api/auth/sign-in/email", "POST", { email, password });
  assert.equal(signin.response.status, 200);
  const cookie = signin.response.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
  assert.ok(cookie);
  return { cookie, user };
}
try {
  assert.equal((await request("/api/v1/weddings")).response.status, 401);
  const owner = await fixture();
  const stranger = await fixture();
  const forgedOrigin = await fetch(base + "/api/v1/weddings", {
    method: "POST", headers: { Origin: "https://untrusted.example", Cookie: owner.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Forbidden wedding", weddingDate: "2027-02-15" }),
  });
  assert.equal(forgedOrigin.status, 403);
  const forgedIdentity = await request("/api/v1/weddings", "POST", {
    title: "Forged wedding", weddingDate: "2027-02-15", ownerUserId: stranger.user._id.toString(),
  }, owner.cookie);
  assert.equal(forgedIdentity.response.status, 422);
  const invalid = await request("/api/v1/weddings", "POST", { title: "Test", weddingDate: "2026-02-30" }, owner.cookie);
  assert.equal(invalid.response.status, 422);
  const created = await request("/api/v1/weddings", "POST", { title: "Integration wedding", brideName: "Test Bride", groomName: "Test Groom", weddingDate: "2027-02-15", city: "Lucknow" }, owner.cookie);
  assert.equal(created.response.status, 201);
  const wedding = await db.collection("weddings").findOne({ ownerUserId: owner.user._id.toString() });
  assert.ok(wedding);
  assert.equal(wedding.brideName, "Test Bride");
  const membership = await db.collection("weddingMembers").findOne({ weddingId: wedding._id });
  assert.equal(membership.role, "OWNER");
  assert.equal(membership.financeAccess, true);
  assert.equal(membership.userId, owner.user._id.toString());
  assert.equal(wedding.timezone, "Asia/Kolkata");
  const ownList = await request("/api/v1/weddings", "GET", undefined, owner.cookie);
  assert.ok(ownList.payload.data.some(item => item.id === created.payload.data.id));
  const otherList = await request("/api/v1/weddings", "GET", undefined, stranger.cookie);
  assert.ok(!otherList.payload.data.some(item => item.id === created.payload.data.id));
  const minimal = await request("/api/v1/weddings", "POST", { title: "Title and date only", weddingDate: "2027-02-15" }, owner.cookie);
  assert.equal(minimal.response.status, 201);
  console.log("PASS: unauthenticated/unverified denial, origin and forged-identity rejection, date validation, transactional creation, names/timezone persisted, Owner membership, account isolation, and creation without optional names.");
} finally {
  // Delete only records belonging to these explicitly fabricated test accounts.
  for (const user of accounts) {
    const userId = user._id.toString();
    const fixtures = await db.collection("weddings").find({ ownerUserId: userId }).toArray();
    for (const wedding of fixtures) {
      await db.collection("weddingMembers").deleteMany({ weddingId: wedding._id });
      await db.collection("weddings").deleteOne({ _id: wedding._id, ownerUserId: userId });
    }
    const references = [user._id, userId];
    await db.collection("session").deleteMany({ userId: { $in: references } });
    await db.collection("account").deleteMany({ userId: { $in: references } });
    await db.collection("verification").deleteMany({ value: { $in: references }, identifier: /^reset-password:/ });
    assert.equal(await db.collection("session").countDocuments({ userId: { $in: references } }), 0);
    assert.equal(await db.collection("account").countDocuments({ userId: { $in: references } }), 0);
    await db.collection("user").deleteOne({ _id: user._id, email: user.email });
  }
  await client.close();
  console.log("Fabricated test accounts and weddings removed.");
}
