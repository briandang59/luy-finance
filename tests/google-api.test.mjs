import test from 'node:test';
import assert from 'node:assert/strict';
import {google} from '../lib/google-api.mjs';

test('token failures identify OAuth causes without exposing raw Google responses',async () => {
  const env = {...process.env}, originalFetch = globalThis.fetch;
  delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  delete process.env.GOOGLE_PRIVATE_KEY;
  Object.assign(process.env,{GOOGLE_CLIENT_ID:'test-client',GOOGLE_CLIENT_SECRET:'test-secret',GOOGLE_REFRESH_TOKEN:'test-refresh'});
  try {
    for (const code of ['invalid_grant','invalid_client','unexpected-sensitive-value']) {
      globalThis.fetch = async () => ({ok:false,json:async () => ({error:code,error_description:'private-response-content'})});
      await assert.rejects(google(),error => {
        assert.equal(error.status,503);
        assert.deepEqual(error.details,{googleError:code.startsWith('invalid_') ? code : 'token_request_failed',authMode:'oauth'});
        assert.doesNotMatch(JSON.stringify({message:error.message,details:error.details}),/private-response-content|unexpected-sensitive-value|test-secret|test-refresh/);
        return true;
      });
    }
  } finally {process.env = env;globalThis.fetch = originalFetch;}
});
