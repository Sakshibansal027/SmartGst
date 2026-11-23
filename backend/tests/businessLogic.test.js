import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTax } from '../utils/tax.js';
import { fiscalYearRange } from '../utils/fy.js';
import { validateInvoice } from '../utils/validators.js';
import { extractReceiptFields } from '../config/ocr.js';

test('intra-state demo GST splits tax into equal CGST and SGST', () => {
  assert.deepEqual(calculateTax(1000, 18, 'Maharashtra', 'maharashtra'), {
    taxable: 1000, rate: 18, cgst: 90, sgst: 90, igst: 0, gst: 180,
    total: 1180, type: 'Intra-state'
  });
});

test('inter-state demo GST applies IGST only', () => {
  const result = calculateTax(2500, 12, 'Maharashtra', 'Delhi');
  assert.equal(result.igst, 300);
  assert.equal(result.cgst, 0);
  assert.equal(result.sgst, 0);
  assert.equal(result.total, 2800);
});

test('financial year selection returns inclusive April-to-March dates', () => {
  assert.deepEqual(fiscalYearRange('2026-27'), { from: '2026-04-01', to: '2027-03-31' });
  assert.equal(fiscalYearRange('2026-28'), null);
  assert.equal(fiscalYearRange('not-a-year'), null);
});

test('invoice validation reports duplicates and required fields deterministically', () => {
  const invoice = { kind: 'sale', number: 'S-1', date: '2026-11-01', party: 'Buyer', state: 'Delhi', description: 'Goods', hsn: '1001', amount: 100, rate: 5 };
  assert.equal(validateInvoice(invoice).valid, true);
  const duplicate = validateInvoice(invoice, [{ id: 3, kind: 'sale', number: 'S-1' }]);
  assert.equal(duplicate.valid, false);
  assert.ok(duplicate.errors.some(message => message.includes('Duplicate invoice')));
  assert.ok(validateInvoice({ ...invoice, number: '', amount: -1, rate: 7 }).errors.length >= 3);
});

test('receipt text extraction normalizes Indian numeric dates and amounts for review forms', () => {
  assert.deepEqual(extractReceiptFields('Invoice No: R-17\nDate: 24/11/2026\nTaxable value: ₹ 12,450.00'), {
    number: 'R-17', date: '2026-11-24', gstin: '', hsn: '', amount: '12450.00'
  });
  assert.equal(extractReceiptFields('Date: 31/02/2026').date, '');
});
