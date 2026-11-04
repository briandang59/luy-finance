export const MAX_MONEY = 10000000000000;
export const CATEGORIES = [
  ['unclassified','Chưa phân loại','other','more'],['salary','Lương','income','briefcase'],['bonus','Thưởng','income','gift'],['income-other','Thu khác','income','arrowDown'],
  ['food','Ăn uống','expense','coffee'],['home','Nhà ở','expense','home'],['transport','Đi lại','expense','car'],['shopping','Mua sắm','expense','bag'],
  ['learning','Học tập','expense','book'],['health','Sức khỏe','expense','heart'],['fun','Giải trí','expense','sparkles'],['family','Gia đình','expense','users'],
  ['bills','Hóa đơn','expense','bolt'],['expense-other','Chi khác','expense','more'],
];
export const categoryInfo = id => CATEGORIES.find(c => c[0] === id) || CATEGORIES[0];
export class ModelError extends Error {}
const check = (value,message) => { if (!value) throw new ModelError(message); };
export const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
export function integer(value,{positive = false,signed = false,label = 'Số tiền'} = {}) {
  check(Number.isSafeInteger(value) && Math.abs(value) <= MAX_MONEY && (signed || value >= 0) && (!positive || value > 0),`${label} phải là số nguyên đồng hợp lệ${positive ? ', lớn hơn 0' : ''}.`);
  return value;
}
export function parseMoney(input,{signed = false} = {}) {
  if (typeof input === 'number') return integer(input,{signed});
  let text = String(input ?? '').trim().replace(/(?:vnd|vnđ|đ|₫|\s)/gi,'');
  check(text.length > 0,'Bạn chưa nhập số tiền.');
  let sign = 1;
  if (text.startsWith('-')) { sign = -1; text = text.slice(1); }
  if (/^\d{1,3}(?:\.\d{3})+$/.test(text) || /^\d{1,3}(?:,\d{3})+$/.test(text)) text = text.replace(/[.,]/g,'');
  check(/^\d+$/.test(text),'Nhập số nguyên đồng, ví dụ 1500000 hoặc 1.500.000.');
  return integer(sign * Number(text),{signed});
}
export function dayKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));
  const get = type => parts.find(p => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export const monthKey = (now = new Date()) => dayKey(now).slice(0,7);
export function validPeriod(value) { return typeof value === 'string' && /^(?:19|20|21|22)\d{2}-(?:0[1-9]|1[0-2])$/.test(value); }
export function validDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !validPeriod(value.slice(0,7))) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === value;
}
export function shiftMonth(period,count) {
  check(validPeriod(period),'Tháng/năm không hợp lệ.');
  const [y,m] = period.split('-').map(Number), date = new Date(Date.UTC(y,m - 1 + count,1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2,'0')}`;
}
export const periodLabel = period => validPeriod(period) ? `${period.slice(5)}/${period.slice(0,4)}` : '—';
function text(value,max,label,required = false) {
  const v = value ?? '';
  check(typeof v === 'string' && v.length <= max && (!required || v.trim()),`${label} không hợp lệ (tối đa ${max} ký tự).`);
  return v.trim();
}
function sum(items) {
  const value = items.reduce((a,b) => a + b,0);
  check(Number.isSafeInteger(value),'Tổng số tiền vượt giới hạn tính toán an toàn.');
  return value;
}
export function emptyState() { return {version:1,revision:0,settings:null,entries:[],goals:[],moves:[],adjustments:[],closes:[]}; }
export function balances(state) {
  const live = state.entries.filter(e => e.scope === 'live');
  const cash = sum([state.settings?.openingBalance || 0,...live.map(e => e.type === 'income' ? e.amount : e.type === 'expense' ? -e.amount : 0),...state.adjustments.map(a => a.delta)]);
  const saved = sum([state.settings?.openingSavings || 0,...state.moves.map(m => m.kind === 'deposit' ? m.amount : m.kind === 'withdraw' ? -m.amount : 0)]);
  const funds = new Map();
  for (const m of state.moves) if (m.goalId) funds.set(m.goalId,sum([funds.get(m.goalId) || 0,(m.kind === 'deposit' || m.kind === 'allocate') ? m.amount : -m.amount]));
  const allocated = sum([...funds.values()]);
  return {cash,saved,allocated,unallocated:saved - allocated,spendable:cash - saved,shortfall:Math.max(0,saved - cash),funds};
}
function checkFunds(state) {
  const b = balances(state);
  check(b.saved >= 0 && b.unallocated >= 0 && [...b.funds.values()].every(v => v >= 0),'Thao tác làm âm quỹ tiết kiệm hoặc phần tiền đã phân bổ. Điều chỉnh/rút phân bổ liên quan trước.');
  for (const [id,amount] of b.funds) check(amount === 0 || state.goals.some(g => g.id === id),'Tiền đang được phân bổ vào mục tiêu không tồn tại.');
}
export function validateEntry(input,state,{today = dayKey(),historyOnly = false} = {}) {
  check(input && validId(input.id),'ID khoản thu chi không hợp lệ.');
  check(['income','expense','unknown'].includes(input.type),'Chọn Thu, Chi hoặc Cần xác nhận.');
  const period = text(input.period,7,'Tháng/năm',true);
  check(validPeriod(period) && period <= today.slice(0,7),'Tháng/năm phải hợp lệ và không ở tương lai.');
  const day = text(input.day,10,'Ngày');
  check(!day || (validDay(day) && day.slice(0,7) === period && day <= today),'Ngày phải thuộc đúng tháng và không ở tương lai.');
  check(['detail','summary'].includes(input.recordMode),'Chọn từng khoản hoặc tổng kết tháng.');
  let scope = historyOnly ? 'history' : input.scope;
  check(['history','live'].includes(scope),'Phạm vi số dư không hợp lệ.');
  if (input.type === 'unknown') scope = 'history';
  if (scope === 'live') {
    check(state.settings,'Thiết lập số dư ban đầu trước khi ghi nhận khoản làm thay đổi số dư.');
    check(period >= state.settings.openingAt.slice(0,7) && (!day || day >= state.settings.openingAt),'Khoản trước mốc số dư chỉ được lưu vào lịch sử.');
  }
  check(CATEGORIES.some(c => c[0] === input.category),'Danh mục không hợp lệ.');
  const info = categoryInfo(input.category);
  check(info[2] === 'other' || input.type === 'unknown' || info[2] === input.type,'Danh mục không phù hợp với loại Thu/Chi.');
  if (input.type !== 'unknown') {
    const other = state.entries.filter(e => e.id !== input.id && e.period === period && e.type === input.type);
    check(!other.some(e => e.recordMode === 'summary' || input.recordMode === 'summary'),`Tháng ${periodLabel(period)} đã có ${input.type === 'income' ? 'khoản thu' : 'khoản chi'}. Không trộn tổng tháng với từng khoản hoặc nhập hai tổng cho cùng tháng.`);
  }
  return {id:input.id,type:input.type,amount:integer(input.amount,{positive:true}),period,day,category:input.category,description:text(input.description,1000,'Ghi chú'),scope,recordMode:input.recordMode};
}
function validateGoal(input) {
  check(input && validId(input.id),'ID mục tiêu không hợp lệ.');
  const deadline = text(input.deadline,7,'Thời hạn');
  check(!deadline || validPeriod(deadline),'Thời hạn phải có dạng tháng/năm.');
  const color = ['green','orange','blue','purple'].includes(input.color) ? input.color : 'green';
  const icon = ['shield','home','plane','car','gift','target','book'].includes(input.icon) ? input.icon : 'target';
  return {id:input.id,name:text(input.name,100,'Tên mục tiêu',true),target:integer(input.target,{positive:true}),deadline,color,icon,note:text(input.note,1000,'Ghi chú')};
}
function move(state,input,event) {
  check(state.settings,'Thiết lập số dư ban đầu trước.');
  check(input && validId(input.id) && !state.moves.some(m => m.id === input.id),'ID khoản tiết kiệm không hợp lệ hoặc đã tồn tại.');
  check(['deposit','withdraw','allocate','release'].includes(input.kind),'Loại chuyển quỹ không hợp lệ.');
  const amount = integer(input.amount,{positive:true}), goalId = input.goalId || '';
  check(!goalId || state.goals.some(g => g.id === goalId),'Mục tiêu không tồn tại.');
  const b = balances(state);
  if (input.kind === 'deposit') check(amount <= b.spendable,'Tiền sinh hoạt hiện có không đủ để dành khoản này.');
  if (input.kind === 'allocate') check(goalId && amount <= b.unallocated,'Quỹ chung chưa đủ để phân bổ khoản này.');
  if (input.kind === 'release') check(goalId && amount <= (b.funds.get(goalId) || 0),'Số tiền trả về vượt phần đã phân bổ cho mục tiêu.');
  if (input.kind === 'withdraw') check(amount <= (goalId ? b.funds.get(goalId) || 0 : b.unallocated),'Quỹ được chọn không đủ để rút.');
  state.moves.push({id:input.id,kind:input.kind,amount,goalId,goalName:state.goals.find(g => g.id === goalId)?.name || '',at:event.at,note:text(input.note,1000,'Ghi chú')});
}
export function monthStats(state,period) {
  const entries = state.entries.filter(e => e.period === period);
  const income = sum(entries.filter(e => e.type === 'income').map(e => e.amount));
  const expense = sum(entries.filter(e => e.type === 'expense').map(e => e.amount));
  const saving = sum(state.moves.filter(m => monthKey(m.at) === period).map(m => m.kind === 'deposit' ? m.amount : m.kind === 'withdraw' ? -m.amount : 0));
  return {income,expense,net:income - expense,saving,pending:entries.filter(e => e.type === 'unknown').length,unclassified:entries.filter(e => e.category === 'unclassified').length,count:entries.length,rate:income > 0 ? (income - expense) / income * 100 : null};
}
export function goalProgress(state,goal,period = monthKey()) {
  const amount = balances(state).funds.get(goal.id) || 0, remaining = Math.max(0,goal.target - amount);
  const months = goal.deadline ? (Number(goal.deadline.slice(0,4)) - Number(period.slice(0,4))) * 12 + Number(goal.deadline.slice(5)) - Number(period.slice(5)) + 1 : null;
  return {amount,remaining,percent:Math.min(100,amount / goal.target * 100),months,monthly:months !== null && months > 0 ? Math.ceil(remaining / months) : remaining === 0 ? 0 : null,overdue:remaining > 0 && months !== null && months <= 0};
}
export function applyOperation(previous,event) {
  check(event && validId(event.id) && typeof event.at === 'string' && Number.isFinite(Date.parse(event.at)),'Sự kiện không hợp lệ.');
  const state = structuredClone(previous), input = event.payload, today = dayKey(event.at);
  check(input && typeof input === 'object' && !Array.isArray(input),'Dữ liệu thao tác không hợp lệ.');
  if (event.type === 'setup') {
    check(!state.settings,'Đã có mốc số dư. Dùng Đối chiếu số dư để cập nhật.');
    check(validDay(input.openingAt) && input.openingAt <= today,'Ngày bắt đầu không hợp lệ.');
    const openingBalance = integer(input.openingBalance), openingSavings = integer(input.openingSavings);
    check(openingSavings <= openingBalance,'Tiền tiết kiệm ban đầu không được lớn hơn tổng tiền hiện có.');
    state.settings = {openingBalance,openingSavings,openingAt:input.openingAt,name:text(input.name || 'Bạn',60,'Tên hiển thị',true)};
  } else if (event.type === 'entry.save') {
    const entry = validateEntry(input,state,{today}), exists = state.entries.find(e => e.id === entry.id);
    if (exists) state.entries = state.entries.map(e => e.id === entry.id ? entry : e);
    else {check(state.entries.length < 10000,'Đạt giới hạn 10.000 khoản.'); state.entries.push(entry);}
  } else if (event.type === 'entry.delete') {
    check(state.entries.some(e => e.id === input.id),'Không tìm thấy khoản thu chi.');
    state.entries = state.entries.filter(e => e.id !== input.id);
  } else if (event.type === 'goal.save') {
    const goal = validateGoal(input), exists = state.goals.some(g => g.id === goal.id);
    if (exists) state.goals = state.goals.map(g => g.id === goal.id ? goal : g);
    else {
      check(state.goals.length < 100,'Tối đa 100 mục tiêu.'); state.goals.push(goal);
      if (input.initialAllocation) move(state,{id:`${event.id}-allocation`,kind:'allocate',amount:input.initialAllocation,goalId:goal.id,note:'Phân bổ ban đầu từ quỹ tiết kiệm chung.'},event);
    }
  } else if (event.type === 'goal.delete') {
    check(state.goals.some(g => g.id === input.id),'Không tìm thấy mục tiêu.');
    const funded = balances(state).funds.get(input.id) || 0;
    if (funded) move(state,{id:`${event.id}-release`,kind:'release',amount:funded,goalId:input.id,note:'Trả về quỹ chung khi xóa mục tiêu.'},event);
    state.goals = state.goals.filter(g => g.id !== input.id);
  } else if (event.type === 'saving.move') move(state,input,event);
  else if (event.type === 'saving.delete') {
    check(state.moves.some(m => m.id === input.id),'Không tìm thấy lần chuyển quỹ.');
    state.moves = state.moves.filter(m => m.id !== input.id);
  } else if (event.type === 'balance.reconcile') {
    check(state.settings,'Thiết lập số dư trước.');
    const actual = integer(input.actual), note = text(input.note,1000,'Lý do đối chiếu',true);
    state.adjustments.push({id:event.id,at:event.at,actual,delta:integer(actual - balances(state).cash,{signed:true}),note});
  } else if (event.type === 'month.close') {
    check(validPeriod(input.period) && input.period <= today.slice(0,7),'Tháng chốt không hợp lệ.');
    check(!monthStats(state,input.period).pending,'Còn khoản chưa xác nhận Thu/Chi. Xử lý trước khi chốt tháng.');
    for (const type of ['income','expense']) {
      const total = integer(input[type],{label:type === 'income' ? 'Tổng thu' : 'Tổng chi'});
      const existing = state.entries.filter(e => e.period === input.period && e.type === type);
      if (!existing.length && total > 0) state.entries.push(validateEntry({id:`${event.id}-${type}`,type,amount:total,period:input.period,day:'',category:'unclassified',description:'Tổng kết tháng',scope:input.affectBalance ? 'live' : 'history',recordMode:'summary'},state,{today}));
      else check(total === sum(existing.map(e => e.amount)),'Tháng đã có phát sinh. Sửa các khoản trong Sổ thu chi thay vì nhập tổng lần nữa.');
    }
    const actual = input.actual === null || input.actual === undefined ? null : integer(input.actual);
    if (input.reconcile) {
      check(input.period === today.slice(0,7) && actual !== null && state.settings,'Chỉ đối chiếu số dư hiện tại khi chốt tháng hiện tại và đã có mốc số dư.');
      state.adjustments.push({id:event.id,at:event.at,actual,delta:integer(actual - balances(state).cash,{signed:true}),note:'Đối chiếu khi chốt tháng.'});
    }
    const closed = {period:input.period,actual,note:text(input.note,1000,'Ghi chú'),at:event.at};
    state.closes = [...state.closes.filter(c => c.period !== input.period),closed];
  } else if (event.type === 'entries.import') {
    check(Array.isArray(input.entries) && input.entries.length <= 1000,'Mỗi lần nhập tối đa 1.000 khoản.');
    const ids = new Set(state.entries.map(e => e.id));
    for (const row of input.entries) {
      if (ids.has(row.id)) continue;
      const entry = validateEntry(row,state,{today,historyOnly:true});
      state.entries.push(entry); ids.add(entry.id);
    }
    check(state.entries.length <= 10000,'Tối đa 10.000 khoản trong ứng dụng cá nhân.');
  } else if (event.type === 'backup.restore') {
    check(input.confirm === true,'Xác nhận thay dữ liệu bằng bản sao lưu trước.');
    const restored = validateBackup(input.backup,{today});
    Object.assign(state,restored);
  } else throw new ModelError('Thao tác không được hỗ trợ.');
  checkFunds(state);
  state.revision = previous.revision + 1;
  return state;
}
export function validateBackup(backup,{today = dayKey()} = {}) {
  check(backup?.app === 'luy-finance' && backup.version === 1 && backup.state,'File sao lưu không phải của Lũy hoặc khác phiên bản.');
  const raw = backup.state, state = emptyState();
  for (const field of ['entries','goals','moves','adjustments','closes']) check(Array.isArray(raw[field]) && raw[field].length <= (field === 'goals' ? 100 : 10000),'Dữ liệu sao lưu không hợp lệ hoặc quá lớn.');
  if (raw.settings) {
    check(validDay(raw.settings.openingAt) && raw.settings.openingAt <= today,'Mốc số dư không hợp lệ.');
    const openingBalance = integer(raw.settings.openingBalance), openingSavings = integer(raw.settings.openingSavings);
    check(openingSavings <= openingBalance,'Quỹ tiết kiệm ban đầu không hợp lệ.');
    state.settings = {openingBalance,openingSavings,openingAt:raw.settings.openingAt,name:text(raw.settings.name,60,'Tên',true)};
  }
  const unique = list => {const ids = new Set(); for (const row of list) {check(validId(row.id) && !ids.has(row.id),'ID trùng hoặc không hợp lệ trong file.'); ids.add(row.id);}};
  for (const field of ['entries','goals','moves','adjustments']) unique(raw[field]);
  for (const e of raw.entries) state.entries.push(validateEntry(e,state,{today}));
  state.goals = raw.goals.map(validateGoal);
  state.moves = raw.moves.map(m => {
    check(['deposit','withdraw','allocate','release'].includes(m.kind) && Number.isFinite(Date.parse(m.at)),'Lịch sử tiết kiệm không hợp lệ.');
    check(!m.goalId || validId(m.goalId),'Mục tiêu trong lịch sử không hợp lệ.');
    check(!['allocate','release'].includes(m.kind) || m.goalId,'Phân bổ hoặc trả quỹ phải gắn với mục tiêu.');
    return {id:m.id,kind:m.kind,amount:integer(m.amount,{positive:true}),goalId:m.goalId || '',goalName:text(m.goalName,100,'Tên mục tiêu'),at:m.at,note:text(m.note,1000,'Ghi chú')};
  });
  state.adjustments = raw.adjustments.map(a => {check(Number.isFinite(Date.parse(a.at)),'Ngày đối chiếu không hợp lệ.'); return {id:a.id,at:a.at,actual:integer(a.actual),delta:integer(a.delta,{signed:true}),note:text(a.note,1000,'Ghi chú',true)};});
  check(new Set(raw.closes.map(c => c.period)).size === raw.closes.length,'Tháng chốt bị trùng.');
  state.closes = raw.closes.map(c => {check(validPeriod(c.period) && c.period <= today.slice(0,7) && Number.isFinite(Date.parse(c.at)),'Tháng chốt không hợp lệ.');return {period:c.period,actual:c.actual === null ? null : integer(c.actual),at:c.at,note:text(c.note,1000,'Ghi chú')};});
  check(state.settings || (!state.moves.length && !state.adjustments.length),'Lịch sử quỹ cần có mốc số dư.');
  checkFunds(state);
  return state;
}
export function replayEvents(events) {
  let state = emptyState();
  const seen = new Map(), applied = new Set(), conflicts = [];
  for (const event of events) {
    const signature = JSON.stringify([event.type,event.at,event.baseRevision,event.payload]);
    if (seen.has(event.id)) {check(seen.get(event.id) === signature,'ID sự kiện bị lặp với nội dung khác.'); continue;}
    seen.set(event.id,signature);
    check(Number.isSafeInteger(event.baseRevision) && event.baseRevision >= 0,'Phiên bản sự kiện không hợp lệ.');
    if (event.baseRevision !== state.revision) {conflicts.push(event.id); continue;}
    state = applyOperation(state,event); applied.add(event.id);
  }
  return {state,applied,conflicts};
}
export function categoryTotals(state,period) {
  const totals = new Map();
  for (const e of state.entries) if (e.period === period && e.type === 'expense') totals.set(e.category,sum([totals.get(e.category) || 0,e.amount]));
  return [...totals].map(([id,amount]) => ({id,amount,label:categoryInfo(id)[1]})).sort((a,b) => b.amount - a.amount);
}
