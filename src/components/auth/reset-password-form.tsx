"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";
import { accountError, resetPasswordSchema } from "@/modules/accounts/account.schema";

export function ResetPasswordForm() {
  const search = useSearchParams();
  const token = search.get("token");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !token) return;
    const fields = new FormData(event.currentTarget);
    const parsed = resetPasswordSchema.safeParse({ password: fields.get("password"), confirmation: fields.get("confirmation") });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setPending(true); setError("");
    try {
      const result = await authClient.resetPassword({ token, newPassword: parsed.data.password });
      if (result.error) setError(result.error.code === "INVALID_TOKEN" ? "This reset link has expired or already been used. Request a new link from sign in." : accountError(result.error.code));
      else setDone(true);
    } catch { setError("We couldn’t connect. Please try again."); }
    finally { setPending(false); }
  }
  if (!token || search.get("error")) return <><p className="auth-error" role="alert">This reset link is invalid or expired.</p><Link className="auth-text-button" href="/login">Request a new link from sign in →</Link></>;
  if (done) return <><p className="auth-status" role="status">Your password has been updated.</p><Link className="button auth-submit" href="/login">Sign in</Link></>;
  return <form onSubmit={submit} aria-busy={pending}><fieldset disabled={pending}><label htmlFor="new-password">New password</label><input id="new-password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /><label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" name="confirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />{error && <p className="auth-error" role="alert">{error}</p>}<button className="button auth-submit" type="submit">{pending ? "Updating…" : "Update password"}</button></fieldset></form>;
}
