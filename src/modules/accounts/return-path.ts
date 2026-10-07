export function invitationReturnPath(value: string | string[] | undefined) {
  return typeof value === "string" && /^\/family-invite\/[A-Za-z0-9_-]{43}$/.test(value) ? value : "/plan";
}
