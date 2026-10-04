export const WEDDING_ROLES = ["OWNER", "EDITOR", "VIEWER"] as const;

export type WeddingRole = (typeof WEDDING_ROLES)[number];

export type WeddingAccess = {
  weddingId: string;
  userId: string;
  role: WeddingRole;
  financeAccess: boolean;
};

export type WeddingCapability =
  | "READ_WORKSPACE"
  | "MANAGE_PLANNING"
  | "READ_FINANCE"
  | "MANAGE_FINANCE"
  | "MANAGE_MEMBERS"
  | "ARCHIVE_WEDDING";

export function hasCapability(
  access: WeddingAccess,
  capability: WeddingCapability,
) {
  if (access.role === "OWNER") return true;
  if (capability === "READ_WORKSPACE") return true;

  if (access.role === "EDITOR") {
    if (capability === "MANAGE_PLANNING") return true;
    if (capability === "READ_FINANCE" || capability === "MANAGE_FINANCE") {
      return access.financeAccess;
    }
  }

  return false;
}

export function belongsToWedding(
  access: WeddingAccess,
  resource: { weddingId: string },
) {
  return access.weddingId === resource.weddingId;
}
