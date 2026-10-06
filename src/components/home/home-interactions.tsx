"use client";
import { useId, useRef, useState, type FormEvent } from "react";
import { Arrow, Brand, Flower } from "./home-marks";
import { planningDraftSchema, readPlanningDraft, savePlanningDraft } from "@/modules/weddings/planning-draft";

export function PlanningButton({ className = "button", label = "Start planning your wedding" }: { className?: string; label?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [draft, setDraft] = useState({ title: "", weddingDate: "", city: "" });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  function open() {
    setDraft(readPlanningDraft() ?? { title: "", weddingDate: "", city: "" });
    setSaved(false); setError(""); dialog.current?.showModal();
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = planningDraftSchema.safeParse(draft);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    try { setDraft(savePlanningDraft(parsed.data)); setSaved(true); setError(""); }
    catch { setError("Your browser couldn’t save the draft. Please allow site storage and try again."); }
  }
  return <><button className={className} onClick={open}>{label}<Arrow /></button><dialog ref={dialog} className="planning-dialog" aria-labelledby={`${id}-title`} onClick={(event) => { if (event.target === dialog.current) { const bounds = dialog.current.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.current.close(); } }}><button className="dialog-close" aria-label="Close planning starter" onClick={() => dialog.current?.close()}>×</button><Flower /><p className="eyebrow">YOUR FIRST LITTLE STEP</p><h2 id={`${id}-title`}>{saved ? "A lovely beginning." : "Let’s make it yours."}</h2>{saved ? <div role="status"><p>Your draft for <strong>{draft.title}</strong> is saved in this browser.</p><p className="form-note">An account and shared workspace haven’t been created yet. You can return to this starter on this browser to update your details.</p><button className="button" onClick={() => setSaved(false)}>Edit your draft <Arrow /></button></div> : <><p>Start with a name. The rest can unfold in its own time.</p><form onSubmit={submit}><label htmlFor={`${id}-name`}>Your wedding name <span>Required</span></label><input id={`${id}-name`} name="title" required minLength={2} maxLength={120} placeholder="e.g. Aarav & Nisha’s wedding" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /><label htmlFor={`${id}-date`}>Wedding date <span>Optional</span></label><input id={`${id}-date`} name="weddingDate" type="date" value={draft.weddingDate} onChange={(event) => setDraft({ ...draft, weddingDate: event.target.value })} /><label htmlFor={`${id}-city`}>City <span>Optional</span></label><input id={`${id}-city`} name="city" maxLength={120} placeholder="Where will you celebrate?" value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} /><p className="form-note">Planning preview · This saves a draft only on this browser. Accounts and shared workspaces are coming next.</p>{error && <p className="form-error" role="alert">{error}</p>}<button className="button" type="submit">Save my wedding draft <Arrow /></button></form></>}</dialog></>;
}
export function HomeHeader() {
  const [open, setOpen] = useState(false);
  return <header className="site-header"><div className="header-inner section-width"><Brand /><nav className={open ? "main-nav is-open" : "main-nav"} id="main-nav" aria-label="Main navigation"><a href="#how-it-works" onClick={() => setOpen(false)}>How it works</a><a href="#celebrations" onClick={() => setOpen(false)}>The celebrations</a><a href="#together" onClick={() => setOpen(false)}>Better together</a></nav><PlanningButton className="button header-cta" label="Start your story" /><button className="menu-toggle" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen(!open)}>{open ? "×" : <><span /><span /></>}</button></div></header>;
}
const ceremonies = [
  { name: "Haldi", mood: "A little sunshine. A lot of laughter.", description: "Keep the flowers, family tasks, venue, and guest list together, so there’s more time for the wonderfully messy bits.", time: "Morning celebration", tasks: ["Confirm the marigold décor", "Share the venue with family", "Prepare the ceremony essentials"], color: "#b19043", symbol: "☀" },
  { name: "Mehndi", mood: "Stories written in henna.", description: "Make space for slow afternoons, favourite songs, and intricate little details. Give your Mehndi its own thoughtful plan.", time: "Afternoon celebration", tasks: ["Confirm the Mehndi artist", "Arrange comfortable seating", "Share personal event invitations"], color: "#66805a", symbol: "❋" },
  { name: "Sangeet", mood: "Your people. Your kind of rhythm.", description: "Bring performances, music, and family responsibilities together. Let the evening be remembered for the dancing.", time: "Evening celebration", tasks: ["Put together the performance order", "Assign music coordination", "Confirm sound and lighting"], color: "#846e8d", symbol: "♫" },
  { name: "Wedding", mood: "The moment everything leads to.", description: "From the ceremony time to the last floral detail, keep the essentials close and your favourite people closer.", time: "The wedding ceremony", tasks: ["Confirm the ceremony time", "Review the mandap references", "Check final vendor arrangements"], color: "#a26756", symbol: "♡" },
  { name: "Reception", mood: "One last dance. A new beginning.", description: "A beautiful finish to the celebrations. Keep the dinner, invitations, and finishing touches in one easy-to-follow plan.", time: "Evening reception", tasks: ["Confirm the dinner menu", "Review event RSVP responses", "Record remaining vendor payments"], color: "#9a8250", symbol: "✧" },
];
export function CeremonyPreview() {
  const [active, setActive] = useState(0);
  const event = ceremonies[active];
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  return <div className="ceremony-preview"><div className="ceremony-tabs" role="tablist" aria-label="Explore the celebrations">{ceremonies.map((ceremony, index) => <button key={ceremony.name} ref={(node) => { tabs.current[index] = node; }} role="tab" id={`ceremony-tab-${index}`} aria-controls="ceremony-panel" aria-selected={active === index} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={(e) => { let next = index; if (e.key === "ArrowRight") next = (index + 1) % ceremonies.length; else if (e.key === "ArrowLeft") next = (index + ceremonies.length - 1) % ceremonies.length; else if (e.key === "Home") next = 0; else if (e.key === "End") next = ceremonies.length - 1; else return; e.preventDefault(); setActive(next); tabs.current[next]?.focus(); }}><span style={{ color: ceremony.color }} aria-hidden="true">{ceremony.symbol}</span>{ceremony.name}</button>)}</div><div className="ceremony-panel" id="ceremony-panel" role="tabpanel" aria-labelledby={`ceremony-tab-${active}`} tabIndex={0}><div className="ceremony-story" key={event.name}><p className="eyebrow">{event.time}</p><h3>{event.mood}</h3><p>{event.description}</p><span className="ceremony-custom">Your traditions, your timeline. Custom events welcome.</span></div><div className="ceremony-plan"><div className="preview-heading"><strong>A little {event.name} checklist</strong><span className="preview-label">Example plan</span></div>{event.tasks.map((task, index) => <div className="ceremony-task" key={task}><span className={index === 0 ? "demo-check checked" : "demo-check"} aria-hidden="true">{index === 0 && "✓"}</span><span>{task}</span></div>)}<div className="plan-footer"><span>Every task has a place.</span><span>And a person. <span aria-hidden="true">♡</span></span></div></div></div></div>;
}
