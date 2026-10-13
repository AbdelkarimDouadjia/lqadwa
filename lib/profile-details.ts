import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).default("");
export const personalFields = {
  firstName: optionalText(60), lastName: optionalText(60),
  phone: optionalText(24).refine(v => !v || /^(?:0\d{8,9}|\+213\d{8,9})$/.test(v), "Invalid Algerian phone number"),
  municipality: optionalText(80), address: optionalText(160),
  age: z.number().int().min(0).max(120).nullable().default(null),
  jobTitle: optionalText(80),
};
export const personalSchema = z.object(personalFields);
export const healthSchema = z.object({ conditions: optionalText(600), chronicConditions: optionalText(600), allergies: optionalText(400), shareWithOwner: z.boolean().default(false) });
export const pharmacyDetailsSchema = z.object({ contactName: optionalText(120), contactEmail: z.union([z.literal(""), z.string().trim().email().max(254)]).default(""), municipality: optionalText(80), accessNotes: optionalText(240), wheelchairAccess: z.boolean().default(false) });
export type PersonalDetails = z.infer<typeof personalSchema>;
export type HealthDetails = z.infer<typeof healthSchema>;
export type PharmacyDetails = z.infer<typeof pharmacyDetailsSchema>;
export function initialPersonalDetails(metadata: Record<string,unknown> | undefined): PersonalDetails {
  return parseDetails(personalSchema,{firstName:typeof metadata?.first_name==="string"?metadata.first_name:"",lastName:typeof metadata?.last_name==="string"?metadata.last_name:""});
}
export function parseDetails<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  try { return schema.parse(typeof value === "string" ? JSON.parse(value) : value || {}); }
  catch { return schema.parse({}); }
}
