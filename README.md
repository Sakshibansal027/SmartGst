# SmartGST — Automated GST Compliance Assistant

> A simple workspace that takes Indian micro-enterprises from paper bills to organized, validated, GST-ready records.

SmartGST is a responsive full-stack prototype built for small shopkeepers, service providers and first-time GST filers who don't have an accountant. Record a bill on one screen, see exactly how the tax splits, catch mistakes early, track filing reminders, and export clean summaries for return preparation, in English or Hindi.

Built for **Build for Bharat · Track 4: MSME Growth and Productivity** (see `SmartGST Problem Breif Updated.pdf`).

> **Prototype notice:** tax rules are configurable demo assumptions and due dates are illustrative. Return downloads are prototype PDFs, not official GST forms or portal submissions. Verify everything with a tax professional before using it for compliance.

---

## Table of Contents

1. [The Problem](#the-problem)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
6. [Environment Variables](#environment-variables)
7. [Receipt OCR (Optional)](#receipt-ocr-optional)
8. [App Screens](#app-screens)
9. [API Reference](#api-reference)
10. [How the Core Logic Works](#how-the-core-logic-works)
11. [Security](#security)
12. [Testing](#testing)
13. [Prototype Limitations](#prototype-limitations)

---

## The Problem

Many micro-enterprises keep records in handwritten bills and registers, but GST processes need structured, validated digital data. Re-entering bills by hand is slow, and errors such as duplicate invoice numbers, wrong tax splits and malformed GSTINs surface only at return time. Existing options are either costly (accountants), complex (full accounting suites) or English-first.

SmartGST is the bridge: guided bill entry, live tax breakdown, transparent rule-based validation, reminders and a bilingual interface.

## Features

| Area | What it does |
|---|---|
| **Auth** | Register/login with bcrypt-hashed passwords and MongoDB-backed sessions. All data APIs are tenant-scoped per user. |
| **Invoices** | Create, read, update, delete; search; sales/purchase filter; printable tax invoice; per-record validation. |
| **GST calculation** | Deterministic CGST + SGST (intra-state) or IGST (inter-state) with demo rates of 0, 5, 12, 18 and 28%. Live breakdown while typing. |
| **Validation** | Required fields, duplicate invoice numbers per transaction type, GSTIN format, date format, rate check, future-date warning. |
| **Dashboard** | FY-filtered totals: sales, purchases, output GST, input tax credit, estimated net liability, pending tasks, recent transactions. |
| **Compliance calendar** | Sample filing reminders plus custom tasks; mark complete or delete. |
| **GST returns** | GSTR-1 (outward supplies) and GSTR-3B (summary estimate) views with invoice-wise detail and PDF download. |
| **Reports** | Filter by date and type, monthly sales vs purchases, export as CSV or PDF. |
| **Receipt upload (optional)** | Upload JPEG/PNG/WEBP/PDF; Google Gemini suggests fields; you review before saving. |
| **Bilingual UI** | English / Hindi dictionaries for navigation, dashboard, forms, GST tools, calendar, reports, profile, settings, login and help. A few server messages stay in English. |

## Tech Stack

**Frontend** (`frontend/`)
- React, Vite, Tailwind CSS 3, React Router, Recharts, Lucide React

**Backend** (`backend/`)
- Node.js 22+, Express 5, `express-session` with a custom MongoDB session store
- MongoDB (Atlas or local) via the official `mongodb` driver
- `bcryptjs` for password hashing, `multer` for uploads, `pdfkit` for PDF generation
- `@google/genai` for optional receipt extraction (Gemini free tier)

**Tests:** Node's built-in test runner (`node --test`), no database or network needed.

## Project Structure

```text
SmartGst/
├── package.json              # Root scripts: dev, build, install:all, test
├── .env.example              # Copy to .env (project root)
├── COVEXCODE.md              # Developer notes and architecture gotchas
├── SmartGST Problem Breif Updated.pdf
│
├── backend/
│   ├── server.js             # Express app, middleware order, route mounting
│   ├── dev.js                # Dev launcher: finds a free API port, starts API + Vite
│   ├── config/               # env, db connection, Mongo session store, OCR, legacy migration
│   ├── controllers/          # auth, invoice, dashboard, gst, report, compliance, profile, ocr
│   ├── routes/               # auth, invoice, dashboard, gst, profile, task routes
│   ├── models/               # Thin MongoDB collection helpers (User, Invoice, ComplianceTask, GSTReturn)
│   ├── middleware/           # auth, error handling, rate limiting, upload
│   ├── utils/                # tax, fy (financial year), validators, csv, generatePDF, generateToken
│   ├── tests/                # node --test suites
│   └── uploads/              # Temporary receipt uploads (git-ignored)
│
└── frontend/
    ├── vite.config.js        # Proxies /api to the backend port
    ├── layout/               # Sidebar, Navbar
    ├── pages/                # Dashboard, Invoices, GSTReturns, Reports, Profile, Login, NotFound, WorkspacePages
    └── src/
        ├── App.jsx           # App shell, data loading, page switching
        ├── components/       # common (Stat, Field, Empty), invoices (EditInvoice, InvoiceDetails)
        ├── constants/        # states, invoice defaults
        ├── locales/          # en.json, hi.json, i18n.js
        ├── services/api.js   # API client
        └── utils/format.js
```

> Pages and layout live outside `src/` and import shared code via `../../src/...`. There are no `<Route>` elements: `App.jsx` picks a page with a pathname check, so adding a screen means updating both the `links` array and that chain.

## Getting Started

### Prerequisites
- **Node.js 22 or newer**
- **MongoDB**: an Atlas cluster or any reachable MongoDB server
- *(Optional)* a Google Gemini API key for receipt OCR

### Setup

```bash
# 1. Clone
git clone https://github.com/Sakshibansal027/SmartGst.git
cd SmartGst

# 2. Configure environment
cp .env.example .env
# Edit .env, set MONGODB_URI and MONGODB_DATABASE=smartgst

# 3. Install dependencies for both apps
npm run install:all

# 4. Start API + frontend together
npm run dev
```

Open the Vite `Local` URL printed in the terminal. Vite may pick a port other than 5173 if it is busy.

**MongoDB URI tips (Atlas):** copy the full string from **Connect → Drivers**, replace every placeholder, URL-encode special characters in the password, and allow your current IP under Network Access.

If `MONGODB_URI` is not set, `npm run dev` tries to start a local `mongod` on port 27017 (override the binary with `MONGOD_BIN`).

### Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start API and Vite together (works from root or `frontend/`) |
| `npm run build` | Build the frontend |
| `npm run start:api` | Run only the API |
| `npm test` | Run backend tests |

The API defaults to port 5000; the launcher finds a nearby free port if needed. Set `SMARTGST_API_PORT` explicitly to keep the Vite proxy aligned.

## Environment Variables

Defined in the root `.env` (see `.env.example`). Never commit `.env`.

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | Full MongoDB connection string |
| `MONGODB_DATABASE` | Yes | Database name (`smartgst`) |
| `SMARTGST_API_PORT` | No | API port (default 5000) |
| `SESSION_SECRET` | Recommended | Long random string. If empty, a random key is generated and stored in MongoDB. |
| `GEMINI_API_KEY` | No | Enables receipt OCR. Leave empty to disable. |
| `GEMINI_MODEL` | No | Defaults to `gemini-2.5-flash` |
| `GEMINI_API_VERSION` | No | Keep as `v1beta` (JSON mode needs it) |
| `CLAIM_LEGACY_DATA` | No | Default `false`. When `true`, ownerless legacy invoices and reminders are assigned to the next account created. Use only for a single-user upgrade from the old SQLite version. |

## Receipt OCR (Optional)

1. Create a free key at <https://aistudio.google.com/apikey>.
2. Set `GEMINI_API_KEY` in `.env` and restart the API.

Details:
- Gemini reads JPEG, PNG, WEBP and PDF directly, so no Poppler or Tesseract install is needed.
- The free tier is rate limited. The app allows 5 uploads per minute per user. On quota exhaustion the API returns `429`, and manual entry still works.
- With no key, the upload endpoint returns a clear configuration error (`503`) and never fakes data.
- Model output is untrusted: GSTIN, date, state and amount are re-validated on the server before reaching the review form.
- Uploaded receipts are sent to Google's API and leave your machine.

## App Screens

| Route | Screen |
|---|---|
| `/` | Dashboard |
| `/invoices` | Invoice list: search, filter, view, edit, delete, print |
| `/add` | Add transaction (with live tax breakdown) |
| `/calculator` | GST calculator |
| `/upload` | Receipt upload and review form |
| `/errors` | Error detection (records checked, passed, issues) |
| `/calendar` | Compliance calendar |
| `/returns` | GSTR-1 and GSTR-3B views |
| `/reports` | Reports with CSV/PDF export |
| `/profile` | Business profile |
| `/settings` | Settings |
| `/help` | Help |

The financial year selector (for example `2026-27`) filters the dashboard, invoices, returns and reports. English/Hindi can be switched from the navbar.

## API Reference

All routes are under `/api`. Everything except `/api/health` and `/api/auth/*` requires a logged-in session.

**Auth**

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create account and workspace (rate limited) |
| POST | `/auth/login` | Sign in (rate limited) |
| POST | `/auth/logout` | Sign out |
| GET | `/auth/me` | Current session user |

**Invoices**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/invoices?fy=2026-27` | List invoices |
| POST | `/invoices` | Create invoice |
| PUT | `/invoices/:id` | Update invoice |
| DELETE | `/invoices/:id` | Delete invoice |
| POST | `/invoices/validate`, `/validate` | Validate an invoice body without saving |

**Dashboard, tasks, profile**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/dashboard?fy=` | Dashboard totals |
| GET / POST | `/tasks` | List / add reminders (also at `/dashboard/tasks`) |
| PATCH / DELETE | `/tasks/:id` | Toggle completion / delete |
| GET / PUT | `/profile` | Read / save business profile |

**GST, reports, OCR**

| Method | Endpoint | Description |
|---|---|---|
| POST | `/calculate` | Compute tax split |
| GET | `/returns?fy=` | GSTR-1 / GSTR-3B summaries |
| GET | `/returns.pdf` | Returns PDF |
| GET | `/reports.csv` | CSV report |
| GET | `/reports.pdf` | PDF report |
| GET | `/ocr/status` | Whether OCR is configured |
| POST | `/ocr` | Upload receipt (multipart field `file`) |
| GET | `/health` | Health check (database name, OCR configured) |

## How the Core Logic Works

**Tax calculation (`backend/utils/tax.js`).** All arithmetic is done in integer paise and converted to rupees at the end. If the seller and buyer state match, the tax is intra-state (CGST + SGST); otherwise it is inter-state (IGST). For intra-state, the odd paise goes to SGST so `cgst + sgst === gst` always holds, which keeps GSTR-1 summaries consistent with their detail rows.

**Validation (`backend/utils/validators.js`).**
- *Errors* block saving: missing required fields, invalid or impossible date, amount not above zero, unsupported rate, invalid transaction type, duplicate invoice number for the same transaction type.
- *Warnings* flag but allow: malformed GSTIN, future-dated invoice.
- GSTIN pattern checked: `^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$`.

**Financial year (`backend/utils/fy.js`).** A value like `2026-27` maps to `2026-04-01` through `2027-03-31`. Dates are stored as `YYYY-MM-DD` strings, which is why date validation runs on the way in: a malformed date would otherwise silently drop out of FY-filtered views.

**Data layer.** Models are thin helpers over MongoDB collections (no ODM). Numeric IDs for invoices and tasks come from an atomic `counters` collection, and every query is scoped by `userId`.

**Legacy migration.** If an old `backend/smartgst.db` (SQLite) exists, its invoices and tasks are copied into MongoDB once. The file is not deleted and is not the active database.

## Security

- bcrypt password hashing; HTTP-only, `sameSite=lax` session cookies (`secure` in production)
- Sessions stored in MongoDB; `SESSION_SECRET` configurable
- Tenant-scoped data access on every protected route
- In-memory rate limiting: sign-in attempts per email (10 per 15 min) and per IP (50 per 15 min), 300 API requests per minute per user, 5 OCR uploads per minute (sliding window)
- Rate limits are per-process, so they reset on restart and are not shared across instances
- Real credentials never belong in `.env.example` (it is tracked by Git). Rotate any database password that has been pasted into chat or logs.

## Testing

```bash
npm test
```

Runs `node --test` over `backend/tests/`, covering GST math, financial-year logic, invoice validation, CSV export, dashboard buckets, date validation, invoice fields, legacy-data claiming, rate limiting, Gemini OCR (with an injected transport) and the upload contract. No test needs MongoDB, an API key or network access. End-to-end API checks need a reachable MongoDB URI.

`npm run build` compiles the frontend.

## Prototype Limitations

- Sample records and due dates are illustrative, not official deadlines or business records.
- Tax treatment depends on supply type, place of supply, exemptions, notifications, registration and current law; the demo uses only same-state vs different-state rules.
- GSTR outputs are prototype PDFs, with no portal integration or filing.
- OCR fields are model suggestions that need human review; poor scans may fail.
- No email verification, password reset or production-grade threat protection.
- Some backend and dynamic validation messages remain in English.

