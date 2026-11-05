import test from 'node:test';
import assert from 'node:assert/strict';
import {seedState} from '../public/shared/seed.js';
import {monthKey} from '../public/shared/model.js';

// Render smoke check without a browser. This catches runtime errors across pages;
// it deliberately makes no claims about layout, CSS or actual browser interaction.
test('client boots, renders every page and dialog, and escapes names and notes',async () => {
  const state = seedState(), malicious = '<img src=x onerror=alert(1)>';
  state.settings.name = malicious;state.entries.at(-1).description = malicious;
  state.entries.push(...[
    ['2024-12','income',1000],['2024-12','expense',400],
    ['2025-02','income',3000],['2025-02','expense',600],['2025-02','unknown',999],['2025-03','expense',50],
  ].map(([period,type,amount],i) => ({id:`report-${i}`,period,type,amount,day:'',scope:'history',category:'unclassified',recordMode:'detail',description:`report-entry-${i}`})));
  const values = new Map([['luy-finance-data-v1',JSON.stringify({app:'luy-finance',version:1,state})]]), listeners = new Map();
  const messages = [], elements = new Map();
  const app = {innerHTML:''}, modal = {innerHTML:'',open:false,close(){this.open = false;},showModal(){this.open = true;},addEventListener(){}}, toasts = {append(node){messages.push(node.innerHTML);}};
  const overrides = {
    document:{documentElement:{dataset:{}},querySelector:q => elements.get(q) || {'#app':app,'#modal':modal,'#toasts':toasts}[q] || null,querySelectorAll:() => [],addEventListener:(type,fn) => listeners.set(type,fn),createElement:() => ({remove(){}})},
    FormData:class extends FormData {constructor(form){super();for (const [name,value] of form.values) this.set(name,value);}},
    window:{addEventListener(){},scrollTo(){}},
    location:{search:'',pathname:'/',origin:'http://localhost:4180'},
    localStorage:{getItem:k => values.get(k) || null,setItem:(k,v) => values.set(k,v)},
    requestAnimationFrame:fn => fn(),
    setTimeout:() => 0,
    fetch:async () => Response.json({mode:'demo',ready:true,authEnabled:false,authenticated:false}),
  };
  const previous = new Map(Object.keys(overrides).map(k => [k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  for (const [k,v] of Object.entries(overrides)) Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});
  const click = async dataset => listeners.get('click')({target:{closest:() => ({dataset})}});
  const change = async (id,value) => listeners.get('change')({target:{id,value}});
  const totals = () => app.innerHTML.match(/<div class="stats">[\s\S]*?<\/article><\/div>/)?.[0] || '';
  try {
    await import('../public/app.js');await new Promise(resolve => setImmediate(resolve));
    assert.match(app.innerHTML,/TỔNG TIỀN HIỆN CÓ/);assert.ok(!app.innerHTML.includes(malicious));assert.match(app.innerHTML,/&lt;img/);
    for (const [tab,text] of [['ledger','Một cuốn sổ'],['reports','Thống kê thu chi'],['savings','Để dành, từng chút'],['goals','Những điều bạn mong muốn'],['import','Mang cuốn sổ cũ'],['settings','Không gian theo ý bạn']]) {
      await click({tab});assert.ok(app.innerHTML.includes(text),`Page ${tab} rendered`);assert.ok(!app.innerHTML.includes(malicious));
    }
    await click({tab:'reports'});
    await change('report-mode','range');await change('report-from','2024-12');await change('report-to','2025-02');
    assert.match(totals(),/4\.000 ₫/);assert.match(totals(),/1\.000 ₫/);assert.match(totals(),/3\.000 ₫/);assert.match(totals(),/75%/);
    assert.match(app.innerHTML,/01\/2025/);assert.match(app.innerHTML,/Chưa có dữ liệu/);assert.match(app.innerHTML,/1 cần xác nhận/);
    await change('report-group','year');
    assert.match(app.innerHTML,/Thu chi theo năm/);assert.match(app.innerHTML,/data-id="2025-01_2025-02"/);
    const rendered = app.innerHTML;
    await change('report-from','2025-03');assert.equal(app.innerHTML,rendered);assert.match(messages.at(-1),/Chọn khoảng tháng hợp lệ/);
    await click({action:'pending'});assert.match(app.innerHTML,/report-entry-4/);assert.ok(!app.innerHTML.includes('report-entry-3'));
    assert.match(totals(),/4\.000 ₫/); // Pending list still has totals for the selected range.
    await click({tab:'reports'});await click({action:'report-detail',id:'2025-01_2025-02'});
    assert.match(app.innerHTML,/Một cuốn sổ/);assert.match(app.innerHTML,/report-entry-2/);assert.match(app.innerHTML,/report-entry-4/);
    assert.ok(!app.innerHTML.includes('report-entry-0'));assert.ok(!app.innerHTML.includes('report-entry-5'));
    assert.match(totals(),/3\.000 ₫/);assert.match(totals(),/600 ₫/);
    await click({tab:'reports'});await change('report-mode','year');await change('report-year','2025');
    assert.match(totals(),/650 ₫/);assert.match(app.innerHTML,/Năm 2025/);
    await change('report-group','month');assert.match(app.innerHTML,/12\/2025/);
    await change('report-year',monthKey().slice(0,4));assert.match(app.innerHTML,new RegExp(`đến ${monthKey().slice(5)}/${monthKey().slice(0,4)}`));
    await change('report-mode','month');await change('report-month','2025-02');
    assert.match(totals(),/2\.400 ₫/);assert.match(totals(),/80%/);
    await click({action:'report-detail',id:'2025-02_2025-02'});assert.match(app.innerHTML,/value="2025-02"/);
    await change('report-mode','all');await click({tab:'reports'});
    assert.match(app.innerHTML,/Mọi thời gian/);assert.match(app.innerHTML,/12\/2024/);
    await change('report-mode','month');await change('report-month','2023-01');
    assert.match(app.innerHTML,/Chưa có dữ liệu trong kỳ này/);assert.match(totals(),/0 ₫/);
    await click({action:'privacy'});assert.ok(!app.innerHTML.includes('0 ₫'));assert.match(totals(),/••••••/);await click({action:'privacy'});
    for (const action of ['entry','goal','deposit','reconcile','close-month']) {
      await click({action});assert.equal(modal.open,true,`${action} dialog opens`);assert.match(modal.innerHTML,/modal-form/);await click({action:'close'});
    }
    await click({action:'entry'});
    assert.match(modal.innerHTML,/data-money-input/);assert.match(modal.innerHTML,/Nhập nhanh/);
    const amount = {name:'amount',value:'1500000',selectionStart:7,selectionEnd:7,matches:selector => selector === '[data-money-input]',focus(){},setSelectionRange(start,end){this.selectionStart = start;this.selectionEnd = end;},dispatchEvent(){listeners.get('input')({target:this});}};
    const suggestions = {innerHTML:'',parentElement:{hidden:false}};
    elements.set('#modal [data-money-input][name="amount"]',amount);
    elements.set('#modal [data-money-suggestions="amount"]',suggestions);
    listeners.get('input')({target:amount});assert.equal(amount.value,'1,500,000');assert.equal(amount.selectionStart,9);
    amount.value = '50';amount.selectionStart = amount.selectionEnd = 2;
    listeners.get('input')({target:amount});assert.match(suggestions.innerHTML,/50,000 ₫/);
    await click({action:'money-suggestion',id:'50000',field:'amount'});
    assert.equal(amount.value,'50,000');assert.equal(modal.open,true);
    amount.selectionStart = amount.selectionEnd = 3;
    listeners.get('beforeinput')({target:amount,inputType:'deleteContentBackward'});
    assert.equal(amount.selectionStart,1);assert.equal(amount.selectionEnd,3);
    const submit = {disabled:false}, error = {textContent:''};
    await listeners.get('submit')({preventDefault(){},target:{id:'modal-form',values:[['amount',amount.value],['type','income'],['period',monthKey()],['day',''],['category','unclassified'],['description','money-input-save-check'],['recordMode','detail']],querySelector:q => q === 'button[type="submit"]' ? submit : error}});
    const saved = JSON.parse(values.get('luy-finance-data-v1')).state.entries.find(entry => entry.description === 'money-input-save-check');
    assert.equal(saved.amount,50000);assert.equal(typeof saved.amount,'number');assert.equal(modal.open,false);
    elements.clear();
    const importedOnly = {...state,settings:null,revision:0,entries:state.entries.filter(e => e.id.startsWith('report-')),moves:[],goals:[],adjustments:[],closes:[]};
    values.set('luy-finance-data-v1',JSON.stringify({app:'luy-finance',version:1,state:importedOnly}));
    await click({action:'refresh'});await click({tab:'reports'});await change('report-month','2025-02');
    assert.match(app.innerHTML,/Thống kê thu chi/);assert.match(totals(),/2\.400 ₫/);
    await click({action:'report-detail',id:'2025-02_2025-02'});assert.match(app.innerHTML,/report-entry-2/);
  } finally {
    for (const [k,descriptor] of previous) if (descriptor) Object.defineProperty(globalThis,k,descriptor);else delete globalThis[k];
  }
});
