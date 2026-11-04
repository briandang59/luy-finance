import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore,eventValues,parseEvent,EVENT_FIELDS,VIEW_FIELDS,projections} from '../lib/store.mjs';
import {seedState} from '../public/shared/seed.js';
test('large event payloads roundtrip across Sheets cell boundaries and reject corruption',() => {
  const event = {id:'test',at:'2026-11-04T05:00:00.000Z',type:'entries.import',baseRevision:12,payload:{notes:'Tiết kiệm 🌱'.repeat(5000)}};
  const row = eventValues(event);assert.equal(row.length,37);assert.ok(row.slice(5).every(c => c.length <= 30000));assert.deepEqual(parseEvent(row),event);
  const damaged = [...row];damaged[5] += 'x';assert.throws(() => parseEvent(damaged));
  assert.throws(() => eventValues({...event,payload:{text:'a'.repeat(960001)}}));
});
test('readable projections keep opening cash, unclassified history, allocations and goals separate',() => {
  const result = projections(seedState('2026-11-04T05:00:00.000Z'),'2026-11-04T05:00:00Z');
  assert.equal(result.SoDu.at(-1)[2],36000000);assert.equal(result.SoDu.at(-1)[3],22000000);assert.equal(result.MucTieu[0][3],22000000);
  assert.ok(result.ThuChi.some(row => row[4] === '' && row[5] === 'Chưa phân loại'));assert.equal(result.TietKiem[0][3],20000000);
});
test('store initializes isolated tabs, uses literal strings and clears stale projection rows',async () => {
  const calls = [], fields = {Events:EVENT_FIELDS,...VIEW_FIELDS};
  const props = Object.keys(fields).map((title,index) => ({title,sheetId:index + 1,gridProperties:{rowCount:1000,columnCount:title === 'Events' ? 37 : 26}}));
  const call = async (path,options) => {
    const payload = options?.body && JSON.parse(options.body);calls.push({path,payload});
    if (path.startsWith('?fields=')) return {sheets:[]};
    if (payload?.requests?.[0]?.addSheet) return {replies:props.map(properties => ({addSheet:{properties}}))};
    if (path.startsWith('/values:batchGet')) return {valueRanges:Object.keys(fields).map(() => ({}))};
    if (path === '/values/Events!A2:AK') return {values:[]};
    return {};
  };
  const store = createStore(call);await store.read();
  assert.match(calls.find(c => c.path.startsWith('/values:batchGet')).path,/Events!A1:AK1/);
  assert.match(calls.find(c => c.path.startsWith('/values:batchGet')).path,/ThuChi!A1:Z1/);
  await store.append({id:'save',at:'2026-11-04T05:00:00Z',type:'test',baseRevision:0,payload:{text:'=IMPORTDATA("https://example.invalid")'}});
  const appended = calls.find(c => c.payload?.requests?.[0]?.appendCells).payload.requests[0].appendCells;
  assert.ok(appended.rows[0].values[5].userEnteredValue.stringValue.includes('=IMPORTDATA'));
  await store.sync(seedState('2026-11-04T05:00:00Z'));
  const updates = calls.at(-1).payload.requests.filter(r => r.updateCells);assert.equal(updates.length,4);assert.equal(updates[0].updateCells.range.endRowIndex,1000);assert.equal(updates[0].updateCells.fields,'userEnteredValue');
});
test('an existing unrelated table with the same name fails before any data is appended',async () => {
  const props = ['Events',...Object.keys(VIEW_FIELDS)].map((title,index) => ({sheetId:index,title}));
  const store = createStore(async path => path.startsWith('?fields=') ? {sheets:props.map(properties => ({properties}))} : {valueRanges:[{values:[['personal','data']]}]});
  await assert.rejects(store.read(),/cấu trúc khác/);
});
