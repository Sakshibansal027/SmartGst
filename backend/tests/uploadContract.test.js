import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { config } from '../config/env.js';
import { uploadReceipt } from '../middleware/uploadMiddleware.js';

// Guards the client/server contract that broke the receipt upload: the browser
// posts the file under a multipart field name, and multer only accepts the one
// it was configured with. These two literals live in different files, so
// nothing else in the suite would notice them drifting apart.
const pagePath = path.resolve(import.meta.dirname, '../../frontend/pages/WorkspacePages.jsx');
const middlewarePath = path.resolve(import.meta.dirname, '../middleware/uploadMiddleware.js');

const readLiteral = (file, pattern) => {
  const found = fs.readFileSync(file, 'utf8').match(pattern);
  assert.ok(found, `could not find the upload field name in ${path.basename(file)}`);
  return found[1];
};

const clientField = () => readLiteral(pagePath, /fd\.append\('([^']+)'/);
const serverField = () => readLiteral(middlewarePath, /\.single\('([^']+)'\)/);

test('the upload page sends the same multipart field name multer is configured for', () => {
  assert.equal(clientField(), serverField(), 'client and server disagree on the upload field name');
});

test('multer accepts the configured field and rejects any other', async t => {
  fs.mkdirSync(config.uploadDir, { recursive: true });

  const app = express();
  app.post('/api/ocr', uploadReceipt, (req, res) => res.json({ ok: true, path: req.file?.path }));
  // Mirror the real error middleware closely enough to observe multer failures.
  app.use((error, req, res, next) => res.status(400).json({ error: error.code || error.message }));

  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => {
    server.closeAllConnections?.();
    server.close();
  });
  const url = `http://127.0.0.1:${server.address().port}/api/ocr`;

  async function post(field) {
    const body = new FormData();
    body.append(field, new Blob([Buffer.from('receipt-bytes')], { type: 'image/png' }), 'receipt.png');
    const response = await fetch(url, { method: 'POST', body });
    return { status: response.status, json: await response.json() };
  }

  const accepted = await post(serverField());
  try {
    assert.equal(accepted.status, 200);
    assert.ok(accepted.json.path, 'an accepted upload should be written to disk');
  } finally {
    if (accepted.json.path) fs.rmSync(accepted.json.path, { force: true });
  }

  const rejected = await post('not-the-upload-field');
  assert.equal(rejected.status, 400);
  assert.equal(rejected.json.error, 'LIMIT_UNEXPECTED_FILE');
});
