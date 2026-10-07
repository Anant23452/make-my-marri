import "server-only";
import { createWeddingSchema } from "./wedding.schema";
import { findAccessibleWeddings, insertWeddingWithOwner } from "./wedding.repository";

export const weddingService = {
  create(userId: string, input: unknown) { return insertWeddingWithOwner(userId, createWeddingSchema.parse(input)); },
  list(userId: string) { return findAccessibleWeddings(userId); },
};
