import type { Language } from "@/lib/i18n";
import { releaseText } from "@/lib/release-copy";
export function MedicineIdentityNote({language,verification}:{language:Language;verification?:string}){
  return <p className="auth-help">{releaseText(language,verification==="catalog-identified"?"identified":"uncertain")}</p>;
}
