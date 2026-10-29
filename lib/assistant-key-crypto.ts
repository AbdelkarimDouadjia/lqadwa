const bytes=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
const encode=(value:Uint8Array)=>btoa(String.fromCharCode(...value));
async function encryptionKey(value:string) {
  const raw=bytes(value);if(raw.byteLength!==32)throw Error("Invalid credential encryption configuration");
  return crypto.subtle.importKey("raw",raw,"AES-GCM",false,["encrypt","decrypt"]);
}
const context=(provider:string)=>new TextEncoder().encode(`LQADWA/assistant-credential/v1/${provider}`);
export async function sealProviderKey(plain:string,provider:string,master:string) {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:context(provider)},await encryptionKey(master),new TextEncoder().encode(plain));
  return {encrypted_key:encode(new Uint8Array(encrypted)),iv:encode(iv)};
}
export async function openProviderKey(row:{encrypted_key:string;iv:string;provider:string},master:string) {
  if(row.encrypted_key.length>2048 || row.iv.length!==16)throw Error("Invalid encrypted credential");
  const decrypted=await crypto.subtle.decrypt({name:"AES-GCM",iv:bytes(row.iv),additionalData:context(row.provider)},await encryptionKey(master),bytes(row.encrypted_key));
  return new TextDecoder("utf-8",{fatal:true}).decode(decrypted);
}
