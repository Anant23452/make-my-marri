import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { MongoServerError, ObjectId } from "mongodb";
import { getMongoClient } from "@/lib/db/mongodb";
import { getAuthEnv } from "@/lib/validation/env";
import { emailService } from "@/lib/email";
import { EmailDeliveryError } from "@/lib/email/email.service";
import { isEmailDeliveryReady } from "@/lib/email/delivery";
import { familyDatabase, userDisplay } from "./family.repository";
import { inviteSchema, memberRoleSchema } from "./family.schema";

export class FamilyError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
function fail(status: number, message: string): never { throw new FamilyError(status, message); }
const id = (value: string) => ObjectId.isValid(value) ? new ObjectId(value) : fail(404, "This wedding or invitation is unavailable.");
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const escape = (text: string) => text.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

export async function familyAccess(userId: string, weddingId: string, ownerOnly = false) {
  const db = await familyDatabase();
  const wedding = await db.collection("weddings").findOne({ _id: id(weddingId), status: "ACTIVE" });
  const membership = await db.collection("weddingMembers").findOne({ weddingId: id(weddingId), userId, status: "ACTIVE" });
  if (!wedding || !membership) fail(404, "This wedding is unavailable.");
  if (ownerOnly && membership.role !== "OWNER") fail(403, "Only the wedding Owner can manage family access.");
  return { db, wedding, membership };
}

export async function listFamily(userId: string, weddingId: string) {
  const { db, wedding, membership } = await familyAccess(userId, weddingId);
  const records = await db.collection("weddingMembers").find({ weddingId: id(weddingId), status: "ACTIVE" }).limit(100).toArray();
  const members = await Promise.all(records.map(async member => {
    const user = await userDisplay(member.userId);
    return { id: member._id.toHexString(), userId: member.userId as string, name: user?.name ?? "Family member", email: user?.email ?? "", role: member.role, financeAccess: member.financeAccess };
  }));
  const invites = membership.role === "OWNER" ? await db.collection("memberInvites").find({ weddingId: id(weddingId), status: "PENDING" }).sort({ createdAt: -1 }).limit(100).toArray() : [];
  return { title: wedding.title as string, owner: membership.role === "OWNER", members, invites: invites.map(invite => ({ id: invite._id.toHexString(), email: invite.emailNormalized, role: invite.proposedRole, financeAccess: invite.financeAccess, expiresAt: invite.expiresAt.toISOString(), expired: invite.expiresAt <= new Date() })) };
}

export async function sendFamilyInvite(userId: string, weddingId: string, input: unknown) {
  const parsed = inviteSchema.parse(input);
  const { db, wedding } = await familyAccess(userId, weddingId, true);
  if (!isEmailDeliveryReady()) fail(503, "Email delivery needs a verified sender address before invitations can be sent.");
  const owner = await userDisplay(userId);
  if (String(owner?.email).toLowerCase() === parsed.email) fail(409, "You are already the wedding Owner.");
  const members = await listFamily(userId, weddingId);
  if (members.members.some(member => member.email.toLowerCase() === parsed.email)) fail(409, "This person is already a family member.");
  const now = new Date();
  await db.collection("memberInvites").updateMany({ weddingId: id(weddingId), emailNormalized: parsed.email, status: "PENDING", expiresAt: { $lte: now } }, { $set: { status: "REVOKED", revokedAt: now } });
  if (await db.collection("memberInvites").countDocuments({ weddingId: id(weddingId), createdAt: { $gte: new Date(Date.now() - 3600000) } }) >= 20) fail(429, "Too many invitations this hour. Please try again later.");
  const token = randomBytes(32).toString("base64url");
  const inviteId = new ObjectId();
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  try {
    await db.collection("memberInvites").insertOne({ _id: inviteId, weddingId: id(weddingId), emailNormalized: parsed.email, proposedRole: parsed.role, financeAccess: parsed.financeAccess, tokenHash: hash(token), status: "PENDING", expiresAt, invitedByUserId: userId, createdAt: now, updatedAt: now });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) fail(409, "An invitation is already pending for this email.");
    throw error;
  }
  const url = `${getAuthEnv().BETTER_AUTH_URL}/family-invite/${token}`;
  const permissions = parsed.role === "VIEWER" ? "View wedding plans without making changes." : `Help manage wedding plans.${parsed.financeAccess ? " View and update budgets and expenses." : " No access to financial information."}`;
  try {
    await emailService.send({ to: parsed.email, subject: `You’re invited to ${wedding.title}`, text: `${owner?.name ?? "The wedding Owner"} invited you to ${wedding.title}.\nRole: ${parsed.role}. ${permissions}\nAccept using this email address: ${url}\nThis link expires in 7 days.`, html: `<div style="background:#faf8f3;padding:32px;font-family:Arial;color:#264a3d"><h1>Make My Marriage</h1><h2>You’re invited to be part of the story.</h2><p>${escape(String(owner?.name ?? "The wedding Owner"))} invited you to <strong>${escape(String(wedding.title))}</strong>.</p><p>${escape(permissions)}</p><p><a href="${escape(url)}" style="background:#264a3d;color:white;padding:14px 20px;display:inline-block">View invitation</a></p><p>Sign in with ${escape(parsed.email)}. This invitation expires in 7 days.</p></div>` });
  } catch (error) {
    await db.collection("memberInvites").updateOne({ _id: inviteId, status: "PENDING" }, { $set: { status: "REVOKED", revokedAt: new Date() } });
    fail(503, error instanceof EmailDeliveryError ? error.message : "The email could not be sent. Check email delivery settings and try again.");
  }
  return { inviteId: inviteId.toHexString(), email: parsed.email, status: "PENDING", expiresAt: expiresAt.toISOString() };
}

export async function manageInvite(userId: string, weddingId: string, inviteId: string, resend: boolean) {
  const { db } = await familyAccess(userId, weddingId, true);
  const invite = await db.collection("memberInvites").findOneAndUpdate({ _id: id(inviteId), weddingId: id(weddingId), status: "PENDING" }, { $set: { status: "REVOKED", revokedAt: new Date(), updatedAt: new Date() } }, { returnDocument: "before" });
  if (!invite) fail(409, "This invitation is no longer pending.");
  if (resend) return sendFamilyInvite(userId, weddingId, { email: invite.emailNormalized, role: invite.proposedRole, financeAccess: invite.financeAccess });
  return { status: "REVOKED" };
}

export async function changeMember(userId: string, weddingId: string, memberId: string, input: unknown, remove: boolean) {
  const { db } = await familyAccess(userId, weddingId, true);
  const update = remove ? { status: "REMOVED", removedAt: new Date() } : { ...memberRoleSchema.parse(input) };
  const result = await db.collection("weddingMembers").updateOne({ _id: id(memberId), weddingId: id(weddingId), status: "ACTIVE", role: { $ne: "OWNER" } }, { $set: { ...update, updatedAt: new Date() } });
  if (!result.matchedCount) fail(404, "This member is unavailable or is the wedding Owner.");
  return { success: true };
}

export async function readInvitation(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) fail(404, "This invitation is unavailable.");
  const db = await familyDatabase();
  const invite = await db.collection("memberInvites").findOne({ tokenHash: hash(token) });
  if (!invite || invite.status === "REVOKED" || invite.expiresAt <= new Date()) fail(410, "This invitation has expired or was revoked. Ask the wedding Owner for a new link.");
  const wedding = await db.collection("weddings").findOne({ _id: invite.weddingId, status: "ACTIVE" });
  if (!wedding) fail(410, "This wedding is unavailable.");
  const inviter = await userDisplay(invite.invitedByUserId);
  return { db, invite, title: wedding.title as string, inviter: String(inviter?.name ?? "The wedding Owner") };
}

export async function acceptInvitation(token: string, user: { id: string; email: string; emailVerified: boolean }) {
  if (!user.emailVerified) fail(403, "Verify your email before accepting this invitation.");
  const { db, invite } = await readInvitation(token);
  if (user.email.trim().toLowerCase() !== invite.emailNormalized) fail(403, "Sign in using the email address this invitation was sent to.");
  const client = await getMongoClient();
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const current = await db.collection("memberInvites").findOne({ _id: invite._id }, { session });
      if (!current || current.status === "REVOKED" || current.expiresAt <= new Date()) fail(410, "This invitation is no longer available.");
      if (!await db.collection("weddings").findOne({ _id: invite.weddingId, status: "ACTIVE" }, { session })) fail(410, "This wedding is unavailable.");
      const member = await db.collection("weddingMembers").findOne({ weddingId: invite.weddingId, userId: user.id }, { session });
      if (current.status === "ACCEPTED") { if (member?.status !== "ACTIVE") fail(410, "Your membership is no longer active."); return; }
      if (member?.status !== "ACTIVE") await db.collection("weddingMembers").updateOne({ weddingId: invite.weddingId, userId: user.id }, { $set: { role: invite.proposedRole, financeAccess: invite.proposedRole === "EDITOR" && invite.financeAccess, status: "ACTIVE", joinedAt: new Date(), updatedAt: new Date() }, $unset: { removedAt: "" }, $setOnInsert: { createdAt: new Date() } }, { upsert: true, session });
      await db.collection("memberInvites").updateOne({ _id: invite._id, status: "PENDING" }, { $set: { status: "ACCEPTED", acceptedByUserId: user.id, acceptedAt: new Date(), updatedAt: new Date() } }, { session });
    });
  } finally { await session.endSession(); }
  return { weddingId: invite.weddingId.toHexString(), role: invite.proposedRole, financeAccess: invite.financeAccess };
}
