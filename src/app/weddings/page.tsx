import { ownsWedding } from "@/modules/weddings/wedding.repository";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuth } from "@/lib/auth/auth";
import { weddingService } from "@/modules/weddings/wedding.service";
import { Brand } from "@/components/home/home-marks";

export const dynamic = "force-dynamic";
export default async function WeddingsPage() {
  const session = await (await getAuth()).api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (!session.user.emailVerified) redirect("/login");
  const weddings = await weddingService.list(session.user.id);
  const alreadyOwned = await ownsWedding(session.user.id);
  return <div className="auth-page"><header className="auth-header section-width"><Brand /><Link className="auth-back" href="/login">Your account</Link></header><main className="auth-reset"><section className="auth-card"><p className="eyebrow">YOUR STORIES</p><h1>My weddings</h1><p className="auth-card-intro">Your saved wedding details. Ceremony planning and collaboration are coming next.</p>{weddings.length ? <ul className="wedding-list">{weddings.map(wedding => <li key={wedding.id}><h2>{wedding.title}</h2><p>{wedding.weddingDate}{wedding.city ? ` · ${wedding.city}` : ""}</p><small>{wedding.myRole === "OWNER" ? "Owner" : "Member"}</small></li>)}</ul> : <p>You haven’t created a wedding yet.</p>}{!alreadyOwned && <Link className="button auth-submit" href="/onboarding">Create a wedding →</Link>}</section></main></div>;
}
