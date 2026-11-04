import test from 'node:test';
import assert from 'node:assert/strict';
import start from '../api/auth/google.mjs';
import callback from '../api/auth/google/callback.mjs';
import {signSession} from '../lib/auth.mjs';
import {seal,STATE_COOKIE} from '../lib/google-session.mjs';

function invoke(handler,url,cookie = '',extraHeaders = {}) {
  const req = {url,method:'GET',headers:{host:'recall.test',cookie,...extraHeaders}};
  return new Promise((resolve,reject) => {
    const headers = {};
    const res = {statusCode:200,setHeader:(k,v) => {headers[k] = v;},writeHead:(status,extra) => {res.statusCode = status; Object.assign(headers,extra);},end:text => resolve({status:res.statusCode,headers,data:text ? JSON.parse(text) : undefined})};
    Promise.resolve(handler(req,res)).catch(reject);
  });
}

test('blank redirect configuration infers the current Vercel domain or local origin',async () => {
  const env = {...process.env};
  Object.assign(process.env,{GOOGLE_SHEET_ID:'sheet',GOOGLE_CLIENT_ID:'client',GOOGLE_CLIENT_SECRET:'secret',GOOGLE_OAUTH_REDIRECT_URI:'',APP_PASSWORD:'owner',SESSION_SECRET:'r'.repeat(64),VERCEL:'1'});
  try {
    const cookie = `luy_finance_session=${signSession()}`;
    const cloud = await invoke(start,'/api/auth/google',cookie,{host:'internal:8080','x-forwarded-host':'luy.vercel.app'});
    assert.equal(cloud.status,302);assert.equal(new URL(cloud.headers.Location).searchParams.get('redirect_uri'),'https://luy.vercel.app/api/auth/google/callback');
    delete process.env.VERCEL;
    const local = await invoke(start,'/api/auth/google',cookie,{host:'localhost:4180'});
    assert.equal(local.status,302);assert.equal(new URL(local.headers.Location).searchParams.get('redirect_uri'),'http://localhost:4180/api/auth/google/callback');
  } finally {process.env = env;}
});

test('Vercel file-based OAuth entry points resolve start and callback URLs',async () => {
  const env = {...process.env};
  for (const k of ['GOOGLE_SERVICE_ACCOUNT_EMAIL','GOOGLE_PRIVATE_KEY','GOOGLE_REFRESH_TOKEN']) delete process.env[k];
  Object.assign(process.env,{GOOGLE_SHEET_ID:'sheet',GOOGLE_CLIENT_ID:'client',GOOGLE_CLIENT_SECRET:'secret',GOOGLE_OAUTH_REDIRECT_URI:'https://recall.test/api/auth/google/callback',APP_PASSWORD:'owner-password',SESSION_SECRET:'r'.repeat(64)});
  try {
    const unauthorized = await invoke(start,'/api/auth/google');
    assert.equal(unauthorized.status,401);
    const authorized = await invoke(start,'/api/auth/google',`luy_finance_session=${signSession()}`);
    assert.equal(authorized.status,302);
    assert.equal(new URL(authorized.headers.Location).hostname,'accounts.google.com');
    const invalidCallback = await invoke(callback,'/api/auth/google/callback?state=missing&code=code');
    assert.equal(invalidCallback.status,400);
    const stateCookie = `${STATE_COOKIE}=${seal({state:'valid-state',verifier:'test-verifier',redirectUri:process.env.GOOGLE_OAUTH_REDIRECT_URI,expiresAt:Date.now() + 600000})}`;
    // Query parameters must survive the file-based wrapper unchanged.
    const cancelled = await invoke(callback,'/api/auth/google/callback?state=valid-state&error=access_denied',stateCookie);
    assert.equal(cancelled.status,302);
    assert.equal(cancelled.headers.Location,'/?google=cancelled');
  } finally {process.env = env;}
});

test('OAuth accepts the Vercel forwarded host and diagnoses a mismatched callback without trusting standalone forwarded headers',async () => {
  const env = {...process.env};
  for (const k of ['GOOGLE_SERVICE_ACCOUNT_EMAIL','GOOGLE_PRIVATE_KEY','GOOGLE_REFRESH_TOKEN']) delete process.env[k];
  Object.assign(process.env,{GOOGLE_SHEET_ID:'sheet',GOOGLE_CLIENT_ID:'client',GOOGLE_CLIENT_SECRET:'secret',GOOGLE_OAUTH_REDIRECT_URI:'  https://aws-recall-three.vercel.app/api/auth/google/callback  ',APP_PASSWORD:'owner-password',SESSION_SECRET:'r'.repeat(64),VERCEL:'1'});
  try {
    const session = `luy_finance_session=${signSession()}`;
    const proxied = await invoke(start,'/api/auth/google',session,{host:'127.0.0.1:8080','x-forwarded-host':'aws-recall-three.vercel.app'});
    assert.equal(proxied.status,302);
    assert.equal(new URL(proxied.headers.Location).searchParams.get('redirect_uri'),'https://aws-recall-three.vercel.app/api/auth/google/callback');
    const normalized = await invoke(start,'/api/auth/google',session,{host:'AWS-RECALL-THREE.vercel.app:443'});
    assert.equal(normalized.status,302);
    const preview = await invoke(start,'/api/auth/google',session,{host:'preview.vercel.app'});
    assert.equal(preview.status,503);
    assert.deepEqual(preview.data.details,{requestHost:'preview.vercel.app',configuredRedirectUri:'https://aws-recall-three.vercel.app/api/auth/google/callback',expectedRedirectUri:'https://preview.vercel.app/api/auth/google/callback'});
    delete process.env.VERCEL;
    const untrusted = await invoke(start,'/api/auth/google',session,{host:'untrusted.test','x-forwarded-host':'aws-recall-three.vercel.app'});
    assert.equal(untrusted.status,503);
    assert.equal(untrusted.data.details.requestHost,'untrusted.test');
  } finally {process.env = env;}
});
