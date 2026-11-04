import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCSV,detectMapping,importPreview} from '../public/shared/import.js';
const preview = (text,options = {}) => {const csv = parseCSV(text);return importPreview(csv,detectMapping(csv.headers),{today:'2026-11-04',fileKey:'abc',...options});};
test('CSV understands BOM, delimiters, quotes, embedded commas and newlines',() => {
  const csv = parseCSV('\uFEFFTháng;Năm;Số tiền;Nội dung\r\n1;2025;"1.500.000";"Ăn, uống\nở nhà"');
  assert.equal(csv.rows[0][3],'Ăn, uống\nở nhà');assert.equal(csv.delimiter,';');
  assert.equal(parseCSV('a,b\n"a""b",c').rows[0][0],'a"b');
  assert.throws(() => parseCSV('a,a\n1,2'));assert.throws(() => parseCSV('a,b\n1,2,3'));assert.throws(() => parseCSV('a,b\n"1,2'));
});
test('month/year-only import keeps an empty day and does not infer income from positive money',() => {
  const p = preview('Tháng,Năm,Số tiền,Nội dung\n1,2025,1500000,Sinh hoạt');
  assert.equal(p.errors.length,0);assert.equal(p.pending,1);assert.equal(p.entries[0].day,'');assert.equal(p.entries[0].period,'2025-01');assert.equal(p.entries[0].category,'unclassified');assert.equal(p.entries[0].scope,'history');
});
test('recognized type/category and real dates are preserved',() => {
  const p = preview('Ngày,Loại,Số tiền,Danh mục\n03/11/2026,Chi,100000,Ăn uống\n2026-10,Thu,18000000,Lương');
  assert.equal(p.errors.length,0);assert.equal(p.entries[0].day,'2026-11-03');assert.equal(p.entries[0].category,'food');assert.equal(p.entries[1].category,'salary');
});
test('negative values require an explicit sign convention',() => {
  const source = 'Tháng năm,Số tiền\n10/2026,-100000';
  assert.equal(preview(source).errors.length,1);
  const p = preview(source,{signConvention:true});assert.equal(p.entries[0].type,'expense');assert.equal(p.entries[0].amount,100000);
});
test('split monthly columns create independent income/expense entries and skip zero values',() => {
  const p = preview('Kỳ,Thu,Chi\n10/2026,18000000,12000000\n09/2026,0,500000',{layout:'split',recordMode:'summary'});
  assert.equal(p.errors.length,0);assert.equal(p.entries.length,3);assert.equal(p.entries[0].recordMode,'summary');assert.equal(p.entries[1].type,'expense');
});
test('invalid split rows are not partially imported',() => {
  const p = preview('Kỳ,Thu,Chi\n10/2026,100000,abc',{layout:'split'});assert.equal(p.entries.length,0);assert.equal(p.errors.length,1);
});
test('exact reimports skip stable row IDs even if the chosen type changes',() => {
  const source = 'Kỳ,Số tiền\n10/2026,100000', first = preview(source);
  const next = preview(source,{fallbackType:'expense',existing:first.entries});assert.equal(next.entries.length,0);assert.equal(next.duplicates,1);
});
test('similar transactions are warned about and kept unless the user explicitly skips them',() => {
  const source = 'Kỳ,Loại,Số tiền,Nội dung\n10/2026,Chi,100000,Ăn trưa', first = preview(source);
  const second = preview(source,{fileKey:'different',existing:first.entries});assert.equal(second.similar,1);assert.equal(second.entries.length,1);
  const skipped = preview(source,{fileKey:'different',existing:first.entries,skipSimilar:true});assert.equal(skipped.entries.length,0);
});
test('unknown categories stay in the note rather than silently disappearing',() => {
  const p = preview('Kỳ,Loại,Số tiền,Danh mục\n10/2026,Chi,100000,Đồ cho mèo');assert.equal(p.entries[0].category,'unclassified');assert.match(p.entries[0].description,/Đồ cho mèo/);
});
test('future periods, invalid dates and fractional đồng are rejected at preview',() => {
  const p = preview('Kỳ,Số tiền\n12/2026,100000\n2026-02-30,50000\n10/2026,"1,5"');assert.equal(p.entries.length,0);assert.equal(p.errors.length,3);
});
