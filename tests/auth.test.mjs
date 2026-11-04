import test from 'node:test';
import assert from 'node:assert/strict';
import { configuration, passwordMatches, signSession, validSession, sessionCookie } from '../lib/auth.mjs';
import { sameOrigin } from '../lib/http.mjs';

test('cloud configuration fails closed without complete credentials and authentication',() => {
  const original = {...process.env};
  try {
    for (const key of ['GOOGLE_SHEET_ID','GOOGLE_SERVICE_ACCOUNT_EMAIL','GOOGLE_PRIVATE_KEY','APP_PASSWORD','SESSION_SECRET']) delete process.env[key];
    assert.deepEqual(configuration(),{mode:'demo',authEnabled:false,ready:true});
    process.env.GOOGLE_SHEET_ID = 'test';
    assert.equal(configuration().ready,false);
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@example.com'; process.env.GOOGLE_PRIVATE_KEY = 'private';
    assert.equal(configuration().ready,false);
    process.env.APP_PASSWORD = 'strong-test-password'; process.env.SESSION_SECRET = 'x'.repeat(32);
    assert.equal(configuration().ready,true);
    assert.equal(passwordMatches('wrong'),false);
    assert.equal(passwordMatches('strong-test-password'),true);
  } finally { process.env = original; }
});
test('signed sessions expire and reject payload or signature tampering',() => {
  const original = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = 'test'.repeat(16);
  try {
    const token = signSession(1000000);
    assert.equal(validSession(token,1000001),true);
    assert.equal(validSession(token,1000000 + 8 * 86400000),false);
    assert.equal(validSession(`9${token}`,1000001),false);
    assert.equal(validSession(`${token.slice(0,-1)}${token.endsWith('0') ? '1' : '0'}`,1000001),false);
    assert.equal(validSession('x.y.z'),false);
    assert.match(sessionCookie('token'),/HttpOnly; SameSite=Strict/);
  } finally { if (original === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = original; }
});
test('mutations reject foreign or missing browser origins',() => {
  assert.doesNotThrow(() => sameOrigin({headers:{origin:'https://recall.example.com',host:'recall.example.com'}}));
  assert.throws(() => sameOrigin({headers:{origin:'https://attacker.com',host:'recall.example.com'}}));
  assert.throws(() => sameOrigin({headers:{host:'recall.example.com'}}));
});
