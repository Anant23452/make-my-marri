import "server-only";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";

export async function dashboardMembership(userId: string, weddingId: ObjectId) {
  const db = await getDatabase();
  const membership = await db.collection("weddingMembers").findOne({ weddingId, userId, status: "ACTIVE" });
  if (!membership) return null;
  const wedding = await db.collection("weddings").findOne({ _id: weddingId, status: "ACTIVE" }, { projection: { title: 1, weddingDate: 1, timezone: 1, city: 1, brideName: 1, groomName: 1 } });
  return wedding ? { wedding, membership } : null;
}

export async function ownerFamilySummary(weddingId: ObjectId, now: Date) {
  const db = await getDatabase();
  const [joined, pending, expired, revoked] = await Promise.all([
    db.collection("weddingMembers").countDocuments({ weddingId, status: "ACTIVE", role: { $ne: "OWNER" } }),
    db.collection("memberInvites").countDocuments({ weddingId, status: "PENDING", expiresAt: { $gt: now } }),
    db.collection("memberInvites").countDocuments({ weddingId, status: "PENDING", expiresAt: { $lte: now } }),
    db.collection("memberInvites").countDocuments({ weddingId, status: "REVOKED" }),
  ]);
  return { joined, pending, expired, revoked };
}
