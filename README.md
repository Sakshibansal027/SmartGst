# SmartGST — Automated GST Compliance Assistant

A responsive prototype for Indian small businesses to record invoices, calculate GST under explicit demo assumptions, review rule-based validation, track sample compliance reminders, and prepare return summaries.

## Project layout

- `frontend/` — React, Vite, Tailwind CSS, React Router, Recharts, and Lucide React.
- `backend/` — Express API, MongoDB persistence and session store, invoice/GST/report logic, optional Gemini receipt OCR, and PDF generation.
- The old `backend/smartgst.db` SQLite file is retained as a migration source when present; it is not the active database. Legacy invoices/tasks are copied into MongoDB once, without deleting that file.

## Features

- Registration and login with bcrypt password hashing and MongoDB-backed HTTP sessions; protected data APIs are tenant scoped.
- Invoice CRUD, search, sales/purchase filtering, printable details, validation, and dynamic dashboard totals.
- FY-filtered dashboard, invoice listing, GST return summaries, and CSV/PDF reports.
- Deterministic intra-state CGST/SGST and inter-state IGST calculations with configurable demo rates.
- Compliance reminders and calendar completion/custom tasks.
- English/Hindi translation dictionaries cover the primary navigation, dashboard, invoice forms and tables, GST tools, calendar, reports, profile, settings, login, and help screens. A few backend and dynamic validation messages may remain English.
- Receipt uploads sent to the backend for optional Google Gemini Vision extraction. PDFs are read natively by Gemini, so no Poppler install is needed. OCR is honestly unavailable until `GEMINI_API_KEY` is set; the manual entry form remains available.
- Genuine PDFKit-generated prototype report and GSTR-1/GSTR-3B PDF downloads.

Receipt extraction calls the Google Gemini API (free tier). No other AI, ML, LLM, or cloud AI service is used.

## Requirements and setup

- Node.js 22 or newer.
- MongoDB Atlas or a reachable MongoDB server.
- Optional: a Google Gemini API key for receipt extraction. The free tier is sufficient; no billing account is required.

1. Copy `.env.example` to the project root `.env`.
2. Set `MONGODB_URI` to the full connection string copied from Atlas **Connect → Drivers**. Replace all placeholders, URL-encode special characters in the database password, and allow your current IP in Atlas Network Access. Set `MONGODB_DATABASE=smartgst`.
3. Install dependencies with `npm run install:all` (or `npm install` in `frontend` and `backend` separately).
4. Run `npm run dev` from either the project root or the `frontend/` directory. Both commands start the API and Vite together.
5. Open the Vite `Local` URL printed in the terminal. Vite can select a port other than 5173 when that port is occupied. The API defaults to 5000 and the launcher searches a free nearby port if needed; set `SMARTGST_API_PORT` explicitly to keep the Vite proxy aligned.

To run only the API separately, use `npm run start --prefix backend`; the frontend development command intentionally starts both services to keep its API proxy aligned. Build the frontend with `npm run build` from the root.

## Receipt OCR setup (optional)

Receipt extraction uses the Google Gemini API. Create a free key at <https://aistudio.google.com/apikey>, set `GEMINI_API_KEY` in `.env`, and restart the API. `GEMINI_MODEL` defaults to `gemini-2.5-flash`; any vision-capable Gemini model on your tier works. No local binaries are needed — Gemini reads JPEG, PNG, WEBP and PDF directly, so Poppler is no longer required.

The free tier is rate limited (requests per minute and per day). When the quota is reached the upload endpoint returns a `429` saying so, and the manual entry form still works. Check the current limits for your model in Google AI Studio before relying on this in a demo. With no key set, the upload endpoint reports a clear configuration error; it never fakes extracted data.

## Authentication and demo data

There are no hardcoded demo credentials or passwordless login. Create an account using **Register your business**. A new account receives sample invoice/reminder records for demonstrating dashboard and report flows. Sessions are stored in MongoDB. Set `SESSION_SECRET` to a long random value for deployments; when omitted, a random persistent key is stored in MongoDB for this prototype.

## Prototype limitations

- Sample records and due dates are illustrative, not official GST filing deadlines or business records.
- GST formulas use same-state vs different-state demo assumptions. Correct tax treatment depends on supply type, place of supply, exemptions, notifications, registration, and current law. Verify before using for compliance.
- Return downloads are prototype PDFs, not official GST forms, filing submissions, or portal integration.
- Receipt OCR sends the uploaded file to Google's Gemini API, so receipts leave this machine and are subject to Google's free-tier terms and rate limits. Extracted fields are model suggestions, re-validated on the server, and still require human review; scanned or low-quality documents may not extract correctly.
- Authentication has no email verification, password reset, rate limiting, or production-grade threat protection. It is a functional prototype, not production-secure.
- MongoDB Atlas credentials are never included in this repository. Keep `.env` private and rotate any database password that was previously pasted into chat or logs.
- Some server-generated validation and connection error messages remain in English.

## Verification

`npm run build` compiles the frontend. `npm test` runs deterministic GST, financial-year, invoice-validation, receipt-field and upload-contract tests — none of them need a database, an API key, or network access. End-to-end API verification requires a reachable MongoDB URI configured locally.

