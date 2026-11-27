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
    number: 'R-17', date: '2026-11-24', gstin: '', hsn: '', amount: '12450.00', party: '', state: ''
  });
  assert.equal(extractReceiptFields('Date: 31/02/2026').date, '');
});

test('receipt text extraction suggests supplier and place of supply when present', () => {
  const printed = extractReceiptFields('Supplier: Shree Wholesale Mart\nGSTIN: 27AADFS1245K1ZQ\nDate: 03/07/2026');
  assert.equal(printed.party, 'Shree Wholesale Mart');
  assert.equal(printed.state, 'Maharashtra');
  assert.equal(extractReceiptFields('State: Karnataka\nSeller: Coastal Foods Supply').state, 'Karnataka');
  assert.equal(extractReceiptFields('GSTIN: 99INVALID').state, '');
  assert.equal(extractReceiptFields('No supplier line here').party, '');
});

// The invariant a saved invoice depends on: the split must add back up to the
// tax it was split from, and that tax plus the taxable value must add back up
// to the stored total. Asserted on rounded paise rather than on the returned
// floats, because 0.01 + 0.02 is not reliably 0.03 in binary floating point --
// the real guarantee lives in integer paise, so that is what is checked here.
test('GST splits always add back up to the tax and to the total', () => {
  const toPaise = value => Math.round(value * 100);
  for (const rate of [0, 5, 12, 18, 28]) {
    for (let paise = 1; paise <= 10000; paise++) {
      const amount = paise / 100;
      for (const buyer of ['Maharashtra', 'Delhi']) {
        const where = `rate ${rate}, amount ${amount}, buyer ${buyer}`;
        const split = calculateTax(amount, rate, 'Maharashtra', buyer);
        const parts = toPaise(split.cgst) + toPaise(split.sgst) + toPaise(split.igst);
        assert.equal(parts, toPaise(split.gst), `${where}: CGST+SGST+IGST must equal the GST amount`);
        assert.equal(parts + toPaise(split.taxable), toPaise(split.total), `${where}: parts plus taxable value must equal the total`);
        if (split.type === 'Intra-state') {
          assert.equal(toPaise(split.igst), 0, `${where}: an intra-state supply must not carry IGST`);
          assert.ok(Math.abs(toPaise(split.cgst) - toPaise(split.sgst)) <= 1, `${where}: CGST and SGST may differ by at most one paise`);
        } else {
          assert.equal(toPaise(split.cgst), 0, `${where}: an inter-state supply must not carry CGST`);
          assert.equal(toPaise(split.sgst), 0, `${where}: an inter-state supply must not carry SGST`);
        }
      }
    }
  }
});

test('an odd paise of GST is absorbed by one half rather than lost', () => {
  // 10.20 @ 5% is 0.51 of GST: not divisible evenly into two paise amounts.
  const split = calculateTax(10.2, 5, 'Maharashtra', 'Maharashtra');
  assert.equal(Math.round(split.gst * 100), 51);
  assert.equal(Math.round(split.cgst * 100) + Math.round(split.sgst * 100), 51);
  assert.equal(Math.round(split.total * 100), Math.round((10.2 + 0.51) * 100));
});
