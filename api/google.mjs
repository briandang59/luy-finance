import { authenticated,oauthAvailable,ownerReady,signSession,sessionCookie } from '../lib/auth.mjs';
import { authorizationRequest,matchesState,SHEETS_SCOPE } from '../lib/oauth.mjs';
import { seal,unseal,readCookie,googleCookie,GOOGLE_COOKIE,STATE_COOKIE } from '../lib/google-session.mjs';
import { fail,HttpError } from '../lib/http.mjs';

export default async function handler(req,res) {
  try {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Referrer-Policy','no-referrer');
    if (req.method !== 'GET') throw new HttpError(405,'Phương thức không được hỗ trợ.');
    if (!ownerReady() || !oauthAvailable()) throw new HttpError(503,'Điền Client ID, Client Secret, Sheet ID, APP_PASSWORD và SESSION_SECRET trước khi kết nối Google.');
    const path = new URL(req.url,'http://localhost').pathname;
    if (path === '/api/auth/google') {
      if (!authenticated(req)) throw new HttpError(401,'Đăng nhập app trước khi kết nối Google.');
      const publicHost = process.env.VERCEL ? req.headers['x-forwarded-host'] || req.headers.host : req.headers.host;
      const inferredUri = `${process.env.VERCEL ? 'https' : 'http'}://${String(publicHost).split(',')[0].trim()}/api/auth/google/callback`;
      const redirectUri = (process.env.GOOGLE_OAUTH_REDIRECT_URI || inferredUri).trim();
      let redirect;
      try { redirect = new URL(redirectUri); } catch { throw new HttpError(503,'Thiếu GOOGLE_OAUTH_REDIRECT_URI. Điền URL /api/auth/google/callback của website vào môi trường và Google Cloud Console.'); }
      if ((redirect.protocol !== 'https:' && !(redirect.protocol === 'http:' && ['localhost','127.0.0.1'].includes(redirect.hostname))) || redirect.pathname !== '/api/auth/google/callback' || redirect.search || redirect.hash || redirect.username || redirect.password) throw new HttpError(503,'GOOGLE_OAUTH_REDIRECT_URI không hợp lệ.');
      // Vercel may proxy requests to an internal host. Only trust its forwarded
      // host on Vercel; a standalone server must keep using its actual Host.
      const forwarded = process.env.VERCEL ? req.headers['x-forwarded-host'] : undefined;
      const rawHost = typeof forwarded === 'string' && forwarded.trim() ? forwarded.split(',')[0].trim() : req.headers.host;
      let requestHost;
      try {
        if (typeof rawHost !== 'string' || !/^[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(rawHost)) throw new Error('Invalid host');
        requestHost = new URL(`${redirect.protocol}//${rawHost}`).host;
      } catch { throw new HttpError(400,'Không xác định được tên miền truy cập. Mở lại app bằng tên miền Vercel chính thức.'); }
      if (redirect.host !== requestHost) throw new HttpError(503,
        `App đang mở tại ${requestHost}, nhưng GOOGLE_OAUTH_REDIRECT_URI đang trỏ tới ${redirect.host}. Sửa biến môi trường theo đúng tên miền đang dùng rồi redeploy.`,
        {requestHost,configuredRedirectUri:redirectUri,expectedRedirectUri:`${redirect.protocol}//${requestHost}/api/auth/google/callback`});
      const auth = authorizationRequest({clientId:process.env.GOOGLE_CLIENT_ID,redirectUri});
      res.setHeader('Set-Cookie',googleCookie(STATE_COOKIE,seal({state:auth.state,verifier:auth.verifier,redirectUri,expiresAt:Date.now() + 600000}),600,'Lax'));
      res.writeHead(302,{Location:auth.url}); return res.end();
    }
    if (path !== '/api/auth/google/callback') throw new HttpError(404,'Không tìm thấy trang.');
    const pending = unseal(readCookie(req,STATE_COOKIE));
    const url = new URL(req.url,'http://localhost');
    if (!pending || !matchesState(pending.state,url.searchParams.get('state'))) throw new HttpError(400,'Phiên kết nối Google hết hạn hoặc không hợp lệ. Quay lại app và bấm Kết nối Google một lần nữa.');
    res.setHeader('Set-Cookie',googleCookie(STATE_COOKIE,'',0,'Lax'));
    if (url.searchParams.has('error')) { res.writeHead(302,{Location:'/?google=cancelled'}); return res.end(); }
    const code = url.searchParams.get('code');
    if (!code) throw new HttpError(400,'Thiếu mã cấp quyền Google.');
    const response = await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,client_secret:process.env.GOOGLE_CLIENT_SECRET,redirect_uri:pending.redirectUri,grant_type:'authorization_code',code,code_verifier:pending.verifier}),signal:AbortSignal.timeout(20000)});
    const token = await response.json();
    if (!response.ok || !token.refresh_token) throw new HttpError(502,'Google chưa cấp refresh token. Vui lòng kết nối lại và chấp nhận quyền Sheets.');
    if (!String(token.scope || '').split(' ').includes(SHEETS_SCOPE)) throw new HttpError(403,'Bạn chưa cấp quyền Google Sheets.');
    const encrypted = seal({refreshToken:token.refresh_token,expiresAt:Date.now() + 180 * 86400000});
    if (encrypted.length > 3700) throw new HttpError(502,'Thông tin xác thực Google vượt giới hạn cookie. Dùng cách kết nối qua biến môi trường trong README.');
    res.setHeader('Set-Cookie',[googleCookie(STATE_COOKIE,'',0,'Lax'),googleCookie(GOOGLE_COOKIE,encrypted,180 * 86400),sessionCookie(signSession())]);
    res.writeHead(302,{Location:'/?google=connected'}); res.end();
  } catch (error) { fail(res,error); }
}
