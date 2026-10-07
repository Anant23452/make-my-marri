import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/auth";
import { weddingService } from "@/modules/weddings/wedding.service";
import { ownsWedding } from "@/modules/weddings/wedding.repository";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const session = await (await getAuth()).api.getSession({ headers: await headers() });
  if (!session || !session.user.emailVerified) redirect("/login");
  const weddings = await weddingService.list(session.user.id);
  if (weddings.length || await ownsWedding(session.user.id)) redirect("/weddings");
  redirect("/onboarding");
}
