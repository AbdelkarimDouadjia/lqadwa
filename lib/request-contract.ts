import { z } from "zod";
export const medicineSelectionFields = {
  medicine: z.string().trim().min(2).max(300),
  medicineId: z.string().regex(/^miph-2026-08:\d{5}$/).optional(),
  catalogVersion: z.string().max(40).optional(),
  selectionSource: z.enum(["manual", "catalog", "ocr"]).optional(),
};
