import { createCipheriv,createDecipheriv,createHash,randomBytes } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

export const GOOGLE_COOKIE = 'luy_finance_google';
export const STATE_COOKIE = 'luy_finance_google_state';
const context = new AsyncLocalStorage();
const key = () => createHash('sha256').update(process.env.SESSION_SECRET || '').digest();
export function seal(data) {
  if ((process.env.SESSION_SECRET?.length || 0) < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm',key(),iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(data),'utf8'),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),ciphertext]).toString('base64url');
}
export function unseal(token,now = Date.now()) {
  try {
    if (typeof token !== 'string' || token.length > 3800 || (process.env.SESSION_SECRET?.length || 0) < 32) return null;
    const raw = Buffer.from(token,'base64url');
    const decipher = createDecipheriv('aes-256-gcm',key(),raw.subarray(0,12));
    decipher.setAuthTag(raw.subarray(12,28));
    const data = JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)),decipher.final()]).toString('utf8'));
    if (!Number.isFinite(data.expiresAt) || data.expiresAt <= now) return null;
    return data;
  } catch { return null; }
}
export function readCookie(req,name) {
  return (req?.headers?.cookie || '').split(';').map(p => p.trim()).find(p => p.startsWith(`${name}=`))?.slice(name.length + 1);
}
export function googleRefreshToken(req) {
  if (process.env.GOOGLE_REFRESH_TOKEN) return process.env.GOOGLE_REFRESH_TOKEN;
  const data = unseal(readCookie(req,GOOGLE_COOKIE));
  return typeof data?.refreshToken === 'string' ? data.refreshToken : '';
}
export function withGoogleIdentity(req,callback) { return context.run({refreshToken:googleRefreshToken(req)},callback); }
export function currentGoogleToken() { return context.getStore()?.refreshToken || process.env.GOOGLE_REFRESH_TOKEN || ''; }
export function googleCookie(name,value,maxAge,sameSite = 'Strict') {
  const secure = Boolean(process.env.VERCEL) || (process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production');
  return `${name}=${value}; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}
