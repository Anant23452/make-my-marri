"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
export function AcceptFamilyInvite({ token, email, signedInEmail, verified, accepted, recipientHasAccount }: { token: string; email: string; signedInEmail: string | null; verified: boolean; accepted: boolean; recipientHasAccount: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [relationship, setRelationship] = useState("");
  const [otherRelationship, setOtherRelationship] = useState("");
  const next = encodeURIComponent(`/family-invite/${token}`);
  const relationshipFields = !accepted && <div className="auth-card-intro"><label htmlFor="family-relationship">Your relationship to the couple</label><select id="family-relationship" value={relationship} onChange={event => setRelationship(event.target.value)} disabled={pending}><option value="">Choose your relationship</option>{["Groom’s father", "Groom’s mother", "Bride’s father", "Bride’s mother", "Groom’s sibling", "Bride’s sibling", "Relative", "Friend", "Other"].map(value => <option key={value} value={value}>{value}</option>)}</select>{relationship === "Other" && <input aria-label="Describe your relationship" value={otherRelationship} onChange={event => setOtherRelationship(event.target.value)} minLength={2} maxLength={80} />}<p className="onboarding-help">Your relationship does not change the permissions assigned by the Owner.</p></div>;
  async function accept() {
    if (!accepted && !(relationship === "Other" ? otherRelationship.trim().length >= 2 : relationship)) { setError("Choose your relationship to the couple."); return; }
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/v1/member-invites/${token}/accept`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(accepted ? {} : { relationship: relationship === "Other" ? otherRelationship.trim() : relationship }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error?.message ?? "Please try again."); return; }
      router.push(`/weddings/${result.data.weddingId}/dashboard`);
    } catch { setError("We couldn’t accept the invitation. Please try again."); }
    finally { setPending(false); }
  }
  async function switchAccount() { setPending(true); try { const result = await authClient.signOut(); if (result.error) { setError("Could not sign out. Please try again."); return; } router.push(`/${recipientHasAccount ? "login" : "register"}?next=${next}`); router.refresh(); } finally { setPending(false); } }
  return <>{error && <p role="alert" className="auth-error">{error}</p>}{!signedInEmail ? <><p className="auth-status">Sign in or register using {email}, then verify your email.</p><Link className="button auth-submit" href={`/${recipientHasAccount ? "login" : "register"}?next=${next}`}>{recipientHasAccount ? "Sign in to accept" : "Create your account to accept"}</Link><Link className="auth-text-button auth-return" href={`/register?next=${next}`}>Create an account →</Link></> : signedInEmail.toLowerCase() !== email ? <><p className="auth-status">You’re signed in as {signedInEmail}. This invitation is for {email}.</p><button className="button auth-submit" disabled={pending} onClick={switchAccount}>Use another account</button></> : !verified ? <><p className="auth-status">Verify your email before accepting.</p><Link href={`/login?next=${next}`}>Go to your account →</Link></> : <><p className="auth-status">Signed in as {signedInEmail}. {accepted ? "This invitation has already been accepted." : "Your email matches this invitation."}</p>{relationshipFields}<button className="button auth-submit" disabled={pending} onClick={accept}>{pending ? "Joining…" : accepted ? "Open wedding" : "Accept invitation"}</button></>}</>;
}
