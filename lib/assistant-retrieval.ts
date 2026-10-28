import { helpChunks, corpusVersion, type HelpChunk } from "./assistant-corpus.ts";
import manifest from "./assistant-manifest.json" with { type: "json" };
import { assistantText } from "./assistant-copy.ts";
import type { Language } from "./i18n";
import type { AssistantAnswer, AssistantCitation } from "./assistant-contract";

export function helpTokens(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").toLowerCase()
    .match(/[\p{L}\p{N}]+/gu)?.filter(word => word.length > 1 && !stopWords.has(word)).map(word=>aliases.get(word)||word) || [];
}
const stopWords = new Set("the a an is are can i my do to of in on and or it this how what please le la les de du des un une est et ou je mon mes ma pour comment dans que qui en au هل كيف انا من الى في عن هذا هذه ما هو او و على لي من فضلك amek ara iw d n i s akked".split(" "));
// Topic aliases are for HELP retrieval only, never medicine identity or clinical equivalence.
const aliases=new Map([
  ["pickup","collect collection reservation reservations booking retirer retrait reservation reservations استلم استلام الاستلام حجز الحجز حجزي ahraz awiɣ awigh awi"],
  ["privacy","privacy protected protection protect data donnees proteger confidentialite خصوصية الخصوصية احمي حماية بياناتي بيانات isefka hrez herzeɣ"],
  ["recovery","reset recovery reinitialiser reinitialisation استرجاع استعيد استرجع"],
].flatMap(([topic,terms])=>terms.split(" ").map(term=>[term,topic] as const)));
const indexed = helpChunks.map(chunk => ({chunk, words:helpTokens(`${chunk.title} ${chunk.text} ${chunk.keywords}`)}));
const averageLength = indexed.reduce((sum, row) => sum + row.words.length, 0) / indexed.length;
const frequency = new Map<string, number>();
for (const row of indexed) for (const term of new Set(row.words)) frequency.set(term, (frequency.get(term) || 0) + 1);
export function retrieveHelp(question: string, language: Language, previous: string[] = []): HelpChunk[] {
  const current = [...new Set(helpTokens(question))];
  if (!current.length) return [];
  const rank = (terms:string[]) => indexed.filter(row => row.chunk.language === language).map(row => {
    let score=0, matches=0;
    for (const term of terms) {
      const tf=row.words.filter(word => word === term).length;
      if (!tf) continue;
      matches++;
      const idf=Math.log(1+(indexed.length-(frequency.get(term)||0)+0.5)/((frequency.get(term)||0)+0.5));
      score+=idf*(tf*2.2)/(tf+1.2*(0.25+0.75*row.words.length/averageLength));
    }
    return {chunk:row.chunk,score,matches};
  }).filter(row => row.score > 1.5 && row.matches >= Math.min(2, terms.length)).sort((a,b)=>b.score-a.score || a.chunk.id.localeCompare(b.chunk.id));
  let ranked=rank(current);
  // Only short follow-ups borrow a previous USER question, never an assistant answer or retrieved instruction.
  if (!ranked.length && /^(and |what about |et |وماذا |واذا |akked )/i.test(question.trim()) && current.length <= 2 && previous.length) ranked=rank([...new Set([...current,...helpTokens(previous.at(-1)!)])]);
  return ranked.slice(0,3).map(row=>row.chunk);
}
export function citationFor(chunk: HelpChunk): AssistantCitation {
  const hash=(manifest.hashes as Record<string,string>)[chunk.id];
  if (!hash) throw new Error("Unindexed source");
  return { id:chunk.id, title:chunk.title, text:chunk.text, url:chunk.url, updated:chunk.updated, hash };
}
export function isClinicalQuestion(question: string) {
  // Defense in depth. Answer generation can ONLY select verbatim help evidence even if this misses a phrase.
  return /diagnos|dosage|\bdose[s]?\b|symptom|substitut|replace.*(medicine|drug)|traitement|sympt[oô]m|posologie|\bprendre\b|enceinte|allerg|جرع|تشخيص|اعراض|أعراض|بديل|استبد|حامل|علاج.*(ما|ماذا)|حساسي|ordonnance.*(lire|interpr)|(lire|interpr).*ordonnance|prescription.*(read|interpret)|(read|interpret).*prescription|pain|douleur|الم |صدري|نزيف|انتحار|suicid|overdose|treatment|شحال.*(ناخذ|نشرب)|الخط.*(اقرا|اقرأ)|طبي.*نصيح/i.test(question);
}
export function retrievalAnswer(question: string, language: Language, previous: string[] = [], now=new Date()): AssistantAnswer {
  if (isClinicalQuestion(question)) return {mode:"safety",text:assistantText(language,"safety"),citations:[],asOf:now.toISOString()};
  const evidence=retrieveHelp(question,language,previous);
  return {mode:evidence.length?"retrieval":"abstain", text:assistantText(language,evidence.length?"evidence":"noEvidence"), citations:evidence.map(citationFor),asOf:now.toISOString()};
}
export { corpusVersion };
