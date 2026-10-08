"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { inviteSchema, memberRoleSchema } from "@/modules/family/family.schema";

type Family = { owner: boolean; title: string; members: { id: string; name: string; email: string; role: string; financeAccess: boolean; relationship?: string }[]; invites: { id: string; email: string; role: string; financeAccess: boolean; expiresAt: string; expired: boolean }[] };
export function FamilyPanel({ weddingId, family, localEmailPreview = false }: { weddingId: string; family: Family; localEmailPreview?: boolean }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [editing, setEditing] = useState<Family["members"][number] | null>(null);
  const base = `/api/v1/weddings/${weddingId}`;
  async function mutate(path: string, method: string, input?: unknown) {
    if (pending) return;
    setPending(true); setError(""); setMessage("");
    try {
      const response = await fetch(base + path, { method, headers: { "Content-Type": "application/json" }, ...(input ? { body: JSON.stringify(input) } : {}) });
      const result = await response.json();
      if (!response.ok) { setError(result.error?.message ?? "Please try again."); return; }
      dialog.current?.close(); setMessage(method === "POST" && path === "/member-invites" ? (localEmailPreview ? "Invitation saved in the local testing inbox. Open /dev/mailbox to accept it." : "Invitation email sent. The recipient can now accept.") : "Family access updated."); router.refresh();
    } catch { setError("We couldn’t confirm this update. Refresh before trying again."); }
    finally { setPending(false); }
  }
  function open(member: Family["members"][number] | null) { setEditing(member); setRole(member?.role === "VIEWER" ? "VIEWER" : "EDITOR"); setError(""); dialog.current?.showModal(); }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = { role, financeAccess: role === "EDITOR" && data.get("financeAccess") === "on", ...(!editing ? { email: data.get("email") } : {}) };
    const parsed = (editing ? memberRoleSchema : inviteSchema).safeParse(input);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    void mutate(editing ? `/members/${editing.id}` : "/member-invites", editing ? "PATCH" : "POST", parsed.data);
  }
  return <>
    <div className="family-toolbar"><p>Owners manage access. Editors help plan. Viewers stay informed.</p>{family.owner && <button className="button" onClick={() => open(null)}>Invite family member +</button>}</div>
    {message && <p className="auth-status" role="status">{message}</p>}{error && <p className="auth-error" role="alert">{error}</p>}
    <section className="family-section"><h2>{family.owner ? <>Family members <small>{family.members.length}</small></> : "Your access"}</h2>{family.members.map(member => <div className="family-row" key={member.id}><div><strong>{member.name}</strong><p>{member.email}</p>{member.relationship && <p>{member.relationship}</p>}</div><div><span className="family-badge">{member.role === "OWNER" ? "Owner" : member.role === "EDITOR" ? "Editor" : "Viewer"}</span><p>{member.role === "OWNER" || member.financeAccess ? "Budget & expenses access" : "No financial access"}</p>{!family.owner && <p>{member.role === "EDITOR" ? "You can help manage wedding plans." : "You can view wedding plans without making changes."} Only the Owner can view the full member list and manage invitations.</p>}</div>{family.owner && member.role !== "OWNER" && <div className="family-actions"><button className="auth-text-button" disabled={pending} onClick={() => open(member)}>Edit permissions</button><button className="auth-text-button" disabled={pending} onClick={() => { if (confirm(`Remove ${member.name}? They will lose access immediately.`)) void mutate(`/members/${member.id}`, "DELETE"); }}>Remove</button></div>}</div>)}{family.owner && family.members.length === 1 && <p className="family-empty">Your people have a place here. Invite your family to help with the plan.</p>}</section>
    {family.owner && <section className="family-section"><h2>Pending invitations</h2><p className="onboarding-help">Invitation links expire after 7 days.</p>{!family.invites.length && <p className="family-empty">No pending invitations. New invitations will appear here.</p>}{family.invites.map(invite => <div className="family-row" key={invite.id}><div><strong>{invite.email}</strong><p>{invite.role} · {invite.financeAccess ? "Finance access" : "No finances"}</p></div><div><span className="family-badge">{invite.expired ? "Expired" : "Awaiting response"}</span><p>Expires {new Date(invite.expiresAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</p></div><div className="family-actions"><button className="auth-text-button" disabled={pending} onClick={() => { if (confirm("Send a fresh invitation? The previous link will stop working.")) void mutate(`/member-invites/${invite.id}/resend`, "POST"); }}>Resend</button><button className="auth-text-button" disabled={pending} onClick={() => { if (confirm("Revoke this invitation? Its link will stop working.")) void mutate(`/member-invites/${invite.id}/revoke`, "POST"); }}>Revoke</button></div></div>)}</section>}
    <dialog className="planning-dialog" ref={dialog} aria-labelledby="family-dialog-title"><button className="dialog-close" aria-label="Close invitation" disabled={pending} onClick={() => dialog.current?.close()}>×</button><p className="eyebrow">FAMILY COLLABORATION</p><h2 id="family-dialog-title">{editing ? "Change member access" : "Make room for your people."}</h2><p>{editing ? editing.name : `Invite family to ${family.title}.`}</p><form key={editing?.id ?? "invite"} onSubmit={submit}><fieldset disabled={pending} style={{ border: 0, padding: 0 }}>{!editing && <><label htmlFor="family-email">Email address</label><input id="family-email" name="email" type="email" required maxLength={254} /></>}<label htmlFor="family-role">Role</label><select id="family-role" value={role} onChange={event => setRole(event.target.value as "EDITOR" | "VIEWER")}><option value="EDITOR">Editor — can help manage plans</option><option value="VIEWER">Viewer — view only</option></select>{role === "EDITOR" && <label className="family-finance"><input type="checkbox" name="financeAccess" defaultChecked={editing?.financeAccess ?? false} />Allow access to budgets and expenses</label>}<p className="form-note">{editing ? "Changes apply immediately." : "Sign in with the invited email to accept. The link expires in 7 days."}</p>{error && <p className="auth-error" role="alert">{error}</p>}<button className="button" type="submit">{pending ? "Saving…" : editing ? "Save changes" : "Send invitation"}</button></fieldset></form></dialog>
  </>;
}
