import test from 'node:test';
import assert from 'node:assert/strict';
import {dataHandler} from '../api/data.mjs';
import {signSession} from '../lib/auth.mjs';
import {balances,replayEvents} from '../public/shared/model.js';
function invoke(handler,method = 'GET',data,headers = {}) {
  const req = {method,url:'/api/data',body:data,headers:{host:'luy.test',origin:'https://luy.test','content-type':'application/json',cookie:`luy_finance_session=${signSession()}`,...headers}};
  return new Promise((resolve,reject) => {const res = {statusCode:200,setHeader(){},end:text => resolve({status:res.statusCode,data:JSON.parse(text)})};Promise.resolve(handler(req,res)).catch(reject);});
}
function environment() {
  const original = {...process.env};
  for (const key of ['GOOGLE_SERVICE_ACCOUNT_EMAIL','GOOGLE_PRIVATE_KEY','VERCEL']) delete process.env[key];
  Object.assign(process.env,{GOOGLE_SHEET_ID:'sheet',GOOGLE_CLIENT_ID:'client',GOOGLE_CLIENT_SECRET:'secret',GOOGLE_REFRESH_TOKEN:'test-refresh',APP_PASSWORD:'owner',SESSION_SECRET:'a'.repeat(64)});
  return () => {process.env = original;};
}
const setup = {id:'setup',expectedRevision:0,type:'setup',payload:{openingBalance:30000000,openingSavings:10000000,openingAt:'2026-01-01',name:'An'}};
test('data API requires login and origin; invalid operations do not append events',async () => {
  const restore = environment(), events = [];let reads = 0;
  const handler = dataHandler({read:async () => {reads++;return structuredClone(events);},append:async e => events.push(e),sync:async () => {}});
  try {
    assert.equal((await invoke(handler,'GET',undefined,{cookie:''})).status,401);assert.equal(reads,0);
    assert.equal((await invoke(handler,'POST',setup,{origin:'https://attacker.test'})).status,403);
    assert.equal((await invoke(handler,'POST',{...setup,payload:{...setup.payload,openingSavings:31000000}})).status,422);assert.equal(events.length,0);
    assert.equal((await invoke(handler,'POST',setup)).status,200);assert.equal(events.length,1);
  } finally {restore();}
});
test('retrying the same request is idempotent; stale edits are rejected without changing cash',async () => {
  const restore = environment(), events = [], handler = dataHandler({read:async () => structuredClone(events),append:async e => events.push(e),sync:async () => {}});
  try {
    const first = await invoke(handler,'POST',setup);assert.equal(first.status,200);
    const repeated = await invoke(handler,'POST',setup);assert.equal(repeated.status,200);assert.equal(repeated.data.retried,true);assert.equal(events.length,1);
    assert.equal((await invoke(handler,'POST',{...setup,id:'different'})).status,409);
    assert.equal((await invoke(handler,'POST',{...setup,payload:{...setup.payload,openingBalance:10}})).status,409);
    assert.equal(balances((await invoke(handler)).data.state).cash,30000000);
  } finally {restore();}
});
test('concurrent financial writes apply only one event from the same revision',async () => {
  const restore = environment(), events = [];let release, waiting = 0;
  const gate = new Promise(resolve => release = resolve);
  const handler = dataHandler({read:async () => structuredClone(events),append:async e => {events.push(e);if (e.type !== 'setup') {waiting++;if (waiting === 2) release();await gate;}},sync:async () => {}});
  try {
    await invoke(handler,'POST',setup);
    const request = goalId => ({id:`save-${goalId}`,expectedRevision:1,type:'saving.move',payload:{id:goalId,kind:'deposit',amount:2000000,goalId:'',note:''}});
    const results = await Promise.all([invoke(handler,'POST',request('a')),invoke(handler,'POST',request('b'))]);
    assert.deepEqual(results.map(r => r.status).sort(),[200,409]);
    const replay = replayEvents(events);assert.equal(balances(replay.state).saved,12000000);assert.equal(replay.conflicts.length,1);
  } finally {restore();}
});
test('a derived view failure reports a warning without pretending the committed event failed',async () => {
  const restore = environment(), events = [], handler = dataHandler({read:async () => structuredClone(events),append:async e => events.push(e),sync:async () => {throw new Error('projection unavailable');}});
  try {const result = await invoke(handler,'POST',setup);assert.equal(result.status,200);assert.equal(result.data.projectionWarning,true);assert.equal(events.length,1);}finally {restore();}
});
