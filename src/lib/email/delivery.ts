import "server-only";

export function isLocalEmailPreview() {
  if (process.env.NODE_ENV !== "development" || process.env.RESEND_API_KEY) return false;
  try {
    const url = new URL(process.env.BETTER_AUTH_URL ?? "");
    return url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch { return false; }
}

export function isEmailDeliveryReady() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM) || isLocalEmailPreview();
}

type PreviewEmail = { to: string; subject: string; text: string; createdAt: string };
declare global {
  var marriagePreviewEmails: PreviewEmail[] | undefined;
}

export function savePreviewEmail(email: Omit<PreviewEmail, "createdAt">) {
  if (!isLocalEmailPreview()) throw new Error("Local email preview is unavailable");
  global.marriagePreviewEmails = [{ ...email, createdAt: new Date().toISOString() }, ...(global.marriagePreviewEmails ?? [])].slice(0, 20);
}

export function getPreviewEmails() {
  return isLocalEmailPreview() ? global.marriagePreviewEmails ?? [] : [];
}
