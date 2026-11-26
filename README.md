# SmartGST — Automated GST Compliance Assistant

SmartGST is a responsive prototype designed to help Indian small businesses manage their invoices, calculate GST, review transaction errors, track compliance reminders, and prepare GST return summaries.

It combines invoice management, GST calculations, rule-based validation, compliance tracking, and optional AI-powered receipt extraction in one application.

## Project Overview

SmartGST helps small business owners simplify everyday GST-related activities through an easy-to-use interface.

The application supports:
- Recording and managing sales and purchase invoices.
- Calculating GST using configurable demo tax rates.
- Identifying potential invoice errors through rule-based validation.
- Tracking sample GST compliance reminders.
- Preparing GST return summaries and downloadable reports.
- Extracting receipt information using Google Gemini Vision.

## Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS
- React Router
- Recharts
- Lucide React

### Backend
- Node.js
- Express.js
- MongoDB
- MongoDB-backed HTTP sessions
- PDFKit
- Google Gemini API (optional receipt OCR)

## Project Structure

```text
SmartGST/
├── frontend/
│   ├── src/
│   ├── pages/
│   └── ...
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── tests/
│   └── ...
├── .env.example
├── README.md
└── ...
```

The backend uses MongoDB for active application data and session storage.

The old `backend/smartgst.db` SQLite file is retained as a migration source when present. Legacy invoices and tasks are copied into MongoDB once, without deleting the original SQLite file.

## Features

### 1. Authentication and User Management
- Business registration and login.
- Password hashing using bcrypt.
- MongoDB-backed HTTP sessions.
- Protected APIs with tenant-scoped data access.
- No hardcoded demo credentials or passwordless login.

### 2. Invoice Management
- Create, view, update, and delete invoices.
- Search and filter sales and purchase invoices.
- Printable invoice details.
- Invoice validation and duplicate detection.
- Dynamic dashboard totals.

### 3. GST Calculation
- Intra-state transactions use CGST and SGST.
- Inter-state transactions use IGST.
- Configurable demonstration tax rates.
- Tax calculations based on explicit demo assumptions.

### 4. Dashboard and Reports
- Financial-year-filtered dashboard.
- Invoice listing and transaction summaries.
- GST return summaries.
- CSV and PDF report generation.
- GSTR-1 and GSTR-3B prototype PDF downloads.

### 5. Compliance Calendar
- Sample GST compliance reminders.
- Calendar-based task tracking.
- Mark reminders as completed.
- Create custom compliance tasks.

### 6. Receipt OCR using Gemini Vision
- Upload receipt images and PDF documents.
- Extract receipt information using Google Gemini Vision.
- Native PDF processing without requiring Poppler.
- Server-side validation of extracted fields.
- Manual invoice entry remains available if OCR is unavailable.

### 7. Multilingual Interface
- English and Hindi translation support.
- Translations for primary navigation, dashboard, invoice forms, GST tools, calendar, reports, profile, settings, login, and help screens.
- Some backend-generated and dynamic validation messages may remain in English.

## Requirements

Before running the project, ensure you have:

- Node.js 22 or newer.
- MongoDB Atlas account or a reachable MongoDB server.
- npm.
- Google Gemini API key (optional, required only for receipt OCR).

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Sakshibansal027/SmartGst.git
cd SmartGst
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
copy .env.example .env
```

Open the root `.env` file and configure the required variables.

Set your MongoDB connection details:

```env
MONGODB_URI=your_mongodb_connection_string
MONGODB_DATABASE=smartgst
```

For MongoDB Atlas:
1. Open MongoDB Atlas.
2. Navigate to Connect → Drivers.
3. Copy the connection string.
4. Replace the placeholders with your database credentials.
5. URL-encode special characters in your database password.
6. Allow your current IP address under Network Access.

Keep your actual `.env` file private. Never commit API keys or database credentials to GitHub.

### 3. Install Dependencies

From the project root:

```bash
npm run install:all
```

Alternatively, install dependencies separately:

```bash
cd frontend
npm install
```

```bash
cd ../backend
npm install
```

### 4. Run the Application

You can start the development environment from the project root:

```bash
npm run dev
```

Alternatively, run the development command from the `frontend/` directory:

```bash
npm run dev
```

The development launcher starts the Express API and Vite frontend together.

Open the local Vite URL displayed in the terminal.

**Note:**
- Vite uses port 5173 by default.
- If the port is occupied, Vite automatically selects another available port.
- The API defaults to port 5000 and the launcher searches nearby available ports when necessary.
- Set `SMARTGST_API_PORT` explicitly when you need a fixed API port aligned with the Vite proxy.

### 5. Run Only the Backend

To start only the API:

```bash
npm run start --prefix backend
```

## Receipt OCR Setup (Optional)

SmartGST uses the Google Gemini API for receipt extraction.

### 1. Generate a Gemini API Key

Create a free API key using Google AI Studio:

https://aistudio.google.com/apikey

### 2. Configure the API Key

Add the following to your root `.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key
```

The default model is:

```env
GEMINI_MODEL=gemini-2.5-flash
GEMINI_API_VERSION=v1beta
```

The configured model must support vision input.

### 3. Restart the Backend

Restart the development server after configuring the key.

**Important OCR Notes:**
- Receipt extraction uses the Google Gemini API free tier.
- No billing-enabled paid fallback is configured.
- Gemini supports JPEG, PNG, WEBP, and PDF input.
- PDFs are processed directly without requiring Poppler.
- OCR is unavailable until `GEMINI_API_KEY` is configured.
- Free-tier requests are subject to Google's rate limits.
- When the quota is reached, the upload endpoint returns HTTP 429.
- Manual invoice entry remains available even when OCR is unavailable.

Check the current model-specific quota limits in Google AI Studio before relying on OCR during a demonstration.

## Authentication and Demo Data

SmartGST does not provide hardcoded demo credentials or passwordless login.

To use the application:

1. Open the application.
2. Select **Register your business**.
3. Create an account.
4. Log in using your registered credentials.

New accounts receive sample invoice and reminder records to demonstrate dashboard, invoice, and reporting functionality.

Sessions are stored in MongoDB.

For deployments, configure `SESSION_SECRET` with a long random value. If it is omitted, the prototype stores a randomly generated persistent key in MongoDB.

## Testing and Verification

### Backend Tests

Run the backend test suite:

```bash
cd backend
npm test
```

The tests cover:
- Intra-state and inter-state GST calculations.
- Financial-year date selection.
- Invoice validation.
- Receipt field extraction and normalization.
- Gemini API response handling.
- Free-tier quota error handling.
- Invalid API key handling.
- Upload validation and multipart field contracts.

These deterministic tests do not require a database connection, Gemini API key, or network access.

### Frontend Production Build

Run the following commands from the `frontend/` directory:

```bash
cd frontend
npm run build
```

This generates the production build inside the `frontend/dist/` directory.

End-to-end API verification requires a reachable MongoDB URI configured locally.

## Privacy and Security

- MongoDB credentials and Gemini API keys must remain in the private `.env` file.
- Environment example files contain placeholders only.
- Passwords are hashed using bcrypt.
- Protected application APIs use authenticated sessions and tenant-scoped data access.
- Receipt uploads are sent to Google's Gemini API for OCR processing.
- Extracted information is validated by the backend before being returned.

Uploaded receipts may contain sensitive business information. Users should review Google's applicable API terms and privacy practices before uploading real business documents.

## Prototype Limitations

SmartGST is a functional prototype and is not a production-ready GST filing platform.

- Sample records and due dates are illustrative, not official GST filing deadlines or actual business records.
- GST calculations use same-state versus different-state demonstration assumptions. Actual tax treatment depends on supply type, place of supply, exemptions, notifications, registration, and current law.
- GST calculations and return summaries should be verified before being used for actual compliance.
- Downloadable return PDFs are prototype documents, not official GST forms or filing submissions.
- There is no direct GST portal integration.
- OCR output is a model-generated suggestion and requires human verification.
- Scanned, unclear, or low-quality documents may not be extracted correctly.
- Authentication does not currently include email verification, password reset, rate limiting, or production-grade threat protection.
- Some server-generated validation and connection error messages remain in English.

## Future Improvements

Potential improvements include:
- Direct GST portal integration.
- More comprehensive GST rule validation.
- Improved receipt extraction and error detection.
- Advanced analytics and business insights.
- Stronger authentication and production security.
- Expanded Hindi and multilingual coverage.

## License

This project is developed as a prototype for educational and demonstration purposes.
