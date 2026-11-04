import test from 'node:test';
import assert from 'node:assert/strict';
import {seedState} from '../public/shared/seed.js';

// Render smoke check without a browser. This catches runtime errors across pages;
// it deliberately makes no claims about layout, CSS or actual browser interaction.
test('client boots, renders every page and dialog, and escapes names and notes',async () => {
  const state = seedState(), malicious = '<img src=x onerror=alert(1)>';
  state.settings.name = malicious;state.entries.at(-1).description = malicious;
  const values = new Map([['luy-finance-data-v1',JSON.stringify({app:'luy-finance',version:1,state})]]), listeners = new Map();
  const app = {innerHTML:''}, modal = {innerHTML:'',open:false,close(){this.open = false;},showModal(){this.open = true;},addEventListener(){}}, toasts = {append(){}};
  const overrides = {
    document:{documentElement:{dataset:{}},querySelector:q => ({'#app':app,'#modal':modal,'#toasts':toasts}[q] || null),querySelectorAll:() => [],addEventListener:(type,fn) => listeners.set(type,fn)},
    window:{addEventListener(){},scrollTo(){}},
    location:{search:'',pathname:'/',origin:'http://localhost:4180'},
    localStorage:{getItem:k => values.get(k) || null,setItem:(k,v) => values.set(k,v)},
    requestAnimationFrame:fn => fn(),
    fetch:async () => Response.json({mode:'demo',ready:true,authEnabled:false,authenticated:false}),
  };
  const previous = new Map(Object.keys(overrides).map(k => [k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  for (const [k,v] of Object.entries(overrides)) Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});
  const click = async dataset => listeners.get('click')({target:{closest:() => ({dataset})}});
  try {
    await import('../public/app.js');await new Promise(resolve => setImmediate(resolve));
    assert.match(app.innerHTML,/TỔNG TIỀN HIỆN CÓ/);assert.ok(!app.innerHTML.includes(malicious));assert.match(app.innerHTML,/&lt;img/);
    for (const [tab,text] of [['ledger','Một cuốn sổ'],['savings','Để dành, từng chút'],['goals','Những điều bạn mong muốn'],['import','Mang cuốn sổ cũ'],['settings','Không gian theo ý bạn']]) {
      await click({tab});assert.ok(app.innerHTML.includes(text),`Page ${tab} rendered`);assert.ok(!app.innerHTML.includes(malicious));
    }
    for (const action of ['entry','goal','deposit','reconcile','close-month']) {
      await click({action});assert.equal(modal.open,true,`${action} dialog opens`);assert.match(modal.innerHTML,/modal-form/);await click({action:'close'});
    }
  } finally {
    for (const [k,descriptor] of previous) if (descriptor) Object.defineProperty(globalThis,k,descriptor);else delete globalThis[k];
  }
});
