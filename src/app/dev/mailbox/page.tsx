import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPreviewEmails, isLocalEmailPreview } from "@/lib/email/delivery";

export const dynamic = "force-dynamic";
export const metadata = { title: "Local testing inbox", robots: { index: false, follow: false } };

export default async function LocalMailboxPage() {
  if (!isLocalEmailPreview()) notFound();
  const host = (await headers()).get("host");
  if (!host || !["localhost", "127.0.0.1"].includes(host.split(":")[0])) notFound();
  const emails = getPreviewEmails();
  const base = new URL(process.env.BETTER_AUTH_URL!);
  return <main className="auth-reset"><section className="auth-card" style={{ maxWidth: 760 }}>
    <h1>Local testing inbox</h1>
    <p className="auth-status">Development only. These emails are kept in memory and are not sent to an email address. Restarting the server clears this inbox.</p>
    <form action="/dev/mailbox" method="get"><button className="auth-text-button" type="submit">Refresh inbox</button></form>
    {!emails.length && <p>No test emails yet. Register or request a verification link from sign in.</p>}
    {emails.map((email, index) => {
      const candidate = email.text.match(/https?:\/\/\S+/)?.[0];
      let href: string | undefined;
      try { if (candidate && new URL(candidate).origin === base.origin) href = candidate; } catch {}
      return <article key={`${email.createdAt}-${index}`} style={{ borderTop: "1px solid var(--line)", paddingBlock: 20 }}>
        <h2 style={{ fontSize: 25 }}>{email.subject}</h2><p style={{ overflowWrap: "anywhere" }}>To: {email.to}</p>
        {href && <a className="button auth-submit" href={href}>{email.subject.startsWith("Verify") ? "Verify email" : "Reset password"}</a>}
      </article>;
    })}
    <Link className="auth-text-button" href="/login">Back to sign in</Link>
  </section></main>;
}
