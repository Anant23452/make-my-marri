import "server-only";

import { Resend } from "resend";

import { getEmailEnv } from "@/lib/validation/env";

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
