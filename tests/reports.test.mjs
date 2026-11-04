import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,applyOperation,balances,rangeStats,MAX_MONEY} from '../public/shared/model.js';

function history() {
  const rows = [
    ['2024-12','income',1000,'summary'],['2024-12','expense',400,'summary'],
    ['2025-02','income',3000,'detail'],['2025-02','expense',600,'detail'],
    ['2025-02','unknown',999,'detail'],['2025-03','expense',50,'detail'],
  ].map(([period,type,amount,recordMode],i) => ({id:`old-${i}`,period,type,amount,recordMode,day:'',scope:'history',category:'unclassified',description:''}));
  return applyOperation(emptyState(),{id:'import-history',at:'2026-11-04T05:00:00Z',type:'entries.import',payload:{entries:rows}});
}

test('inclusive month ranges combine imported history across years and retain empty months',() => {
  const state = history(), before = structuredClone(state);
  const stats = rangeStats(state,'2024-12','2025-02');
  assert.deepEqual(stats.rows.map(r => r.period),['2024-12','2025-01','2025-02']);
  assert.equal(stats.income,4000);assert.equal(stats.expense,1000);assert.equal(stats.net,3000);
  assert.equal(stats.rate,75);assert.equal(stats.pending,1);assert.equal(stats.count,5);
  assert.equal(stats.rows[1].count,0);assert.equal(stats.rows[1].rate,null);
  assert.equal(stats.rows[2].net,2400);assert.equal(stats.rows[2].rate,80);
  assert.equal(stats.rows[2].pending,1);assert.equal(stats.unclassified,5);
  assert.equal(state.entries[0].day,'');assert.deepEqual(state,before);assert.equal(balances(state).cash,0);
});

test('year grouping preserves the selected month boundaries and computes rate from total income',() => {
  const stats = rangeStats(history(),'2024-12','2025-02',{groupBy:'year'});
  assert.deepEqual(stats.rows.map(r => [r.period,r.from,r.to,r.income,r.expense]),[
    ['2024','2024-12','2024-12',1000,400],['2025','2025-01','2025-02',3000,600],
  ]);
  assert.equal(stats.rate,75); // Weighted by income, not the average of 60% and 80%.
  const year = rangeStats(history(),'2025-01','2025-12');
  assert.equal(year.rows.length,12);assert.equal(year.expense,650);assert.equal(year.pending,1);
});

test('single months, expense-only months, and empty selections have explicit totals',() => {
  const stats = rangeStats(history(),'2025-02','2025-02');
  assert.equal(stats.rows.length,1);assert.equal(stats.net,2400);
  const expense = rangeStats(history(),'2025-03','2025-03');
  assert.equal(expense.net,-50);assert.equal(expense.rate,null);
  const empty = rangeStats(emptyState(),'2024-01','2025-12',{groupBy:'year'});
  assert.equal(empty.rows.length,2);assert.equal(empty.count,0);assert.equal(empty.net,0);assert.equal(empty.rate,null);
});

test('invalid or reversed ranges and unsafe totals are rejected',() => {
  for (const [from,to] of [['2025-03','2025-02'],['2025-00','2025-02'],['','2025-02'],['2025-01','2025-13']]) {
    assert.throws(() => rangeStats(history(),from,to));
  }
  assert.throws(() => rangeStats(history(),'2025-01','2025-02',{groupBy:'day'}));
  const state = emptyState();
  state.entries = Array.from({length:1000},() => ({period:'2025-01',type:'income',amount:MAX_MONEY,category:'salary'}));
  assert.throws(() => rangeStats(state,'2025-01','2025-02'),/giới hạn/);
});
