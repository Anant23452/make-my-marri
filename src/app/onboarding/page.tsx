import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Brand } from "@/components/home/home-marks";
import { WeddingOnboarding } from "@/components/weddings/wedding-onboarding";

export const metadata: Metadata = { title: "Begin your wedding story | Make My Marriage", robots: { index: false, follow: false } };

export default function OnboardingPage() {
  return <div className="auth-page"><a className="skip-link" href="#wedding-form">Skip to wedding details</a><header className="auth-header section-width"><Brand /><Link href="/login" className="auth-back">← Your account</Link></header><main className="onboarding-layout section-width"><section id="wedding-form" tabIndex={-1} className="auth-card onboarding-card"><p className="eyebrow">YOUR FIRST LITTLE STEP</p><h1>Let’s begin your<br /><em>wedding story.</em></h1><p className="auth-card-intro">Start with the two of you. Bring your people and your plans together.</p><WeddingOnboarding /></section><aside className="onboarding-aside"><div className="onboarding-photo"><Image src="/images/wedding-couple.jpg" alt="An Indian couple sharing a joyful wedding moment" fill priority sizes="(max-width: 900px) 90vw, 42vw" /><p>Every great celebration<br /><em>begins with a simple plan.</em></p></div><div className="onboarding-next"><p className="eyebrow">A PLACE TO BEGIN</p><h2>Make room for your story.</h2><p>Give your wedding a name and date. Your details will be saved in your account, ready for the next step.</p><span>Coming next: ceremonies, family collaboration, and shared plans.</span></div></aside></main><footer className="auth-footer section-width"><span>© {new Date().getFullYear()} Make My Marriage</span><span>A little more together.</span></footer></div>;
}
