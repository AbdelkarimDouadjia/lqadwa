"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, FileScan, ImagePlus, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { prescriptionMatches, type PrescriptionCandidate } from "@/lib/prescription-match";
import type { Language } from "@/lib/i18n";
import type { Worker } from "tesseract.js";

const copy = {
  scan: ["مسح الوصفة", "Scanner une ordonnance", "Scan prescription", "Sken tamedyazt n ṭṭbib"],
  title: ["من الوصفة إلى البحث", "De l’ordonnance à la recherche", "From prescription to search", "Seg tmedyazt ɣer unadi"],
  intro: ["صوّر الوصفة أو اختر صورة واضحة. اقرأ النص المصوّر ثم اختر اسم الدواء للبحث.", "Photographiez l’ordonnance ou choisissez une image nette. Vérifiez le texte puis choisissez le médicament à rechercher.", "Take a clear photo or choose an image. Review the text, then choose a medicine to search for.", "Ṭṭef tawlaft neɣ fren tawlaft yellan. Senqed aḍris, syen fren ddwa i unadi."],
  privacy: ["الصورة والنص الكامل يبقيان على جهازك، ولا يُحفظان في حسابك. تجنب تصوير الاسم والعنوان إن أمكن.", "L’image et le texte restent sur votre appareil, sans enregistrement dans votre compte. Évitez le nom et l’adresse si possible.", "Image and full text stay on your device and are not saved to your account. Avoid including names and addresses where possible.", "Tawlaft d uḍris qqimen deg yibenk-ik kan; ur ttwaseklasen ara deg umiḍan."],
  caution: ["القراءة الآلية قد تخطئ، خصوصاً خط اليد. ليست تحققاً من الوصفة ولا نصيحة علاجية. راجع الاسم والتركيز مع الصيدلي؛ أحضر الأصل عند الحاجة.", "L’OCR peut se tromper, surtout sur l’écriture manuscrite. Il ne valide pas une ordonnance et ne donne aucun conseil médical. Vérifiez le nom et le dosage avec le pharmacien ; apportez l’original si nécessaire.", "OCR can misread text, especially handwriting. It does not validate prescriptions or provide treatment advice. Check name and strength with a pharmacist and bring the original when required.", "Taɣuri tawurmant tezmer ad texḍeḍ, ladɣa tira s ufus. Senqed isem d lqedd n ddwa ɣer usaysi. Awi-d tamedyazt taneṣlit."],
  camera: ["التقاط صورة", "Prendre une photo", "Take a photo", "Ṭṭef tawlaft"],
  photo: ["اختيار صورة", "Choisir une image", "Choose an image", "Fren tawlaft"],
  reading: ["جارٍ قراءة الصورة على جهازك…", "Lecture sur votre appareil…", "Reading on your device…", "Taɣuri deg yibenk-ik…"],
  text: ["النص المستخرج — راجعه وعدّله", "Texte extrait — vérifiez et corrigez", "Extracted text — review and edit", "Aḍris — senqed-t, seɣti-t"],
  match: ["أسماء محتملة من الفهرس الجزائري", "Correspondances possibles du catalogue algérien", "Possible Algerian catalog matches", "Ismawen yezmer ad ilin deg ukatalug azzayri"],
  check: ["مطابقة النص المعدّل", "Rechercher les correspondances", "Match edited text", "Anadi deg uḍris yettuseɣtin"],
  manual: ["لم يظهر تطابق واضح. اكتب اسم الدواء فقط في البحث أو استعن بالصيدلي.", "Aucune correspondance claire. Saisissez uniquement le nom dans la recherche ou demandez au pharmacien.", "No clear match. Type only the medicine name in search or ask a pharmacist.", "Ulac amṣada. Aru isem n ddwa deg unadi neɣ steqsi asaysi."],
  error: ["تعذّرت القراءة. جرّب صورة أوضح (حتى 8 MB) أو اكتب الاسم يدوياً.", "Lecture impossible. Essayez une image plus nette (8 Mo max.) ou saisissez le nom.", "Could not read image. Try a clearer image (max. 8 MB) or type the name.", "Taɣuri ur teddi ara. Ɛreḍ tawlaft-nniḍen neɣ aru isem."],
  choose: ["راجع التركيز ثم اختر", "Vérifiez le dosage puis choisissez", "Review strength, then choose", "Senqed lqedd, syen fren"],
  close: ["إغلاق ومسح النص", "Fermer et effacer le texte", "Close and clear text", "Mdel, kkes aḍris"],
} as const;
type Candidate = PrescriptionCandidate;

export function PrescriptionScan({ language, disabled, onSelect }: { language: Language; disabled?: boolean; onSelect: (name: string) => void }) {
  const index = language === "ar" ? 0 : language === "fr" ? 1 : language === "en" ? 2 : 3;
  const t = (key: keyof typeof copy) => copy[key][index];
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [progress, setProgress] = useState(0);
  const [text, setText] = useState(""), [error, setError] = useState(false), [matched, setMatched] = useState(false), [candidates, setCandidates] = useState<Candidate[]>([]);
  const camera = useRef<HTMLInputElement>(null), gallery = useRef<HTMLInputElement>(null), worker = useRef<Worker | null>(null), run = useRef(0);
  useEffect(() => () => { run.current++; void worker.current?.terminate().catch(() => {}); }, []);
  useEffect(() => { if (disabled) close(); }, [disabled]);
  function close() { run.current++; void worker.current?.terminate().catch(() => {}); worker.current = null; setOpen(false); setText(""); setCandidates([]); setMatched(false); setError(false); setBusy(false); }
  async function match(raw: string, generation: number) {
    const { default: catalog } = await import("@/lib/medicines-2026.json");
    const items = prescriptionMatches(raw, catalog);
    if (generation === run.current) { setCandidates(items); setMatched(true); }
  }
  async function scan(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8_000_000) { setText(""); setCandidates([]); setMatched(false); setError(true); return; }
    const generation = ++run.current; setBusy(true); setProgress(0); setError(false); setText(""); setCandidates([]); setMatched(false);
    const timeout = setTimeout(() => {
      if (generation !== run.current) return;
      run.current++; void worker.current?.terminate().catch(() => {}); worker.current = null; setBusy(false); setError(true);
    }, 120000);
    try {
      const { createWorker } = await import("tesseract.js");
      const current = await createWorker(["ara", "fra", "eng"], 1, { logger: (event) => { if (generation === run.current && event.status === "recognizing text") setProgress(Math.round(event.progress * 100)); } });
      if (generation !== run.current) { await current.terminate(); return; }
      worker.current = current;
      try {
        const result = await current.recognize(file);
        if (generation !== run.current) return;
        const raw = result.data.text.trim().slice(0, 15000); setText(raw);
        if (!raw) setError(true); else await match(raw, generation);
      } finally { if (worker.current === current) { worker.current = null; await current.terminate(); } }
    } catch { if (generation === run.current) setError(true); }
    finally { clearTimeout(timeout); if (generation === run.current) setBusy(false); }
  }
  return <><button type="button" disabled={disabled} onClick={() => setOpen(true)}><FileScan />{t("scan")}</button><Dialog open={open} onOpenChange={(value) => !value && close()}><DialogContent className="app-dialog prescription-dialog" dir={language === "ar" ? "rtl" : "ltr"} showCloseButton={false}><button className="dialog-close icon-btn" onClick={close} aria-label={t("close")}><X /></button><span className="dialog-symbol"><FileScan /></span><DialogTitle>{t("title")}</DialogTitle><DialogDescription>{t("intro")}</DialogDescription><p className="scan-privacy"><ShieldCheck />{t("privacy")}</p><div className="row"><Button disabled={busy} onClick={() => camera.current?.click()}><Camera />{t("camera")}</Button><Button disabled={busy} variant="outline" onClick={() => gallery.current?.click()}><ImagePlus />{t("photo")}</Button></div><input ref={camera} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={(e) => { void scan(e.target.files?.[0]); e.target.value = ""; }} /><input ref={gallery} className="visually-hidden" type="file" accept="image/*" onChange={(e) => { void scan(e.target.files?.[0]); e.target.value = ""; }} />{busy && <div className="ocr-progress" role="status"><span>{t("reading")} {progress}%</span><progress value={progress} max={100} /></div>}{error && <p role="alert" className="journey-error">{t("error")}</p>}{text && <><label htmlFor="prescription-text">{t("text")}</label><textarea id="prescription-text" dir="auto" value={text} maxLength={15000} onChange={(e) => { setText(e.target.value); setCandidates([]); setMatched(false); }} /><Button variant="outline" disabled={busy} onClick={() => void match(text, run.current)}>{t("check")}</Button></>}{candidates.length > 0 && <><h3>{t("match")}</h3><p className="muted">{t("choose")}</p><div className="prescription-matches">{candidates.map((item) => <button key={item.name} onClick={() => { onSelect(item.name); close(); }}><span dir="ltr"><strong>{item.name}</strong><small>{item.ingredient}</small></span><Check /></button>)}</div></>}{matched && !candidates.length && <p className="muted">{t("manual")}</p>}<p className="soft-note">{t("caution")}</p></DialogContent></Dialog></>;
}
