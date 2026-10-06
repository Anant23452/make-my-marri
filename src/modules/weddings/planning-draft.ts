import { z } from "zod";
const storageKey = "make-my-marriage:planning-draft:v1";
export const planningDraftSchema = z.object({
  title: z.string().trim().min(2, "Add a wedding name of at least 2 characters.").max(120),
  weddingDate: z.union([z.literal(""), z.iso.date()]),
  city: z.string().trim().max(120),
});
export type PlanningDraft = z.infer<typeof planningDraftSchema>;
// This browser-only starter is not an authenticated wedding workspace.
export function readPlanningDraft(): PlanningDraft | null {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;
    const parsed = planningDraftSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}
export function savePlanningDraft(input: PlanningDraft) {
  const draft = planningDraftSchema.parse(input);
  localStorage.setItem(storageKey, JSON.stringify(draft));
  return draft;
}
