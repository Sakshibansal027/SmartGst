import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { calculateTax } from '../utils/tax.js';
import { invoiceFields } from '../controllers/invoiceController.js';

// updateInvoice used replaceOne, handing it a document rebuilt from scratch.
// That document had no createdAt, so every edit erased the record's creation
// time; any legacy field the rebuild did not know about was erased too. Moving
// to $set means the write can only ever touch the fields it names, so the field
// set itself has to be correct -- ownership and creation time must stay out of
// it, or an edit would rewrite them.

const body = {
  kind: 'sale', number: ' S-9 ', date: '2026-11-01', party: ' Mehta Kirana Stores ',
  gstin: '27aabcu9603r1zm', state: 'Delhi', description: ' Packaged groceries ',
  hsn: ' 1001 ', quantity: '2', unit_price: '500', amount: '1000', rate: '18'
};

test('invoiceFields recalculates tax and normalizes the submitted strings', () => {
  const tax = calculateTax(body.amount, body.rate, 'Maharashtra', body.state);
  const fields = invoiceFields(body, tax);
  assert.equal(fields.number, 'S-9', 'invoice number is trimmed');
  assert.equal(fields.party, 'Mehta Kirana Stores', 'party is trimmed');
  assert.equal(fields.gstin, '27AABCU9603R1ZM', 'GSTIN is uppercased');
  assert.equal(fields.hsn, '1001');
  assert.equal(fields.quantity, 2, 'quantity is a number');
  assert.equal(fields.unit_price, 500, 'unit price is a number');
  assert.equal(fields.amount, 1000, 'amount comes from the tax result, not the body');
  assert.equal(fields.igst, 180, 'Delhi against a Maharashtra seller is inter-state IGST');
  assert.equal(fields.cgst, 0);
  assert.equal(fields.total, 1180);
});

test('invoiceFields omits id, userId and createdAt so a $set cannot rewrite them', () => {
  const tax = calculateTax(body.amount, body.rate, 'Maharashtra', body.state);
  const fields = invoiceFields(body, tax);
  for (const key of ['id', 'userId', 'createdAt']) {
    assert.equal(Object.hasOwn(fields, key), false, `${key} must not be part of the writable field set`);
  }
});

test('invoiceFields stores a date-only value when the client sends a timestamp', () => {
  // A migrated row carries a datetime, and an edit round-trips whatever the
  // record held. Without normalization the stored value keeps its time
  // component, and every financial-year filter -- a plain string comparison
  // against 'YYYY-04-01' -- then misplaces the record.
  const tax = calculateTax(body.amount, body.rate, 'Maharashtra', body.state);
  const fields = invoiceFields({ ...body, date: '2026-11-01T00:00:00.000Z' }, tax);
  assert.equal(fields.date, '2026-11-01');
});

test('invoiceFields stamps updatedAt', () => {
  const fields = invoiceFields(body, calculateTax(body.amount, body.rate, 'Maharashtra', body.state));
  assert.ok(fields.updatedAt instanceof Date, 'an edit should record when it happened');
});

test('updateInvoice writes with $set and no longer replaces the whole document', () => {
  // Mirrors the contract-guard style of uploadContract.test.js: this pairing
  // lives in one file, so nothing else in the suite would notice it regressing.
  const source = fs.readFileSync(path.resolve(import.meta.dirname, '../controllers/invoiceController.js'), 'utf8');
  const update = source.slice(source.indexOf('export async function updateInvoice'));
  assert.match(update, /\$set/, 'updateInvoice must write with $set so unknown fields survive');
  assert.doesNotMatch(update, /replaceOne/, 'replaceOne wipes createdAt and any field the rebuild omitted');
});

test('create and update share one field builder rather than duplicating it', () => {
  const source = fs.readFileSync(path.resolve(import.meta.dirname, '../controllers/invoiceController.js'), 'utf8');
  const create = source.slice(source.indexOf('export async function createInvoice'), source.indexOf('export async function updateInvoice'));
  assert.match(create, /invoiceFields\(/, 'createInvoice should use the shared builder');
  assert.match(source.slice(source.indexOf('export async function updateInvoice')), /invoiceFields\(/, 'updateInvoice should use the shared builder');
});
