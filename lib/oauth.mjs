import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
export function authorizationRequest({clientId,redirectUri}) {
  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({client_id:clientId,redirect_uri:redirectUri,response_type:'code',scope:SHEETS_SCOPE,access_type:'offline',prompt:'consent',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString();
  return {url:url.toString(),state,verifier};
}
export function matchesState(expected,received) {
  if (typeof received !== 'string' || typeof expected !== 'string' || received.length > 200) return false;
  const digest = text => createHash('sha256').update(text).digest();
  return timingSafeEqual(digest(expected),digest(received));
}
export function setEnvValue(text,key,value) {
  const lines = text.split(/\r?\n/).filter(line => !line.startsWith(`${key}=`));
  while (lines.at(-1) === '') lines.pop();
  return `${lines.join('\n')}\n${key}=${JSON.stringify(value)}\n`;
}
