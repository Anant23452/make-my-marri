import { Suspense } from "react";
import Link from "next/link";
import { Brand } from "@/components/home/home-marks";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return <div className="auth-page"><header className="auth-header section-width"><Brand /><Link className="auth-back" href="/login">← Back to sign in</Link></header><main className="auth-reset"><section className="auth-card"><p className="eyebrow">A FRESH START</p><h1>Reset password</h1><p className="auth-card-intro">Choose a new password for your account.</p><Suspense fallback={<p>Loading your reset link…</p>}><ResetPasswordForm /></Suspense></section></main></div>;
}
