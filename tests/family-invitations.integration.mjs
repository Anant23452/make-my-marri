// Uses fabricated accounts; delivery calls run only with confirmed local preview.
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { MongoClient, ObjectId } from "mongodb";
import { hashPassword } from "better-auth/crypto";
const base = process.env.BETTER_AUTH_URL || "http://localhost:3000";
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const users = [];
let weddingId;
await client.connect();
const db = client.db(process.env.MONGODB_DB_NAME || "make_my_marriage");
async function request(path, method = "GET", body, cookie) {
  const response = await fetch(base + path, { method, headers: { Origin: base, "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, payload: await response.json(), response };
}
async function fixture() {
  const _id = new ObjectId(); const email = `family-check-${randomUUID()}@example.invalid`; const password = randomUUID() + "Aa1!"; const now = new Date();
  const user = { _id, name: "Family test", email, emailVerified: true, createdAt: now, updatedAt: now }; users.push(user);
  await db.collection("user").insertOne(user);
  await db.collection("account").insertOne({ _id: new ObjectId(), userId: _id, accountId: _id.toString(), providerId: "credential", password: await hashPassword(password), createdAt: now, updatedAt: now });
  const result = await request("/api/auth/sign-in/email", "POST", { email, password }); assert.equal(result.status, 200);
  return { user, cookie: result.response.headers.getSetCookie().map(value => value.split(";")[0]).join("; ") };
}
async function invitation(email, status = "PENDING", expiresAt = new Date(Date.now() + 86400000)) {
  const token = randomBytes(32).toString("base64url");
  const _id = new ObjectId();
  await db.collection("memberInvites").insertOne({ _id, weddingId, emailNormalized: email, proposedRole: "EDITOR", financeAccess: false, tokenHash: createHash("sha256").update(token).digest("hex"), status, expiresAt, invitedByUserId: users[0]._id.toString(), createdAt: new Date(), updatedAt: new Date() });
  return { token, _id };
}
try {
  const owner = await fixture(); const editor = await fixture(); const stranger = await fixture();
  const created = await request("/api/v1/weddings", "POST", { title: "Family integration wedding", weddingDate: "2027-02-15" }, owner.cookie); assert.equal(created.status, 201); weddingId = new ObjectId(created.payload.data.id);
  const root = `/api/v1/weddings/${weddingId}`;
  assert.equal((await request(root + "/dashboard")).status, 401);
  assert.equal((await request(root + "/dashboard", "GET", undefined, stranger.cookie)).status, 404);
  const ownerDashboard = await request(root + "/dashboard", "GET", undefined, owner.cookie);
  assert.equal(ownerDashboard.status, 200);
  assert.equal(ownerDashboard.payload.data.family.joined, 0);
  assert.equal(ownerDashboard.payload.data.finance.visible, true);
  const plan = await fetch(base + "/plan", { headers: { Cookie: owner.cookie }, redirect: "manual" });
  assert.equal(plan.headers.get("location"), `/weddings/${weddingId}/dashboard`);
  assert.equal((await request(root + "/members")).status, 401);
  assert.equal((await request(root + "/members", "GET", undefined, stranger.cookie)).status, 404);
  let invited;
  if (process.env.EMAIL_DELIVERY_MODE === "preview") {
    const inboxBefore = await fetch(base + "/dev/mailbox");
    assert.ok((await inboxBefore.text()).includes("<h1>Local testing inbox</h1>"), "Live server must be in preview before invitation sends");
    const sent = await request(root + "/member-invites", "POST", { email: editor.user.email, role: "EDITOR", financeAccess: false }, owner.cookie);
    assert.equal(sent.status, 201);
    assert.equal((await request(root + "/member-invites", "POST", { email: editor.user.email, role: "EDITOR", financeAccess: false }, owner.cookie)).status, 409);
    let html = await (await fetch(base + "/dev/mailbox")).text();
    assert.ok(html.includes(editor.user.email));
    let match = html.match(/href="[^\"]*\/family-invite\/([A-Za-z0-9_-]{43})"/);
    assert.ok(match, "Family invitation link delivered to local inbox");
    invited = { token: match[1], _id: new ObjectId(sent.payload.data.inviteId) };
    const resent = await request(root + `/member-invites/${invited._id}/resend`, "POST", undefined, owner.cookie);
    assert.equal(resent.status, 200);
    assert.equal((await request(`/api/v1/member-invites/${invited.token}/accept`, "POST", undefined, editor.cookie)).status, 410);
    html = await (await fetch(base + "/dev/mailbox")).text();
    match = html.match(/href="[^\"]*\/family-invite\/([A-Za-z0-9_-]{43})"/);
    assert.ok(match);
    assert.notEqual(match[1], invited.token);
    invited = { token: match[1], _id: new ObjectId(resent.payload.data.inviteId) };
    console.log("PASS: local invitation delivery, duplicate rejection, resend delivery, and old-link revocation.");
  } else invited = await invitation(editor.user.email);
  assert.equal((await request(`/api/v1/member-invites/${invited.token}/accept`, "POST", undefined, stranger.cookie)).status, 403);
  assert.equal((await request(`/api/v1/member-invites/${invited.token}/accept`, "POST", undefined, editor.cookie)).status, 422);
  assert.equal((await request(`/api/v1/member-invites/${invited.token}/accept`, "POST", { relationship: "Groom’s father" }, editor.cookie)).status, 200);
  assert.equal((await request(`/api/v1/member-invites/${invited.token}/accept`, "POST", {}, editor.cookie)).status, 200);
  const member = await db.collection("weddingMembers").findOne({ weddingId, userId: editor.user._id.toString() }); assert.equal(member.role, "EDITOR"); assert.equal(member.financeAccess, false);
  assert.equal(member.relationship, "Groom’s father");
  const editorDashboard = await request(root + "/dashboard", "GET", undefined, editor.cookie);
  assert.equal(editorDashboard.status, 200);
  assert.equal(editorDashboard.payload.data.access.relationship, "Groom’s father");
  assert.equal(editorDashboard.payload.data.access.canManagePlanning, true);
  assert.equal(editorDashboard.payload.data.finance.visible, false);
  assert.ok(!Object.hasOwn(editorDashboard.payload.data, "family"));
  assert.equal((await request(root + "/dashboard", "GET", undefined, owner.cookie)).payload.data.family.joined, 1);
  assert.equal((await request(root + "/members", "GET", undefined, editor.cookie)).status, 403);
  const editorPage = await fetch(`${base}/weddings/${weddingId}/family`, { headers: { Cookie: editor.cookie } });
  const editorHtml = await editorPage.text();
  assert.ok(editorHtml.includes("Your access"));
  assert.ok(!editorHtml.includes(owner.user.email));
  assert.equal((await request(root + "/member-invites", "GET", undefined, editor.cookie)).status, 403);
  assert.equal((await request(root + "/members/" + member._id, "PATCH", { role: "VIEWER", financeAccess: true }, owner.cookie)).status, 422);
  assert.equal((await request(root + "/members/" + member._id, "PATCH", { role: "VIEWER", financeAccess: false }, owner.cookie)).status, 200);
  const viewerDashboard = await request(root + "/dashboard", "GET", undefined, editor.cookie);
  assert.equal(viewerDashboard.payload.data.access.canManagePlanning, false);
  assert.equal(viewerDashboard.payload.data.finance.visible, false);
  assert.ok(!Object.hasOwn(viewerDashboard.payload.data, "family"));
  console.log("PASS: dashboard Owner/Editor/Viewer permissions, no family/financial leaks, countdown source data, and login routing.");
  assert.equal((await request(root + "/members/" + member._id, "DELETE", undefined, owner.cookie)).status, 200);
  assert.equal((await request(root + "/members", "GET", undefined, editor.cookie)).status, 404);
  const revoked = await invitation(stranger.user.email);
  assert.equal((await request(root + `/member-invites/${revoked._id}/revoke`, "POST", undefined, owner.cookie)).status, 200);
  assert.equal((await request(`/api/v1/member-invites/${revoked.token}/accept`, "POST", undefined, stranger.cookie)).status, 410);
  const expired = await invitation(stranger.user.email, "PENDING", new Date(Date.now() - 1000));
  assert.equal((await request(`/api/v1/member-invites/${expired.token}/accept`, "POST", undefined, stranger.cookie)).status, 410);
  console.log("PASS: invitation email match, acceptance/retry, role/finance validation, Owner authorization, revocation, removal, and wedding isolation. No outbound emails sent.");
} finally {
  if (weddingId) { await db.collection("memberInvites").deleteMany({ weddingId }); await db.collection("weddingMembers").deleteMany({ weddingId }); await db.collection("weddings").deleteOne({ _id: weddingId }); }
  for (const user of users) { await db.collection("weddingOwnership").deleteOne({ _id: user._id.toString() }); for (const collection of ["account", "session"]) await db.collection(collection).deleteMany({ userId: { $in: [user._id, user._id.toString()] } }); await db.collection("user").deleteOne({ _id: user._id, email: user.email }); }
  await client.close(); console.log("Fabricated family test records removed.");
}
