import {CATEGORIES,categoryInfo,emptyState,balances,monthStats,rangeStats,goalProgress,categoryTotals,applyOperation,validateBackup,parseMoney,dayKey,monthKey,shiftMonth,periodLabel,validPeriod} from './shared/model.js';
import {seedState} from './shared/seed.js';
import {parseCSV,detectMapping,importPreview,fold} from './shared/import.js';
import {formatMoneyInput,moneySuggestions,updateMoneyInput} from './shared/money-input.js';

const $ = (q,root = document) => root.querySelector(q);
const $$ = (q,root = document) => [...root.querySelectorAll(q)];
const esc = value => String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = {
  grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',book:'M4 4h12a3 3 0 0 1 3 3v14H6a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2 M3 17h16 M8 8h7 M8 11h5',wallet:'M20 7V5a2 2 0 0 0-2-2H6a3 3 0 0 0 0 6h14v11H6a3 3 0 0 1-3-3V6 M20 12h-5v5h5 M16 14.5h1',target:'M21 12a9 9 0 1 1-9-9 M17 12a5 5 0 1 1-5-5 M12 12l9-9 M16 3h5v5',upload:'M12 16V3 M7 8l5-5 5 5 M4 15v5h16v-5',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M10 3h4l1 3 3 1 3 3v4l-3 1-1 3-3 3h-4l-1-3-3-1-3-3v-4l3-1 1-3z',leaf:'M20 3C8 2 2 8 5 16c8 6 16-1 15-13z M5 20L16 9',arrowUp:'M7 17L17 7 M7 7h10v10',arrowDown:'M7 7l10 10 M7 17h10V7',chevron:'M9 5l7 7-7 7',plus:'M12 5v14 M5 12h14',calendar:'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0',moon:'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z',sun:'M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1',search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6',more:'M5 12h.1 M12 12h.1 M19 12h.1',edit:'M14 5l5 5 M4 20l1-6L17 2l5 5L10 19z',trash:'M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',close:'M6 6l12 12 M6 18L18 6',check:'M5 12l4 4L19 6',alert:'M12 3l10 18H2z M12 9v5 M12 17h.1',shield:'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6',home:'M3 10l9-7 9 7 M5 9v12h14V9 M9 21v-8h6v8',plane:'M21 3L3 10l7 3 3 8z M10 13l5-5',car:'M4 10l2-6h12l2 6 M3 10h18v9H3z M6 19v2 M18 19v2 M6 14h2 M16 14h2',gift:'M3 9h18v4H3z M5 13v8h14v-8 M12 9v12 M12 9C4 10 5 1 9 4l3 5c8 1 7-8 3-5z',coffee:'M3 8h13v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z M16 9h2a3 3 0 0 1 0 6h-2 M6 3v2 M10 2v3 M14 3v2',briefcase:'M3 7h18v14H3z M8 7V3h8v4 M3 12l9 3 9-3 M12 12v4',bag:'M4 7h16l1 14H3z M8 9V6a4 4 0 0 1 8 0v3',heart:'M12 21C-5 10 4-3 12 6 20-3 29 10 12 21z',sparkles:'M12 3l3 6 6 3-6 3-3 6-3-6-6-3 6-3z',users:'M5 7a3 3 0 1 0 6 0 3 3 0 0 0-6 0 M2 21v-4a6 6 0 0 1 12 0v4 M16 4a3 3 0 0 1 0 6 M18 14a5 5 0 0 1 4 5v2',bolt:'M13 2L4 14h7l-1 8 10-13h-7z',download:'M12 3v13 M7 11l5 5 5-5 M4 16v5h16v-5',refresh:'M21 4v6h-6 M3 20v-6h6 M5 8a8 8 0 0 1 13-3l3 5 M3 14l3 5a8 8 0 0 0 13-3',logout:'M9 4H3v16h6 M9 12h12 M16 7l5 5-5 5',menu:'M4 6h16 M4 12h16 M4 18h16',lock:'M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4',cloud:'M7 18a5 5 0 1 1 0-10 6 6 0 0 1 11 0 5 5 0 0 1 0 10z',percent:'M5 19L19 5 M7 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M17 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6',swap:'M3 7h17 M16 3l4 4-4 4 M21 17H4 M8 13l-4 4 4 4',file:'M5 3h9l5 5v13H5z M14 3v6h5 M8 13h8 M8 17h5',info:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 10v7 M12 7h.1',history:'M3 4v6h6 M3 10a9 9 0 1 1 1 9 M12 7v5l3 2',chart:'M4 20V4 M4 20h17 M8 17v-5 M13 17V7 M18 17v-8',checklist:'M9 5h12 M9 12h12 M9 19h12 M3 5l1 1 2-2 M3 12l1 1 2-2 M3 19l1 1 2-2',
};
const icon = (name,cls = '') => `<svg class="icon ${cls}" aria-hidden="true" viewBox="0 0 24 24"><path d="${paths[name] || paths.more}"/></svg>`;
const key = 'luy-finance-data-v1', prefKey = 'luy-finance-prefs-v1';
let prefs = {theme:'light',hidden:false};
try {prefs = {...prefs,...JSON.parse(localStorage.getItem(prefKey) || '{}')};} catch {}
document.documentElement.dataset.theme = prefs.theme === 'dark' ? 'dark' : 'light';
const ui = {data:emptyState(),session:null,tab:'overview',period:monthKey(),reportMode:'month',reportYear:monthKey().slice(0,4),reportFrom:`${monthKey().slice(0,4)}-01`,reportTo:monthKey(),reportGroup:'month',query:'',filter:'all',category:'all',modal:null,loading:false,error:'',localError:false};
const tabs = {overview:['Tổng quan','grid'],ledger:['Sổ thu chi','book'],reports:['Thống kê','chart'],savings:['Tiết kiệm','wallet'],goals:['Mục tiêu','target'],import:['Nhập dữ liệu','upload'],settings:['Cài đặt','settings']};
const types = {income:'Thu nhập',expense:'Chi tiêu',unknown:'Cần xác nhận'};
const moveNames = {deposit:'Để dành',withdraw:'Rút tiết kiệm',allocate:'Phân bổ mục tiêu',release:'Trả về quỹ chung'};
const num = value => new Intl.NumberFormat('vi-VN').format(value);
const money = value => prefs.hidden ? '••••••' : `${num(value)} ₫`;
const compact = value => prefs.hidden ? '••••' : Math.abs(value) >= 1000000 ? `${num(Math.round(value / 100000) / 10)}tr` : money(value);
const id = () => crypto.randomUUID();
const isCloud = () => ui.session?.mode === 'sheets';
const backup = state => ({app:'luy-finance',version:1,exportedAt:new Date().toISOString(),state});
const empty = (title,description,action = '',label = '',ico = 'leaf') => `<div class="empty">${icon(ico)}<h2>${title}</h2><p>${description}</p>${action ? button(label,action,'plus') : ''}</div>`;
const button = (label,action,ico = '',cls = '',extra = '') => `<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${ico ? icon(ico) : ''}${label}</button>`;
const iconButton = (label,action,ico,extra = '') => `<button type="button" class="icon-btn" title="${label}" aria-label="${label}" data-action="${action}" ${extra}>${icon(ico)}</button>`;
const moneySuggestionButtons = (name,value) => moneySuggestions(value).map(amount => `<button type="button" data-action="money-suggestion" data-field="${name}" data-id="${amount}" aria-label="Nhập ${formatMoneyInput(amount)} đồng">${formatMoneyInput(amount)} ₫</button>`).join('');
const field = (label,name,value = '',type = 'text',extra = '',hint = '') => {
  const isMoney = extra.includes('inputmode="numeric"'), editable = isMoney && !/\b(?:readonly|disabled)\b/.test(extra), inputId = `field-${name}`;
  const suggestions = editable ? moneySuggestionButtons(name,value) : '';
  return `<div class="field${name === 'amount' ? ' amount-input' : ''}"><label for="${inputId}">${label}${hint ? `<small>${hint}</small>` : ''}</label><input id="${inputId}" name="${name}" type="${type}" value="${esc(isMoney ? formatMoneyInput(value) : value)}" ${isMoney ? 'data-money-input autocomplete="off"' : ''} ${extra}>${editable ? `<div class="money-shortcuts" ${suggestions ? '' : 'hidden'}><small>Nhập nhanh</small><div class="money-suggestions" data-money-suggestions="${name}" role="group" aria-label="Gợi ý ${label}">${suggestions}</div></div>` : ''}</div>`;
};
const select = (label,name,options,value,extra = '') => `<label class="field"><span>${label}</span><select name="${name}" ${extra}>${options.map(([v,l]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
const noteField = (value = '',name = 'note',label = 'Ghi chú',required = false) => `<label class="field"><span>${label}</span><textarea name="${name}" maxlength="1000" ${required ? 'required' : ''} placeholder="Một chút ngữ cảnh để sau này dễ nhớ…">${esc(value)}</textarea></label>`;
const check = (name,label,checked = false,extra = '') => `<label class="check"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''} ${extra}><span>${label}</span></label>`;
const notice = text => `<div class="notice">${icon('info')}<span>${text}</span></div>`;

function toast(text,error = false) {
  const node = document.createElement('div');node.className = `toast${error ? ' error' : ''}`;
  node.innerHTML = `${icon(error ? 'alert' : 'check')}<span>${esc(text)}</span>`;
  $('#toasts').append(node);setTimeout(() => node.remove(),6000);
}
async function api(path,method = 'GET',data) {
  const res = await fetch(path,{method,credentials:'same-origin',headers:data ? {'Content-Type':'application/json'} : {},...(data ? {body:JSON.stringify(data)} : {})});
  let result;try {result = await res.json();}catch {throw new Error(`Máy chủ trả về lỗi ${res.status}. Kiểm tra ứng dụng đã deploy đúng thư mục.`);}
  if (!res.ok) {const e = new Error(result.error || `Lỗi ${res.status}`);e.status = res.status;throw e;}return result;
}
function loadLocal() {
  const raw = localStorage.getItem(key);
  if (!raw) {const state = seedState();localStorage.setItem(key,JSON.stringify(backup(state)));return state;}
  const saved = JSON.parse(raw), state = validateBackup(saved);
  if (!Number.isSafeInteger(saved.state.revision) || saved.state.revision < 0) throw new Error('Phiên bản dữ liệu trên máy không hợp lệ.');
  state.revision = saved.state.revision;return state;
}
async function boot() {
  try {
    ui.session = await api('/api/session');
    if ((ui.session.authEnabled && !ui.session.authenticated) || (!ui.session.ready && ui.session.mode !== 'sheets')) return renderGate();
    if (isCloud()) ui.data = (await api('/api/data')).state;
    else {try {ui.data = loadLocal();}catch (e) {ui.localError = true;ui.error = `Không đọc được dữ liệu trên máy: ${e.message} Bạn có thể tải dữ liệu gốc và khôi phục bản sao lưu trong Cài đặt.`;}}
    render();
    if (new URLSearchParams(location.search).get('google') === 'connected') {history.replaceState({},'',location.pathname);toast('Đã kết nối Google Sheets.');}
  } catch (e) {ui.error = e.message;renderGate(true);}
}
function brand() {return `<div class="brand"><span class="brand-mark">l</span><div><span class="brand-name">lũy</span><span class="brand-tag">TỪNG CHÚT CHO NGÀY MAI</span></div></div>`;}
function renderGate(failed = false) {
  const s = ui.session || {}, connectedLogin = s.authEnabled && !s.authenticated, connect = s.authenticated && s.oauthAvailable && !s.ready;
  $('#app').innerHTML = `<main class="login"><div class="login-card">${brand()}<p class="eyebrow">KHÔNG GIAN TÀI CHÍNH CỦA BẠN</p><h1>${connectedLogin ? 'Chào bạn trở lại.' : connect ? 'Kết nối sổ của bạn.' : 'Mở không gian của bạn.'}</h1><p>${connectedLogin ? 'Một nơi yên tĩnh để nhìn lại thu chi và dành dụm cho những điều quan trọng.' : connect ? 'Đăng nhập Google bằng tài khoản có quyền chỉnh sửa Sheet đã chọn. Lũy sẽ tạo các tab dữ liệu cần thiết khi bạn bắt đầu.' : 'Ứng dụng chưa sẵn sàng kết nối. Kiểm tra cấu hình máy chủ rồi tải lại.'}</p>${failed || ui.error ? notice(esc(ui.error || 'Không thể tải dữ liệu.')) : ''}${connectedLogin ? `<form id="login-form">${field('Mật khẩu ứng dụng','password','','password','required autocomplete="current-password"')}<p class="form-error" role="alert"></p><button class="btn" type="submit">${icon('lock')}Mở sổ của tôi</button></form>` : connect ? `<a class="btn" href="/api/auth/google">${icon('cloud')}Kết nối Google Sheets</a><p class="footer-note">Trong Google Cloud, thêm callback này vào OAuth Client:</p><div class="callback">${esc(location.origin)}/api/auth/google/callback</div>${button('Đăng xuất','logout','logout','btn-ghost')}` : button('Thử lại','reload','refresh')}<p class="footer-note">${icon('shield')} Dữ liệu của bạn, trong Google Sheet của bạn.</p></div></main>`;
}
function render() {
  const pending = ui.data.entries.filter(e => e.type === 'unknown').length;
  $('#app').innerHTML = `<div class="mobile-overlay" data-action="menu"></div><aside class="sidebar">${brand()}<p class="nav-label">KHÔNG GIAN CỦA BẠN</p><nav class="nav" aria-label="Điều hướng chính">${Object.entries(tabs).map(([tab,[label,ico]]) => `<button class="nav-item ${ui.tab === tab ? 'active' : ''}" data-tab="${tab}" ${ui.tab === tab ? 'aria-current="page"' : ''}>${icon(ico)}${label}${tab === 'ledger' && pending ? `<span class="nav-count">${pending}</span>` : ''}</button>`).join('')}</nav><div class="sidebar-bottom"><div class="side-tip">${icon('leaf')}<strong>Mỗi chút đều có ý nghĩa.</strong><p>Một khoản nhỏ hôm nay,<br>một bước gần hơn đến ngày mai.</p></div><div class="storage"><i class="dot ${isCloud() ? 'connected' : ''}"></i>${isCloud() ? 'Đã kết nối Google Sheets' : 'Dữ liệu trên máy'}</div></div></aside><div class="main"><header class="topbar"><div class="breadcrumbs">${iconButton('Mở menu','menu','menu').replace('class="icon-btn"','class="icon-btn mobile-menu"')}<span class="crumb-home">Không gian của tôi</span>${icon('chevron')}<strong>${tabs[ui.tab][0]}</strong></div><div class="top-actions"><span class="top-date">${new Intl.DateTimeFormat('vi-VN',{day:'numeric',month:'long',year:'numeric'}).format(new Date())}</span>${iconButton(prefs.hidden ? 'Hiện số tiền' : 'Ẩn số tiền','privacy','eye')}${iconButton('Đổi giao diện','theme',prefs.theme === 'dark' ? 'sun' : 'moon')}<span class="avatar">${esc((ui.data.settings?.name || 'Bạn').slice(0,2).toUpperCase())}</span></div></header><main class="page">${ui.error ? notice(`${esc(ui.error)} ${button('Tải lại','reload','refresh','btn-ghost')}`) : ''}${pageContent()}<footer class="demo-notice">${icon(isCloud() ? 'cloud' : 'info')}${isCloud() ? 'Dữ liệu được lưu vào Google Sheet của bạn.' : 'Dữ liệu trên máy · Chưa đồng bộ Google Sheets.'}${!isCloud() ? '<button data-action="start-own">Bắt đầu với dữ liệu của tôi</button>' : ''}</footer></main></div>`;
  requestAnimationFrame(() => {$$('[data-width]').forEach(n => {n.style.width = `${Math.max(0,Math.min(100,Number(n.dataset.width)))}%`;});$$('[data-height]').forEach(n => {n.style.height = `${Math.max(0,Math.min(100,Number(n.dataset.height)))}%`;});});
}
function intro(title,subtitle,actions = '',withPeriod = true) {
  return `<div class="intro"><div><p class="eyebrow">TỪNG CHÚT CHO NGÀY MAI</p><h1>${title}</h1><p class="subtitle">${subtitle}</p></div><div class="intro-actions">${withPeriod ? `<label class="period-control" aria-label="Tháng đang xem">${icon('calendar')}<input id="period" aria-label="Tháng đang xem" type="month" value="${ui.period}" min="1900-01" max="${monthKey()}"></label>` : ''}${actions}</div></div>`;
}
function pageContent() {
  if (ui.tab === 'settings') return settingsPage();
  if (ui.tab === 'import') return importPage();
  if (ui.tab === 'reports') return reportsPage();
  if (ui.tab === 'ledger') return ledgerPage();
  if (!ui.data.settings) return `${intro('Bắt đầu từ hôm nay.','Bạn không cần một lịch sử hoàn hảo để bắt đầu dành dụm.','',false)}${empty('Bạn đang có bao nhiêu?','Nhập tổng tiền thực tế và phần đã dành làm tiết kiệm. Lịch sử cũ sẽ được lưu riêng, không cộng lại vào số dư này.','setup','Thiết lập số dư','wallet')}`;
  return {overview:overviewPage,ledger:ledgerPage,savings:savingsPage,goals:goalsPage}[ui.tab]();
}
function stat(label,amount,ico,note,cls = '') {return `<article class="stat"><div class="stat-top">${label}${icon(ico)}</div><div class="stat-amount ${cls}">${amount}</div><small>${note}</small></article>`;}
function statsBlock(s = monthStats(ui.data,ui.period),label = `Tháng ${periodLabel(ui.period)}`) {
  return `<div class="stats">${stat('Tổng thu',money(s.income),'arrowDown',label,'income')}${stat('Tổng chi',money(s.expense),'arrowUp',label,'expense')}${stat('Dư từ thu chi',money(s.net),'chart','Thu nhập − chi tiêu',s.net < 0 ? 'negative' : '')}${stat('Tỷ lệ dư',s.rate === null ? '—' : `${num(Math.round(s.rate))}%`,'percent',s.rate === null ? 'Chưa có thu nhập để tính tỷ lệ' : 'Dư từ thu chi / thu nhập')}</div>`;
}
function balanceWarnings(p = monthStats(ui.data,ui.period)) {
  const b = balances(ui.data);
  return `${b.shortfall ? notice(`Số dư thực tế đang thiếu ${money(b.shortfall)} so với phần đã dành tiết kiệm. Kiểm tra thu chi hoặc rút bớt tiết kiệm để đối chiếu.`) : ''}${p.pending ? notice(`Có ${p.pending} khoản chưa xác nhận Thu/Chi trong kỳ đang xem, chưa được tính vào tổng. <button data-action="pending">Xem và xác nhận</button>`) : ''}`;
}
function overviewPage() {
  const b = balances(ui.data), s = monthStats(ui.data,ui.period), name = esc(ui.data.settings.name), time = Number(new Intl.DateTimeFormat('en-US',{hour:'numeric',hour12:false,timeZone:'Asia/Ho_Chi_Minh'}).format(new Date()));
  const hello = time < 12 ? 'Chào buổi sáng' : time < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const rows = ui.data.entries.filter(e => e.period === ui.period).slice().reverse().slice(0,5);
  return `${intro(`${hello}, ${name}.`,'Cùng nhìn lại một chút, và tiến thêm một bước.',button('Thêm thu chi','entry','plus'))}${balanceWarnings()}<div class="hero-row"><section class="balance-hero"><div class="hero-label">${icon('wallet')}TỔNG TIỀN HIỆN CÓ · ĐẾN HÔM NAY</div><div class="hero-amount">${prefs.hidden ? '••••••••' : num(b.cash)}<span>₫</span></div><div class="hero-note">Số dư ban đầu + phát sinh sau mốc + đối chiếu</div><div class="hero-bottom"><div><small>Đã dành tiết kiệm</small><strong>${money(b.saved)}</strong></div><div><small>Còn để sinh hoạt</small><strong>${money(b.spendable)}</strong></div><button data-action="reconcile">${icon('swap')}Đối chiếu</button></div></section><section class="savings-hero"><p class="eyebrow">GIEO MỘT CHÚT, GẶT NGÀY MAI</p><h2>Tích lũy cho những<br>điều bạn mong muốn.</h2><p>${s.net > 0 ? `Tháng này thu chi đang dư ${money(s.net)}. Bạn muốn dành lại một chút chứ?` : 'Mỗi khoản để dành đều đưa bạn đến gần mục tiêu hơn.'}</p>${button('Để dành thêm','deposit','plus','btn-secondary')}<div class="growing-art" aria-hidden="true"><span class="stem"></span><span class="leaf"></span><span class="leaf two"></span><span class="leaf three"></span><span class="coin">₫</span></div></section></div>${statsBlock()}<div class="dashboard-grid"><section class="panel"><div class="section-head"><div><h2>Nhịp thu chi</h2><p>6 tháng đến ${periodLabel(ui.period)}</p></div><div class="legend"><span><i></i>Thu nhập</span><span><i class="orange"></i>Chi tiêu</span></div></div>${chart()}<p class="chart-foot">Di chuột hoặc chạm cột để xem giá trị. Dữ liệu chưa rõ Thu/Chi được loại khỏi biểu đồ.</p></section><section class="panel"><div class="section-head"><div><h2>Tiền đi đâu?</h2><p>Chi tiêu theo danh mục · ${periodLabel(ui.period)}</p></div>${icon('leaf')}</div>${categoryBreakdown()}</section></div><div class="section-head"><div><h2>Những điều đang dành dụm</h2><p>Mỗi mục tiêu là một lời hẹn với chính mình.</p></div><button class="text-link" data-tab="goals">Xem tất cả ${icon('chevron')}</button></div><div class="goal-grid home-goals">${ui.data.goals.slice(0,2).map(goalCard).join('')}${goalAdd()}</div><section class="recent"><div class="section-head"><div><h2>Ghi chép gần đây</h2><p>Những khoản trong tháng ${periodLabel(ui.period)}</p></div><button class="text-link" data-tab="ledger">Mở sổ thu chi ${icon('chevron')}</button></div>${entryTable(rows)}</section>`;
}
function chart() {
  const periods = Array.from({length:6},(_,i) => shiftMonth(ui.period,i - 5)), values = periods.map(p => monthStats(ui.data,p)), max = Math.max(1,...values.flatMap(v => [v.income,v.expense]));
  return `<div class="bar-chart" role="img" aria-label="Biểu đồ thu chi 6 tháng">${periods.map((p,i) => `<div class="bar-month ${p === ui.period ? 'current' : ''}"><div class="bar-pair"><span class="bar in" tabindex="0" data-height="${values[i].income / max * 100}" title="${periodLabel(p)} · Thu: ${money(values[i].income)}" aria-label="${periodLabel(p)} Thu ${money(values[i].income)}"></span><span class="bar out" tabindex="0" data-height="${values[i].expense / max * 100}" title="${periodLabel(p)} · Chi: ${money(values[i].expense)}" aria-label="${periodLabel(p)} Chi ${money(values[i].expense)}"></span></div><label>T${Number(p.slice(5))}</label></div>`).join('')}</div>`;
}
function categoryBreakdown() {
  const rows = categoryTotals(ui.data,ui.period), total = rows.reduce((a,b) => a + b.amount,0);
  if (!total) return '<p class="empty-inline">Chưa có khoản chi trong tháng này.</p>';
  const colors = ['#47765a','#d58b59','#668cb1','#a581af','#b4a04c','#4c9b99','#cc7184','#878c69','#936a50','#7e83bd','#a5b66c','#6e8791'];
  let offset = 0;
  const slices = rows.map((c,i) => {
    const share = c.amount / total * 100;
    const slice = `<circle cx="60" cy="60" r="46" fill="none" stroke="${colors[i % colors.length]}" stroke-width="22" pathLength="100" stroke-dasharray="${share} ${100 - share}" stroke-dashoffset="${-offset}" transform="rotate(-90 60 60)"><title>${esc(c.label)}: ${money(c.amount)} · ${num(Math.round(share * 10) / 10)}%</title></circle>`;
    offset += share;return slice;
  }).join('');
  return `<div class="monthly-pie"><div class="pie-visual"><svg viewBox="0 0 120 120" role="img" aria-label="Biểu đồ tròn chi tiêu tháng ${periodLabel(ui.period)} theo danh mục">${slices}</svg><div class="pie-total"><small>Tổng chi</small><strong>${compact(total)}</strong></div></div><p class="pie-period">Tháng ${periodLabel(ui.period)}</p><ul class="pie-legend">${rows.map((c,i) => `<li><i style="background:${colors[i % colors.length]}" aria-hidden="true"></i><span>${esc(c.label)}</span><strong>${money(c.amount)}<small>${num(Math.round(c.amount / total * 1000) / 10)}%</small></strong></li>`).join('')}</ul></div>`;
}
function goalCard(g) {
  const p = goalProgress(ui.data,g);
  return `<article class="goal-card ${g.color}"><div class="goal-top"><span class="round-icon">${icon(g.icon)}</span>${iconButton('Sửa mục tiêu','goal','edit',`data-id="${g.id}"`)}</div><h3>${esc(g.name)}</h3><p class="goal-deadline">${g.deadline ? `Hẹn tháng ${periodLabel(g.deadline)}` : 'Theo nhịp của riêng bạn'}${p.overdue ? ' · Đã qua hạn' : ''}</p><div class="goal-amounts"><strong>${money(p.amount)}</strong><small>/ ${money(g.target)}</small></div><div class="progress" role="progressbar" aria-label="${esc(g.name)}" aria-valuenow="${Math.round(p.percent)}" aria-valuemin="0" aria-valuemax="100"><span data-width="${p.percent}"></span></div><div class="goal-foot"><span>${Math.floor(p.percent)}% hoàn thành</span><span>${p.remaining === 0 ? 'Đã đạt mục tiêu ✨' : p.monthly !== null ? `Cần ${compact(p.monthly)}/tháng` : `Còn ${compact(p.remaining)}`}</span></div>${g.note ? `<p class="form-hint">${esc(g.note)}</p>` : ''}<div class="quick-actions">${button('Thêm tiền','deposit','plus','btn-secondary',`data-id="${g.id}"`)}</div></article>`;
}
function goalAdd() {return `<button class="goal-add" data-action="goal"><span class="round-icon">${icon('plus')}</span><strong>Thêm một điều mong muốn</strong><small>Một mục tiêu nhỏ, một động lực lớn.</small></button>`;}
function entryTable(rows) {
  if (!rows.length) return empty('Trang sổ còn trống.','Thêm một khoản thu chi, hoặc nhập dữ liệu cũ để bắt đầu.','entry','Ghi khoản đầu tiên','book');
  return `<div class="table-wrap entry-table"><table><thead><tr><th>NỘI DUNG</th><th>THỜI GIAN</th><th>PHÂN LOẠI</th><th>SỐ TIỀN</th><th></th></tr></thead><tbody>${rows.map(e => `<tr><td><div class="entry-title"><span class="round-icon">${icon(categoryInfo(e.category)[3])}</span><div><strong>${esc(e.description || categoryInfo(e.category)[1])}</strong><small>${e.scope === 'history' ? 'Lịch sử · Không đổi số dư' : 'Có cập nhật số dư'}${e.recordMode === 'summary' ? ' · Tổng tháng' : ''}</small></div></div></td><td>${e.day ? `${e.day.slice(8)}/${e.day.slice(5,7)}/${e.day.slice(0,4)}` : `${periodLabel(e.period)}<br><span class="muted">Không có ngày</span>`}</td><td><span class="badge ${e.type === 'income' ? 'green' : e.type === 'expense' ? 'orange' : ''}">${types[e.type]}</span><br><small class="muted">${esc(categoryInfo(e.category)[1])}</small></td><td class="amount ${e.type === 'income' ? 'income' : e.type === 'expense' ? 'expense' : 'muted'}">${prefs.hidden ? '' : e.type === 'income' ? '+' : e.type === 'expense' ? '−' : ''}${money(e.amount)}</td><td><div class="table-actions">${iconButton(e.type === 'unknown' ? 'Xác nhận khoản này' : 'Sửa khoản','entry','edit',`data-id="${e.id}"`)}${button('X\u00f3a','delete-entry','trash','btn-delete-entry',`data-id="${e.id}" aria-label="Xóa khoản ${esc(e.description || categoryInfo(e.category)[1])}"`)}</div></td></tr>`).join('')}</tbody></table></div>`;
}
function reportRange() {
  if (ui.reportMode === 'month') return {from:ui.period,to:ui.period,label:`Tháng ${periodLabel(ui.period)}`};
  if (ui.reportMode === 'year') return {from:`${ui.reportYear}-01`,to:ui.reportYear === monthKey().slice(0,4) ? monthKey() : `${ui.reportYear}-12`,label:`Năm ${ui.reportYear}${ui.reportYear === monthKey().slice(0,4) ? ` · đến ${periodLabel(monthKey())}` : ''}`};
  if (ui.reportMode === 'range') return {from:ui.reportFrom,to:ui.reportTo,label:`${periodLabel(ui.reportFrom)} – ${periodLabel(ui.reportTo)}`};
  const periods = ui.data.entries.map(e => e.period).sort();
  return {from:periods[0] || monthKey(),to:periods.at(-1) || monthKey(),label:'Mọi thời gian'};
}
function reportControls() {
  const current = monthKey(), input = (label,id,value,type = 'month',extra = '') => `<label class="field"><span>${label}</span><input id="${id}" type="${type}" value="${esc(value)}" ${extra}></label>`;
  const mode = `<label class="field"><span>Xem theo</span><select id="report-mode">${[['month','Tháng'],['year','Năm'],['range','Khoảng tháng'],['all','Mọi thời gian']].map(([v,l]) => `<option value="${v}" ${ui.reportMode === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
  const controls = ui.reportMode === 'month' ? input('Tháng/năm','report-month',ui.period,'month',`min="1900-01" max="${current}" required`) : ui.reportMode === 'year' ? input('Năm','report-year',ui.reportYear,'number',`min="1900" max="${current.slice(0,4)}" step="1" required`) : ui.reportMode === 'range' ? `${input('Từ tháng','report-from',ui.reportFrom,'month',`min="1900-01" max="${current}" required`)}${input('Đến tháng','report-to',ui.reportTo,'month',`min="1900-01" max="${current}" required`)}` : '';
  return `<section class="panel report-controls" aria-label="Chọn kỳ thống kê">${mode}${controls}<p class="report-period">${esc(reportRange().label)}</p></section>`;
}
function reportsPage() {
  const range = reportRange(), s = rangeStats(ui.data,range.from,range.to,{groupBy:ui.reportGroup});
  const rate = value => value === null ? '—' : `${num(Math.round(value))}%`;
  const grouping = `<label class="report-group">Gộp theo <select id="report-group" aria-label="Gộp thống kê theo"><option value="month" ${ui.reportGroup === 'month' ? 'selected' : ''}>Từng tháng</option><option value="year" ${ui.reportGroup === 'year' ? 'selected' : ''}>Từng năm</option></select></label>`;
  return `${intro('Thống kê thu chi.','Xem lại dữ liệu cũ theo tháng, năm hoặc khoảng thời gian bạn chọn.',button('Nhập dữ liệu cũ','import','upload','btn-secondary'),false)}${reportControls()}${balanceWarnings(s)}${statsBlock(s,range.label)}${ui.reportMode === 'month' ? `<section class="panel monthly-report"><div class="section-head"><div><h2>Chi tiêu theo danh mục</h2><p>Tỷ trọng các khoản chi trong tháng đã chọn</p></div></div>${categoryBreakdown()}</section>` : ''}<section class="report-summary"><div class="section-head"><div><h2>Thu chi theo ${ui.reportGroup === 'year' ? 'năm' : 'tháng'}</h2><p>${esc(range.label)} · ${s.count} khoản ghi chép</p></div>${grouping}</div><p class="form-hint">Bao gồm lịch sử đã nhập và các khoản mới. Khoản cần xác nhận chưa tính vào Thu/Chi. Dư từ thu chi là Thu − Chi; chuyển quỹ tiết kiệm được ghi riêng.</p>${!s.count ? notice('Chưa có dữ liệu trong kỳ này. Chọn kỳ khác hoặc nhập dữ liệu cũ để xem thống kê.') : ''}<div class="table-wrap report-table"><table><thead><tr><th>${ui.reportGroup === 'year' ? 'NĂM' : 'THÁNG'}</th><th>TỔNG THU</th><th>TỔNG CHI</th><th>DƯ THU CHI</th><th>TỶ LỆ DƯ</th><th>GHI CHÉP</th><th></th></tr></thead><tbody>${s.rows.map(row => `<tr><td><strong>${ui.reportGroup === 'year' ? row.period : periodLabel(row.period)}</strong>${ui.reportGroup === 'year' ? `<small class="report-row-note">${periodLabel(row.from)} – ${periodLabel(row.to)}</small>` : ''}</td><td class="amount income">${money(row.income)}</td><td class="amount expense">${money(row.expense)}</td><td class="amount ${row.net < 0 ? 'negative' : ''}">${money(row.net)}</td><td>${rate(row.rate)}</td><td>${row.count ? `${row.count} khoản${row.pending ? `<small class="report-row-note">${row.pending} cần xác nhận</small>` : ''}` : '<span class="muted">Chưa có dữ liệu</span>'}</td><td>${button('Xem khoản','report-detail','chevron','btn-ghost',`data-id="${row.from}_${row.to}"`)}</td></tr>`).join('')}</tbody><tfoot><tr><th>TỔNG CỘNG</th><td class="amount income">${money(s.income)}</td><td class="amount expense">${money(s.expense)}</td><td class="amount ${s.net < 0 ? 'negative' : ''}">${money(s.net)}</td><td>${rate(s.rate)}</td><td>${s.count} khoản</td><td></td></tr></tfoot></table></div></section>`;
}
function filteredEntries() {
  const {from,to} = reportRange();
  return ui.data.entries.filter(e => e.period >= from && e.period <= to && (ui.filter === 'all' || e.type === ui.filter) && (ui.category === 'all' || e.category === ui.category) && (!ui.query || fold(`${e.description} ${categoryInfo(e.category)[1]} ${e.amount}`).includes(fold(ui.query)))).slice().sort((a,b) => (b.day || b.period).localeCompare(a.day || a.period));
}
function ledgerPage() {
  const rows = filteredEntries(), range = reportRange(), s = rangeStats(ui.data,range.from,range.to);
  return `${intro('Một cuốn sổ, thật rõ ràng.','Ghi một chút mỗi ngày, hoặc bắt đầu bằng dữ liệu bạn đã có.',button('Thêm thu chi','entry','plus'),false)}${reportControls()}${balanceWarnings(s)}${statsBlock(s,range.label)}<p class="form-hint">Tổng thu/chi phía trên tính cho toàn bộ kỳ đã chọn. Các bộ lọc bên dưới áp dụng cho danh sách ghi chép.</p><div class="toolbar"><label class="search">${icon('search')}<input id="search" value="${esc(ui.query)}" placeholder="Tìm ghi chú, danh mục, số tiền…" aria-label="Tìm khoản thu chi"></label><select id="category-filter" aria-label="Lọc danh mục"><option value="all">Mọi danh mục</option>${CATEGORIES.map(c => `<option value="${c[0]}" ${ui.category === c[0] ? 'selected' : ''}>${c[1]}</option>`).join('')}</select>${button('Nhập dữ liệu','import','upload','btn-secondary')}${ui.reportMode === 'month' ? button('Chốt tháng','close-month','checklist','btn-secondary') : ''}</div><div class="filter-row">${[['all','Tất cả'],...Object.entries(types)].map(([v,l]) => `<button class="chip ${ui.filter === v ? 'active' : ''}" data-filter="${v}">${l}</button>`).join('')}<span class="result-count" id="result-count">${rows.length} khoản</span></div><div id="ledger-results">${rows.length ? entryTable(rows) : empty('Không có khoản phù hợp.','Chọn kỳ khác hoặc đổi bộ lọc để xem lại dữ liệu cũ.','import','Nhập dữ liệu cũ','book')}</div>`;
}
function savingsPage() {
  const b = balances(ui.data), s = monthStats(ui.data,ui.period);
  return `${intro('Để dành, từng chút một.','Tiền tiết kiệm vẫn nằm trong tổng tiền hiện có.',button('Để dành thêm','deposit','plus'))}${balanceWarnings()}<div class="two-col"><section class="panel"><p class="eyebrow">QUỸ TIẾT KIỆM HIỆN TẠI</p><div class="savings-total">${money(b.saved)}</div><p class="subtitle">Đã dành ${ui.data.settings.openingSavings ? `${money(ui.data.settings.openingSavings)} từ mốc ban đầu` : 'từ mốc ban đầu'} và các lần để dành sau đó.</p><div class="summary-row"><span>Đã phân bổ cho mục tiêu</span><strong>${money(b.allocated)}</strong></div><div class="summary-row"><span>Quỹ chung chưa phân bổ</span><strong>${money(b.unallocated)}</strong></div><div class="summary-row"><span>Còn để sinh hoạt</span><strong>${money(b.spendable)}</strong></div><div class="summary-row"><span>Để dành ròng tháng ${periodLabel(ui.period)}</span><strong>${money(s.saving)}</strong></div><div class="quick-actions">${button('Để dành','deposit','plus')}${button('Rút tiết kiệm','withdraw','arrowUp','btn-secondary')}${button('Phân bổ quỹ','allocate','swap','btn-secondary')}</div><p class="form-hint">Để dành chuyển tiền sinh hoạt sang tiết kiệm. Phân bổ chuyển quỹ chung sang một mục tiêu. Cả hai đều không tạo khoản chi hay tiền mới.</p></section><section class="panel"><div class="section-head"><h2>Tiền đang ở đâu?</h2>${icon('wallet')}</div><div class="fund-row"><div><strong>Quỹ tiết kiệm chung</strong><p>Chưa gắn với một mục tiêu</p></div><span>${money(b.unallocated)}</span></div>${ui.data.goals.map(g => `<div class="fund-row"><div><strong>${esc(g.name)}</strong><p>Mục tiêu ${money(g.target)}</p></div><span>${money(b.funds.get(g.id) || 0)}</span></div>`).join('')}${button('Trả phân bổ về quỹ chung','release','swap','btn-ghost')}</section></div><section class="recent"><div class="section-head"><div><h2>Hành trình để dành</h2><p>Lịch sử chuyển quỹ · Mọi thời gian</p></div></div>${ui.data.moves.length ? `<div class="table-wrap"><table><thead><tr><th>THAO TÁC</th><th>THỜI GIAN</th><th>QUỸ / MỤC TIÊU</th><th>SỐ TIỀN</th></tr></thead><tbody>${ui.data.moves.slice().reverse().map(m => `<tr><td><div class="entry-title"><span class="round-icon">${icon(m.kind === 'deposit' ? 'leaf' : 'swap')}</span><div><strong>${moveNames[m.kind]}</strong><small>${esc(m.note)}</small></div></div></td><td>${new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(m.at))}</td><td>${esc(m.goalName || 'Quỹ chung')}</td><td class="amount">${money(m.amount)}</td></tr>`).join('')}</tbody></table></div>` : empty('Một hành trình mới.','Bắt đầu bằng khoản để dành đầu tiên, dù nhỏ thôi.','deposit','Để dành ngay','leaf')}</section>`;
}
function goalsPage() {
  return `${intro('Những điều bạn mong muốn.','Đặt một đích đến, rồi tiến đến theo nhịp của riêng bạn.',button('Tạo mục tiêu','goal','plus'),false)}${notice('Số tiền của mỗi mục tiêu được phân bổ từ quỹ tiết kiệm. Cùng một khoản tiền sẽ không bị tính cho hai mục tiêu.')}<div class="goal-grid">${ui.data.goals.map(goalCard).join('')}${goalAdd()}</div>`;
}
function importPage() {
  return `${intro('Mang cuốn sổ cũ sang đây.','Không cần đủ ngày, không cần có sẵn danh mục.','',false)}<section class="panel import-card"><div><span class="round-icon">${icon('history')}</span><h2>Chỉ có tháng và năm?<br>Vậy là đủ để bắt đầu.</h2><p>Lũy giữ đúng thời gian bạn có. Những khoản chưa rõ Thu hay Chi sẽ nằm ở mục “Cần xác nhận” đến khi bạn kiểm tra.</p><p>Lịch sử cũ dùng để nhìn lại thu chi, không cộng thêm vào số dư hiện tại.</p><div class="steps"><div><b>1</b>Chọn file dữ liệu</div><div><b>2</b>Ghép cột, xem trước</div><div><b>3</b>Xác nhận và lưu</div></div></div><div class="import-drop">${icon('upload')}<strong>Mở file dữ liệu của bạn</strong><p>CSV UTF-8 hoặc bản sao lưu JSON của Lũy<br>Tối đa 500 dòng CSV / 900 KB mỗi file</p>${button('Chọn file','pick-file','plus')}<a class="text-link" href="/sample-import.csv" download>Tải CSV mẫu ${icon('download')}</a></div></section><input type="file" class="file-input" id="import-file" accept=".csv,.json,text/csv,application/json"><section class="panel mt"><h2>Chọn cách ghi phù hợp</h2><div class="two-col mt"><div><h3>Từng khoản thu chi</h3><p class="subtitle">Một dòng là một lần phát sinh. Bạn có thể bổ sung danh mục, ghi chú và ngày khi biết.</p></div><div><h3>Tổng thu / tổng chi theo tháng</h3><p class="subtitle">Một dòng Thu và một dòng Chi cho mỗi tháng. Chọn “Tổng tháng” khi nhập để tránh trộn với dữ liệu chi tiết cùng kỳ.</p></div></div><p class="form-hint">Excel: lưu file thành CSV UTF-8 trước khi nhập. Số tiền dùng đơn vị đồng; hỗ trợ 1500000 hoặc 1.500.000. Không suy đoán Thu/Chi từ số dương.</p></section>`;
}
function settingsPage() {
  const s = ui.session || {};
  return `${intro('Không gian theo ý bạn.','Giữ cuốn sổ gọn gàng, dễ đọc và luôn có bản sao.','',false)}<div class="two-col"><section class="panel"><div class="settings-group"><h3>Giao diện & riêng tư</h3><p>Chọn một giao diện dễ nhìn và ẩn số tiền khi cần.</p><div class="quick-actions">${button(prefs.theme === 'dark' ? 'Dùng nền sáng' : 'Dùng nền tối','theme',prefs.theme === 'dark' ? 'sun' : 'moon','btn-secondary')}${button(prefs.hidden ? 'Hiện số tiền' : 'Ẩn số tiền','privacy','eye','btn-secondary')}</div></div><div class="settings-group"><h3>Mốc số dư</h3><p>${ui.data.settings ? `Bắt đầu ngày ${esc(ui.data.settings.openingAt)} với tổng tiền ${money(ui.data.settings.openingBalance)}, trong đó tiết kiệm ${money(ui.data.settings.openingSavings)}.` : 'Chưa thiết lập số dư ban đầu.'}</p>${button(ui.data.settings ? 'Đối chiếu số dư hiện tại' : 'Thiết lập số dư',ui.data.settings ? 'reconcile' : 'setup','wallet','btn-secondary')}</div><div class="settings-group"><h3>Lưu trữ & kết nối</h3><p>${isCloud() ? 'Đang dùng Google Sheets. Nhật ký gốc nằm trong tab Events; các tab ThuChi, MucTieu, SoDu, TietKiem là bảng tổng hợp để đọc.' : 'Đang lưu trong trình duyệt này. Dữ liệu trên máy không tự chuyển sang Google Sheets; xuất bản sao lưu rồi nhập lại sau khi kết nối.'}</p><div class="quick-actions">${button('Tải lại dữ liệu','refresh','refresh','btn-secondary')}${isCloud() ? button('Cập nhật bảng tổng hợp','sync','cloud','btn-secondary') : ''}${s.authEnabled ? button('Đăng xuất','logout','logout','btn-ghost') : ''}</div></div></section><section class="panel"><div class="settings-group"><h3>Sao lưu dữ liệu</h3><p>Tải file JSON chứa toàn bộ thu chi, số dư, tiết kiệm và mục tiêu. Cất file ở nơi riêng tư.</p><div class="quick-actions">${button('Tải bản sao lưu','export','download')}${button('Khôi phục từ file','import','upload','btn-secondary')}</div>${ui.localError ? button('Tải dữ liệu gốc trên máy','raw-export','download','btn-secondary') : ''}</div><div class="settings-group"><h3>Chốt tháng</h3><p>Xem lại thu chi, ghi số dư thực tế và một vài điều muốn nhớ. Chốt tháng giữ lại bản tổng kết; bạn vẫn có thể sửa các khoản khi cần.</p>${button('Chốt tháng','close-month','checklist','btn-secondary')}</div>${ui.data.closes.length ? `<div class="settings-group"><h3>Các tháng đã chốt</h3>${ui.data.closes.slice().sort((a,b) => b.period.localeCompare(a.period)).map(c => `<div class="summary-row"><span>${periodLabel(c.period)}${c.note ? ` · ${esc(c.note)}` : ''}</span><strong>${c.actual === null ? 'Không ghi số dư' : money(c.actual)}</strong></div>`).join('')}</div>` : ''}${!isCloud() ? `<div class="settings-group"><h3>Bắt đầu lại trên máy</h3><p>Thay dữ liệu hiện tại bằng một cuốn sổ trống. Bạn sẽ xác nhận trước khi thay.</p>${button('Dùng dữ liệu của tôi','start-own','leaf','btn-danger')}${button('Nạp dữ liệu mẫu','demo-reset','refresh','btn-ghost')}</div>` : ''}</section></div>`;
}

function openModal(title,subtitle,body,onSubmit,{wide = false,submit = 'Lưu thay đổi',danger = '',afterOpen} = {}) {
  const modal = $('#modal');if (modal.open) modal.close();
  ui.modal = {onSubmit,revision:ui.data.revision,requestId:id(),submitting:false};
  modal.className = wide ? 'wide' : '';
  modal.innerHTML = `<form id="modal-form"><div class="modal-head"><div><h2 id="modal-title">${esc(title)}</h2><p>${esc(subtitle)}</p></div>${iconButton('Đóng','close','close')}</div><div class="modal-body">${body}<p class="form-error" role="alert"></p></div><div class="modal-foot">${danger}<div class="right">${button('Để sau','close','','btn-ghost')}<button type="submit" class="btn">${icon('check')}${submit}</button></div></div></form>`;
  modal.showModal();afterOpen?.();
}
async function mutate(type,payload,context = ui.modal) {
  if (ui.localError && type !== 'backup.restore') throw new Error('Dữ liệu trên máy chưa đọc được. Tải dữ liệu gốc và khôi phục bản sao lưu trước.');
  const expectedRevision = context?.revision ?? ui.data.revision, requestId = context?.requestId || id();
  // Validate before sending. Server validates again with its own time and current state.
  applyOperation(ui.data,{id:requestId,at:new Date().toISOString(),type,payload});
  let next;
  if (isCloud()) {
    const result = await api('/api/data','POST',{id:requestId,expectedRevision,type,payload});next = result.state;
    if (result.projectionWarning) toast('Đã lưu dữ liệu gốc. Bảng tổng hợp cần được cập nhật lại trong Cài đặt.',true);
  } else {
    const stored = localStorage.getItem(key);
    if (!ui.localError && stored && JSON.parse(stored).state.revision !== expectedRevision) throw new Error('Dữ liệu đã thay đổi ở tab khác. Tải lại trước khi lưu.');
    next = applyOperation(ui.data,{id:requestId,at:new Date().toISOString(),type,payload});
    localStorage.setItem(key,JSON.stringify(backup(next)));
  }
  ui.data = next;ui.error = '';ui.localError = false;
  $('#modal').close();ui.modal = null;render();toast('Đã lưu vào ' + (isCloud() ? 'Google Sheets.' : 'trình duyệt này.'));
}
function setupModal() {
  openModal('Bắt đầu từ số tiền bạn có.','Mốc này là tổng tiền thực tế, đã bao gồm phần tiết kiệm.',`${field('Tên của bạn','name','Bạn','text','required maxlength="60"')}${field('Tổng tiền hiện có (₫)','openingBalance','','text','required inputmode="numeric" placeholder="Ví dụ: 30,000,000"')}${field('Trong đó, đã dành tiết kiệm (₫)','openingSavings','0','text','required inputmode="numeric"')}${field('Ngày bắt đầu theo dõi','openingAt',dayKey(),'date',`required max="${dayKey()}"`)}${notice('Các khoản lịch sử nhập sau sẽ không tự cộng vào mốc số dư này.')}`,async f => mutate('setup',{name:f.get('name'),openingBalance:parseMoney(f.get('openingBalance')),openingSavings:parseMoney(f.get('openingSavings')),openingAt:f.get('openingAt')}),{submit:'Bắt đầu cuốn sổ'});
}
function entryModal(entryId) {
  const existing = ui.data.entries.find(e => e.id === entryId), e = existing || {id:id(),type:'expense',amount:'',period:ui.period,day:ui.period === monthKey() ? dayKey() : '',category:'unclassified',description:'',scope:ui.data.settings && ui.period === monthKey() ? 'live' : 'history',recordMode:'detail'};
  openModal(existing ? 'Sửa một dòng ghi chép.' : 'Ghi thêm một chút.','Bạn có thể chỉ nhập tháng/năm nếu không nhớ ngày.',`<div class="type-switch">${Object.entries(types).map(([type,label]) => `<button type="button" data-type="${type}" class="${e.type === type ? 'active' : ''}">${label}</button>`).join('')}</div><input type="hidden" name="type" value="${e.type}">${field('Số tiền (₫)','amount',e.amount,'text','required inputmode="numeric" placeholder="0"') }<div class="form-row">${field('Tháng/năm','period',e.period,'month',`required max="${monthKey()}" min="1900-01"`)}${field('Ngày cụ thể','day',e.day,'date',`max="${dayKey()}"`,'Không bắt buộc')}</div><div class="form-row">${select('Danh mục','category',CATEGORIES.filter(c => c[2] === 'other' || c[2] === e.type || e.type === 'unknown').map(c => [c[0],c[1]]),e.category)}${select('Cách ghi','recordMode',[['detail','Từng khoản'],['summary','Tổng tháng']],e.recordMode)}</div>${noteField(e.description,'description','Nội dung / ghi chú')}${check('live','Khoản phát sinh sau mốc số dư — cập nhật tiền hiện có',e.scope === 'live') }<p class="form-hint">Bỏ chọn nếu đây là lịch sử đã nằm trong số dư ban đầu. “Cần xác nhận” không được tính vào Thu/Chi hay số dư.</p>`,async f => mutate('entry.save',{id:e.id,type:f.get('type'),amount:parseMoney(f.get('amount')),period:f.get('period'),day:f.get('day'),category:f.get('category'),description:f.get('description'),scope:f.has('live') ? 'live' : 'history',recordMode:f.get('recordMode')}),{submit:existing ? 'Lưu ghi chép' : 'Thêm vào sổ'});
}
function goalModal(goalId) {
  const g = ui.data.goals.find(g => g.id === goalId) || {id:id(),name:'',target:'',deadline:'',color:'green',icon:'target',note:''}, exists = ui.data.goals.some(v => v.id === g.id);
  openModal(exists ? 'Chăm chút mục tiêu.' : 'Một điều bạn muốn dành dụm.','Mục tiêu có thể lớn hay nhỏ. Quan trọng là của bạn.',`${field('Tên mục tiêu','name',g.name,'text','required maxlength="100" placeholder="Ví dụ: Quỹ dự phòng an tâm"')}${field('Số tiền muốn đạt (₫)','target',g.target,'text','required inputmode="numeric"')}<div class="form-row">${field('Hẹn vào tháng','deadline',g.deadline,'month','','Không bắt buộc')}${select('Màu gợi nhớ','color',[['green','Xanh lá'],['orange','Cam đất'],['blue','Xanh trời'],['purple','Tím nhẹ']],g.color)}</div>${select('Biểu tượng','icon',[['shield','An tâm'],['home','Ngôi nhà'],['plane','Chuyến đi'],['car','Chiếc xe'],['gift','Món quà'],['target','Mục tiêu'],['book','Học tập']],g.icon)}${!exists ? field('Phân bổ từ quỹ chung (₫)','initialAllocation','0','text','inputmode="numeric"',`Đang có ${money(balances(ui.data).unallocated)}`) : ''}${noteField(g.note)}`,async f => mutate('goal.save',{id:g.id,name:f.get('name'),target:parseMoney(f.get('target')),deadline:f.get('deadline'),color:f.get('color'),icon:f.get('icon'),note:f.get('note'),...(!exists ? {initialAllocation:parseMoney(f.get('initialAllocation'))} : {})}),{submit:exists ? 'Lưu mục tiêu' : 'Tạo mục tiêu',danger:exists ? button('Xóa','delete-goal','trash','btn-danger',`data-id="${g.id}"`) : ''});
}
function moveModal(kind = 'deposit',goalId = '') {
  const b = balances(ui.data), options = [...(!['allocate','release'].includes(kind) ? [['','Quỹ tiết kiệm chung']] : []),...ui.data.goals.map(g => [g.id,`${g.name} · ${money(b.funds.get(g.id) || 0)}`])];
  if (!options.length) {toast('Tạo một mục tiêu trước khi phân bổ quỹ nhé.',true);return;}
  const descriptions = {deposit:`Chuyển tiền sinh hoạt sang tiết kiệm. Hiện còn ${money(b.spendable)} để sinh hoạt.`,withdraw:'Chuyển tiền tiết kiệm về phần sinh hoạt. Không làm thay đổi tổng tiền.',allocate:`Chuyển từ quỹ chung sang mục tiêu. Quỹ chung đang có ${money(b.unallocated)}.`,release:'Trả tiền từ mục tiêu về quỹ tiết kiệm chung. Tổng tiết kiệm không đổi.'};
  const moveId = id();
  openModal(`${moveNames[kind]}.`,descriptions[kind],`${field('Số tiền (₫)','amount','','text','required inputmode="numeric" placeholder="0"')}${select(kind === 'deposit' || kind === 'allocate' ? 'Dành cho' : 'Lấy từ','goalId',options,goalId || options[0][0])}${noteField()}${notice('Đây là chuyển quỹ trong số tiền hiện có; không tạo khoản thu hay chi.')}`,async f => mutate('saving.move',{id:moveId,kind,amount:parseMoney(f.get('amount')),goalId:f.get('goalId'),note:f.get('note')}),{submit:moveNames[kind]});
}
function reconcileModal() {
  const b = balances(ui.data);
  openModal('Đối chiếu với thực tế.','Nhập tổng tiền hiện có trên tất cả tài khoản và tiền mặt.',`${notice(`Lũy đang ghi nhận ${money(b.cash)}. Khoản chênh lệch sẽ được ghi riêng, không tính thành thu nhập.`)}${field('Tổng tiền thực tế (₫)','actual',b.cash,'text','required inputmode="numeric"')}${noteField('','note','Lý do đối chiếu',true)}<p class="form-hint" id="reconcile-difference"></p>`,async f => mutate('balance.reconcile',{actual:parseMoney(f.get('actual')),note:f.get('note')}));
}
function closeMonthModal() {
  const s = monthStats(ui.data,ui.period), current = ui.period === monthKey(), closed = ui.data.closes.find(c => c.period === ui.period);
  openModal(`Nhìn lại tháng ${periodLabel(ui.period)}.`,s.pending ? 'Còn khoản cần xác nhận. Xử lý trong Sổ thu chi trước khi chốt.' : 'Ghi lại một tháng đã qua, rồi bắt đầu tháng mới nhẹ nhàng hơn.',`${notice('Nếu tháng đã có giao dịch, tổng thu/chi được lấy từ sổ và không nhập thêm lần nữa. Tháng trống có thể ghi tổng tháng.')}<div class="form-row">${field('Tổng thu (₫)','income',s.income,'text',`required inputmode="numeric" ${ui.data.entries.some(e => e.period === ui.period && e.type === 'income') ? 'readonly' : ''}`)}${field('Tổng chi (₫)','expense',s.expense,'text',`required inputmode="numeric" ${ui.data.entries.some(e => e.period === ui.period && e.type === 'expense') ? 'readonly' : ''}`)}</div>${field('Số dư thực tế cuối tháng (₫)','actual',closed?.actual ?? '','text','inputmode="numeric"','Có thể để trống')}${current ? check('reconcile','Dùng số dư thực tế để đối chiếu số tiền hiện có') : ''}${check('affectBalance','Nếu tạo tổng tháng mới: đây là phát sinh sau mốc, cần cập nhật số dư')}${noteField(closed?.note || '')}`,async f => mutate('month.close',{period:ui.period,income:parseMoney(f.get('income')),expense:parseMoney(f.get('expense')),actual:f.get('actual').trim() ? parseMoney(f.get('actual')) : null,reconcile:f.has('reconcile'),affectBalance:f.has('affectBalance'),note:f.get('note')}),{submit:'Lưu tổng kết tháng'});
}
function confirmModal(title,description,type,payload,submit = 'Xác nhận') {
  openModal(title,'Kiểm tra một lần trước khi tiếp tục.',notice(description),async () => mutate(type,payload),{submit});
}
function download(text,name,type = 'application/json') {const url = URL.createObjectURL(new Blob([text],{type}));const a = document.createElement('a');a.href = url;a.download = name;a.click();setTimeout(() => URL.revokeObjectURL(url),1000);}

let importContext = null;
async function readImport(file) {
  if (!file) return;
  if (file.size > 900000) throw new Error('File quá lớn. Tối đa 900 KB mỗi lần nhập.');
  const text = await file.text();
  if (file.name.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(text), restored = validateBackup(parsed);
    openModal('Khôi phục cuốn sổ.','Bản sao lưu sẽ thay toàn bộ dữ liệu đang có.',`${notice(`File chứa ${restored.entries.length} khoản thu chi, ${restored.goals.length} mục tiêu và ${restored.moves.length} lần chuyển quỹ. Số dư: ${money(balances(restored).cash)}.`)}${check('confirm','Tôi đã sao lưu dữ liệu hiện tại và đồng ý thay bằng file này.',false,'required')}`,async f => mutate('backup.restore',{confirm:f.has('confirm'),backup:parsed}),{submit:'Khôi phục dữ liệu'});return;
  }
  const csv = parseCSV(text), hash = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)), fileKey = [...new Uint8Array(hash)].map(v => v.toString(16).padStart(2,'0')).join('').slice(0,24);
  importContext = {csv,fileKey,preview:null};const mapping = detectMapping(csv.headers);
  const column = Object.entries({period:'Cột kỳ / ngày',month:'Cột tháng',year:'Cột năm',amount:'Cột số tiền',type:'Cột loại Thu/Chi',income:'Cột Thu riêng',expense:'Cột Chi riêng',category:'Cột danh mục',description:'Cột ghi chú'}).map(([name,label]) => select(label,`map-${name}`,[['-1','Không có'],...csv.headers.map((h,i) => [String(i),h])],mapping[name])).join('');
  openModal('Đưa dữ liệu cũ vào Lũy.',`${file.name} · ${csv.rows.length} dòng. Ghép cột rồi xem trước trước khi lưu.`,`${notice('Tất cả khoản nhập được lưu dạng lịch sử, không thay đổi số dư hiện tại.')}<div class="form-row">${select('Bố cục file','layout',[['rows','Một cột số tiền'],['split','Hai cột Thu và Chi riêng']],Number(mapping.income) >= 0 && Number(mapping.expense) >= 0 ? 'split' : 'rows')}${select('Mỗi dòng là','recordMode',[['detail','Một khoản thu chi'],['summary','Tổng tháng']], 'detail')}</div><div class="mapping-grid">${column}</div>${select('Khi không xác định được Thu/Chi','fallbackType',[['unknown','Để Cần xác nhận'],['income','Tất cả là Thu'],['expense','Tất cả là Chi']],'unknown')}${check('signConvention','File dùng số âm = Chi, số dương = Thu (chỉ suy đoán khi thiếu loại)')}${check('skipSimilar','Bỏ các khoản giống nội dung, tháng, loại và số tiền đã có')}${check('skipErrors','Cho phép bỏ qua các dòng lỗi; chỉ nhập dòng hợp lệ')}<div id="import-results"></div>`,async f => {
    const preview = updateImportPreview();
    if (preview.errors.length && !f.has('skipErrors')) throw new Error('Sửa dòng lỗi hoặc xác nhận bỏ qua các dòng lỗi trước khi nhập.');
    if (!preview.entries.length) throw new Error('Không còn khoản hợp lệ để nhập.');
    await mutate('entries.import',{entries:preview.entries});
  },{wide:true,submit:'Nhập vào sổ',afterOpen:updateImportPreview});
}
function updateImportPreview() {
  if (!importContext || !$('#import-results')) return null;
  const f = new FormData($('#modal-form')), mapping = Object.fromEntries([...f].filter(([k]) => k.startsWith('map-')).map(([k,v]) => [k.slice(4),v]));
  const preview = importPreview(importContext.csv,mapping,{layout:f.get('layout'),recordMode:f.get('recordMode'),fallbackType:f.get('fallbackType'),signConvention:f.has('signConvention'),skipSimilar:f.has('skipSimilar'),fileKey:importContext.fileKey,existing:ui.data.entries});
  importContext.preview = preview;
  $('#import-results').innerHTML = `<div class="import-summary"><span class="badge green">${preview.entries.length} khoản sẽ nhập</span><span class="badge">${preview.pending} cần xác nhận</span><span class="badge">${preview.duplicates} trùng file đã bỏ</span><span class="badge orange">${preview.similar} khoản giống nội dung${f.has('skipSimilar') ? ' đã bỏ' : ' vẫn giữ'}</span></div>${preview.errors.length ? `<div class="import-errors">${preview.errors.map(e => `<div>Dòng ${e.line}: ${esc(e.message)}</div>`).join('')}</div>` : ''}${preview.warnings.map(w => `<p class="form-hint">${esc(w)}</p>`).join('')}<div class="import-preview"><table><thead><tr><th>THÁNG / NGÀY</th><th>LOẠI</th><th>SỐ TIỀN</th><th>GHI CHÚ</th></tr></thead><tbody>${preview.entries.slice(0,80).map(e => `<tr><td>${e.day || periodLabel(e.period)}</td><td>${types[e.type]}</td><td>${money(e.amount)}</td><td>${esc(e.description || categoryInfo(e.category)[1])}</td></tr>`).join('')}</tbody></table></div>${preview.entries.length > 80 ? '<p class="form-hint">Hiển thị 80 khoản đầu để xem trước; tất cả khoản hợp lệ sẽ được nhập.</p>' : ''}`;
  return preview;
}

async function refresh() {
  if (ui.loading) return;ui.loading = true;
  try {ui.data = isCloud() ? (await api('/api/data')).state : loadLocal();ui.error = '';ui.localError = false;render();toast('Đã tải dữ liệu mới nhất.');}finally {ui.loading = false;}
}
const actions = {
  'money-suggestion'(amount,name) {
    const input = $(`#modal [data-money-input][name="${name}"]`);
    if (!input || input.readOnly || input.disabled || ui.modal?.submitting) return;
    input.value = formatMoneyInput(amount);input.focus();input.setSelectionRange(input.value.length,input.value.length);
    input.dispatchEvent(new Event('input',{bubbles:true}));
  },
  menu() {$('.sidebar')?.classList.toggle('open');$('.mobile-overlay')?.classList.toggle('open');},
  close() {if (!ui.modal?.submitting) {$('#modal').close();ui.modal = null;}},
  theme() {prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark';document.documentElement.dataset.theme = prefs.theme;localStorage.setItem(prefKey,JSON.stringify(prefs));render();},
  privacy() {prefs.hidden = !prefs.hidden;localStorage.setItem(prefKey,JSON.stringify(prefs));render();},
  reload() {location.reload();},refresh,
  setup:setupModal,entry:entryModal,goal:goalModal,deposit:goalId => moveModal('deposit',goalId),withdraw:() => moveModal('withdraw'),allocate:() => moveModal('allocate'),release:() => moveModal('release'),reconcile:reconcileModal,'close-month':closeMonthModal,
  import() {ui.tab = 'import';render();},
  'pick-file'() {$('#import-file').click();},
  'report-detail'(periods) {
    const [from,to] = periods.split('_');
    if (!validPeriod(from) || !validPeriod(to) || from > to) return;
    if (from === to) {ui.reportMode = 'month';ui.period = from;}
    else {ui.reportMode = 'range';ui.reportFrom = from;ui.reportTo = to > monthKey() ? monthKey() : to;}
    ui.tab = 'ledger';ui.filter = 'all';ui.category = 'all';ui.query = '';render();window.scrollTo({top:0});
  },
  pending() {if (!['ledger','reports'].includes(ui.tab)) ui.reportMode = 'month';ui.tab = 'ledger';ui.filter = 'unknown';ui.category = 'all';ui.query = '';render();},
  'delete-entry'(entryId) {const e = ui.data.entries.find(e => e.id === entryId);if (e) confirmModal('Xóa dòng ghi chép này?',`Khoản ${types[e.type]} ${money(e.amount)} sẽ được xóa khỏi sổ.${e.scope === 'live' ? ' Số dư sẽ được tính lại.' : ''}`,'entry.delete',{id:entryId},'Xóa khoản');},
  'delete-goal'(goalId) {const g = ui.data.goals.find(g => g.id === goalId);if (g) confirmModal(`Xóa mục tiêu “${g.name}”?`,'Toàn bộ tiền đã phân bổ cho mục tiêu sẽ trả về quỹ tiết kiệm chung. Tổng tiền và tổng tiết kiệm không đổi.','goal.delete',{id:goalId},'Xóa mục tiêu');},
  export() {download(JSON.stringify(backup(ui.data),null,2),`luy-backup-${dayKey()}.json`);},
  'raw-export'() {download(localStorage.getItem(key) || '',`luy-raw-${dayKey()}.json`);},
  'start-own'() {confirmModal('Bắt đầu cuốn sổ của bạn?','Dữ liệu hiện tại trên máy sẽ được thay bằng cuốn sổ trống. Tải bản sao lưu trước nếu có thông tin muốn giữ.','backup.restore',{confirm:true,backup:backup(emptyState())},'Tạo sổ trống');},
  'demo-reset'() {confirmModal('Khám phá lại dữ liệu mẫu?','Dữ liệu hiện tại trên máy sẽ được thay bằng bộ dữ liệu mẫu. Hãy sao lưu trước khi tiếp tục.','backup.restore',{confirm:true,backup:backup(seedState())},'Nạp dữ liệu mẫu');},
  async sync() {if (ui.loading) return;ui.loading = true;try {ui.data = (await api('/api/data','POST',{action:'sync'})).state;render();toast('Đã cập nhật các bảng tổng hợp trong Sheet.');}finally {ui.loading = false;}},
  async logout() {await api('/api/session','DELETE',{});location.reload();},
};
document.addEventListener('click',async event => {
  const node = event.target.closest('[data-tab],[data-action],[data-filter],[data-type]');if (!node || node.disabled) return;
  try {
    if (node.dataset.tab) {if (ui.tab === 'overview' && node.dataset.tab === 'ledger') ui.reportMode = 'month';ui.tab = node.dataset.tab;render();window.scrollTo({top:0});}
    else if (node.dataset.filter) {ui.filter = node.dataset.filter;render();}
    else if (node.dataset.type) {
      const type = node.dataset.type;$('#modal [name="type"]').value = type;
      $$('#modal [data-type]').forEach(n => n.classList.toggle('active',n.dataset.type === type));
      const category = $('#modal [name="category"]');category.innerHTML = CATEGORIES.filter(c => c[2] === 'other' || c[2] === type || type === 'unknown').map(c => `<option value="${c[0]}">${c[1]}</option>`).join('');
      const live = $('#modal [name="live"]');if (type === 'unknown') live.checked = false;
    } else {await actions[node.dataset.action]?.(node.dataset.id || '',node.dataset.field);}
  } catch (e) {toast(e.message,true);}
});
document.addEventListener('submit',async event => {
  event.preventDefault();const form = event.target;
  if (form.id === 'login-form') {
    const submit = $('button[type="submit"]',form);submit.disabled = true;
    try {await api('/api/session','POST',{password:new FormData(form).get('password')});ui.error = '';await boot();}catch (e) {$('.form-error',form).textContent = e.message;}finally {submit.disabled = false;}return;
  }
  if (form.id !== 'modal-form' || !ui.modal || ui.modal.submitting) return;
  const context = ui.modal;context.submitting = true;const submit = $('button[type="submit"]',form);submit.disabled = true;$('.form-error',form).textContent = '';
  try {await context.onSubmit(new FormData(form));}catch (e) {$('.form-error',form).textContent = e.message;toast(e.message,true);}finally {context.submitting = false;submit.disabled = false;}
});
document.addEventListener('change',async event => {
  const node = event.target;
  try {
    if (node.id === 'period' || node.id === 'report-month') {
      if (!validPeriod(node.value) || node.value > monthKey()) {render();throw new Error('Chọn tháng hợp lệ, không ở tương lai.');}
      ui.period = node.value;render();
    }
    else if (node.id === 'report-mode') {if (['month','year','range','all'].includes(node.value)) {ui.reportMode = node.value;render();}}
    else if (node.id === 'report-group') {if (['month','year'].includes(node.value)) {ui.reportGroup = node.value;render();}}
    else if (node.id === 'report-year') {
      if (!/^\d{4}$/.test(node.value) || Number(node.value) < 1900 || Number(node.value) > Number(monthKey().slice(0,4))) {render();throw new Error('Chọn năm từ 1900 đến năm hiện tại.');}
      ui.reportYear = node.value;render();
    }
    else if (node.id === 'report-from' || node.id === 'report-to') {
      const from = node.id === 'report-from' ? node.value : ui.reportFrom, to = node.id === 'report-to' ? node.value : ui.reportTo;
      if (!validPeriod(from) || !validPeriod(to) || from > to || to > monthKey()) {render();throw new Error('Chọn khoảng tháng hợp lệ: tháng bắt đầu không sau tháng kết thúc, không ở tương lai.');}
      ui.reportFrom = from;ui.reportTo = to;render();
    }
    else if (node.id === 'category-filter') {ui.category = node.value;render();}
    else if (node.id === 'import-file') {await readImport(node.files[0]);node.value = '';}
    else if (node.closest('#modal-form') && $('#import-results')) updateImportPreview();
    else if (node.name === 'period' && node.closest('#modal')) {const day = $('#modal [name="day"]');if (day?.value && !day.value.startsWith(node.value)) day.value = '';}
  } catch (e) {toast(e.message,true);}
});
document.addEventListener('beforeinput',event => {
  const node = event.target;
  if (!node.matches?.('[data-money-input]') || node.selectionStart !== node.selectionEnd) return;
  const cursor = node.selectionStart;
  // Delete the neighbouring digit with its separator in a single keystroke.
  if (event.inputType === 'deleteContentBackward' && node.value[cursor - 1] === ',') node.setSelectionRange(cursor - 2,cursor);
  if (event.inputType === 'deleteContentForward' && node.value[cursor] === ',') node.setSelectionRange(cursor,cursor + 2);
});
document.addEventListener('input',event => {
  const node = event.target;
  if (event.isComposing) return;
  if (node.matches?.('[data-money-input]')) {
    updateMoneyInput(node);
    const suggestions = $(`#modal [data-money-suggestions="${node.name}"]`);
    if (suggestions) {suggestions.innerHTML = moneySuggestionButtons(node.name,node.value);suggestions.parentElement.hidden = !suggestions.innerHTML;}
  }
  if (node.id === 'search') {ui.query = node.value;const rows = filteredEntries();$('#ledger-results').innerHTML = entryTable(rows);$('#result-count').textContent = `${rows.length} khoản`;}
  if (node.name === 'actual' && $('#reconcile-difference')) {try {const diff = parseMoney(node.value) - balances(ui.data).cash;$('#reconcile-difference').textContent = `Chênh lệch: ${diff > 0 ? '+' : ''}${money(diff)}. Sẽ ghi riêng vào lịch sử đối chiếu.`;}catch {$('#reconcile-difference').textContent = '';}}
});
$('#modal').addEventListener('cancel',event => {if (ui.modal?.submitting) event.preventDefault();else ui.modal = null;});
window.addEventListener('storage',event => {if (event.key === key && !isCloud()) toast('Sổ vừa thay đổi ở tab khác. Tải lại dữ liệu trước khi lưu tiếp.',true);});
boot();
