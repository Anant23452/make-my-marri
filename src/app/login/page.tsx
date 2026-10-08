import { invitedAccountEmail } from "@/modules/accounts/invited-email";
import { invitationReturnPath } from "@/modules/accounts/return-path";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Brand, Flower } from "@/components/home/home-marks";
import { LoginForm } from "@/components/auth/login-form";
import { isEmailDeliveryReady, isLocalEmailPreview } from "@/lib/email/delivery";

export const metadata: Metadata = { title: "Sign in | Make My Marriage", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const returnTo = invitationReturnPath(next);
  const invitedEmail = await invitedAccountEmail(returnTo);
  return <div className="auth-page">
    <a className="skip-link" href="#login-form">Skip to sign in</a>
    <header className="auth-header section-width"><Brand /><Link className="auth-back" href="/">← Back to home</Link></header>
    <main className="auth-layout section-width">
      <section className="auth-story" aria-labelledby="welcome-title">
        <p className="eyebrow">YOUR WEDDING. YOUR PEOPLE.</p>
        <h1 id="welcome-title">Welcome back to<br /><em>your wedding story.</em></h1>
        <p className="auth-intro">The big moments. The little details. A place to bring your plans, and your favourite people, together.</p>
        <div className="auth-photo"><Image src="/images/wedding-couple.jpg" alt="An Indian couple celebrating their wedding" fill priority sizes="(max-width: 900px) 90vw, 50vw" /><span>A little more together.</span></div>
        <p className="auth-quote">“For everything that leads to your forever.”</p>
      </section>
      <section className="auth-card" aria-labelledby="login-title"><Flower /><p className="eyebrow">A LITTLE MORE TOGETHER</p><h2 id="login-title">Sign in</h2><p className="auth-card-intro">A familiar place for your next chapter.</p><LoginForm initialEmail={invitedEmail} returnTo={returnTo} emailReady={isEmailDeliveryReady()} localEmailPreview={isLocalEmailPreview()} /></section>
    </main>
    <footer className="auth-footer section-width"><span>© {new Date().getFullYear()} Make My Marriage</span><span>Made for your celebrations.</span></footer>
  </div>;
}
