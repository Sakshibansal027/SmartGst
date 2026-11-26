import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { normalizeFields, recognizeReceipt, ocrStatus } from '../config/ocr.js';

// Every test here runs offline: the Gemini call is injected, so no API key and
// no network access are needed to prove the request shape and error mapping.
async function tempReceipt(bytes = Buffer.from('fake-receipt-bytes'), mimetype = 'image/png') {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'smartgst-ocr-'));
  const file = path.join(dir, 'receipt.png');
  await fs.writeFile(file, bytes);
  return { path: file, mimetype, cleanup: () => fs.rm(dir, { recursive: true, force: true }) };
}

test('normalizeFields validates model output instead of trusting it', () => {
  const fields = normalizeFields({
    number: 'pb-7781 ', date: '03/07/2026', gstin: '27aadfs1245k1zq',
    hsn: 'HSN 1001', amount: '\u20b9 12,450.50', party: '  Shree   Wholesale Mart ', state: 'maharashtra'
  });
  assert.deepEqual(fields, {
    number: 'PB-7781', date: '2026-07-03', gstin: '27AADFS1245K1ZQ',
    hsn: '1001', amount: '12450.50', party: 'Shree Wholesale Mart', state: 'Maharashtra'
  });
  assert.equal(normalizeFields({ gstin: '99INVALID' }).gstin, '');
  assert.equal(normalizeFields({ date: '2026-02-31' }).date, '');
  assert.equal(normalizeFields({ state: 'Atlantis' }).state, '');
});

test('a JSON answer from Gemini is normalized into form fields', async t => {
  const file = await tempReceipt();
  t.after(file.cleanup);
  const sent = [];
  const result = await recognizeReceipt(file, {
    apiKey: 'test-key',
    model: 'test-model',
    generate: async args => {
      sent.push(args);
      return JSON.stringify({
        number: 'PB-7781', date: '2026-07-03', party: 'Shree Wholesale Mart',
        gstin: '27AADFS1245K1ZQ', hsn: '1001', amount: '12450.00', state: ''
      });
    }
  });

  assert.equal(result.fallback, false);
  assert.equal(result.fields.party, 'Shree Wholesale Mart');
  assert.equal(result.fields.state, 'Maharashtra', 'state should be derived from the GSTIN');
  assert.match(result.engine, /Gemini/);
  assert.equal(sent[0].mimeType, 'image/png');
  assert.equal(sent[0].model, 'test-model');
  assert.equal(sent[0].data, Buffer.from('fake-receipt-bytes').toString('base64'));
});

test('a prose answer falls back to the pattern extractor', async t => {
  const file = await tempReceipt();
  t.after(file.cleanup);
  const result = await recognizeReceipt(file, {
    apiKey: 'test-key',
    generate: async () => 'Supplier: Coastal Foods Supply\nGSTIN: 32AADFC6723P1ZB\nInvoice No: PB-9\nTaxable value: \u20b9 980.00'
  });

  assert.equal(result.fallback, true);
  assert.equal(result.fields.party, 'Coastal Foods Supply');
  assert.equal(result.fields.state, 'Kerala');
  assert.equal(result.fields.amount, '980.00');
});

test('free-tier quota errors surface as a clear 429', async t => {
  const file = await tempReceipt();
  t.after(file.cleanup);
  await assert.rejects(
    () => recognizeReceipt(file, {
      apiKey: 'test-key',
      generate: async () => { throw Object.assign(new Error('429 RESOURCE_EXHAUSTED: quota exceeded'), { status: 429 }); }
    }),
    error => {
      assert.equal(error.status, 429);
      assert.match(error.message, /free-tier rate limit/i);
      return true;
    }
  );
});

test('an invalid API key is reported without leaking the key', async t => {
  const file = await tempReceipt();
  t.after(file.cleanup);
  await assert.rejects(
    () => recognizeReceipt(file, {
      apiKey: 'secret-key-value',
      generate: async () => { throw Object.assign(new Error('API key not valid. Please pass a valid API key.'), { status: 400 }); }
    }),
    error => {
      assert.equal(error.status, 502);
      assert.doesNotMatch(error.message, /secret-key-value/);
      return true;
    }
  );
});

test('a missing API key fails fast with 503 and never calls the provider', async t => {
  const file = await tempReceipt();
  t.after(file.cleanup);
  let called = false;
  await assert.rejects(
    () => recognizeReceipt(file, { apiKey: '', generate: async () => { called = true; return '{}'; } }),
    error => {
      assert.equal(error.status, 503);
      assert.match(error.message, /GEMINI_API_KEY/);
      return true;
    }
  );
  assert.equal(called, false);
});

test('unsupported and oversized files are rejected before any request', async t => {
  const wrongType = await tempReceipt(Buffer.from('x'), 'text/plain');
  t.after(wrongType.cleanup);
  await assert.rejects(() => recognizeReceipt(wrongType, { apiKey: 'k', generate: async () => '{}' }), error => error.status === 400);

  const tooBig = await tempReceipt(Buffer.alloc(10 * 1024 * 1024 + 1));
  t.after(tooBig.cleanup);
  await assert.rejects(() => recognizeReceipt(tooBig, { apiKey: 'k', generate: async () => '{}' }), error => error.status === 413);
});

test('the request is sent on the v1beta API, which is where JSON mode lives', async t => {
  const file = await tempReceipt();
  t.after(file.cleanup);
  let seen;
  await recognizeReceipt(file, {
    apiKey: 'test-key',
    model: 'test-model',
    apiVersion: 'v1beta',
    generate: async args => { seen = args; return '{}'; }
  });
  assert.equal(seen.apiVersion, 'v1beta');
});

test('an INVALID_ARGUMENT error surfaces Google\'s reason instead of blaming the file', async t => {
  const file = await tempReceipt();
  t.after(file.cleanup);
  // This is the exact payload Google returned when the request used the v1 API.
  const googleError = JSON.stringify({
    error: { code: 400, message: 'JSON mode is not enabled for api version v1. Use api version v1beta instead.', status: 'INVALID_ARGUMENT' }
  });
  await assert.rejects(
    () => recognizeReceipt(file, { apiKey: 'k', generate: async () => { throw Object.assign(new Error(googleError), { status: 400 }); } }),
    error => {
      assert.match(error.message, /v1beta/, 'message should name the API version fix');
      assert.doesNotMatch(error.message, /clearer photo|smaller file/, 'must not blame the user\'s image');
      return true;
    }
  );
});

test('a genuine bad-input rejection still reaches the user as 422', async t => {
  const file = await tempReceipt();
  t.after(file.cleanup);
  await assert.rejects(
    () => recognizeReceipt(file, { apiKey: 'k', generate: async () => { throw Object.assign(new Error(JSON.stringify({ error: { code: 400, message: 'Unsupported MIME type.', status: 'INVALID_ARGUMENT' } })), { status: 400 }); } }),
    error => error.status === 422 && /Unsupported MIME type/.test(error.message)
  );
});

test('ocrStatus reports the API version without exposing the key', () => {
  const status = ocrStatus();
  assert.equal(status.provider, 'gemini');
  assert.equal(typeof status.configured, 'boolean');
  assert.ok(Array.isArray(status.missing));
  assert.equal(typeof status.model, 'string');
  assert.equal(status.apiVersion, 'v1beta');
  assert.equal(Object.keys(status).includes('apiKey'), false);
});
