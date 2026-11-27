import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyBuckets } from '../controllers/dashboardController.js';

// The chart loop used to call row.date.slice(0, 7) on every record. A stored
// row whose date was unset or not a string threw a TypeError, which surfaced to
// the client as a rejected refresh() and left every panel empty, not just the
// chart. Malformed date strings were already excluded by the financial-year
// query filter, so the reachable trigger is a missing or non-string date.

test('monthlyBuckets groups records by year-month', () => {
  const buckets = monthlyBuckets([
    { date: '2026-04-15', kind: 'sale', amount: 100, cgst: 9, sgst: 9, igst: 0 },
    { date: '2026-04-28', kind: 'purchase', amount: 50, cgst: 3, sgst: 3, igst: 0 },
    { date: '2026-05-02', kind: 'sale', amount: 200, cgst: 18, sgst: 18, igst: 0 }
  ]);
  assert.deepEqual(buckets, [
    { month: '2026-04', sales: 100, purchases: 50, output: 18, itc: 6 },
    { month: '2026-05', sales: 200, purchases: 0, output: 36, itc: 0 }
  ]);
});

test('monthlyBuckets skips a record whose date is missing or malformed instead of throwing', () => {
  // Before the fix the first of these threw "Cannot read properties of
  // undefined (reading 'slice')" and took the whole dashboard with it.
  const buckets = monthlyBuckets([
    { date: undefined, kind: 'sale', amount: 999, cgst: 1, sgst: 1, igst: 0 },
    { date: 'garbage', kind: 'sale', amount: 999, cgst: 1, sgst: 1, igst: 0 },
    { date: null, kind: 'purchase', amount: 999, cgst: 1, sgst: 1, igst: 0 },
    { date: '2026-11-01', kind: 'sale', amount: 100, cgst: 9, sgst: 9, igst: 0 }
  ]);
  assert.deepEqual(buckets, [
    { month: '2026-11', sales: 100, purchases: 0, output: 18, itc: 0 }
  ], 'the one valid record must still be bucketed, the bad ones simply omitted');
});

test('monthlyBuckets keeps the tax components separate from the taxable value', () => {
  const [april] = monthlyBuckets([
    { date: '2026-04-10', kind: 'sale', amount: 1000, cgst: 90, sgst: 90, igst: 0 }
  ]);
  assert.equal(april.sales, 1000, 'sales tracks the taxable value');
  assert.equal(april.output, 180, 'output tracks the GST, not the taxable value');
});

test('monthlyBuckets survives a record with entirely absent numeric fields', () => {
  const [april] = monthlyBuckets([{ date: '2026-04-10', kind: 'sale' }]);
  assert.deepEqual(april, { month: '2026-04', sales: 0, purchases: 0, output: 0, itc: 0 });
});
