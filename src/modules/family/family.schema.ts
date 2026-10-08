import { z } from "zod";
export const relationshipSchema = z.object({ relationship: z.string().trim().min(2, "Choose your relationship to the couple.").max(80) }).strict();
export const memberRoleSchema = z.object({ role: z.enum(["EDITOR", "VIEWER"]), financeAccess: z.boolean().default(false) }).refine(value => value.role !== "VIEWER" || !value.financeAccess, { message: "Viewers cannot access finances." });
export const inviteSchema = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()), role: z.enum(["EDITOR", "VIEWER"]), financeAccess: z.boolean().default(false) }).refine(value => value.role !== "VIEWER" || !value.financeAccess, { message: "Viewers cannot access finances." });
