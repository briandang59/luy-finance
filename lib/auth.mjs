import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http.mjs";
import { googleRefreshToken } from './google-session.mjs';

const SESSION = "luy_finance_session";
const hash = value => createHash("sha256").update(value).digest();
export function configuration(req) {
  const service = [process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, process.env.GOOGLE_PRIVATE_KEY];
  const oauth = [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, googleRefreshToken(req)];
  const sheetEnabled = Boolean(process.env.GOOGLE_SHEET_ID && (service.every(Boolean) || oauth.every(Boolean)));
  const partial = Boolean(process.env.GOOGLE_SHEET_ID || service.some(Boolean) || process.env.GOOGLE_REFRESH_TOKEN) && !sheetEnabled;
  const authEnabled = Boolean(process.env.APP_PASSWORD);
  const validAuth = authEnabled && (process.env.SESSION_SECRET?.length || 0) >= 32;
  return { mode: sheetEnabled ? "sheets" : "demo", authEnabled, ready: !partial && (!authEnabled || validAuth) && (!sheetEnabled || validAuth) };
}
export function oauthAvailable() { return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_SHEET_ID); }
export function ownerReady() { return Boolean(process.env.APP_PASSWORD && (process.env.SESSION_SECRET?.length || 0) >= 32); }
export function passwordMatches(input) {
  return typeof input === "string" && timingSafeEqual(hash(input), hash(process.env.APP_PASSWORD || ""));
}
export function signSession(now = Date.now()) {
  const payload = `${now + 7 * 86400000}.${randomBytes(16).toString("hex")}`;
  const sig = createHmac("sha256", process.env.SESSION_SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}
export function validSession(value, now = Date.now()) {
  if (!process.env.SESSION_SECRET || typeof value !== "string") return false;
  const parts = value.split(".");
  if (parts.length !== 3 || !/^\d+$/.test(parts[0]) || Number(parts[0]) <= now || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{64}$/.test(parts[2])) return false;
  const expected = createHmac("sha256", process.env.SESSION_SECRET).update(`${parts[0]}.${parts[1]}`).digest("hex");
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(parts[2], "hex"));
}
export function authenticated(req) {
  if (!configuration().authEnabled) return false;
  const token = (req.headers.cookie || "").split(";").map(p => p.trim()).find(p => p.startsWith(`${SESSION}=`))?.slice(SESSION.length + 1);
  return validSession(token);
}
export function requireSession(req) {
  const c = configuration(req);
  if (!c.ready) throw new HttpError(503, "Cấu hình chưa đầy đủ. Kiểm tra các biến môi trường và SESSION_SECRET (ít nhất 32 ký tự).");
  if (c.mode !== "sheets") throw new HttpError(409, "Chưa kết nối Google Sheets. Dữ liệu demo được lưu trong trình duyệt.");
  if (!authenticated(req)) throw new HttpError(401, "Vui lòng đăng nhập lại.");
}
export function sessionCookie(token, clear = false) {
  const secure = Boolean(process.env.VERCEL) || (process.env.COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production");
  return `${SESSION}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear ? 0 : 604800}${secure ? "; Secure" : ""}`;
}

// Best-effort protection per warm function; use a Vercel Firewall rate limit for public deployments.
const attempts = new Map();
export function checkLoginRate(req, now = Date.now()) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0];
  for (const [key, value] of attempts) if (now >= value.reset) attempts.delete(key);
  if (attempts.size > 10000) attempts.clear();
  const record = attempts.get(ip) || { count: 0, reset: now + 15 * 60000 };
  record.count++;
  attempts.set(ip, record);
  if (record.count > 10) throw new HttpError(429, "Bạn thử quá nhiều lần. Vui lòng chờ 15 phút.");
}
