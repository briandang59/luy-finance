import {parseMoney,validPeriod,validDay,CATEGORIES,validateEntry,emptyState} from './model.js';
export const fold = value => String(value ?? '').normalize('NFD').replace(/\p{M}/gu,'').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function parseCSV(source) {
  const text = String(source).replace(/^\uFEFF/,'');
  const first = text.split(/\r?\n/)[0];
  const count = separator => {let quote = false,n = 0; for (let i = 0;i < first.length;i++) {if (first[i] === '"') {if (quote && first[i + 1] === '"') i++;else quote = !quote;}else if (!quote && first[i] === separator) n++;}return n;};
  const delimiter = [',',';','\t'].sort((a,b) => count(b) - count(a))[0];
  const rows = [], row = []; let value = '', quote = false;
  for (let i = 0;i < text.length;i++) {
    const c = text[i];
    if (c === '"') {if (quote && text[i + 1] === '"') {value += '"';i++;}else if (!quote && value.length) throw new Error('Dấu ngoặc kép không hợp lệ trong CSV.'); else quote = !quote;}
    else if (!quote && (c === delimiter || c === '\r' || c === '\n')) {
      row.push(value); value = '';
      if (c !== delimiter) {if (c === '\r' && text[i + 1] === '\n') i++; if (row.some(v => v.trim())) rows.push([...row]);row.length = 0;}
    } else value += c;
  }
  if (quote) throw new Error('CSV có ô chưa đóng dấu ngoặc kép.');
  row.push(value); if (row.some(v => v.trim())) rows.push(row);
  if (rows.length < 2) throw new Error('File cần có dòng tiêu đề và ít nhất một dòng dữ liệu.');
  if (rows.length > 501) throw new Error('Mỗi lần nhập tối đa 500 dòng CSV. Chia file thành nhiều phần nhé.');
  const headers = rows.shift().map(h => h.trim());
  if (new Set(headers.map(fold)).size !== headers.length || headers.some(h => !h)) throw new Error('Tên cột phải có nội dung và không trùng nhau.');
  if (rows.some(r => r.length !== headers.length)) throw new Error('Có dòng CSV thiếu/thừa cột. Kiểm tra dấu phân cách và dấu ngoặc kép.');
  return {headers,rows,delimiter};
}
export function detectMapping(headers) {
  const find = names => String(headers.findIndex(h => names.includes(fold(h))));
  return {
    period:find(['ky','thang nam','month year','period','date','ngay','ngay giao dich']),month:find(['thang','month']),year:find(['nam','year']),
    amount:find(['so tien','amount','gia tri','value']),type:find(['loai','type','thu chi','loai giao dich']),
    income:find(['thu','tong thu','thu nhap','income','credit']),expense:find(['chi','tong chi','chi tieu','expense','debit']),
    category:find(['danh muc','phan loai','category']),description:find(['ghi chu','noi dung','description','note','dien giai']),
  };
}
function parsePeriod(value,month,year) {
  const v = String(value ?? '').trim();
  if (/^\d{4}[-/]\d{1,2}$/.test(v)) {const [y,m] = v.split(/[-/]/);return {period:`${y}-${m.padStart(2,'0')}`,day:''};}
  if (/^\d{1,2}[-/]\d{4}$/.test(v)) {const [m,y] = v.split(/[-/]/);return {period:`${y}-${m.padStart(2,'0')}`,day:''};}
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return {period:v.slice(0,7),day:v};
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)) {const [d,m,y] = v.split('/');return {period:`${y}-${m.padStart(2,'0')}`,day:`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`};}
  return {period:`${String(year).trim()}-${String(month).trim().padStart(2,'0')}`,day:''};
}
function categoryId(value,type) {
  const key = fold(value), match = CATEGORIES.find(c => (fold(c[0]) === key || fold(c[1]) === key) && (c[2] === type || c[2] === 'other' || type === 'unknown'));
  return match?.[0] || 'unclassified';
}
export function importPreview(csv,mapping,{layout = 'rows',fallbackType = 'unknown',signConvention = false,recordMode = 'detail',fileKey = 'file',today,existing = [],skipSimilar = false} = {}) {
  const entries = [], errors = [], warnings = [];
  const ids = new Set(existing.map(e => e.id));
  const fingerprint = e => JSON.stringify([e.period,e.day,e.type,e.amount,fold(e.description)]);
  const known = new Set(existing.map(fingerprint));
  let duplicates = 0, similar = 0;
  const at = (row,key) => {const index = Number(mapping[key]);return Number.isInteger(index) && index >= 0 ? row[index] || '' : '';};
  csv.rows.forEach((row,index) => {
    try {
      const date = parsePeriod(at(row,'period'),at(row,'month'),at(row,'year'));
      if (!validPeriod(date.period) || (date.day && !validDay(date.day))) throw new Error('Không đọc được tháng/năm. Chọn cột kỳ hoặc cả cột tháng và năm.');
      const description = at(row,'description').trim(), sourceCategory = at(row,'category').trim();
      let amounts;
      if (layout === 'split') {
        if (Number(mapping.income) < 0 || Number(mapping.expense) < 0) throw new Error('Chọn cả cột Thu và cột Chi.');
        amounts = [['income',at(row,'income')],['expense',at(row,'expense')]].filter(([,v]) => String(v).trim()).map(([type,value]) => ({type,amount:parseMoney(value)})).filter(e => e.amount > 0);
      } else {
        if (Number(mapping.amount) < 0) throw new Error('Chọn cột số tiền.');
        const amount = parseMoney(at(row,'amount'),{signed:true}), typeText = fold(at(row,'type'));
        let type = ['thu','income','credit','thu nhap'].includes(typeText) ? 'income' : ['chi','expense','debit','chi tieu'].includes(typeText) ? 'expense' : fallbackType;
        if (type === 'unknown' && signConvention) type = amount < 0 ? 'expense' : 'income';
        if (amount < 0 && !signConvention) throw new Error('Có số âm. Xác nhận quy ước số âm là Chi hoặc sửa số tiền trước.');
        amounts = [{type,amount:Math.abs(amount)}];
      }
      if (!amounts.length) warnings.push(`Dòng ${index + 2}: cả Thu và Chi bằng 0 hoặc trống, được bỏ qua.`);
      const staged = [];
      for (const item of amounts) {
        const category = categoryId(sourceCategory,item.type);
        const note = category === 'unclassified' && sourceCategory && fold(sourceCategory) !== fold('Chưa phân loại') ? `${description}${description ? ' · ' : ''}Danh mục gốc: ${sourceCategory}` : description;
        const entry = {id:`csv-${fileKey}-${index + 2}-${layout === 'split' ? item.type : 'row'}`,type:item.type,amount:item.amount,...date,category,description:note,scope:'history',recordMode};
        validateEntry(entry,emptyState(),{...(today ? {today} : {}),historyOnly:true});
        staged.push(entry);
      }
      for (const entry of staged) {
        if (ids.has(entry.id)) {duplicates++;continue;}
        if (known.has(fingerprint(entry))) {similar++;if (skipSimilar) continue;}
        entries.push(entry); ids.add(entry.id); known.add(fingerprint(entry));
      }
    } catch (error) {errors.push({line:index + 2,message:error.message});}
  });
  return {entries,errors,warnings,duplicates,similar,pending:entries.filter(e => e.type === 'unknown').length};
}
