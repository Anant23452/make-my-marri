import "server-only";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";

export async function familyDatabase() {
  const db = await getDatabase();
  await Promise.all([
    db.collection("weddingMembers").createIndex({ weddingId: 1, userId: 1 }, { unique: true }),
    db.collection("memberInvites").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("memberInvites").createIndex({ weddingId: 1, emailNormalized: 1 }, { unique: true, partialFilterExpression: { status: "PENDING" } }),
  ]);
  return db;
}
export async function userDisplay(userId: string) {
  const db = await getDatabase();
  const ids = ObjectId.isValid(userId) ? [userId, new ObjectId(userId)] : [userId];
  return db.collection<{ _id: string | ObjectId; name: string; email: string }>("user").findOne({ _id: { $in: ids } }, { projection: { name: 1, email: 1 } });
}
