"use client";
import { ArrowUpRight, GripVertical, Layers3, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/i18n";

const copy = {
  ar: ["محرر الموقع المرئي", "صمّم الصفحة التي تستقبل زوارك", "اسحب الأقسام لترتيبها، عدّل النصوص على المعاينة المباشرة، ثم انشر عندما تصبح جاهزاً.", "فتح محرر الصفحة", "مساحة مستقلة · مسودة خاصة · أربع لغات"],
  fr: ["Éditeur visuel du site", "Composez la page qui accueille vos visiteurs", "Glissez les sections, modifiez les textes avec un aperçu en direct, puis publiez quand tout est prêt.", "Ouvrir l’éditeur", "Espace dédié · Brouillon privé · Quatre langues"],
  en: ["Visual website editor", "Shape the page your visitors see", "Drag sections into place, edit copy alongside a live preview, and publish when you’re ready.", "Open page editor", "Dedicated workspace · Private draft · Four languages"],
  kab: ["Amaẓrag n usmel", "Beddel asebter n yinerzaf", "Smutti iḥricen, beddel aḍris, wali agbur uqbel asissen.", "Ldi amaẓrag", "Adeg iman-is · Aqerru uslig · Kuẓ n tutlayin"],
} as const;
export function AdminEditorLauncher({ language }: { language: Language }) {
  const t = copy[language];
  return <section className="visual-editor-entry" aria-labelledby="visual-editor-entry-title"><div className="editor-entry-copy"><span className="editor-entry-kicker"><Layers3 aria-hidden="true" />{t[0]}</span><h2 id="visual-editor-entry-title">{t[1]}</h2><p>{t[2]}</p><Button asChild><a href={`/operations/editor?lang=${language}`}>{t[3]}<ArrowUpRight aria-hidden="true" /></a></Button><small>{t[4]}</small></div><div className="editor-entry-illustration" aria-hidden="true"><div className="editor-entry-layers">{[0, 1, 2].map(n => <span key={n}><GripVertical /><i /></span>)}</div><div className="editor-entry-page"><i /><div /><span /><span /></div><MousePointer2 className="editor-entry-pointer" /></div></section>;
}
