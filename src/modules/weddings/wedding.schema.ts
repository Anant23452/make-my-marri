import { z } from "zod";

export const createWeddingSchema = z.object({
  brideName: z.string().trim().min(2, "Enter the bride’s name.").max(120).optional(),
  groomName: z.string().trim().min(2, "Enter the groom’s name.").max(120).optional(),
  title: z.string().trim().min(2, "Enter a wedding title.").max(120),
  weddingDate: z.iso.date("Choose a valid wedding date."),
  city: z.string().trim().max(120).optional(),
  timezone: z.literal("Asia/Kolkata").default("Asia/Kolkata"),
}).strict();

export type CreateWeddingInput = z.output<typeof createWeddingSchema>;

export function suggestWeddingTitle(bride: string, groom: string) {
  const names = [bride, groom].map(name => name.trim().split(/\s+/)[0]).filter(Boolean);
  return names.length ? `${names.join(" & ")}’s Wedding` : "";
}
