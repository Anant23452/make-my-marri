"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
export function AcceptFamilyInvite({ token, email, signedInEmail, verified, accepted }: { token: string; email: string; signedInEmail: string | null; verified: boolean; accepted: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const next = encodeURIComponent(`/family-invite/${token}`);
  async function accept() {
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/v1/member-invites/${token}/accept`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) { setError(result.error?.message ?? "Please try again."); return; }
      router.push(`/weddings/${result.data.weddingId}/family`);
    } catch { setError("We couldn’t accept the invitation. Please try again."); }
    finally { setPending(false); }
  }
  async function switchAccount() { setPending(true); try { const result = await authClient.signOut(); if (result.error) { setError("Could not sign out. Please try again."); return; } router.push(`/login?next=${next}`); router.refresh(); } finally { setPending(false); } }
  return <>{error && <p role="alert" className="auth-error">{error}</p>}{!signedInEmail ? <><p className="auth-status">Sign in or register using {email}, then verify your email.</p><Link className="button auth-submit" href={`/login?next=${next}`}>Sign in to accept</Link><Link className="auth-text-button auth-return" href={`/register?next=${next}`}>Create an account →</Link></> : signedInEmail.toLowerCase() !== email ? <><p className="auth-status">You’re signed in as {signedInEmail}. This invitation is for {email}.</p><button className="button auth-submit" disabled={pending} onClick={switchAccount}>Use another account</button></> : !verified ? <><p className="auth-status">Verify your email before accepting.</p><Link href={`/login?next=${next}`}>Go to your account →</Link></> : <><p className="auth-status">Signed in as {signedInEmail}. {accepted ? "This invitation has already been accepted." : "Your email matches this invitation."}</p><button className="button auth-submit" disabled={pending} onClick={accept}>{pending ? "Joining…" : accepted ? "Open wedding" : "Accept invitation"}</button></>}</>;
}
