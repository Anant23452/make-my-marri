import { isLocalEmailPreview } from "@/lib/email/delivery";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/home/home-marks";
import { getAuth } from "@/lib/auth/auth";
import { FamilyError, listFamily } from "@/modules/family/family.service";
import { FamilyPanel } from "@/components/family/family-panel";
export const dynamic = "force-dynamic";
export default async function FamilyPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const session = await (await getAuth()).api.getSession({ headers: await headers() });
  if (!session || !session.user.emailVerified) redirect("/login");
  const { weddingId } = await params;
  let family;
  try { family = await listFamily(session.user.id, weddingId); } catch (error) { if (error instanceof FamilyError && error.status === 404) notFound(); throw error; }
  return <div className="auth-page"><header className="auth-header section-width"><Brand /><Link className="auth-back" href={`/weddings/${weddingId}/dashboard`}>← Back to dashboard</Link></header><main className="family-page section-width"><p className="eyebrow">{family.title} · FAMILY COLLABORATION</p><h1>Your people,<br /><em>together.</em></h1><p className="auth-card-intro">Bring your family into the plan, with the right access for everyone.</p><FamilyPanel localEmailPreview={isLocalEmailPreview()} weddingId={weddingId} family={family} /></main></div>;
}
