import {createHash} from 'node:crypto';
import {google} from './google-api.mjs';
import {HttpError} from './http.mjs';
import {balances,goalProgress,categoryInfo} from '../public/shared/model.js';
export const EVENT_FIELDS = ['id','at','type','baseRevision','payloadHash',...Array.from({length:32},(_,i) => `payload${i + 1}`)];
export const VIEW_FIELDS = {
  ThuChi:['id','loai','soTien','thangNam','ngay','danhMuc','ghiChu','phamVi','kieuDuLieu'],
  MucTieu:['id','ten','mucTieu','daPhanBo','thoiHan','conThieu','canMoiThang','ghiChu'],
  SoDu:['loai','thoiDiem','tongTien','tietKiem','sinhHoat','dieuChinh','ghiChu'],
  TietKiem:['id','thoiDiem','thaoTac','soTien','mucTieu','ghiChu'],
};
const cells = values => values.map(v => ({userEnteredValue:typeof v === 'number' ? {numberValue:v} : {stringValue:String(v ?? '')}}));
export function eventValues(event) {
  const payload = JSON.stringify(event.payload);
  if (payload.length > 960000) throw new HttpError(413,'Dữ liệu một lần lưu quá lớn. Chia file nhập thành nhiều phần.');
  return [event.id,event.at,event.type,event.baseRevision,createHash('sha256').update(payload).digest('hex'),...Array.from({length:32},(_,i) => payload.slice(i * 30000,(i + 1) * 30000))];
}
export function parseEvent(row) {
  const payload = row.slice(5).join('');
  if (createHash('sha256').update(payload).digest('hex') !== row[4]) throw new HttpError(422,'Nhật ký gốc đã bị sửa hoặc hỏng. Khôi phục bản sao lưu; không tự sửa tab Events.');
  try {return {id:row[0],at:row[1],type:row[2],baseRevision:Number(row[3]),payload:JSON.parse(payload)};}
  catch {throw new HttpError(422,'Không đọc được nhật ký gốc.');}
}
export function projections(state,now = new Date().toISOString()) {
  const b = balances(state), snapshot = state.settings;
  return {
    ThuChi:state.entries.map(e => [e.id,{income:'Thu',expense:'Chi',unknown:'Cần xác nhận'}[e.type],e.amount,e.period,e.day,categoryInfo(e.category)[1],e.description,e.scope === 'history' ? 'Lịch sử — không cộng vào mốc số dư' : 'Sau mốc số dư',e.recordMode === 'summary' ? 'Tổng tháng' : 'Từng khoản']),
    MucTieu:state.goals.map(g => {const p = goalProgress(state,g);return [g.id,g.name,g.target,p.amount,g.deadline,p.remaining,p.monthly ?? '',g.note];}),
    SoDu:[...(snapshot ? [['Mốc ban đầu',snapshot.openingAt,snapshot.openingBalance,snapshot.openingSavings,snapshot.openingBalance - snapshot.openingSavings,0,'Lịch sử nhập cũ không được cộng vào mốc này.']] : []),...state.adjustments.map(a => ['Đối chiếu',a.at,a.actual,'','',a.delta,a.note]),['Hiện tại',now,b.cash,b.saved,b.spendable,'','Bảng tổng hợp; nhật ký Events là dữ liệu gốc.']],
    TietKiem:[...(snapshot ? [['opening',snapshot.openingAt,'Tiết kiệm ban đầu',snapshot.openingSavings,'Quỹ chung','Đã nằm trong số dư ban đầu.']] : []),...state.moves.map(m => [m.id,m.at,{deposit:'Để dành',withdraw:'Rút tiết kiệm',allocate:'Phân bổ mục tiêu',release:'Trả về quỹ chung'}[m.kind],m.amount,m.goalName || 'Quỹ chung',m.note])],
  };
}
export function createStore(call = google) {
  let metadata, initializing;
  async function initialize() {
    const doc = await call('?fields=sheets.properties'), props = doc.sheets?.map(s => s.properties) || [];
    const fields = {Events:EVENT_FIELDS,...VIEW_FIELDS}, missing = Object.keys(fields).filter(name => !props.some(s => s.title === name));
    if (missing.length) {
      const added = await call(':batchUpdate',{method:'POST',body:JSON.stringify({requests:missing.map(title => ({addSheet:{properties:{title,gridProperties:{rowCount:1000,columnCount:Math.max(26,fields[title].length)}}}}))})});
      for (const reply of added.replies) props.push(reply.addSheet.properties);
    }
    const map = Object.fromEntries(props.map(p => [p.title,p]));
    const headers = await call('/values:batchGet?' + Object.keys(fields).map(n => `ranges=${n}!A1:${n === 'Events' ? 'AK' : 'Z'}1`).join('&'));
    const requests = [];
    Object.entries(fields).forEach(([name,expected],index) => {
      const actual = headers.valueRanges[index]?.values?.[0];
      if (actual?.length && expected.some((v,i) => actual[i] !== v)) throw new HttpError(422,`Tab ${name} có cấu trúc khác. Dùng Sheet trống riêng cho Lũy.`);
      if (!actual?.length) requests.push({updateCells:{start:{sheetId:map[name].sheetId,rowIndex:0,columnIndex:0},rows:[{values:cells(expected)}],fields:'userEnteredValue'}});
    });
    if (requests.length) await call(':batchUpdate',{method:'POST',body:JSON.stringify({requests})});
    return map;
  }
  async function ensure() {
    if (metadata) return metadata;
    initializing ||= initialize().then(result => metadata = result).finally(() => {initializing = null;});
    return initializing;
  }
  return {
    async read() {
      await ensure();
      const result = await call('/values/Events!A2:AK');
      return (result.values || []).filter(row => row[0]).map(parseEvent);
    },
    async append(event) {
      const map = await ensure();
      await call(':batchUpdate',{method:'POST',body:JSON.stringify({requests:[{appendCells:{sheetId:map.Events.sheetId,rows:[{values:cells(eventValues(event))}],fields:'userEnteredValue'}}]})});
    },
    async sync(state) {
      const map = await ensure(), views = projections(state), requests = [];
      for (const [name,data] of Object.entries(views)) {
        const rows = [VIEW_FIELDS[name],...data], oldCount = map[name].gridProperties?.rowCount || 1000;
        if (rows.length > oldCount) requests.push({updateSheetProperties:{properties:{sheetId:map[name].sheetId,gridProperties:{rowCount:rows.length}},fields:'gridProperties.rowCount'}});
        requests.push({updateCells:{range:{sheetId:map[name].sheetId,startRowIndex:0,endRowIndex:Math.max(oldCount,rows.length),startColumnIndex:0,endColumnIndex:VIEW_FIELDS[name].length},rows:rows.map(r => ({values:cells(r)})),fields:'userEnteredValue'}});
        map[name].gridProperties = {...map[name].gridProperties,rowCount:Math.max(oldCount,rows.length)};
      }
      await call(':batchUpdate',{method:'POST',body:JSON.stringify({requests})});
    },
  };
}
export const store = createStore();
