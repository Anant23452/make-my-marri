import "server-only";
import { MongoServerError, ObjectId } from "mongodb";
import { getDatabase, getMongoClient } from "@/lib/db/mongodb";
import type { CreateWeddingInput } from "./wedding.schema";

export class WeddingAlreadyOwnedError extends Error {}
export async function ownsWedding(userId: string) {
  const db = await getDatabase();
  return Boolean(await db.collection("weddings").findOne({ ownerUserId: userId }, { projection: { _id: 1 } }));
}

export async function insertWeddingWithOwner(userId: string, input: CreateWeddingInput) {
  const client = await getMongoClient();
  const db = await getDatabase();
  const session = client.startSession();
  const weddingId = new ObjectId();
  const now = new Date();
  try {
    await session.withTransaction(async () => {
      // The unique user ID prevents concurrent creates while retaining legacy weddings.
      await db.collection<{ _id: string; weddingId: ObjectId; createdAt: Date }>("weddingOwnership").insertOne({ _id: userId, weddingId, createdAt: now }, { session });
      if (await db.collection("weddings").findOne({ ownerUserId: userId }, { session, projection: { _id: 1 } })) throw new WeddingAlreadyOwnedError();
      await db.collection("weddings").insertOne({ ...input, _id: weddingId, ownerUserId: userId, status: "ACTIVE", schemaVersion: 1, createdAt: now, updatedAt: now }, { session });
      await db.collection("weddingMembers").insertOne({ weddingId, userId, role: "OWNER", financeAccess: true, status: "ACTIVE", joinedAt: now, createdAt: now, updatedAt: now }, { session });
    });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) throw new WeddingAlreadyOwnedError();
    throw error;
  } finally { await session.endSession(); }
  return { id: weddingId.toHexString(), title: input.title, weddingDate: input.weddingDate, city: input.city, status: "ACTIVE", myRole: "OWNER", financeAccess: true };
}

export async function findAccessibleWeddings(userId: string) {
  const db = await getDatabase();
  // Join by the authenticated user's active membership; never accept a client userId.
  return db.collection("weddingMembers").aggregate([
    { $match: { userId, status: "ACTIVE" } },
    { $lookup: { from: "weddings", localField: "weddingId", foreignField: "_id", as: "wedding" } },
    { $unwind: "$wedding" },
    { $match: { "wedding.status": "ACTIVE" } },
    { $sort: { "wedding.createdAt": -1 } },
    { $limit: 100 },
    { $project: { _id: 0, id: { $toString: "$wedding._id" }, title: "$wedding.title", weddingDate: "$wedding.weddingDate", city: "$wedding.city", status: "$wedding.status", myRole: "$role", financeAccess: { $cond: [{ $eq: ["$role", "OWNER"] }, true, { $and: [{ $eq: ["$role", "EDITOR"] }, "$financeAccess"] }] } } },
  ]).toArray();
}
