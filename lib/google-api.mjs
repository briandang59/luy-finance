import {createSign,createHash} from 'node:crypto';
import {currentGoogleToken} from './google-session.mjs';
import {HttpError} from './http.mjs';
let cachedToken;
async function accessToken() {
  const refresh = currentGoogleToken();
  const key = createHash('sha256').update([process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,process.env.GOOGLE_PRIVATE_KEY,process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET,refresh].join('|')).digest('hex');
  if (cachedToken?.key === key && cachedToken.expires > Date.now()) return cachedToken.value;
  let form;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    const now = Math.floor(Date.now() / 1000), b64 = v => Buffer.from(JSON.stringify(v)).toString('base64url');
    const payload = `${b64({alg:'RS256',typ:'JWT'})}.${b64({iss:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now + 3600})}`;
    const signature = createSign('RSA-SHA256').update(payload).sign(process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n')).toString('base64url');
    form = new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:`${payload}.${signature}`});
  } else form = new URLSearchParams({grant_type:'refresh_token',client_id:process.env.GOOGLE_CLIENT_ID,client_secret:process.env.GOOGLE_CLIENT_SECRET,refresh_token:refresh});
  const response = await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:form,signal:AbortSignal.timeout(15000)}), token = await response.json();
  if (!response.ok || !token.access_token) throw new HttpError(503,'Quyền Google hết hạn hoặc cấu hình chưa đúng. Hãy kết nối lại Google.');
  cachedToken = {key,value:token.access_token,expires:Date.now() + (Number(token.expires_in || 3600) - 120) * 1000};
  return cachedToken.value;
}
export async function google(path = '',options = {}) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(process.env.GOOGLE_SHEET_ID)}${path}`,{...options,headers:{Authorization:`Bearer ${await accessToken()}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(20000)});
  if (response.status === 429) throw new HttpError(429,'Google Sheets đang giới hạn lượt gọi. Chờ khoảng một phút rồi thử lại.');
  if (response.status === 403) throw new HttpError(403,'Tài khoản Google chưa có quyền sửa Sheet hoặc Google Sheets API chưa được bật.');
  if (!response.ok) throw new Error(`Google Sheets returned ${response.status}`);
  return response.json();
}
