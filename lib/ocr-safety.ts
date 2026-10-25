export const ocrLimits={bytes:8_000_000,pixels:20_000_000,edge:2200,text:15000,runtimeMs:120000};
export type UncertainSpan={start:number;end:number;reason:"low-recognition-score"};
export function uncertainSpans(raw:string,words:readonly {text:string;confidence:number}[]):UncertainSpan[]{
  let cursor=0;const spans:UncertainSpan[]=[];
  for(const word of words){const start=raw.indexOf(word.text,cursor);if(start<0)continue;cursor=start+word.text.length;if(word.confidence<80)spans.push({start,end:cursor,reason:"low-recognition-score"});}
  return spans;
}
export async function prepareOcrImage(file:File,signal?:AbortSignal){
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||!file.size||file.size>ocrLimits.bytes)throw Error("Invalid image");
  signal?.throwIfAborted();
  const bitmap=await createImageBitmap(file,{imageOrientation:"from-image"});
  try{
    signal?.throwIfAborted();
    if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>ocrLimits.pixels)throw Error("Image dimensions exceed OCR limit");
    const ratio=Math.min(1,ocrLimits.edge/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
    const ctx=canvas.getContext("2d");if(!ctx)throw Error("Image processing unavailable");
    ctx.fillStyle="white";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error("Image processing unavailable")),"image/png"));
    signal?.throwIfAborted();return blob;
  }finally{bitmap.close();}
}
