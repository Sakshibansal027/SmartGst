import test from 'node:test';
import assert from 'node:assert/strict';
import { isIsoDate, toDateOnly, validateInvoice } from '../utils/validators.js';

// Dates reach the database as strings, and every financial-year filter is a
// string comparison against 'YYYY-04-01'. A date that is merely non-empty but
// malformed therefore does not fail loudly: the record simply disappears from
// the dashboard, the returns summary and the reports while still appearing in
// the invoice list.
const valid = { kind: 'sale', number: 'S-1', date: '2026-11-01', party: 'Buyer', state: 'Delhi', description: 'Goods', hsn: '1001', amount: 100, rate: 5 };

test('isIsoDate accepts only real calendar dates in YYYY-MM-DD form', () => {
  assert.equal(isIsoDate('2026-11-01'), true);
  assert.equal(isIsoDate('2027-03-31'), true);
  assert.equal(isIsoDate('2028-02-29'), true, 'a leap day in a leap year is real');
  assert.equal(isIsoDate('2026-02-29'), false, '2026 is not a leap year');
  assert.equal(isIsoDate('2026-13-01'), false, 'month 13 does not exist');
  assert.equal(isIsoDate('2026-00-10'), false, 'month 0 does not exist');
  assert.equal(isIsoDate('2026-04-31'), false, 'April has 30 days');
  assert.equal(isIsoDate('not-a-date'), false);
  assert.equal(isIsoDate(''), false);
  assert.equal(isIsoDate(null), false);
  assert.equal(isIsoDate(undefined), false);
  assert.equal(isIsoDate('2026-1-1'), false, 'components must be zero padded');
});

test('isIsoDate rejects strings that merely contain a date-shaped substring', () => {
  // The old unanchored /\d{4}-\d{2}-\d{2}/ matched a date-shaped substring in
  // each of these, but they contain it differently: wrapped in junk, trailing
  // it, and leading it. Only a fully anchored pattern rejects all three.
  assert.equal(isIsoDate('junk2026-99-99zz'), false);
  assert.equal(isIsoDate('2026-11-01 extra'), false);
  assert.equal(isIsoDate('note 2026-11-01'), false);
});

test('isIsoDate accepts a full ISO timestamp but does not normalize it', () => {
  // Migrated legacy rows may carry a datetime rather than a bare date; an edit
  // to such a record must not be rejected for a reason unrelated to the edit.
  // Normalization is toDateOnly's job; this predicate only reports acceptability.
  assert.equal(isIsoDate('2026-11-01T00:00:00.000Z'), true);
  assert.equal(isIsoDate('2026-11-01T18:45:12+05:30'), true);
  assert.equal(isIsoDate('2026-11-01T25:00:00Z'), false, 'hour 25 does not exist');
});

test('toDateOnly strips a time component and leaves a bare date alone', () => {
  assert.equal(toDateOnly('2026-11-01'), '2026-11-01', 'a bare date passes through unchanged');
  assert.equal(toDateOnly('2026-11-01T00:00:00.000Z'), '2026-11-01');
  assert.equal(toDateOnly('2026-11-01T18:45:12+05:30'), '2026-11-01');
  assert.equal(toDateOnly('  2026-11-01T00:00:00Z  '), '2026-11-01', 'surrounding whitespace is trimmed');
  assert.equal(toDateOnly(''), '');
  assert.equal(toDateOnly(null), '');
  assert.equal(toDateOnly(undefined), '');
});

test('invoice validation rejects an unparseable date', () => {
  const result = validateInvoice({ ...valid, date: 'not-a-date' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(m => m.includes('Invoice date')), 'the error should name the invoice date');

  const impossible = validateInvoice({ ...valid, date: '2026-02-31' });
  assert.equal(impossible.valid, false);
  assert.ok(impossible.errors.some(m => m.includes('Invoice date')));
});

test('invoice validation still accepts a well-formed date', () => {
  assert.equal(validateInvoice(valid).valid, true);
});

test('a future invoice date is a warning, not a blocking error', () => {
  const result = validateInvoice({ ...valid, date: '2999-01-01' });
  assert.equal(result.valid, true, 'a future date must not block saving');
  assert.ok(result.warnings.some(m => m.includes('future')), 'it should warn that the date is in the future');
  assert.equal(result.status, 'Warning');
});

test('addTask validates the raw due date before it normalizes it', async () => {
  const { addTask } = await import('../controllers/complianceController.js');
  const fakeRes = () => {
    const res = { statusCode: 200, body: null };
    res.status = code => { res.statusCode = code; return res; };
    res.json = payload => { res.body = payload; return res; };
    return res;
  };
  // Normalizing first would truncate each of these to '2026-11-01', which is a
  // real date -- so a malformed timestamp would be silently accepted and stored.
  // The guard has to see the value untruncated.
  for (const due of ['2026-11-01T25:00:00Z', '2026-11-01T10:70:00Z', '2026-11-01Tgarbage']) {
    const res = fakeRes();
    await addTask({ body: { title: 'File GSTR-1', due }, user: { _id: 'u1' } }, res, error => { throw error; });
    assert.equal(res.statusCode, 400, `${due} should be rejected`);
  }
  // The three accepted shapes. Each passes the guard and so reaches the database
  // layer, which throws because no MongoDB is connected in this test -- that
  // rejection is the proof the guard accepted the full value.
  for (const due of ['2026-11-01', '2026-11-01T00:00:00Z', '2026-11-01T18:45:12+05:30']) {
    const res = fakeRes();
    await assert.rejects(
      () => addTask({ body: { title: 'File GSTR-1', due }, user: { _id: 'u1' } }, res, error => { throw error; }),
      /MongoDB has not been connected/,
      `${due} should pass the guard and reach the database layer`
    );
    assert.equal(res.statusCode, 200, `${due} must not be rejected`);
  }
});

test('adding a reminder rejects an invalid due date: unanchored match, impossible month, and empty', async () => {
  const { addTask } = await import('../controllers/complianceController.js');
  const fakeRes = () => {
    const res = { statusCode: 200, body: null };
    res.status = code => { res.statusCode = code; return res; };
    res.json = payload => { res.body = payload; return res; };
    return res;
  };
  // Before the fix this matched the guard, fell through to nextTaskId(), and
  // only stopped because no database was connected -- so it never returned 400.
  for (const due of ['junk2026-99-99zz', '2026-13-01', '']) {
    const res = fakeRes();
    await addTask({ body: { title: 'File GSTR-1', due }, user: { _id: 'u1' } }, res, error => { throw error; });
    assert.equal(res.statusCode, 400, `${due} should be rejected`);
    assert.ok(res.body.error, 'a rejection should carry a message');
  }
});
