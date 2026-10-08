import { headers } from "next/headers";
import Link from "next/link";
import { Brand, Flower } from "@/components/home/home-marks";
import { getAuth } from "@/lib/auth/auth";
import { FamilyError, readInvitation } from "@/modules/family/family.service";
import { AcceptFamilyInvite } from "@/components/family/accept-family-invite";
export const dynamic = "force-dynamic";
export const metadata = { title: "Family invitation | Make My Marriage", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let details;
  try { details = await readInvitation(token); } catch (error) { if (!(error instanceof FamilyError)) throw error; return <main className="auth-reset"><section className="auth-card"><Brand /><h1>Invitation unavailable</h1><p className="auth-status">{error.message}</p><Link href="/">Return home →</Link></section></main>; }
  const session = await (await getAuth()).api.getSession({ headers: await headers() });
  return <div className="auth-page"><header className="auth-header section-width"><Brand /><span className="family-badge">Private family invitation</span></header><main className="auth-reset"><section className="auth-card acceptance-card"><Flower /><p className="eyebrow">WEDDING COLLABORATION</p><h1>You’re invited to be<br /><em>part of the story.</em></h1><p className="auth-card-intro">{details.inviter} invited you to <strong>{details.title}</strong>.</p><div className="auth-status"><strong>{details.invite.proposedRole === "EDITOR" ? "Editor" : "Viewer"}</strong><p>{details.invite.proposedRole === "EDITOR" ? "Can help manage wedding plans." : "Can view plans without making changes."}</p><p>{details.invite.financeAccess ? "Can view and update budgets and expenses." : "No financial access."}</p><p>Cannot invite members or change family permissions.</p></div><p className="onboarding-help">Invited email: {details.invite.emailNormalized}</p><AcceptFamilyInvite recipientHasAccount={details.recipientHasAccount} token={token} email={details.invite.emailNormalized} signedInEmail={session?.user.email ?? null} verified={session?.user.emailVerified ?? false} accepted={details.invite.status === "ACCEPTED"} /></section></main></div>;
}
