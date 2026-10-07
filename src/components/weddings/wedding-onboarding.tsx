"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { createWeddingSchema, suggestWeddingTitle } from "@/modules/weddings/wedding.schema";
import { Arrow } from "@/components/home/home-marks";

export function WeddingOnboarding() {
  const { data: session, isPending } = authClient.useSession();
  const [bride, setBride] = useState("");
  const [groom, setGroom] = useState("");
  const [customTitle, setCustomTitle] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<{ title: string; weddingDate: string } | null>(null);
  const title = customTitle ?? suggestWeddingTitle(bride, groom);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const parsed = createWeddingSchema.safeParse({ brideName: bride.trim() || undefined, groomName: groom.trim() || undefined, title, weddingDate: form.get("weddingDate"), city: form.get("city") });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setPending(true); setError("");
    try {
      const response = await fetch("/api/v1/weddings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const result = await response.json();
      if (!response.ok) { setError(result.error?.message ?? "We couldn’t save your wedding."); return; }
      setSaved({ title: result.data.title, weddingDate: result.data.weddingDate });
    } catch { setError("We couldn’t confirm the save. Check My weddings before trying again."); }
    finally { setPending(false); }
  }
  if (isPending) return <p role="status">Checking your account…</p>;
  if (!session) return <div><p className="auth-status">Sign in first to save your wedding in your account.</p><Link className="button auth-submit" href="/login">Sign in <Arrow /></Link></div>;
  if (!session.user.emailVerified) return <p className="auth-status">Verify your email before creating a wedding. <Link href="/login">Return to your account →</Link></p>;
  if (saved) return <div role="status"><h2>Your story has a home.</h2><p className="auth-status"><strong>{saved.title}</strong> is saved for {saved.weddingDate}. You are the owner of this wedding.</p><Link className="button auth-submit" href="/weddings">My weddings <Arrow /></Link></div>;
  return <><form onSubmit={submit} aria-busy={pending}><fieldset disabled={pending}><div className="onboarding-row"><div><label htmlFor="bride-name">Bride’s name <span>Optional</span></label><input id="bride-name" value={bride} onChange={event => setBride(event.target.value)} placeholder="e.g. Nisha Sharma" minLength={2} maxLength={120} /></div><div><label htmlFor="groom-name">Groom’s name <span>Optional</span></label><input id="groom-name" value={groom} onChange={event => setGroom(event.target.value)} placeholder="e.g. Aarav Singh" minLength={2} maxLength={120} /></div></div><div className="auth-label-row"><label htmlFor="wedding-title">Wedding title</label><button type="button" className="auth-text-button" onClick={() => setCustomTitle(null)}>Use suggested title</button></div><input id="wedding-title" value={title} onChange={event => setCustomTitle(event.target.value)} required minLength={2} maxLength={120} placeholder="Your wedding’s name" /><p className="onboarding-help">Suggested from your names. Make it your own.</p><div className="onboarding-row"><div><label htmlFor="wedding-date">Wedding date <span>Required</span></label><input id="wedding-date" name="weddingDate" type="date" required /></div><div><label htmlFor="wedding-city">City <span>Optional</span></label><input id="wedding-city" name="city" placeholder="Where will you celebrate?" maxLength={120} /></div></div>{error && <p className="auth-error" role="alert">{error}</p>}<button type="submit" className="button auth-submit">{pending ? "Creating your wedding…" : "Create our wedding"}<Arrow /></button><p className="onboarding-help">Your wedding is saved only when you select Create our wedding.</p></fieldset></form><Link className="auth-text-button auth-return" href="/weddings">Already started? My weddings →</Link></>;
}
