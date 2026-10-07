import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/home/home-marks";
import { RegistrationForm } from "@/components/auth/registration-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create an account | Make My Marriage", robots: { index: false, follow: false } };

export default function RegisterPage() {
  const emailReady = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  return <div className="auth-page"><header className="auth-header section-width"><Brand /><Link className="auth-back" href="/login">← Back to sign in</Link></header><main className="auth-reset"><section className="auth-card"><p className="eyebrow">YOUR FIRST LITTLE STEP</p><h1>Create an account</h1><p className="auth-card-intro">A place for your plans, and your people.</p><RegistrationForm emailReady={emailReady} /></section></main></div>;
}
