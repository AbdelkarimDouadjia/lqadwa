// Synthetic printed document, no patient data. Uses the actual shipping OCR engine and languages.
import assert from 'node:assert/strict';
import {createWorker} from 'tesseract.js';
import {createRequire} from 'node:module';
import {mkdirSync,readFileSync} from 'node:fs';
import {prescriptionMatches} from '../lib/prescription-match.ts';
const require=createRequire(import.meta.url);
const sharp=require(require.resolve('sharp',{paths:[require.resolve('miniflare')]}));
mkdirSync('.cloudflare/ocr-cache',{recursive:true});
const image=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="700"><rect width="100%" height="100%" fill="white"/><g fill="black" font-family="Arial,sans-serif" font-size="65"><text x="80" y="120">ORDONNANCE</text><text x="80" y="260">DOLIPRANE 500 MG</text><text x="80" y="400">AUGMENTIN 1 G</text></g></svg>')).png().toBuffer();
const worker=await createWorker(['ara','fra','eng'],1,{cachePath:'.cloudflare/ocr-cache'});
try {
 const {data}=await worker.recognize(image);
 assert.match(data.text,/DOLIPRANE/i);assert.match(data.text,/AUGMENTIN/i);assert.match(data.text,/500/);
 const matches=prescriptionMatches(data.text,JSON.parse(readFileSync('lib/medicines-2026.json','utf8')));
 assert(matches.some(m=>m.name.startsWith('DOLIPRANE ')));assert(matches.some(m=>m.name.startsWith('AUGMENTIN ')));
 console.log('PASS: actual Arabic/French/English Tesseract worker read a synthetic printed prescription and matched both real catalog brands. Not a handwriting or physical-phone acceptance test.');
} finally {await worker.terminate();}
