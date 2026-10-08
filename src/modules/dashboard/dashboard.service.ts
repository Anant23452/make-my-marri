import "server-only";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { hasCapability, WEDDING_ROLES } from "@/lib/permissions/roles";
import { dashboardMembership, ownerFamilySummary } from "./dashboard.repository";
import { weddingCountdown } from "./dashboard-calendar";

export class DashboardUnavailableError extends Error {}
const weddingSchema = z.object({ title: z.string(), weddingDate: z.iso.date(), timezone: z.string().default("Asia/Kolkata"), city: z.string().optional(), brideName: z.string().optional(), groomName: z.string().optional() });
export async function getDashboard(userId: string, weddingId: string) {
  if (!ObjectId.isValid(weddingId)) throw new DashboardUnavailableError();
  const record = await dashboardMembership(userId, new ObjectId(weddingId));
  if (!record) throw new DashboardUnavailableError();
  const wedding = weddingSchema.parse(record.wedding);
  const role = z.enum(WEDDING_ROLES).parse(record.membership.role);
  const access = { weddingId, userId, role, financeAccess: record.membership.financeAccess === true };
  const now = new Date();
  return {
    wedding: { id: weddingId, ...wedding },
    countdown: weddingCountdown(wedding.weddingDate, wedding.timezone, now),
    access: { role, relationship: typeof record.membership.relationship === "string" ? record.membership.relationship : null, canManagePlanning: hasCapability(access, "MANAGE_PLANNING"), canManageFamily: hasCapability(access, "MANAGE_MEMBERS") },
    finance: { visible: hasCapability(access, "READ_FINANCE"), status: "COMING_SOON" as const },
    ...(role === "OWNER" ? { family: await ownerFamilySummary(new ObjectId(weddingId), now) } : {}),
    events: { status: "COMING_SOON" as const }, tasks: { status: "COMING_SOON" as const }, guests: { status: "COMING_SOON" as const },
  };
}
