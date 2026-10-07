"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { accountError, registrationSchema } from "@/modules/accounts/account.schema";

export function RegistrationForm({ emailReady, localEmailPreview = false }: { emailReady: boolean; localEmailPreview?: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const parsed = registrationSchema.safeParse(Object.fromEntries(data));
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setPending(true); setError("");
    try {
      const { name, email, password } = parsed.data;
      const result = await authClient.signUp.email({ name, email, password, callbackURL: "/login" });
      if (result.error) setError(accountError(result.error.code));
      else setDone(true);
    } catch { setError("We couldn’t connect. Please try again."); }
    finally { setPending(false); }
  }
  if (done) return <><p className="auth-status" role="status">{localEmailPreview ? "Registration received. Open the local testing inbox and verify your email before signing in." : emailReady ? "Registration received. Check your inbox for a verification link before signing in. If you already have an account, sign in instead." : "Registration received. Email verification is required before signing in. Email delivery is not set up yet; you’ll be able to verify once it is configured."}</p>{localEmailPreview && <Link className="button auth-submit" href="/dev/mailbox" target="_blank">Open testing inbox ↗</Link>}<Link className="button auth-submit" href="/login">Back to sign in</Link></>;
  return <><form onSubmit={submit} aria-busy={pending}><fieldset disabled={pending}><label htmlFor="register-name">Your name</label><input id="register-name" name="name" autoComplete="name" required minLength={2} maxLength={120} /><label htmlFor="register-email">Email address</label><input id="register-email" name="email" type="email" autoComplete="email" required maxLength={254} /><label htmlFor="register-password">Password</label><input id="register-password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /><label htmlFor="register-confirm">Confirm password</label><input id="register-confirm" name="confirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />{!emailReady && <p className="auth-status">You can register now. Signing in will require email verification once email delivery is set up.</p>}{error && <p className="auth-error" role="alert">{error}</p>}<button className="button auth-submit" type="submit">{pending ? "Creating account…" : "Create an account"}</button></fieldset></form><div className="auth-onboarding"><p>Already have an account? <Link href="/login">Sign in →</Link></p></div></>;
}
