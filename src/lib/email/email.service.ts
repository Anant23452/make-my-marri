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
      throw new Error(`Transactional email could not be sent: ${error.message}`);
    }
  }
}

export const emailService: EmailService = new ResendEmailService();
