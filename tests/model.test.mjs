import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,applyOperation,balances,monthStats,goalProgress,parseMoney,validDay,dayKey,replayEvents,validateBackup} from '../public/shared/model.js';
import {seedState} from '../public/shared/seed.js';
const at = '2026-11-04T05:00:00.000Z';
let seq = 0;
const change = (s,type,payload) => applyOperation(s,{id:`event-${++seq}`,at,type,payload});
const setup = () => change(emptyState(),'setup',{name:'An',openingBalance:30000000,openingSavings:10000000,openingAt:'2026-11-01'});
const entry = (overrides = {}) => ({id:`entry-${++seq}`,type:'expense',amount:1000000,period:'2026-11',day:'',category:'unclassified',description:'',scope:'live',recordMode:'detail',...overrides});
const goal = (overrides = {}) => ({id:'goal',name:'Dự phòng',target:20000000,deadline:'2027-01',color:'green',icon:'shield',note:'',...overrides});
const move = (s,kind,amount,goalId = '') => change(s,'saving.move',{id:`move-${++seq}`,kind,amount,goalId,note:''});

test('VND parsing accepts whole đồng and grouping, rejects ambiguous fractions and unsafe values',() => {
  for (const raw of ['1500000','1.500.000','1,500,000','1 500 000 ₫','1.500.000 VND']) assert.equal(parseMoney(raw),1500000);
  for (const raw of ['1,5','1.50','12.3.000','',-1,NaN,1e16]) assert.throws(() => parseMoney(raw));
  assert.equal(parseMoney('-1.000',{signed:true}),-1000);
});
test('calendar validation and Vietnamese midnight do not invent dates',() => {
  assert.equal(validDay('2024-02-29'),true);assert.equal(validDay('2025-02-29'),false);
  assert.equal(dayKey('2026-10-31T18:00:00Z'),'2026-11-01');
  assert.throws(() => change(setup(),'entry.save',entry({period:'2026-12'})));
  assert.throws(() => change(setup(),'entry.save',entry({day:'2026-10-02'})));
});
test('historical monthly data contributes to analytics without adding to the current balance',() => {
  let s = setup();s = change(s,'entries.import',{entries:[entry({id:'old-income',type:'income',amount:18000000,period:'2025-01',recordMode:'summary'}),entry({id:'old-expense',amount:11000000,period:'2025-01',recordMode:'summary'})]});
  assert.equal(balances(s).cash,30000000);assert.equal(monthStats(s,'2025-01').net,7000000);
  assert.equal(s.entries[0].day,'');assert.equal(s.entries[0].scope,'history');
});
test('unconfirmed entries are excluded from income, expense and current cash until explicitly classified',() => {
  let s = change(setup(),'entry.save',entry({id:'pending',type:'unknown',scope:'live',amount:4000000}));
  assert.equal(monthStats(s,'2026-11').pending,1);assert.equal(monthStats(s,'2026-11').expense,0);assert.equal(balances(s).cash,30000000);
  s = change(s,'entry.save',{...s.entries[0],type:'expense'});
  assert.equal(monthStats(s,'2026-11').expense,4000000);assert.equal(balances(s).cash,30000000);
});
test('live transactions change cash and edits replace the previous amount',() => {
  let s = change(setup(),'entry.save',entry({id:'bill',amount:2000000}));assert.equal(balances(s).cash,28000000);
  s = change(s,'entry.save',{...s.entries[0],amount:3000000});assert.equal(balances(s).cash,27000000);
  s = change(s,'entry.delete',{id:'bill'});assert.equal(balances(s).cash,30000000);
  assert.throws(() => change(s,'entry.save',entry({period:'2026-10',scope:'live'})));
});
test('monthly summaries cannot be mixed with detailed rows or another summary of the same type',() => {
  const s = change(setup(),'entry.save',entry({recordMode:'summary'}));
  assert.throws(() => change(s,'entry.save',entry()));assert.throws(() => change(s,'entry.save',entry({recordMode:'summary'})));
  assert.doesNotThrow(() => change(s,'entry.save',entry({type:'income'})));
  assert.doesNotThrow(() => change(s,'entry.save',{...s.entries[0],amount:1500000}));
});
test('saving, allocation and release never create cash or expenses',() => {
  let s = setup();s = change(s,'goal.save',goal({initialAllocation:6000000}));
  assert.equal(balances(s).unallocated,4000000);
  s = move(s,'deposit',2000000,'goal');s = move(s,'allocate',1000000,'goal');s = move(s,'release',3000000,'goal');
  const b = balances(s);assert.equal(b.cash,30000000);assert.equal(b.saved,12000000);assert.equal(b.funds.get('goal'),6000000);assert.equal(b.unallocated,6000000);assert.equal(b.spendable,18000000);
  assert.equal(monthStats(s,'2026-11').expense,0);assert.equal(monthStats(s,'2026-11').saving,2000000);
  s = move(s,'withdraw',1000000,'goal');assert.equal(balances(s).saved,11000000);assert.equal(balances(s).cash,30000000);
});
test('the same savings cannot fund two goals or exceed spendable cash',() => {
  let s = change(setup(),'goal.save',goal({initialAllocation:8000000}));
  assert.throws(() => change(s,'goal.save',goal({id:'second',initialAllocation:3000000})));
  assert.throws(() => move(s,'deposit',21000000));assert.throws(() => move(s,'withdraw',9000000,'goal'));
  assert.throws(() => move(s,'release',9000000,'goal'));assert.throws(() => move(s,'allocate',1));
});
test('deleting a funded goal releases its money into the common fund',() => {
  let s = change(setup(),'goal.save',goal({initialAllocation:8000000}));s = change(s,'goal.delete',{id:'goal'});
  assert.equal(s.goals.length,0);assert.equal(balances(s).saved,10000000);assert.equal(balances(s).unallocated,10000000);
  assert.doesNotThrow(() => validateBackup({app:'luy-finance',version:1,state:s},{today:'2026-11-04'}));
});
test('reconciliation adjusts current cash without manufacturing income, and exposes a savings shortfall',() => {
  const s = change(setup(),'balance.reconcile',{actual:8000000,note:'Kiểm tra tài khoản'});
  assert.equal(balances(s).cash,8000000);assert.equal(balances(s).shortfall,2000000);assert.equal(monthStats(s,'2026-11').income,0);
  assert.throws(() => change(s,'balance.reconcile',{actual:1,note:''}));
});
test('goal contribution uses inclusive remaining months and handles past deadlines',() => {
  const s = change(setup(),'goal.save',goal({initialAllocation:8000000}));
  assert.equal(goalProgress(s,s.goals[0],'2026-11').monthly,4000000);
  assert.equal(goalProgress(s,s.goals[0],'2027-02').overdue,true);assert.equal(goalProgress(s,s.goals[0],'2027-02').monthly,null);
});
test('closing a historic month creates summaries once without affecting the current balance',() => {
  const payload = {period:'2026-10',income:18000000,expense:12000000,actual:25000000,reconcile:false,affectBalance:false,note:'Tháng tốt'};
  let s = change(setup(),'month.close',payload);s = change(s,'month.close',payload);
  assert.equal(s.entries.length,2);assert.equal(s.closes.length,1);assert.equal(monthStats(s,'2026-10').net,6000000);assert.equal(balances(s).cash,30000000);
  assert.throws(() => change(s,'month.close',{...payload,expense:9000000}));
  assert.throws(() => change(s,'month.close',{...payload,reconcile:true}));
});
test('a month with unconfirmed rows cannot be closed',() => {
  const s = change(setup(),'entry.save',entry({type:'unknown'}));
  assert.throws(() => change(s,'month.close',{period:'2026-11',income:0,expense:0,note:''}));
});
test('imports are atomic and exact IDs are idempotent',() => {
  const s = setup(), rows = [entry({id:'old',scope:'history',period:'2026-10'})];
  let result = change(s,'entries.import',{entries:rows});result = change(result,'entries.import',{entries:rows});assert.equal(result.entries.length,1);
  assert.throws(() => change(s,'entries.import',{entries:[...rows,entry({amount:-1})]}));assert.equal(s.entries.length,0);
});
test('backup validation rejects inconsistent funds, duplicate IDs and bad dates',() => {
  const original = seedState(at), wrapped = {app:'luy-finance',version:1,state:original};
  const restored = validateBackup(wrapped,{today:'2026-11-04'});assert.equal(balances(restored).cash,36000000);assert.equal(balances(restored).saved,22000000);
  for (const damage of [s => {s.entries.push(s.entries[0]);},s => {s.moves[0].amount = 999999999;},s => {s.entries[0].day = '2026-02-30';}]) {const copy = structuredClone(wrapped);damage(copy.state);assert.throws(() => validateBackup(copy,{today:'2026-11-04'}));}
  assert.throws(() => change(setup(),'backup.restore',{backup:wrapped}));
  const replaced = change(setup(),'backup.restore',{backup:wrapped,confirm:true});assert.equal(replaced.revision,2);
});
test('event replay applies one of two concurrent writes and ignores identical retried events',() => {
  const first = {id:'setup',at,type:'setup',baseRevision:0,payload:{name:'An',openingBalance:30000000,openingSavings:0,openingAt:'2026-11-01'}};
  const a = {id:'a',at,type:'entry.save',baseRevision:1,payload:entry({id:'expense-a'})};
  const b = {id:'b',at,type:'entry.save',baseRevision:1,payload:entry({id:'expense-b'})};
  const replay = replayEvents([first,a,b,a]);assert.equal(replay.state.revision,2);assert.equal(replay.state.entries.length,1);assert.equal(balances(replay.state).cash,29000000);assert.deepEqual(replay.conflicts,['b']);
  assert.throws(() => replayEvents([first,a,{...a,payload:{...a.payload,amount:2}}]));
});
