# SmartGST — Automated GST Compliance Assistant

SmartGST is a web-based GST compliance assistant designed to help Indian small businesses manage invoices, calculate GST, identify common invoice errors, track compliance activities, and prepare GST return summaries through a single dashboard.

The project focuses on simplifying routine GST-related operations through an organized interface, automated calculations, rule-based validation, and AI-powered receipt data extraction.

> **Project Status:** Hackathon prototype. GST calculations and compliance workflows use demo assumptions and should not be treated as professional tax or legal advice.

---

## Features

### 1. Dashboard
- Centralized business dashboard.
- Overview of invoices and GST-related information.
- Summary of compliance activities.
- Quick access to important workspace features.

### 2. Authentication and User Profile
- User registration and login.
- Session-based authentication.
- Protected backend routes.
- User profile management.
- Business details used for GST-related calculations.

### 3. Invoice Management
- Create and manage invoices.
- View saved invoice records.
- Edit and review invoice details.
- Store invoice information for business tracking.

### 4. GST Calculator
- Calculate GST using applicable demo tax rates.
- Intra-state transactions: CGST + SGST.
- Inter-state transactions: IGST.
- Seller state is taken from the authenticated user's business profile.
- Supports GST-related invoice calculations.

### 5. AI-Powered Receipt OCR
- Upload receipt images and PDF documents.
- Extract text and relevant invoice fields using Google Gemini Vision.
- Validate and normalize extracted information.
- Review extracted data before using it in the application.

**OCR configuration:**
- Provider: Google Gemini API.
- Default model: `gemini-2.5-flash`.
- Model can be configured through environment variables.
- Uses Gemini Vision with inline file data.
- Supports image and PDF processing without requiring local Tesseract or Poppler installation.

### 6. Invoice Error Detection
- Rule-based invoice validation.
- Identify common GST-related inconsistencies.
- Validate extracted invoice information.
- Highlight issues that may require manual review.

### 7. Compliance Calendar
- Track compliance-related tasks.
- View pending and completed activities.
- Organize important GST-related reminders.

### 8. GST Returns
- Prepare GST return summaries.
- Review invoice-related tax information.
- Generate prototype return reports.

### 9. Reports and Export
- Generate business reports.
- Export supported data in CSV format.
- Generate PDF reports.

### 10. Multilingual Interface
- English language support.
- Hindi language support.
- Centralized translation files.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript |
| Styling | CSS, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| Authentication | Session-based authentication |
| AI / OCR | Google Gemini API |
| Testing | Node.js test runner |
| PDF Generation | PDF generation utilities |
| Version Control | Git and GitHub |

---

## Project Folder Structure

```text
SmartGST/
├── backend/
│   ├── config/
│   │   ├── db.js
│   │   ├── env.js
│   │   ├── migrateLegacy.js
│   │   ├── mongoSessionStore.js
│   │   └── ocr.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── complianceController.js
│   │   ├── dashboardController.js
│   │   ├── gstController.js
│   │   ├── invoiceController.js
│   │   ├── ocrController.js
│   │   ├── profileController.js
│   │   └── reportController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── errorMiddleware.js
│   │   └── uploadMiddleware.js
│   ├── models/
│   │   ├── ComplianceTask.js
│   │   ├── GSTReturn.js
│   │   ├── Invoice.js
│   │   └── User.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── dashboardRoutes.js
│   │   ├── gstRoutes.js
│   │   ├── invoiceRoutes.js
│   │   ├── profileRoutes.js
│   │   └── taskRoutes.js
│   ├── tests/
│   │   ├── businessLogic.test.js
│   │   ├── ocrGemini.test.js
│   │   └── uploadContract.test.js
│   ├── uploads/
│   ├── utils/
│   │   ├── fy.js
│   │   ├── generatePDF.js
│   │   ├── generateToken.js
│   │   ├── responseHandler.js
│   │   ├── tax.js
│   │   └── validators.js
│   ├── .env.example
│   ├── dev.js
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
│
├── frontend/
│   ├── layout/
│   │   ├── Navbar.jsx
│   │   └── Sidebar.jsx
│   ├── pages/
│   │   ├── Dashboard/
│   │   │   └── DashboardPage.jsx
│   │   ├── GSTReturns/
│   │   │   └── ReturnsPage.jsx
│   │   ├── Invoices/
│   │   │   ├── AddInvoicePage.jsx
│   │   │   └── InvoicesPage.jsx
│   │   ├── Login/
│   │   │   └── AuthPage.jsx
│   │   ├── NotFound/
│   │   │   └── NotFoundPage.jsx
│   │   ├── Profile/
│   │   │   └── ProfilePages.jsx
│   │   ├── Reports/
│   │   │   └── ReportsPage.jsx
│   │   └── WorkspacePages.jsx
│   ├── public/
│   │   ├── assets/
│   │   ├── icons/
│   │   └── images/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── charts/
│   │   │   ├── common/
│   │   │   │   ├── Empty.jsx
│   │   │   │   ├── Field.jsx
│   │   │   │   └── Stat.jsx
│   │   │   ├── dashboard/
│   │   │   ├── gst/
│   │   │   └── invoices/
│   │   │       ├── EditInvoice.jsx
│   │   │       └── InvoiceDetails.jsx
│   │   ├── constants/
│   │   │   ├── invoice.js
│   │   │   └── states.js
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── locales/
│   │   │   ├── en.json
│   │   │   ├── hi.json
│   │   │   └── i18n.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── utils/
│   │   │   └── format.js
│   │   ├── App.jsx
│   │   ├── auth.css
│   │   ├── main.jsx
│   │   ├── modal.css
│   │   └── style.css
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── .env.example
├── .gitignore
├── COVEXCODE.md
├── package.json
├── package-lock.json
├── README.md
└── SmartGST Problem Breif Updated.pdf
```

### Backend Directory

| Directory / File | Purpose |
|---|---|
| `config/` | Database, environment, session store and OCR configuration |
| `controllers/` | Handles application requests and business operations |
| `middleware/` | Authentication, error handling and file upload processing |
| `models/` | Database models and data structures |
| `routes/` | Defines API endpoints |
| `tests/` | Backend business logic, OCR and upload tests |
| `uploads/` | Upload-related directory |
| `utils/` | GST calculations, validation, PDF generation and helper functions |
| `server.js` | Backend application entry point |
| `dev.js` | Local development startup script |

### Frontend Directory

| Directory / File | Purpose |
|---|---|
| `layout/` | Shared application layout components |
| `pages/` | Main application pages |
| `public/` | Public static assets |
| `src/components/` | Reusable UI components |
| `src/constants/` | Shared application constants |
| `src/context/` | Context-related application code |
| `src/hooks/` | Custom React hooks |
| `src/locales/` | English and Hindi translations |
| `src/services/` | API communication |
| `src/utils/` | Formatting and helper functions |
| `src/App.jsx` | Main application component |
| `src/main.jsx` | Frontend entry point |

---

## Prerequisites

Make sure the following are installed:

- Node.js 22 or later.
- npm.
- MongoDB database (local MongoDB or MongoDB Atlas).
- Google Gemini API key for OCR functionality.
- Git (optional, for cloning the repository).

---

## Installation and Setup

### 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd SmartGST
```

### 2. Install Dependencies

Install root-level dependencies:

```bash
npm install
```

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root using the root `.env.example` as a reference.

Also configure the backend and frontend environment files if their respective `.env.example` files contain required variables.

**Backend / root configuration**

Typical configuration includes:

```env
MONGODB_URI=your_mongodb_connection_string
DB_NAME=your_database_name
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_API_VERSION=v1beta
```

Use the exact variable names and any additional required values from the supplied environment example files.

**Frontend configuration**

Refer to `frontend/.env.example` for the required frontend variables.

Never commit actual API keys, database credentials, session secrets or other sensitive environment values to GitHub.

### 4. Start the Application

For local development, use the startup script configured in the project.

From the backend directory:

```bash
cd backend
npm run dev
```

Alternatively, use the root-level development script if configured in the root `package.json`.

The frontend and backend development services are started according to the project's development configuration.

---

## OCR Configuration

SmartGST uses Google Gemini Vision to extract information from uploaded receipts and invoices.

To enable OCR:

1. Obtain a Gemini API key from Google AI Studio.
2. Add the key to the appropriate local `.env` file.
3. Configure the model using `GEMINI_MODEL`.
4. Set `GEMINI_API_VERSION=v1beta` if required by the project configuration.
5. Restart the backend server.

Default model:

```env
GEMINI_MODEL=gemini-2.5-flash
GEMINI_API_VERSION=v1beta
```

The OCR feature sends uploaded receipt content to Google's Gemini API for processing. Avoid uploading sensitive documents unless you are comfortable with this data processing.

The project is configured to use the Gemini API; it does not include a paid-provider fallback.

---

## Running Tests

Backend tests are available in the `backend/tests/` directory.

Run the test suite:

```bash
cd backend
npm test
```

The tests cover business logic, Gemini OCR request behavior and upload validation contracts.

---

## Building the Frontend

Navigate to the frontend directory:

```bash
cd frontend
npm run build
```

The production build is generated by Vite in the frontend build output directory.

---

## Important Project Notes and Limitations

- SmartGST is a hackathon prototype, not a production-ready GST filing platform.
- GST calculations use explicitly defined demo assumptions.
- Tax calculations and validation results should be independently verified before real business use.
- Generated GST return summaries are not official government return forms.
- The application does not directly submit returns to the GST portal.
- OCR results may contain inaccuracies and should be reviewed before saving or using them.
- Authentication and security features require further hardening before production deployment.
- Compliance reminders are intended for demonstration and tracking purposes.

---

## Future Improvements

- Integration with official GST services, subject to API access and authorization.
- More comprehensive GST validation rules.
- Improved OCR accuracy and confidence-based review.
- Advanced compliance reminders and notifications.
- More detailed financial analytics and reporting.
- Production-grade security and audit logging.
- Automated deployment and monitoring.

---

## Contributing

Contributions, suggestions and bug reports are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Test the changes locally.
5. Submit a pull request.

---

## License

No license has been specified yet. All rights are reserved unless a license is added to the repository.

---

**SmartGST — Simplifying GST compliance for small businesses.**
