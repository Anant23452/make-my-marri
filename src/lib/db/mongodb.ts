import "server-only";

import { MongoClient } from "mongodb";

import { getMongoEnv } from "@/lib/validation/env";

declare global {
  // Reuse the in-flight connection while Next.js reloads modules in development.
  var makeMyMarriageMongoClientPromise: Promise<MongoClient> | undefined;
}

export function getMongoClient(): Promise<MongoClient> {
  if (!global.makeMyMarriageMongoClientPromise) {
    const { MONGODB_URI } = getMongoEnv();
    const client = new MongoClient(MONGODB_URI);

    global.makeMyMarriageMongoClientPromise = client.connect().catch((error) => {
      global.makeMyMarriageMongoClientPromise = undefined;
      throw error;
    });
  }

  return global.makeMyMarriageMongoClientPromise;
}

export async function getDatabase() {
  const { MONGODB_DB_NAME } = getMongoEnv();
  const client = await getMongoClient();

  return client.db(MONGODB_DB_NAME);
}
