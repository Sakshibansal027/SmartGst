# Project notes for future sessions

## Tooling quirks in this environment

- **`findstr` silently returns nothing here.** It missed `@tailwind` in
  `frontend/src/style.css` and `dist/` in `.gitignore`, both of which are present. Never
  conclude "that text is absent" from an empty `findstr` result — use `grep_search` or
  `read_file`. This produced a wrong claim that Tailwind was inactive.
- **The stylesheets are minified onto very few, very long lines.** `grep_search`
  truncates a matching line at ~250 chars, so it cannot show you a whole CSS rule.
  Extract rules with a throwaway Node script (`css.match(/\.name[^{]*\{[^}]*\}/g)`).
- **Shell quoting is unreliable** through `run_command` (`cmd /C`): `node -e "..."` and
  PowerShell one-liners using `$` get mangled. Write a temporary `.mjs` file, run it with
  `node`, then delete it.
- **`web_search` does not work here.** `python3` resolves to the Windows "App Execution
  Alias" stub, so `ddgs` never runs and every search errors out. Use `npm view`, `gh`, or
  reading `node_modules` type definitions instead of fetching docs.

## Architecture facts worth not re-deriving

- **Tailwind v3 is active** (`postcss.config.js` plus `@tailwind` directives at the top of
  `frontend/src/style.css`), even though component markup relies on the hand-written
  classes rather than utilities.
- **Pages and layout sit outside `src/`** (`frontend/pages/`, `frontend/layout/`) and
  import shared code as `../../src/...`.
- **There are no `<Route>` elements.** `App.jsx` picks a page with a ternary chain over
  `useLocation().pathname`; adding a screen means updating both the `links` array and that
  chain.
- **Receipt upload contract:** the client posts the file as multipart field `file` and
  multer is configured `.single('file')`; the controller always reads `req.file`.
  `backend/tests/uploadContract.test.js` now guards that pair across the two files.
- **Receipt OCR runs on Google Gemini**, not Tesseract. `@google/genai` v3 (needs Node
  `>=22`): `new GoogleGenAI({apiKey, apiVersion}).models.generateContent({model,
  contents, config})` with the file as base64 `inlineData` and
  `responseMimeType`/`responseSchema` for JSON.
- **`apiVersion` must be `v1beta`.** JSON mode (`responseMimeType: 'application/json'`
  plus `responseSchema`) does not exist on `v1`, which is the SDK default. Using the
  default fails with `400 INVALID_ARGUMENT: JSON mode is not enabled for api version v1`,
  and it fails for *every* image regardless of size. `GEMINI_API_VERSION` defaults to
  `v1beta` in `env.js` — do not remove it.
- **Free tier for `gemini-2.5-flash` is 5 requests/minute** (Google reports the number in
  the 429 body). Iterating on a real key burns this fast and yields misleading 429s, so
  prefer the injected `generate` transport in tests and space out manual live calls.
- `GEMINI_API_KEY` and `GEMINI_MODEL` live in `.env`; without a key the endpoint returns
  `503` and the manual form still works. PDFs go straight to Gemini, so Poppler and
  Tesseract are no longer dependencies.
- **Never paste a real key into `.env.example`** — `.gitignore` un-ignores that file
  (`!.env.example`), so it is tracked and a real key there gets committed.
- **Model output is untrusted input.** `normalizeFields` in `backend/config/ocr.js`
  re-validates GSTIN, date, state and amount before anything reaches the review form, and
  `recognizeReceipt(file, {generate})` takes an injected transport so
  `backend/tests/ocrGemini.test.js` runs with no key and no network.
- Tests are `node --test` over `backend/tests/*.test.js` and cover pure functions plus the
  upload contract — no test needs a running MongoDB.
- **Tax arithmetic is integer paise, and `cgst + sgst === gst` must always hold.**
  `calculateTax` rounds to paise first and gives the odd paise to SGST. Rounding each
  half independently produced invoices whose CGST+SGST did not equal their GST and
  GSTR-1 summaries that disagreed with their own detail rows. The sweep in
  `backend/tests/businessLogic.test.js` asserts the invariant on paise, not on floats.
- **Rate limiting is in-memory and therefore per-process** (`backend/middleware/rateLimit.js`).
  A second API instance keeps its own counters and doubles the effective limit; a
  multi-instance deployment needs shared storage. `/api/ocr` deliberately uses the
  sliding strategy because Gemini's free-tier limit is a rolling 5 per minute — a fixed
  window lets a boundary burst through.
- **Upload type is decided by magic bytes, not the declared `Content-Type`.** `detectMime`
  in `config/ocr.js` runs on the file bytes after `fs.readFile` and its result is what
  gets sent to Gemini. Fixtures in `ocrGemini.test.js` must therefore carry real
  headers; plain fake strings are rejected before the provider is ever called.
- **`edit_file` anchors spanning more than one line fail in this repo.** The working tree
  is CRLF for files written by earlier tools and LF for files written by `write_file`,
  so a multi-line `old_string` copied from `read_file` does not match. Use single-line
  anchors, or batch single-line edits, and verify with `git diff` afterwards.
- **Dates are stored as bare `YYYY-MM-DD`, never as a timestamp.** Every financial-year
  filter is a plain string comparison against `'YYYY-04-01'`, so a stored ISO timestamp
  does not throw — it silently drops the record out of the dashboard, the returns
  summary and the reports while leaving it in the invoice list. `isIsoDate`/`toDateOnly`
  in `backend/utils/validators.js` accept a timestamp on the way in and store only the
  date; `refresh()` in `frontend/src/App.jsx` strips the time on the way out, and
  `fmtDate` slices before appending `'T00:00:00'`, which otherwise yields `Invalid Date`.
