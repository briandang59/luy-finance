import { configuration, authenticated, passwordMatches, signSession, sessionCookie, checkLoginRate, oauthAvailable, ownerReady } from "../lib/auth.mjs";
import { json, body, sameOrigin, fail, HttpError } from "../lib/http.mjs";
import { googleCookie, GOOGLE_COOKIE, STATE_COOKIE } from '../lib/google-session.mjs';

export default async function handler(req, res) {
  try {
    const config = configuration(req);
    if (req.method === "GET") return json(res, 200, { ...config, authenticated: authenticated(req), oauthAvailable:oauthAvailable(), ownerReady:ownerReady() });
    sameOrigin(req);
    if (req.method === "DELETE") {
      res.setHeader("Set-Cookie", [sessionCookie("", true),googleCookie(GOOGLE_COOKIE,'',0),googleCookie(STATE_COOKIE,'',0,'Lax')]);
      return json(res, 200, { ok: true });
    }
    if (req.method !== "POST") { res.setHeader("Allow", "GET, POST, DELETE"); throw new HttpError(405, "Phương thức không được hỗ trợ."); }
    if (!ownerReady() || (!config.ready && !oauthAvailable())) throw new HttpError(503, "Chưa cấu hình đăng nhập.");
    checkLoginRate(req);
    const data = await body(req);
    if (!data || typeof data.password !== 'string' || data.password.length > 500 || !passwordMatches(data.password)) throw new HttpError(401, "Mật khẩu chưa đúng.");
    res.setHeader("Set-Cookie", sessionCookie(signSession()));
    return json(res, 200, { ok: true });
  } catch (error) { fail(res, error); }
}
