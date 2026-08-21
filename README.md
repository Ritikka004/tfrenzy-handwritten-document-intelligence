# TFrenzy Handwritten Document Intelligence Platform

High-performance, edge-capable document intelligence platform designed to ingest, assess quality, preprocess, extract handwritten text using cascading OCR engines, validate extracted structured records, support human-in-the-loop verification, and persist data to PostgreSQL.

---

## 🏗️ Architecture Overview

```
                          ┌───────────────────────────┐
                          │   React SPA (Vite + TS)   │
                          └─────────────┬─────────────┘
                                        │ REST API
                          ┌─────────────▼─────────────┐
                          │   Express Node.js Server  │
                          └──────┬─────────────┬──────┘
                                 │             │
              ┌──────────────────▼──┐       ┌──▼─────────────────┐
              │  OpenCV Quality     │       │ Hybrid OCR Engine  │
              │  Preprocessing      │       │ (PaddleOCR + TrOCR)│
              └─────────────────────┘       └────────────────────┘
                                 │             │
                          ┌──────▼─────────────▼──────┐
                          │ PostgreSQL 15              │
                          └───────────────────────────┘
```

---

## ⚡ Quick Start & Development

### 1. Prerequisites
- Node.js (v18+)
- npm (v9+)
- Docker & Docker Compose (required for local PostgreSQL-backed operation)

### 2. Installation
```bash
npm install
```

### 3. Environment Setup
Copy `.env.example` to create your local `.env` file:
```bash
cp .env.example .env
```

### 4. Running Local Development Server
```bash
npm run dev
```
Access the application at `http://localhost:3000`.

The development server requires `JWT_SECRET_KEY` in `.env`. Use a long random
value and never commit a real secret.

### 5. Production Build & Execution
```bash
npm run build
npm start
```

---

## 🛡️ Pipeline & Ingestion Workflow

1. **Document Upload**: Ingests images (`.png`, `.jpg`, `.jpeg`) or multi-page `.pdf` files up to **15 MB** stored securely under `backend/uploads/`.
2. **OpenCV Quality Gate**: Evaluates Laplacian blur score, brightness histogram, DPI resolution, and rotation angle. Rejects degraded images.
3. **Cascading OCR Engine**: Cascades from the configured lightweight OCR provider to TrOCR on low-confidence regions.
4. **Field Validation Engine**: Evaluates regex rules (Mobile numbers, Dates, Vehicle registration IDs, Employee IDs) and computes confidence levels.
5. **Human-in-the-loop Verification**: Verifiers review bounding regions, inspect validation badges, and submit corrections without overwriting original raw OCR output.
6. **Persistence**: Saves records, corrections, job states, exports, and audit trails to PostgreSQL. Production refuses to start without PostgreSQL.

---

## 🗄️ PostgreSQL Setup & Docker

To launch PostgreSQL via Docker Compose:
```bash
docker compose up -d postgres
```

- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `tfrenzy_doc_db`
- **User**: `tfrenzy_user`
- **Password**: `securepassword`

> **Note**: PostgreSQL is the persistence source of truth. Production startup fails closed when it cannot connect. Development may expose the existing in-memory demo fallback, but it must not be used for production data.

## Authentication and API areas

The application uses signed, expiring HMAC bearer sessions. Operational APIs require
the authenticated token; role checks protect uploads, processing, verification,
exports, templates, models, and datasets. Main API areas include `/api/auth`,
`/api/documents`, `/api/queue`, `/api/verification`, `/api/export`,
`/api/duplicates`, `/api/dashboard`, and `/api/audit-logs`.

## Canonical fields and workflow behavior

Active structured records use exactly six canonical fields:

- `visitor_name`
- `mobile_number`
- `visit_date`
- `host_employee_id`
- `vehicle_number`
- `passes_issued_quantity`

Original OCR text is retained when a verifier submits a correction; the corrected
final value and correction metadata are stored separately. Failed processing jobs
include a failure reason and can be retried only when `retryable` is true. Completed
jobs are not processed again.

---

## 🧪 Testing & Verification

- **TypeScript Typecheck**:
  ```bash
  npx tsc --noEmit
  ```
- **Production Build Check**:
  ```bash
  npm run build
  ```

---

## 📌 Environment Constraints & Known Limitations
- **PostgreSQL Live Persistence**: PostgreSQL or Docker must be available on port `5432`; production will not silently fall back to memory.

## 🚀 Production Deployment

### Local development
```bash
npm install
npm run dev
```

### Production build
```bash
npm run build
```

### Render
Create a Render PostgreSQL database and a Node Web Service connected to the
`development` branch. Use `npm install && npm run build` as the build command,
`npm start` as the start command, and `/api/health` as the health check path.
Set `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET_KEY`, `DEMO_ADMIN_EMAIL`,
`DEMO_ADMIN_PASSWORD`, `OCR_PROVIDER`, `PYTHON_EXECUTABLE`,
`HANDWRITING_OCR_MODEL`, and `CORS_ORIGIN` in Render's environment settings.
Run `alembic upgrade head` against the Render PostgreSQL database before the
service starts. Do not commit database URLs or secrets.

### Netlify
Connect the `development` branch with build command `npm run build` and
publish directory `dist`. Set `VITE_API_BASE_URL` to
`https://YOUR-RENDER-SERVICE.onrender.com` so browser API requests reach the
Render backend. Configure real secrets only in provider environment settings;
never commit them to the repository.
