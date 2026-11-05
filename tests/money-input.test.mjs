import test from 'node:test';
import assert from 'node:assert/strict';
import {formatMoneyInput,moneySuggestions,updateMoneyInput} from '../public/shared/money-input.js';
import {MAX_MONEY,parseMoney,applyOperation,emptyState,dayKey} from '../public/shared/model.js';

test('money inputs use commas and still save ordinary numbers',() => {
  for (const amount of [0,999,1000,1500000,MAX_MONEY]) {
    const formatted = formatMoneyInput(amount);
    assert.equal(parseMoney(formatted),amount);
    assert.ok(!formatted.includes('.'));
  }
  assert.equal(formatMoneyInput('1500000'),'1,500,000');
  assert.equal(formatMoneyInput('1.500.000 ₫'),'1,500,000');
  assert.equal(formatMoneyInput(''), '');
  for (const invalid of ['1.5','abc','-5000','10000000000001']) {
    assert.throws(() => parseMoney(formatMoneyInput(invalid)));
  }
  const state = applyOperation(emptyState(),{id:'setup',at:new Date().toISOString(),type:'setup',payload:{name:'Bạn',openingAt:dayKey(),openingBalance:parseMoney(formatMoneyInput('1500000')),openingSavings:parseMoney(formatMoneyInput('500000'))}});
  assert.equal(state.settings.openingBalance,1500000);
  assert.equal(state.settings.openingSavings,500000);
  assert.equal(typeof JSON.parse(JSON.stringify(state)).settings.openingBalance,'number');
});

test('quick amounts follow the entered digits and respect the money limit',() => {
  assert.ok(moneySuggestions('').includes(100000));
  assert.ok(moneySuggestions('50').includes(50000));
  assert.ok(moneySuggestions('50').includes(500000));
  assert.ok(moneySuggestions('1,500').includes(1500000));
  assert.deepEqual(moneySuggestions(MAX_MONEY),[]);
  assert.deepEqual(moneySuggestions('1.5'),[]);
  assert.deepEqual(moneySuggestions('-50'),[]);
  for (const suggestion of moneySuggestions('1,000,000,000,000')) assert.ok(suggestion <= MAX_MONEY);
});

test('formatting preserves the cursor and selection while editing in the middle',() => {
  const input = (value,start,end = start) => ({value,selectionStart:start,selectionEnd:end,selectionDirection:'forward',setSelectionRange(start,end,direction){this.selectionStart = start;this.selectionEnd = end;this.selectionDirection = direction;}});
  const typed = input('1234',4);updateMoneyInput(typed);
  assert.equal(typed.value,'1,234');assert.equal(typed.selectionStart,5);
  const inserted = input('192,345',2);updateMoneyInput(inserted);
  assert.equal(inserted.value,'192,345');assert.equal(inserted.selectionStart,2);
  const deleted = input('12,45',3);updateMoneyInput(deleted);
  assert.equal(deleted.value,'1,245');assert.equal(deleted.selectionStart,3);
  const selection = input('1234567',2,5);updateMoneyInput(selection);
  assert.equal(selection.value,'1,234,567');assert.equal(selection.selectionStart,3);assert.equal(selection.selectionEnd,7);
  const cleared = input('',0);updateMoneyInput(cleared);
  assert.equal(cleared.value,'');assert.equal(cleared.selectionStart,0);
});
