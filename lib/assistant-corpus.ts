import { publicInfoCopy, publicInfoPages } from "./public-information-copy.ts";
import type { Language } from "./i18n";

export const corpusVersion = "lqadwa-help-2026-10-27.1";
export const corpusReviewed = "2026-10-27";
export type HelpChunk = { id: string; language: Language; title: string; text: string; url: string; updated: string; rights: string; keywords: string };
const topics:Record<string,string>={
  "how-it-works:0":"search medicine catalog OCR scan name ingredient strength recherche médicament مسح دواء اسم anadi ddwa",
  "how-it-works:1":"availability pharmacy stock confirmation request توفر صيدلية طلب تأكيد uxezzen",
  "how-it-works:2":"pickup collect reservation booking QR route walk car transit استلام استلم حجز الحجز مسار ahraz awi",
  "for-pharmacies:0":"pharmacy register approval registration inscription validation تسجيل اعتماد صيدلية asekles",
  "for-pharmacies:1":"inventory stock quantity edit update مخزون كمية تحديث axezzen",
  "for-pharmacies:2":"pharmacy inbox reply QR respond réponse رسالة رد جواب",
  "safety:0":"OCR prescription scan handwriting accuracy local مسح وصفة خط دقة قراءة",
  "safety:1":"privacy protected data location consent données protection confidentialité حماية احمي بياناتي خصوصية isefka hrez",
  "safety:2":"delivery dispensing pharmacist purchase prescription توصيل بيع صرف تسليم",
  "pricing:0":"price patient free fee gratuit frais prix client مجاني سعر مريض imen",
  "pricing:1":"pharmacy subscription 300 2027 plan abonnement اشتراك سعر صيدلية aseqdec",
  "pricing:2":"listing pharmacy approval commission classement ظهور ترتيب اعتماد عمولة",
  "help:0":"contact support assistance email help contact مساعدة دعم تواصل imayl tallalt",
};
// Only code-reviewed snapshots enter retrieval. CMS drafts, user text and fetched URLs never enter this corpus.
export const helpChunks: HelpChunk[] = (["ar", "fr", "en", "kab"] as const).flatMap(language => publicInfoPages.flatMap(page => {
  const content = publicInfoCopy(language, page), url = `/${page}${language === "ar" ? "" : `?lang=${language}`}`;
  return content.sections.map((section, index) => ({ id: `${language}:${page}:${index}`, language,
    title: section.title, text: `${section.body} ${section.detail}`, url, updated: corpusReviewed,
    rights: "First-party product documentation; operator launch acceptance pending", keywords: topics[`${page}:${index}`]||section.title,
  }));
}));
const accountHelp = {
  ar: "لإعادة تعيين كلمة المرور افتح صفحة الدخول واختر نسيت كلمة المرور. افتح الرابط من آخر رسالة فقط. إن انتهت صلاحيته اطلب رسالة جديدة. لا تشارك كلمة المرور أو رمز التأكيد مع أحد. تواصل مع الدعم إذا لم تصل الرسالة.",
  fr: "Pour réinitialiser le mot de passe, ouvrez la connexion et choisissez Mot de passe oublié. Utilisez le lien du dernier message. Si le lien expire, demandez un nouvel envoi. Ne partagez ni mot de passe ni code. Contactez l’assistance si le message n’arrive pas.",
  en: "To reset your password, open sign in and choose Forgot password. Use the link in the latest email. If it expires, request another email. Never share passwords or verification codes. Contact support if the message does not arrive.",
  kab: "I ubeddel n wawal uffir, ldi akcam sakin fren Tettuḍ awal uffir. Seqdec aseɣwen n yizen aneggaru. Ma yemmut useɣwen, suter izen amaynut. Ur beṭṭu ara awal uffir neɣ tangalt. Nermes tallalt ma ur d-yewwiḍ ara yizen.",
};
for (const language of ["ar", "fr", "en", "kab"] as const) helpChunks.push({id:`${language}:account:recovery`, language, title:({ar:"استرجاع الحساب",fr:"Récupérer le compte",en:"Account recovery",kab:"Anerni n umiḍan"})[language], text:accountHelp[language], url:`/login${language === "ar" ? "" : `?lang=${language}`}`, updated:corpusReviewed, rights:"First-party account flow documentation", keywords:"password reset recovery login email mot de passe réinitialiser connexion بريد كلمة المرور دخول استرجاع awal uffir"});
// Short original paraphrase, not copied WHO material. No clinical guidance is ingested.
for (const language of ["ar", "fr", "en", "kab"] as const) helpChunks.push({ id:`${language}:who:safety`, language,
  title:({ar:"منظمة الصحة العالمية: سلامة الدواء",fr:"OMS : sécurité des médicaments",en:"WHO: medication safety",kab:"WHO: taɣellist n ddwa"})[language],
  text:({ar:"تُشجّع منظمة الصحة العالمية مشاركة المريض ومقدّم الرعاية في سلامة استعمال الدواء بالتعاون مع المهنيين الصحيين.",fr:"L’OMS encourage la participation du patient et de son aidant à la sécurité des médicaments, en collaboration avec les professionnels de santé.",en:"WHO encourages patients and caregivers to participate in medication safety together with health professionals.",kab:"WHO tessemḥas i yimuḍan akked wid i ten-yettɛawanen ad ttekkin deg tɣellist n ddwa akked yimsujji."})[language],
  url:"https://www.who.int/initiatives/medication-without-harm", updated:corpusReviewed,
  rights:"Original brief paraphrase; official WHO reference, no endorsement implied", keywords:"WHO OMS medication safety سلامة الدواء منظمة الصحة العالمية taɣellist" });
