import "server-only";

import { Resend } from "resend";

import { getEmailEnv } from "@/lib/validation/env";
import { isLocalEmailPreview, savePreviewEmail } from "./delivery";

export type TransactionalEmail = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export interface EmailService {
  send(message: TransactionalEmail): Promise<void>;
}

export class EmailDeliveryError extends Error {
  constructor(public reason: string, message: string) { super(message); }
}

export function deliveryFailure(name: string, message: string, status: number | null) {
  if (/domain.*not verified|verify.*domain/i.test(message)) return new EmailDeliveryError("DOMAIN_UNVERIFIED", "The sending domain is not verified in Resend. Verify makemymarri.com or use an address from your verified domain.");
  if (/only.*testing emails|own email address/i.test(message)) return new EmailDeliveryError("TEST_RECIPIENT_RESTRICTED", "Resend is restricted to test recipients. Verify your sending domain to invite family members.");
  if (status === 401 || name === "restricted_api_key") return new EmailDeliveryError("KEY_PERMISSIONS", "Resend rejected the email credentials or sender permissions. Check the API key and allowed sending domain.");
  if (status === 429) return new EmailDeliveryError("RATE_LIMITED", "Email sending limits were reached. Please try again later.");
  if (status === null) return new EmailDeliveryError("CONNECTION_FAILED", "The server could not reach Resend. Please check the connection and try again.");
  return new EmailDeliveryError("PROVIDER_REJECTED", "Resend rejected this email. Check the sender domain and email delivery settings.");
}

class ResendEmailService implements EmailService {
  async send(message: TransactionalEmail): Promise<void> {
    if (isLocalEmailPreview()) {
      for (const to of Array.isArray(message.to) ? message.to : [message.to]) {
        savePreviewEmail({ to, subject: message.subject, text: message.text ?? "" });
      }
      return;
    }
    const { EMAIL_FROM, RESEND_API_KEY } = getEmailEnv();
    const resend = new Resend(RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      ...message,
    });

    if (error) {
      const failure = deliveryFailure(error.name, error.message, error.statusCode);
      console.error("Email delivery failed", { reason: failure.reason, providerCode: error.name, status: error.statusCode });
      throw failure;
    }
  }
}

export const emailService: EmailService = new ResendEmailService();
