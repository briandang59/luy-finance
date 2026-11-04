import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {authorizationRequest,matchesState,setEnvValue} from '../lib/oauth.mjs';
import {configuration} from '../lib/auth.mjs';

test('OAuth requests use offline access, random state and PKCE without exposing client secrets',() => {
  const data = {clientId:'client.apps.googleusercontent.com',redirectUri:'http://localhost:3000/api/auth/google/callback'};
  const first = authorizationRequest(data), second = authorizationRequest(data), url = new URL(first.url);
  assert.equal(url.origin,'https://accounts.google.com');
  assert.equal(url.searchParams.get('access_type'),'offline');
  assert.equal(url.searchParams.get('code_challenge_method'),'S256');
  assert.equal(url.searchParams.get('code_challenge'),createHash('sha256').update(first.verifier).digest('base64url'));
  assert.notEqual(first.state,second.state);
  assert.equal(matchesState(first.state,first.state),true);
  assert.equal(matchesState(first.state,second.state),false);
  assert.equal(matchesState(first.state,null),false);
  assert.equal(url.searchParams.has('client_secret'),false);
});
test('saving refresh tokens preserves other env values and replaces an old token once',() => {
  const text = '# comment\nAPP_PASSWORD=keep\nGOOGLE_REFRESH_TOKEN=old\n';
  const updated = setEnvValue(text,'GOOGLE_REFRESH_TOKEN','new-token');
  assert.match(updated,/APP_PASSWORD=keep/);
  assert.equal((updated.match(/GOOGLE_REFRESH_TOKEN=/g) || []).length,1);
  assert.match(updated,/GOOGLE_REFRESH_TOKEN="new-token"/);
});
test('OAuth credentials alone retain demo mode until consent and a Sheet are configured',() => {
  const env = {...process.env};
  try {
    for (const key of ['GOOGLE_SHEET_ID','GOOGLE_SERVICE_ACCOUNT_EMAIL','GOOGLE_PRIVATE_KEY','APP_PASSWORD','SESSION_SECRET','GOOGLE_REFRESH_TOKEN']) delete process.env[key];
    process.env.GOOGLE_CLIENT_ID = 'client'; process.env.GOOGLE_CLIENT_SECRET = 'secret';
    assert.deepEqual(configuration(),{mode:'demo',authEnabled:false,ready:true});
    process.env.GOOGLE_SHEET_ID = 'sheet';
    assert.equal(configuration().ready,false);
    process.env.GOOGLE_REFRESH_TOKEN = 'refresh'; process.env.APP_PASSWORD = 'owner-password'; process.env.SESSION_SECRET = 'x'.repeat(32);
    assert.equal(configuration().mode,'sheets');
    assert.equal(configuration().ready,true);
  } finally {process.env = env;}
});
