import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import googleHandler from '../api/google.mjs';
import sessionHandler from '../api/session.mjs';
import {configuration} from '../lib/auth.mjs';
import {seal,unseal,GOOGLE_COOKIE,STATE_COOKIE,withGoogleIdentity,currentGoogleToken} from '../lib/google-session.mjs';
import {SHEETS_SCOPE} from '../lib/oauth.mjs';

async function invoke(handler,url,cookie = '',data) {
  const req = {url,method:data ? 'POST' : 'GET',body:data,headers:{host:'recall.test',origin:'https://recall.test','content-type':'application/json',cookie},socket:{remoteAddress:'127.0.0.2'}};
  return new Promise((resolve,reject) => {
    const headers = {};
    const res = {statusCode:200,setHeader:(k,v) => {headers[k] = v;},writeHead:(status,extra) => {res.statusCode = status; Object.assign(headers,extra);},end:text => resolve({status:res.statusCode,headers,data:text ? JSON.parse(text) : undefined})};
    Promise.resolve(handler(req,res)).catch(reject);
  });
}
test('web OAuth works before Sheet consent, validates state and PKCE, and stores only an encrypted HttpOnly token',async () => {
  const env = {...process.env}, originalFetch = globalThis.fetch;
  for (const key of ['GOOGLE_SERVICE_ACCOUNT_EMAIL','GOOGLE_PRIVATE_KEY','GOOGLE_REFRESH_TOKEN']) delete process.env[key];
  Object.assign(process.env,{GOOGLE_SHEET_ID:'sheet',GOOGLE_CLIENT_ID:'client',GOOGLE_CLIENT_SECRET:'client-secret',GOOGLE_OAUTH_REDIRECT_URI:'https://recall.test/api/auth/google/callback',APP_PASSWORD:'owner-password',SESSION_SECRET:'a'.repeat(64)});
  let challenge;
  globalThis.fetch = async (address,options) => {
    assert.equal(address,'https://oauth2.googleapis.com/token');
    assert.equal(options.body.get('client_secret'),'client-secret');
    assert.equal(options.body.get('redirect_uri'),process.env.GOOGLE_OAUTH_REDIRECT_URI);
    assert.equal(createHash('sha256').update(options.body.get('code_verifier')).digest('base64url'),challenge);
    return Response.json({access_token:'short-lived-access',refresh_token:'private-google-refresh',scope:SHEETS_SCOPE,expires_in:3600});
  };
  try {
    assert.equal(configuration().ready,false);
    assert.equal((await invoke(googleHandler,'/api/auth/google')).status,401);
    const login = await invoke(sessionHandler,'/api/session','',{password:'owner-password'});
    assert.equal(login.status,200);
    const session = login.headers['Set-Cookie'].split(';')[0];
    const start = await invoke(googleHandler,'/api/auth/google',session);
    assert.equal(start.status,302);
    const target = new URL(start.headers.Location);
    challenge = target.searchParams.get('code_challenge');
    const pendingCookie = start.headers['Set-Cookie'].split(';')[0];
    assert.ok(pendingCookie.startsWith(`${STATE_COOKIE}=`));
    assert.match(start.headers['Set-Cookie'],/SameSite=Lax/);
    const bad = await invoke(googleHandler,'/api/auth/google/callback?state=bad&code=code',pendingCookie);
    assert.equal(bad.status,400);
    // The app's Strict session cookie is absent on the cross-site Google callback.
    const callback = await invoke(googleHandler,`/api/auth/google/callback?state=${target.searchParams.get('state')}&code=code`,pendingCookie);
    assert.equal(callback.status,302);
    assert.equal(callback.headers.Location,'/?google=connected');
    const cookie = callback.headers['Set-Cookie'].find(c => c.startsWith(`${GOOGLE_COOKIE}=`));
    assert.match(cookie,/HttpOnly; SameSite=Strict/);
    assert.equal(cookie.includes('private-google-refresh'),false);
    const googlePair = cookie.split(';')[0];
    assert.equal(configuration({headers:{cookie:googlePair}}).ready,true);
    const payload = unseal(googlePair.slice(GOOGLE_COOKIE.length + 1));
    assert.equal(payload.refreshToken,'private-google-refresh');
  } finally {process.env = env; globalThis.fetch = originalFetch;}
});
test('encrypted Google cookies reject tampering, expiry and a changed session secret',() => {
  const env = {...process.env};
  process.env.SESSION_SECRET = 'k'.repeat(64);
  try {
    const encrypted = seal({refreshToken:'secret',expiresAt:20000});
    assert.equal(unseal(encrypted,10000).refreshToken,'secret');
    assert.equal(unseal(encrypted,20001),null);
    const tampered = encrypted.slice(0,20) + (encrypted[20] === 'a' ? 'b' : 'a') + encrypted.slice(21);
    assert.equal(unseal(tampered,10000),null);
    process.env.SESSION_SECRET = 'different'.repeat(8);
    assert.equal(unseal(encrypted,10000),null);
  } finally {process.env = env;}
});
test('parallel requests keep Google refresh tokens isolated',async () => {
  const env = {...process.env};
  delete process.env.GOOGLE_REFRESH_TOKEN;
  process.env.SESSION_SECRET = 'x'.repeat(64);
  try {
    const req = token => ({headers:{cookie:`${GOOGLE_COOKIE}=${seal({refreshToken:token,expiresAt:Date.now() + 10000})}`}});
    const results = await Promise.all(['owner-a','owner-b'].map((token,index) => withGoogleIdentity(req(token),async () => { await new Promise(r => setTimeout(r,index * 3)); return currentGoogleToken(); })));
    assert.deepEqual(results,['owner-a','owner-b']);
  } finally {process.env = env;}
});
