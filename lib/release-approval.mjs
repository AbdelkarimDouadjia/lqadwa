import assert from 'node:assert/strict';
export const informationGates=['exactCommitCI','schemaVerified','freshBackup','restoreRehearsal','rollbackCompatible','informationLegalAcceptance'];
export const coreGates=['realEmail','verifiedPharmacy','operationalRoundTrip','privilegedMfaRecovery','privacyLegalAcceptance','channelAcceptance','medicineIdentity'];
export function validateReleaseApproval(receipt,mode,sha,now=Date.now()){
 assert(['CORE','INFORMATION_ONLY'].includes(mode),'Release mode must be explicit');
 assert(receipt,'Operator release evidence is required; see docs/release-runbook.md');
 assert.equal(receipt.commit,sha,'Approval must bind the exact commit');
 assert.equal(receipt.mode,mode,'Approval must bind the operating mode');
 assert(typeof receipt.operator==='string'&&receipt.operator.length>3,'Name the responsible operator');
 assert(Date.parse(receipt.expires)>now&&Date.parse(receipt.expires)<now+48*3600_000,'Approval must expire within 48 hours');
 for(const gate of [...informationGates,...(mode==='CORE'?coreGates:[])])assert(receipt.gates?.[gate]?.passed===true&&typeof receipt.gates[gate].evidence==='string'&&receipt.gates[gate].evidence.length>8,`Missing passed gate and evidence: ${gate}`);
 assert(!/"(?:password|access_token|service_role)"\s*:|\bpassword\s*[=:]\s*\S+|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/i.test(JSON.stringify(receipt)),'Receipt must contain evidence references only');
}
