"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { accountError, loginSchema } from "@/modules/accounts/account.schema";
import { Arrow } from "@/components/home/home-marks";

export function LoginForm() {
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [recovery, setRecovery] = useState(false);
  const { data: session, isPending: sessionPending, refetch } = authClient.useSession();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(""); setNotice("");
    const data = new FormData(event.currentTarget);
    const input = { email: String(data.get("email") ?? "").trim(), password: String(data.get("password") ?? ""), rememberMe: data.get("remember") === "on" };
    const parsed = loginSchema.safeParse({ ...input, password: recovery ? "unused" : input.password });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setPending(true);
    try {
      if (recovery) {
        const result = await authClient.requestPasswordReset({ email: parsed.data.email, redirectTo: "/reset-password" });
        if (result.error) setError(accountError(result.error.code));
        else setNotice("If an account exists for this email, you’ll receive a password reset link. Check your inbox.");
      } else {
        const result = await authClient.signIn.email(parsed.data);
        if (result.error) setError(accountError(result.error.code));
        else { setNotice("You’re signed in."); await refetch(); }
      }
    } catch { setError("We couldn’t connect. Check your connection and try again."); }
    finally { setPending(false); }
  }

  async function signOut() {
    setPending(true); setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) setError(accountError(result.error.code));
      else { setNotice("You’re signed out."); await refetch(); }
    } catch { setError("We couldn’t sign you out. Please try again."); }
    finally { setPending(false); }
  }

  return <div id="login-form">
    {sessionPending && <p className="auth-status" role="status">Checking your session…</p>}
    {session ? <div className="auth-signed-in"><p>Signed in as <strong>{session.user.email}</strong>.</p><p>Your shared wedding workspace is coming next. You can still explore the homepage and save a draft.</p><Link className="button auth-submit" href="/">Back to your story <Arrow /></Link><button className="auth-text-button" disabled={pending} onClick={signOut}>{pending ? "Signing out…" : "Sign out"}</button></div> : <form onSubmit={submit} aria-busy={pending}>
      {recovery && <p className="auth-recovery-copy">Enter your account email and we’ll send you a link to reset your password.</p>}
      <fieldset disabled={pending || sessionPending}>
        <label htmlFor="login-email">Email address</label><input id="login-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} />
        {!recovery && <><div className="auth-label-row"><label htmlFor="login-password">Password</label><button className="auth-text-button" type="button" onClick={() => { setRecovery(true); setError(""); setNotice(""); }}>Forgot password?</button></div><div className="auth-password"><input id="login-password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required /><button type="button" aria-controls="login-password" aria-pressed={visible} aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(!visible)}>{visible ? "Hide" : "Show"}</button></div><label className="auth-remember"><input type="checkbox" name="remember" />Keep me signed in on this device</label></>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        {notice && <p className="auth-status" role="status">{notice}</p>}
        <button className="button auth-submit" type="submit">{pending ? (recovery ? "Sending link…" : "Signing in…") : (recovery ? "Send reset link" : "Sign in")}<Arrow /></button>
        {recovery && <button type="button" className="auth-text-button auth-return" onClick={() => { setRecovery(false); setError(""); setNotice(""); }}>← Back to sign in</button>}
      </fieldset>
    </form>}
    {session && error && <p className="auth-error" role="alert">{error}</p>}
    <div className="auth-onboarding"><p>New to Make My Marriage?</p><p><Link href="/register">Create an account →</Link></p></div>
  </div>;
}
