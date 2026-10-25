function editDistance<T>(expected:readonly T[],actual:readonly T[]){
  let previous=Array.from({length:actual.length+1},(_,i)=>i);
  for(let i=1;i<=expected.length;i++){const row=[i];for(let j=1;j<=actual.length;j++)row[j]=Math.min(row[j-1]+1,previous[j]+1,previous[j-1]+Number(expected[i-1]!==actual[j-1]));previous=row;}
  return previous[actual.length];
}
export function transcriptionMetrics(expected:string,actual:string){
  const normalize=(s:string)=>s.normalize("NFC").trim().replace(/\s+/g," ");
  const e=normalize(expected),a=normalize(actual),ew=e.split(" ").filter(Boolean),aw=a.split(" ").filter(Boolean);
  return {characterErrorRate:editDistance([...e],[...a])/Math.max(1,[...e].length),wordErrorRate:editDistance(ew,aw)/Math.max(1,ew.length)};
}
