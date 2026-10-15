import { editorialText } from "@/lib/editorial-copy";
import { ex } from "@/lib/experience-copy";
import type { LandingCopyKey } from "@/lib/landing-content";
import type { Language } from "@/lib/i18n";

const experienceKeys = ["clientFree", "join", "free", "scanHelp", "confirmHelp", "collectHelp", "aDelivery", "aCoverage", "aReserve"] as const;
export function landingDefaultCopy(language: Language, key: LandingCopyKey): string {
  return (experienceKeys as readonly string[]).includes(key)
    ? ex(language, key as Parameters<typeof ex>[1])
    : editorialText(language, key as Parameters<typeof editorialText>[1]);
}
