import { invitedAccountEmail } from "@/modules/accounts/invited-email";
import { invitationReturnPath } from "@/modules/accounts/return-path";
import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/home/home-marks";
import { RegistrationForm } from "@/components/auth/registration-form";
import { isEmailDeliveryReady, isLocalEmailPreview } from "@/lib/email/delivery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create an account | Make My Marriage", robots: { index: false, follow: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const returnTo = invitationReturnPath(next);
  const invitedEmail = await invitedAccountEmail(returnTo);
  const emailReady = isEmailDeliveryReady();
  return <div className="auth-page"><header className="auth-header section-width"><Brand /><Link className="auth-back" href="/login">← Back to sign in</Link></header><main className="auth-reset"><section className="auth-card"><p className="eyebrow">YOUR FIRST LITTLE STEP</p><h1>Create an account</h1><p className="auth-card-intro">A place for your plans, and your people.</p><RegistrationForm initialEmail={invitedEmail} returnTo={returnTo} emailReady={emailReady} localEmailPreview={isLocalEmailPreview()} /></section></main></div>;
}
