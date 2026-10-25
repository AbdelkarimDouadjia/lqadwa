"use client";
import { useCallback, useEffect, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Copy, Eye, EyeOff, Globe2, GripVertical, History, Layers3, LayoutTemplate, LockKeyhole, Monitor, Moon, MousePointer2, PanelLeft, Plus, Redo2, RotateCcw, Save, Send, Settings2, Smartphone, Sun, Tablet, Trash2, Type, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LandingPage } from "@/components/landing-page";
import { LandingEditorCanvas } from "@/components/landing-editor-canvas";
import { emptyLandingContent, landingContentSchema, landingLayout, landingSectionKeys, reorderLanding, type LandingContent, type LandingCopyKey, type LandingSectionKey } from "@/lib/landing-content";
import { landingDefaultCopy } from "@/lib/landing-copy";
import type { Language } from "@/lib/i18n";

type Revision = { id: string; actor: string; created_at: number };
type LandingState = { draft: LandingContent; published: LandingContent; draftVersion: number; publishedVersion: number; updatedAt: number; publishedAt: number; revisions: Revision[] };
const words = {
  title: ["محتوى الصفحة الرئيسية", "Contenu de la page d’accueil", "Landing page content", "Agbur n usebter agejdan"],
  help: ["عدّل النصوص والأقسام التي يراها الزوار. تحفظ المسودة أولاً، ولا تظهر للعموم حتى تضغط نشر.", "Modifiez les textes et sections visibles. Enregistrez d’abord le brouillon ; il ne sera public qu’après publication.", "Edit the visitor-facing copy and sections. Save a draft first; it stays private until you publish.", "Beddel aḍris d yiḥricen. Sekles aqbel, sakin sissen-it i yimdanen."],
  loading: ["جارٍ تحميل المحرر…", "Chargement de l’éditeur…", "Loading editor…", "Asali n umaẓrag…"],
  failed: ["تعذر تحميل محتوى الصفحة. تحقق من اتصالك ثم أعد المحاولة.", "Impossible de charger le contenu. Vérifiez la connexion puis réessayez.", "Could not load page content. Check your connection and retry.", "Ur yezmir ara ad yali ugbur. Senqed tuqqna, sakin ales."],
  retry: ["إعادة المحاولة", "Réessayer", "Retry", "Ales"],
  language: ["لغة التحرير", "Langue d’édition", "Editing language", "Tutlayt n ubeddel"],
  save: ["حفظ المسودة", "Enregistrer le brouillon", "Save draft", "Sekles aqerru"],
  publish: ["نشر للزوار", "Publier pour les visiteurs", "Publish for visitors", "Sissen i yimdanen"],
  preview: ["معاينة المسودة", "Prévisualiser le brouillon", "Preview draft", "Wali aqerru"],
  saved: ["حُفظت المسودة. ما تزال غير منشورة.", "Brouillon enregistré. Il n’est pas encore publié.", "Draft saved. It is not public yet.", "Aqerru yettwasekles; ur d-iban ara i yimdanen."],
  publishedToast: ["نُشر محتوى الصفحة بنجاح.", "Le contenu de la page est publié.", "The landing page is now published.", "Agbur n usebter yettwassen."],
  unchanged: ["المحتوى نفسه منشور بالفعل.", "Ce contenu est déjà publié.", "This content is already published.", "Agbur-a yella yakan."],
  publishing: ["جارٍ النشر…", "Publication…", "Publishing…", "Asissen…"],
  unsaved: ["هناك تغييرات غير محفوظة. احفظ المسودة قبل نشرها.", "Des modifications ne sont pas enregistrées. Enregistrez avant de publier.", "You have unsaved changes. Save the draft before publishing.", "Llan ibeddilen ur nettwasekles ara. Sekles uqbel asissen."],
  sections: ["ترتيب الأقسام", "Ordre des sections", "Section order", "Amizwer n yiḥricen"],
  visible: ["يظهر للزوار", "Visible aux visiteurs", "Visible to visitors", "Yettban i yimdanen"],
  reset: ["الأصل", "Texte d’origine", "Reset to default", "Ales amezwaru"],
  add: ["إضافة قسم محتوى", "Ajouter une section", "Add a content section", "Rnu aḥric"],
  addHelp: ["قسم نصي بسيط مع زر اختياري. أضف النص لكل لغة ليظهر بها.", "Section de texte simple avec bouton facultatif. Ajoutez le texte dans chaque langue souhaitée.", "A simple text section with an optional button. Add copy per language where it should appear.", "Aḥric n uḍris d tqeffalt s ufran. Rnu aḍris i tutlayin i tebɣiḍ."],
  heading: ["العنوان", "Titre", "Heading", "Azwel"], body: ["النص", "Texte", "Body text", "Aḍris"], buttonText: ["نص الزر (اختياري)", "Texte du bouton (facultatif)", "Button label (optional)", "Aḍris n tqeffalt (s ufran)"],
  buttonDestination: ["وجهة الزر", "Destination du bouton", "Button destination", "Anida ara truḥ tqeffalt"],
  noButton: ["بدون زر", "Sans bouton", "No button", "War taqeffalt"], search: ["مساحة البحث", "Espace de recherche", "Search workspace", "Adeg n unadi"], pharmacy: ["تسجيل الصيدلية", "Inscription pharmacie", "Pharmacy signup", "Asekles n tsaymit"], directory: ["دليل الصيدليات", "Annuaire des pharmacies", "Pharmacy directory", "Amahraz n tsaymitin"], journey: ["كيف تعمل", "Fonctionnement", "How it works", "Amek i iteddu"],
  remove: ["حذف القسم", "Supprimer la section", "Remove section", "Kkes aḥric"], deleteQuestion: ["حذف هذا القسم؟ لا يمكن التراجع عن الحذف بعد حفظ المسودة.", "Supprimer cette section ? Cette suppression sera enregistrée dans le brouillon.", "Remove this section? Saving the draft will keep it removed.", "Kkes aḥric-a?"],
  restore: ["استعادة هذه النسخة المنشورة", "Restaurer cette version publiée", "Restore this published version", "Err-d lversion-a"], history: ["النسخ السابقة", "Versions précédentes", "Previous published versions", "Lversions yezrin"], noHistory: ["تظهر هنا النسخ السابقة بعد أول نشر.", "Les versions précédentes apparaîtront après la première publication.", "Previous versions appear here after the first publish.", "Lversions yezrin ad d-banen seld asissen amezwaru."],
  published: ["المنشور", "Publié", "Published", "Yettwassen"], draft: ["مسودة", "Brouillon", "Draft", "Aqerru"], unpublished: ["غير منشور", "Non publié", "Not published", "Ur yettwassen ara"],
  confirmPublish: ["سيصبح هذا النص مرئياً لكل زوار الموقع. هل تريد المتابعة؟", "Ce contenu sera visible par tous les visiteurs. Continuer ?", "This copy will be visible to every site visitor. Continue?", "Aḍris-a ad d-yban i yal amdan. Kemmel?"], confirmRestore: ["سيحل هذا المحتوى محل المنشور الحالي فوراً. هل تريد المتابعة؟", "Cette version remplacera immédiatement le contenu publié. Continuer ?", "This will immediately replace the current published page. Continue?", "Lversion-a ad ibeddel agbur yettwassen tura. Kemmel?"],
  hero: ["المقدمة", "Introduction", "Introduction", "Tazwart"], tools: ["المزايا", "Fonctionnalités", "Features", "Tiwuriwin"], offer: ["العرض", "Offre", "Offer", "L’offre"], android: ["تطبيق Android", "Application Android", "Android app", "Asnas Android"], faq: ["الأسئلة", "Questions", "FAQ", "Isteqsiyen"],
} as const;
const studioWords = {
  studio: ["محرر الموقع", "Éditeur du site", "Website editor", "Amaẓrag n usmel"],
  dashboard: ["لوحة الإدارة", "Tableau de bord", "Dashboard", "Tafelwit n tedbelt"],
  layers: ["الأقسام", "Calques", "Layers", "Iḥricen"], insert: ["إضافة", "Insérer", "Insert", "Rnu"],
  canvas: ["الصفحة", "Page", "Canvas", "Asebter"], properties: ["الخصائص", "Propriétés", "Properties", "Timahilin"],
  drag: ["اسحب لترتيب القسم", "Glisser pour réordonner", "Drag to reorder section", "Smutti aḥric"],
  dragHelp: ["اسحب من المقبض لترتيب الأقسام، أو استخدم زري التحريك.", "Glissez une poignée pour déplacer une section, ou utilisez les flèches.", "Drag a handle to reorder sections, or use the move buttons.", "Smutti aḥric s ufus neɣ s tqeffalin."],
  selectHelp: ["اضغط على أي قسم في الصفحة لتعديله.", "Cliquez sur une section de la page pour la modifier.", "Select any section on the canvas to edit it.", "Fren aḥric deg usebter i ubeddel."],
  select: ["تحديد القسم", "Sélectionner la section", "Select section", "Fren aḥric"],
  moveUp: ["تحريك للأعلى", "Monter", "Move up", "Sali"], moveDown: ["تحريك للأسفل", "Descendre", "Move down", "Sader"],
  undo: ["تراجع", "Annuler", "Undo", "Err-d"], redo: ["إعادة", "Rétablir", "Redo", "Ales"],
  desktop: ["حاسوب", "Ordinateur", "Desktop", "Aselkim"], tablet: ["لوحي", "Tablette", "Tablet", "Tafelwit"], mobile: ["هاتف", "Téléphone", "Mobile", "Asawal"],
  fit: ["ملاءمة", "Ajuster", "Fit", "Sezg"], zoom: ["التكبير", "Zoom", "Zoom", "Asemɣer"],
  appearance: ["المظهر", "Apparence", "Appearance", "Timeẓri"],
  alignment: ["المحاذاة", "Alignement", "Alignment", "Asemsawi"],
  soft: ["خلفية ناعمة", "Fond doux", "Soft surface", "Agilil aleqqaq"], plain: ["بسيط", "Sobre", "Plain", "Aḥerfi"], brand: ["لون العلامة", "Couleur de marque", "Brand color", "Ini n usmel"],
  start: ["محاذاة البداية", "Aligner au début", "Align to start", "Di tazwara"], center: ["توسيط", "Centrer", "Center", "Deg tlemmast"],
  textSection: ["قسم نصي", "Section de texte", "Text section", "Aḥric n uḍris"], ctaSection: ["دعوة للتسجيل", "Appel à l’inscription", "Signup call to action", "Asekles"],
  templateHelp: ["اسحب إلى الصفحة، أو اضغط لإضافته بعد القسم المحدد.", "Glissez vers la page, ou cliquez pour insérer après la sélection.", "Drag onto the canvas, or click to insert after the selection.", "Smutti ɣer usebter neɣ senned i tmerna."],
  limit: ["يمكن إضافة ثمانية أقسام مخصصة كحد أقصى.", "Vous pouvez ajouter huit sections personnalisées au maximum.", "You can add up to eight custom sections.", "Tzemreḍ ad ternuḍ 8 n yiḥricen."],
  duplicate: ["نسخ القسم", "Dupliquer la section", "Duplicate section", "Nɣel aḥric"],
  hide: ["إخفاء القسم", "Masquer la section", "Hide section", "Ffer aḥric"], show: ["إظهار القسم", "Afficher la section", "Show section", "Sken aḥric"],
  hidden: ["مخفي عن الزوار", "Masqué aux visiteurs", "Hidden from visitors", "Yeffar i yimdanen"],
  fixed: ["موضع ثابت", "Position fixe", "Fixed position", "Adeg ur ibeddilen"],
  directoryHelp: ["دليل الصيدليات · يُحدّث تلقائياً من الصيدليات المعتمدة", "Annuaire · Alimenté automatiquement par les pharmacies approuvées", "Pharmacy directory · Automatically populated from approved pharmacies", "Amahraz n tsaymitin · Yettili s wudem awurman"],
  missing: ["أضف عنواناً ونصاً بهذه اللغة ليظهر القسم للزوار.", "Ajoutez un titre et un texte dans cette langue pour afficher cette section.", "Add a heading and body in this language to show this section to visitors.", "Rnu azwel d uḍris s tutlayt-a i uskan n uḥric."],
  required: ["أدخل نصاً أو استعد النص الأصلي.", "Saisissez un texte ou rétablissez le texte d’origine.", "Enter copy or reset to the default.", "Aru aḍris neɣ err-d aḍris amezwaru."],
  unsavedShort: ["تغييرات غير محفوظة", "Modifications non enregistrées", "Unsaved changes", "Ibeddilen ur nettwasekles ara"],
  savedShort: ["المسودة محفوظة", "Brouillon enregistré", "Draft saved", "Aqerru yettwasekles"],
  saving: ["جارٍ الحفظ…", "Enregistrement…", "Saving…", "Asekles…"],
  cancel: ["إلغاء", "Annuler", "Cancel", "Sefsex"], confirm: ["تأكيد", "Confirmer", "Confirm", "Sentem"],
  leave: ["مغادرة دون حفظ؟", "Quitter sans enregistrer ?", "Leave without saving?", "Ffeɣ war asekles?"],
  leaveHelp: ["تُفقد التغييرات غير المحفوظة. يمكنك حفظ المسودة أولاً.", "Les modifications non enregistrées seront perdues. Vous pouvez d’abord enregistrer le brouillon.", "Unsaved edits will be lost. You can save your draft first.", "Ibeddilen ur nettwasekles ara ad ṛuḥen."],
  publishHelp: ["تُحفظ تغييراتك ثم تُنشر للزوار بكل اللغات. يمكنك استعادة النسخة السابقة من السجل.", "Vos modifications seront enregistrées puis publiées dans toutes les langues. Vous pourrez restaurer une version précédente.", "Your changes will be saved, then published in every language. You can restore the previous page from history.", "Ibeddilen ad ttwaseklsen, sakin ad d-banen i yimdanen."],
  historyHelp: ["استعادة النسخة تغيّر الصفحة المنشورة فوراً. تبقى أي مسودة محفوظة وغير منشورة متاحة للتحرير.", "La restauration remplace la page publiée immédiatement. Un brouillon enregistré non publié est conservé.", "Restoring replaces the live page immediately. Any saved unpublished draft is preserved.", "Err-d lversion ad ibeddel asebter yettwassen tura."],
  changed: ["تم تحديث ترتيب الأقسام.", "L’ordre des sections a été modifié.", "Section order updated.", "Amizwer n yiḥricen ibeddel."],
  previewTheme: ["تغيير مظهر المعاينة", "Changer le thème de l’aperçu", "Toggle preview theme", "Beddel timeẓri"],
  editing: ["العودة للتحرير", "Revenir à l’édition", "Back to editing", "Uɣal ɣer ubeddel"],
} as const;
const editorWords = { ...words, ...studioWords };
const groups: { title: string; fields: { key: LandingCopyKey; multiline?: boolean }[] }[] = [
  { title: "hero", fields: [{ key: "titleA" }, { key: "titleB" }, { key: "lead", multiline: true }, { key: "explore" }, { key: "clientFree" }] },
  { title: "journey", fields: [{ key: "journey" }, { key: "search" }, { key: "scanHelp", multiline: true }, { key: "confirm" }, { key: "confirmHelp", multiline: true }, { key: "collect" }, { key: "collectHelp", multiline: true }] },
  { title: "tools", fields: [{ key: "tools" }, { key: "scan" }, { key: "scanBody", multiline: true }, { key: "scanAction" }, { key: "route" }, { key: "routeBody", multiline: true }] },
  { title: "pharmacy", fields: [{ key: "stock" }, { key: "stockBody", multiline: true }, { key: "join" }] },
  { title: "offer", fields: [{ key: "offer" }, { key: "offerBody", multiline: true }, { key: "free" }, { key: "month" }] },
  { title: "android", fields: [{ key: "android" }, { key: "androidBody", multiline: true }] },
  { title: "faq", fields: [{ key: "questions" }, { key: "delivery" }, { key: "aDelivery", multiline: true }, { key: "coverage" }, { key: "aCoverage", multiline: true }, { key: "reserve" }, { key: "aReserve", multiline: true }] },
];
const sectionLabels: Record<LandingSectionKey, keyof typeof words> = { journey: "journey", tools: "tools", pharmacy: "pharmacy", offer: "offer", android: "android", faq: "faq" };
const fieldLabels: Record<LandingCopyKey, readonly [string, string, string, string]> = {
  titleA: ["العنوان - السطر الأول", "Titre - première ligne", "Headline - first line", "Azwel - izir amezwaru"], titleB: ["العنوان - السطر الثاني", "Titre - deuxième ligne", "Headline - second line", "Azwel - izir wis sin"],
  lead: ["النص التعريفي", "Texte d’introduction", "Introductory copy", "Aḍris n tazwart"], explore: ["نص زر الاستكشاف", "Bouton de découverte", "Explore button", "Taqeffalt n unadi"], clientFree: ["ملاحظة مجانية المريض", "Mention de gratuité patient", "Patient-free note", "Tazmilt n baṭel i umuḍin"],
  journey: ["عنوان خطوات الخدمة", "Titre des étapes", "Steps heading", "Azwel n yimecwar"], search: ["خطوة البحث", "Étape de recherche", "Search step", "Amecwar n unadi"], scanHelp: ["شرح البحث", "Description de la recherche", "Search description", "Asegzi n unadi"], confirm: ["خطوة التأكيد", "Étape de confirmation", "Confirmation step", "Amecwar n usentem"], confirmHelp: ["شرح التأكيد", "Description de la confirmation", "Confirmation description", "Asegzi n usentem"], collect: ["خطوة الاستلام", "Étape du retrait", "Collection step", "Amecwar n wawey"], collectHelp: ["شرح الاستلام", "Description du retrait", "Collection description", "Asegzi n wawey"],
  tools: ["عنوان المزايا", "Titre des fonctionnalités", "Features heading", "Azwel n twuriwin"], scan: ["عنوان المسح الضوئي", "Titre du scan", "Scan heading", "Azwel n uskan"], scanBody: ["شرح المسح الضوئي", "Description du scan", "Scan description", "Asegzi n uskan"], scanAction: ["زر مساحة البحث", "Bouton de recherche", "Search workspace button", "Taqeffalt n unadi"], route: ["عنوان المسار", "Titre de l’itinéraire", "Directions heading", "Azwel n ubrid"], routeBody: ["شرح المسار", "Description de l’itinéraire", "Directions description", "Asegzi n ubrid"],
  stock: ["عنوان قسم الصيدليات", "Titre espace pharmacie", "Pharmacy section heading", "Azwel n tsaymit"], stockBody: ["شرح قسم الصيدليات", "Description espace pharmacie", "Pharmacy section description", "Asegzi n tsaymit"], join: ["زر تسجيل الصيدلية", "Bouton d’inscription pharmacie", "Pharmacy signup button", "Taqeffalt n usekles n tsaymit"],
  offer: ["عنوان العرض", "Titre de l’offre", "Offer heading", "Azwel n l’offre"], offerBody: ["تفاصيل العرض", "Détails de l’offre", "Offer details", "Talqayt n l’offre"], free: ["شارة السعر المجاني", "Badge de gratuité", "Free-price label", "Tabzimt n baṭel"], month: ["السعر المرجعي", "Prix de référence", "Reference price", "Azal n usmekti"],
  android: ["عنوان تطبيق Android", "Titre de l’application Android", "Android app heading", "Azwel n usnas Android"], androidBody: ["شرح تحميل التطبيق", "Texte de téléchargement", "App download description", "Asegzi n usider n usnas"],
  questions: ["عنوان الأسئلة", "Titre FAQ", "FAQ heading", "Azwel n yisteqsiyen"], delivery: ["السؤال عن التوصيل", "Question sur la livraison", "Delivery question", "Asteqsi ɣef usiweḍ"], aDelivery: ["إجابة التوصيل", "Réponse sur la livraison", "Delivery answer", "Tiririt ɣef usiweḍ"], coverage: ["السؤال عن التغطية", "Question sur la couverture", "Coverage question", "Asteqsi ɣef ussiwel"], aCoverage: ["إجابة التغطية", "Réponse sur la couverture", "Coverage answer", "Tiririt ɣef ussiwel"], reserve: ["السؤال عن الحجز", "Question sur la réservation", "Reservation question", "Asteqsi ɣef uḥraz"], aReserve: ["إجابة الحجز", "Réponse sur la réservation", "Reservation answer", "Tiririt ɣef uḥraz"],
};
const localeName = { ar: "العربية", fr: "Français", en: "English", kab: "Taqbaylit" } as const;
const indexOf = (language: Language) => language === "ar" ? 0 : language === "fr" ? 1 : language === "en" ? 2 : 3;
function defaultCopy(language: Language, key: LandingCopyKey): string {
  return landingDefaultCopy(language, key);
}
type ContentBlock = LandingContent["blocks"][number];
function BlockProperties({ block, language, working, w, update }: {
  block: ContentBlock; language: Language; working: boolean; w: (key: keyof typeof editorWords) => string; update: (change: (value: ContentBlock) => ContentBlock) => void;
}) {
  const id = (key: string) => `block-${block.id}-${key}`;
  return <fieldset className="builder-copy-fields" disabled={working}>
    <legend>{w("textSection")}</legend>
    {(["heading", "body", "button"] as const).map(key => <div className="builder-field" key={key}>
      <label htmlFor={id(key)}>{w(key === "button" ? "buttonText" : key)}</label>
      {key === "body" ? <Textarea id={id(key)} rows={4} maxLength={600} value={block.copy[language]?.body ?? ""} onChange={event => update(value => ({ ...value, copy: { ...value.copy, [language]: { ...value.copy[language], body: event.target.value } } }))} /> : <Input id={id(key)} maxLength={key === "heading" ? 100 : 80} value={block.copy[language]?.[key] ?? ""} onChange={event => update(value => ({ ...value, copy: { ...value.copy, [language]: { ...value.copy[language], [key]: event.target.value } } }))} />}
    </div>)}
    <p className="builder-panel-hint">{w("missing")}</p>
    <div className="builder-field"><label htmlFor={id("target")}>{w("buttonDestination")}</label><select id={id("target")} value={block.target} onChange={event => update(value => ({ ...value, target: event.target.value as typeof value.target }))}>{(["none", "search", "pharmacy", "directory", "journey"] as const).map(key => <option key={key} value={key}>{w(key === "none" ? "noButton" : key)}</option>)}</select></div>
    <div className="builder-field"><label htmlFor={id("tone")}>{w("appearance")}</label><select id={id("tone")} value={block.appearance?.tone ?? "soft"} onChange={event => update(value => ({ ...value, appearance: { align: value.appearance?.align ?? "start", tone: event.target.value as "soft" | "plain" | "brand" } }))}>{(["soft", "plain", "brand"] as const).map(key => <option key={key} value={key}>{w(key)}</option>)}</select></div>
    <div className="builder-field"><label htmlFor={id("align")}>{w("alignment")}</label><select id={id("align")} value={block.appearance?.align ?? "start"} onChange={event => update(value => ({ ...value, appearance: { tone: value.appearance?.tone ?? "soft", align: event.target.value as "start" | "center" } }))}>{(["start", "center"] as const).map(key => <option key={key} value={key}>{w(key)}</option>)}</select></div>
  </fieldset>;
}
export function AdminLandingEditor({ language }: { language: Language }) {
  const router = useRouter();
  const i = indexOf(language), w = (key: keyof typeof editorWords) => editorWords[key][i];
  const [history, setHistory] = useState<{ past: LandingContent[]; present: LandingContent; future: LandingContent[] }>({ past: [], present: emptyLandingContent, future: [] });
  const draft = history.present;
  const [published, setPublished] = useState<LandingContent>(emptyLandingContent), [savedDraft, setSavedDraft] = useState<LandingContent>(emptyLandingContent);
  const [version, setVersion] = useState(0), [publishedVersion, setPublishedVersion] = useState(0), [revisions, setRevisions] = useState<Revision[]>([]);
  const [contentLanguage, setContentLanguage] = useState(language), [requestedSelection, setSelected] = useState("hero");
  const [working, setWorking] = useState(false), [loaded, setLoaded] = useState(false), [loadError, setLoadError] = useState(false), [requestError, setRequestError] = useState("");
  const [preview, setPreview] = useState(false), [leftTab, setLeftTab] = useState<"layers" | "insert">("layers"), [showHistory, setShowHistory] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"layers" | "canvas" | "properties">("canvas"), [device, setDevice] = useState(1280), [zoom, setZoom] = useState<number | "fit">("fit"), [theme, setTheme] = useState<"light" | "dark">("light");
  const [pending, setPending] = useState<{ kind: "publish" | "delete" | "restore" | "leave"; revision?: Revision } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null), [drop, setDrop] = useState<{ id: string; after: boolean } | null>(null), [announcement, setAnnouncement] = useState("");
  const dragRef = useRef<string | null>(null), dropRef = useRef<typeof drop>(null), canvasRef = useRef<HTMLDivElement>(null);
  const pointerDrag = useRef(false);
  const selected = requestedSelection === "hero" || (landingSectionKeys as readonly string[]).includes(requestedSelection) || draft.blocks.some(block => block.id === requestedSelection) ? requestedSelection : "hero";
  const layout = landingLayout(draft), selectedBlock = draft.blocks.find(block => block.id === selected);
  const selectedGroup = groups.find(group => group.title === selected);
  const isBuiltIn = (id: string): id is LandingSectionKey => (landingSectionKeys as readonly string[]).includes(id);
  const hidden = (id: string) => isBuiltIn(id) ? draft.sections[id] === false : draft.blocks.find(block => block.id === id)?.enabled === false;
  const name = (id: string) => id === "hero" ? w("hero") : isBuiltIn(id) ? w(sectionLabels[id]) : draft.blocks.find(block => block.id === id)?.copy[contentLanguage]?.heading || w("textSection");
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedDraft), hasUnpublished = dirty || JSON.stringify(savedDraft) !== JSON.stringify(published);
  const valid = landingContentSchema.safeParse(draft).success;
  function setDraft(update: (current: LandingContent) => LandingContent) {
    if (working) return;
    setHistory(current => {
      const next = update(current.present);
      if (JSON.stringify(next) === JSON.stringify(current.present)) return current;
      return { past: [...current.past.slice(-49), current.present], present: next, future: [] };
    });
  }
  function undo() { if (!working) setHistory(h => h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h); }
  function redo() { if (!working) setHistory(h => h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h); }
  const call = useCallback(async <T extends object = Record<string, unknown>,>(body: Record<string, unknown>): Promise<T> => {
    const response = await fetch("/api/landing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
    const result = await response.json() as T & { error?: string };
    if (!response.ok) throw new Error(result.error || "Landing request failed.");
    return result;
  }, []);
  const reload = useCallback(async () => {
    const result = await call<LandingState>({ action: "load" });
    setLoadError(false); setHistory({ past: [], present: result.draft, future: [] }); setSavedDraft(result.draft); setPublished(result.published);
    setVersion(result.draftVersion); setPublishedVersion(result.publishedVersion); setRevisions(result.revisions); setLoaded(true);
  }, [call]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void reload().catch(() => setLoadError(true)); }, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function select(id: string, scroll = true) {
    setSelected(id); setShowHistory(false);
    if (scroll) canvasRef.current?.querySelector("iframe")?.contentDocument?.querySelector(`[data-editor-node="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function updateCopy(key: LandingCopyKey, value?: string) {
    setDraft(current => {
      const copy = { ...current.copy[contentLanguage] }; if (value === undefined) delete copy[key]; else copy[key] = value;
      const locales = { ...current.copy }; if (Object.keys(copy).length) locales[contentLanguage] = copy; else delete locales[contentLanguage];
      return { ...current, copy: locales };
    });
  }
  function updateBlock(update: (block: NonNullable<typeof selectedBlock>) => NonNullable<typeof selectedBlock>) {
    setDraft(current => ({ ...current, blocks: current.blocks.map(block => block.id === selected ? update(block) : block) }));
  }
  function toggle(id: string) {
    setDraft(current => isBuiltIn(id) ? { ...current, sections: { ...current.sections, [id]: current.sections[id] === false } } : { ...current, blocks: current.blocks.map(block => block.id === id ? { ...block, enabled: !block.enabled } : block) });
  }
  function move(id: string, delta: number) {
    const target = layout[layout.indexOf(id) + delta];
    if (target) { setDraft(current => reorderLanding(current, id, target, delta > 0)); setAnnouncement(w("changed")); }
  }
  function add(template: string, target = selected, after = true) {
    if (working || draft.blocks.length >= 8) return;
    const id = crypto.randomUUID(), cta = template === "template:cta";
    const block: NonNullable<typeof selectedBlock> = { id, enabled: true, target: cta ? "search" : "none", appearance: { tone: cta ? "brand" : "soft", align: cta ? "center" : "start" }, copy: { [contentLanguage]: { heading: defaultCopy(contentLanguage, cta ? "titleA" : "tools"), body: defaultCopy(contentLanguage, cta ? "lead" : "routeBody"), ...(cta ? { button: defaultCopy(contentLanguage, "explore") } : {}) } } };
    setDraft(current => {
      const order = [...landingLayout(current)], index = order.indexOf(target);
      order.splice(index < 0 ? 0 : index + Number(after), 0, id);
      return { ...current, blocks: [...current.blocks, block], layout: order };
    });
    setLeftTab("layers"); select(id, false); setMobilePanel("properties");
  }
  function duplicate() {
    if (!selectedBlock || draft.blocks.length >= 8) return;
    const block = { ...structuredClone(selectedBlock), id: crypto.randomUUID() };
    setDraft(current => {
      const order = [...landingLayout(current)]; order.splice(order.indexOf(selected) + 1, 0, block.id);
      return { ...current, blocks: [...current.blocks, block], layout: order };
    });
    select(block.id, false);
  }
  function clearDrag() { dragRef.current = null; dropRef.current = null; pointerDrag.current = false; setDragging(null); setDrop(null); }
  function setDropTarget(id: string, after: boolean) { const next = { id, after }; dropRef.current = next; setDrop(next); }
  function finishDrop(id: string, after: boolean) {
    const source = dragRef.current;
    if (source?.startsWith("template:")) add(source, id, after);
    else if (source) { setDraft(current => reorderLanding(current, source, id, after)); select(source, false); setAnnouncement(w("changed")); }
    clearDrag();
  }
  function dragStart(event: DragEvent, id: string) {
    if (working) { event.preventDefault(); return; }
    dragRef.current = id; setDragging(id); event.dataTransfer.effectAllowed = id.startsWith("template:") ? "copy" : "move"; event.dataTransfer.setData("text/plain", id);
  }
  function dragOver(event: DragEvent<HTMLElement>, id: string) {
    if (!dragRef.current || working) return;
    event.preventDefault(); event.stopPropagation();
    event.dataTransfer.dropEffect = dragRef.current.startsWith("template:") ? "copy" : "move";
    const rect = event.currentTarget.getBoundingClientRect(); setDropTarget(id, event.clientY > rect.top + rect.height / 2);
  }
  function touchStart(event: ReactPointerEvent<HTMLButtonElement>, id: string, canvas: boolean) {
    if ((event.pointerType === "mouse" && !canvas) || working) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); pointerDrag.current = true; dragRef.current = id; setDragging(id);
  }
  function touchMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!pointerDrag.current || !dragRef.current) return;
    const doc = event.currentTarget.ownerDocument, target = doc.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-editor-drop]");
    if (target) { const rect = target.getBoundingClientRect(); setDropTarget(target.dataset.editorDrop!, event.clientY > rect.top + rect.height / 2); }
    const scroller = target?.closest<HTMLElement>("[data-editor-scroll]") ?? doc.scrollingElement;
    if (scroller) { const rect = scroller.getBoundingClientRect(); if (event.clientY < Math.max(0, rect.top) + 50) scroller.scrollBy(0, -20); else if (event.clientY > Math.min(doc.documentElement.clientHeight, rect.bottom) - 50) scroller.scrollBy(0, 20); }
  }
  function dragHandle(id: string, canvas = false) {
    return <button type="button" className="builder-drag-handle" draggable={!working && !canvas} disabled={working} aria-label={`${w("drag")}: ${name(id)}`} title={w("drag")} onDragStart={event => dragStart(event, id)} onDragEnd={clearDrag} onPointerDown={event => touchStart(event, id, canvas)} onPointerMove={touchMove} onPointerUp={() => { if (pointerDrag.current && dragRef.current) { if (dropRef.current) finishDrop(dropRef.current.id, dropRef.current.after); else clearDrag(); } }} onPointerCancel={clearDrag} onKeyDown={event => { if (event.altKey && ["ArrowUp", "ArrowDown"].includes(event.key)) { event.preventDefault(); move(id, event.key === "ArrowUp" ? -1 : 1); } }}><GripVertical aria-hidden="true" /></button>;
  }
  function dropProps(id: string) {
    return { "data-editor-drop": id, "data-drop": drop?.id === id ? drop.after ? "after" : "before" : undefined, onDragOver: (event: DragEvent<HTMLElement>) => dragOver(event, id), onDrop: (event: DragEvent<HTMLElement>) => { if (dragRef.current) { event.preventDefault(); event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); finishDrop(id, event.clientY > rect.top + rect.height / 2); } } };
  }
  async function persist() {
    if (!dirty) return version;
    const result = await call<{ draftVersion: number }>({ action: "save", draftVersion: version, content: draft });
    setVersion(result.draftVersion); setSavedDraft(draft); return result.draftVersion;
  }
  function failed(error: unknown) { const message = error instanceof Error ? error.message : w("failed"); setRequestError(message); toast.error(message); }
  async function save() {
    if (working || !dirty || !valid) return;
    setWorking(true); setRequestError("");
    try { await persist(); toast.success(w("saved")); } catch (error) { failed(error); } finally { setWorking(false); }
  }
  async function confirmAction() {
    if (!pending || working) return;
    if (pending.kind === "leave") { router.push("/operations"); return; }
    if (pending.kind === "delete") {
      setDraft(current => ({ ...current, blocks: current.blocks.filter(block => block.id !== selected), layout: landingLayout(current).filter(id => id !== selected) }));
      select("hero"); setPending(null); return;
    }
    setWorking(true); setRequestError("");
    try {
      if (pending.kind === "publish") { const draftVersion = await persist(); await call({ action: "publish", draftVersion }); }
      else if (pending.revision) await call({ action: "restore", draftVersion: version, revision: pending.revision.id });
      await reload(); setPending(null); toast.success(w("publishedToast"));
    } catch (error) { failed(error); } finally { setWorking(false); }
  }
  function renderSection(id: string, node: ReactNode) {
    const fixed = id === "hero", missing = draft.blocks.some(block => block.id === id && (!block.copy[contentLanguage]?.heading?.trim() || !block.copy[contentLanguage]?.body?.trim()));
    return <section className={`builder-page-section ${selected === id ? "is-selected" : ""} ${hidden(id) ? "is-hidden" : ""} ${dragging === id ? "is-dragging" : ""}`} data-editor-node={id} {...(fixed ? {} : dropProps(id))} onClick={() => select(id, false)} aria-label={name(id)}>
      <div className="builder-section-label">{fixed ? <LockKeyhole aria-hidden="true" /> : dragHandle(id, true)}<button type="button" onClick={() => select(id, false)} aria-label={`${w("select")}: ${name(id)}`}>{name(id)}</button>{hidden(id) && <span><EyeOff aria-hidden="true" />{w("hidden")}</span>}</div>
      <div inert>{missing ? <div className="builder-missing-section"><Type aria-hidden="true" /><p>{w("missing")}</p></div> : node}</div>
    </section>;
  }
  return <main className={`landing-editor builder ${preview ? "is-preview" : ""}`} dir={language === "ar" ? "rtl" : "ltr"} data-mobile-panel={mobilePanel} onKeyDown={event => {
    if (event.key === "Escape") { clearDrag(); setPreview(false); }
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.key.toLowerCase() === "s") { event.preventDefault(); void save(); }
    else if (!(event.target as HTMLElement).closest("input,textarea,select,[contenteditable]") && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
  }}>
    <header className="builder-header"><div className="builder-identity"><a href="/operations" className="builder-back" aria-label={w("dashboard")} title={w("dashboard")} onClick={event => { if (dirty) { event.preventDefault(); setPending({ kind: "leave" }); } }}><ArrowLeft aria-hidden="true" /></a><img src="/brand/luqya.png" alt="LQADWA" width="36" height="36" /><div><h1>{w("studio")}</h1><span>{w("title")}</span></div></div><div className="builder-history-controls"><Button variant="ghost" size="icon" aria-label={w("undo")} title={`${w("undo")} · Ctrl+Z`} disabled={working || !history.past.length} onClick={undo}><Undo2 /></Button><Button variant="ghost" size="icon" aria-label={w("redo")} title={`${w("redo")} · Ctrl+Shift+Z`} disabled={working || !history.future.length} onClick={redo}><Redo2 /></Button><Button variant="ghost" size="icon" aria-label={w("history")} title={w("history")} aria-pressed={showHistory} onClick={() => { setShowHistory(value => !value); setMobilePanel("properties"); }}><History /></Button></div><div className="builder-publish-actions"><Button variant="outline" disabled={!loaded || working} aria-pressed={preview} onClick={() => setPreview(value => !value)}><Eye /><span>{w(preview ? "editing" : "preview")}</span></Button><Button variant="outline" disabled={!loaded || working || !dirty || !valid} onClick={() => void save()}><Save /><span>{w(working ? "saving" : "save")}</span></Button><Button disabled={!loaded || working || !hasUnpublished || !valid} onClick={() => setPending({ kind: "publish" })}><Send /><span>{w("publish")}</span></Button></div></header>
    {!loaded ? <div className="builder-loading" role={loadError ? "alert" : "status"}><LayoutTemplate aria-hidden="true" /><h2>{w(loadError ? "failed" : "loading")}</h2>{loadError ? <Button variant="outline" onClick={() => void reload().catch(() => setLoadError(true))}><RotateCcw />{w("retry")}</Button> : <div className="builder-loading-lines"><i /><i /><i /></div>}</div> : <>
      <nav className="builder-mobile-tabs" aria-label={w("studio")}>{([["layers", PanelLeft], ["canvas", Monitor], ["properties", Settings2]] as const).map(([panel, Icon]) => <button key={panel} aria-current={mobilePanel === panel ? "page" : undefined} onClick={() => setMobilePanel(panel)}><Icon aria-hidden="true" />{w(panel)}</button>)}</nav>
      <div className="builder-workspace">
        <aside className="builder-layers" aria-label={w("layers")}><div className="builder-panel-tabs">{(["layers", "insert"] as const).map(tab => <button key={tab} aria-pressed={leftTab === tab} onClick={() => setLeftTab(tab)}>{tab === "layers" ? <Layers3 aria-hidden="true" /> : <Plus aria-hidden="true" />}{w(tab)}</button>)}</div><div className="builder-layer-scroll" data-editor-scroll>
          {leftTab === "layers" ? <><div className="builder-page-label"><Globe2 aria-hidden="true" />{w("title")}</div><ol className="builder-layer-list"><li className={`builder-layer ${selected === "hero" ? "is-selected" : ""}`}><span className="builder-fixed-icon"><LockKeyhole aria-hidden="true" /></span><button className="builder-layer-name" onClick={() => select("hero")} aria-pressed={selected === "hero"}>{w("hero")}<small>{w("fixed")}</small></button></li>{layout.map(id => <li key={id} className={`builder-layer ${selected === id ? "is-selected" : ""} ${hidden(id) ? "is-hidden" : ""} ${dragging === id ? "is-dragging" : ""}`} {...dropProps(id)}>{dragHandle(id)}<button className="builder-layer-name" onClick={() => select(id)} aria-pressed={selected === id}>{name(id)}</button><button className="builder-visibility" disabled={working} aria-label={`${w(hidden(id) ? "show" : "hide")}: ${name(id)}`} onClick={() => toggle(id)}>{hidden(id) ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></li>)}</ol><Button className="builder-add-section" variant="outline" onClick={() => setLeftTab("insert")}><Plus />{w("add")}</Button><p className="builder-panel-hint">{w("dragHelp")}</p></> : <><h2 className="builder-panel-title">{w("add")}</h2><p className="builder-panel-hint">{w("templateHelp")}</p>{(["text", "cta"] as const).map(template => <button key={template} className={`builder-template template-${template}`} disabled={working || draft.blocks.length >= 8} draggable={!working && draft.blocks.length < 8} onDragStart={event => dragStart(event, `template:${template}`)} onDragEnd={clearDrag} onClick={() => add(`template:${template}`)}><span className="builder-template-drawing" aria-hidden="true"><i /><i /><i />{template === "cta" && <b />}</span><span>{w(template === "cta" ? "ctaSection" : "textSection")}<Plus aria-hidden="true" /></span></button>)}{draft.blocks.length >= 8 && <p className="builder-panel-hint">{w("limit")}</p>}</>}
        </div></aside>
        <section className="builder-canvas" aria-label={w("canvas")} ref={canvasRef}><div className="builder-canvas-toolbar"><div className="builder-device-switch" role="group" aria-label={w("preview")}>{([[1280, Monitor, "desktop"], [768, Tablet, "tablet"], [390, Smartphone, "mobile"]] as const).map(([width, Icon, label]) => <button key={width} aria-label={w(label)} title={w(label)} aria-pressed={device === width} onClick={() => setDevice(width)}><Icon aria-hidden="true" /></button>)}</div><span className="builder-viewport-size" dir="ltr">{device}px</span><div className="builder-canvas-options"><button aria-label={w("previewTheme")} title={w("previewTheme")} onClick={() => setTheme(value => value === "light" ? "dark" : "light")}>{theme === "light" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}</button><label><span className="sr-only">{w("zoom")}</span><select value={zoom} onChange={event => setZoom(event.target.value === "fit" ? "fit" : Number(event.target.value))}><option value="fit">{w("fit")}</option>{[0.5, 0.75, 1].map(value => <option key={value} value={value}>{value * 100}%</option>)}</select></label></div></div>
          <LandingEditorCanvas width={device} zoom={zoom} theme={theme} language={contentLanguage} title={w("preview")}><div className="app-shell landing-editor-preview" onClickCapture={event => { if ((event.target as HTMLElement).closest("a")) event.preventDefault(); }}><div className="builder-preview-brand"><img src="/brand/luqya.png" width="32" height="32" alt="" /><strong>LQADWA.</strong><span>{w("title")}</span></div><div className="builder-preview-content"><LandingPage language={contentLanguage} content={draft} renderEditorSection={preview ? undefined : renderSection}><div className="builder-directory-placeholder"><Globe2 aria-hidden="true" /><p>{w("directoryHelp")}</p></div></LandingPage></div></div></LandingEditorCanvas>
          <div className="builder-canvas-hint"><MousePointer2 aria-hidden="true" />{w(preview ? "preview" : "selectHelp")}</div>
        </section>
        <aside className="builder-inspector" aria-label={w("properties")}><div className="builder-inspector-heading"><Settings2 aria-hidden="true" /><h2>{w(showHistory ? "history" : "properties")}</h2></div><div className="builder-inspector-scroll" data-editor-scroll>{showHistory ? <section className="landing-revision-history"><p className="builder-panel-hint">{w("historyHelp")}</p>{revisions.length ? revisions.map(revision => <article key={revision.id}><span>{new Date(revision.created_at).toLocaleString(language === "ar" ? "ar-DZ" : language === "kab" ? "fr-DZ" : `${language}-DZ`)}</span><Button variant="outline" disabled={working || dirty} onClick={() => setPending({ kind: "restore", revision })}><RotateCcw />{w("restore")}</Button></article>) : <p className="builder-panel-hint">{w("noHistory")}</p>}{dirty && <p className="builder-panel-hint">{w("unsaved")}</p>}</section> : <>
          <div className="builder-selection-heading"><span>{w("select")}</span><h3>{name(selected)}</h3></div><div className="builder-field builder-language"><label htmlFor="editor-content-language">{w("language")}</label><select id="editor-content-language" value={contentLanguage} disabled={working} onChange={event => setContentLanguage(event.target.value as Language)}>{Object.entries(localeName).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></div>
          {selected !== "hero" && (isBuiltIn(selected) || selectedBlock) && <><label className="builder-visible"><Checkbox checked={!hidden(selected)} disabled={working} onCheckedChange={() => toggle(selected)} />{w("visible")}</label><div className="builder-section-actions"><Button variant="outline" size="icon" title={w("moveUp")} aria-label={w("moveUp")} disabled={working || layout.indexOf(selected) <= 0} onClick={() => move(selected, -1)}><ArrowUp /></Button><Button variant="outline" size="icon" title={w("moveDown")} aria-label={w("moveDown")} disabled={working || layout.indexOf(selected) === layout.length - 1} onClick={() => move(selected, 1)}><ArrowDown /></Button>{selectedBlock && <><Button variant="outline" size="icon" title={w("duplicate")} aria-label={w("duplicate")} disabled={working || draft.blocks.length >= 8} onClick={duplicate}><Copy /></Button><Button variant="outline" size="icon" className="builder-delete" title={w("remove")} aria-label={w("remove")} disabled={working} onClick={() => setPending({ kind: "delete" })}><Trash2 /></Button></>}</div></>}
          {selectedGroup && <fieldset className="builder-copy-fields" disabled={working}><legend>{w("title")}</legend>{selectedGroup.fields.map(({ key, multiline }) => {
            const label = fieldLabels[key][i], value = draft.copy[contentLanguage]?.[key] ?? defaultCopy(contentLanguage, key), empty = !value.trim();
            return <div className="builder-field" key={key}><div className="builder-field-label"><label htmlFor={`copy-${key}`}>{label}</label><button type="button" title={w("reset")} aria-label={`${w("reset")}: ${label}`} disabled={working || draft.copy[contentLanguage]?.[key] === undefined} onClick={() => updateCopy(key)}><RotateCcw aria-hidden="true" /></button></div>{multiline ? <Textarea id={`copy-${key}`} maxLength={600} rows={4} value={value} aria-invalid={empty} aria-describedby={empty ? `error-${key}` : undefined} onChange={event => updateCopy(key, event.target.value)} /> : <Input id={`copy-${key}`} maxLength={600} value={value} aria-invalid={empty} aria-describedby={empty ? `error-${key}` : undefined} onChange={event => updateCopy(key, event.target.value)} />}{empty && <span className="builder-field-error" id={`error-${key}`}>{w("required")}</span>}</div>;
          })}</fieldset>}
          {selectedBlock && <BlockProperties block={selectedBlock} language={contentLanguage} working={working} w={w} update={updateBlock} />}
          {!selectedGroup && !selectedBlock && <p className="builder-panel-hint">{w("selectHelp")}</p>}
        </>}</div></aside>
      </div><footer className="builder-statusbar"><span role="status">{dirty ? <><span className="builder-status-dot" />{w("unsavedShort")}</> : <><Check aria-hidden="true" />{w(hasUnpublished ? "savedShort" : "published")}</>}</span>{requestError && <span className="builder-request-error" role="alert">{requestError}</span>}<span className="builder-version">v{publishedVersion} · {localeName[contentLanguage]}</span></footer>
    </>}
    <span className="sr-only" aria-live="polite">{announcement}</span>
    <Dialog open={!!pending} onOpenChange={open => { if (!open && !working) setPending(null); }}><DialogContent className="builder-confirm" dir={language === "ar" ? "rtl" : "ltr"}><DialogTitle>{pending?.kind === "leave" ? w("leave") : pending?.kind === "delete" ? w("remove") : pending?.kind === "restore" ? w("restore") : w("publish")}</DialogTitle><DialogDescription>{pending?.kind === "leave" ? w("leaveHelp") : pending?.kind === "delete" ? w("deleteQuestion") : pending?.kind === "restore" ? w("historyHelp") : w("publishHelp")}</DialogDescription><div className="builder-confirm-actions"><Button variant="outline" disabled={working} onClick={() => setPending(null)}>{w("cancel")}</Button><Button disabled={working} onClick={() => void confirmAction()}>{w(working ? "saving" : "confirm")}</Button></div></DialogContent></Dialog>
  </main>;
}
