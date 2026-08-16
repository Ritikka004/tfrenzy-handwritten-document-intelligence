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
                          │ PostgreSQL 15 / Fallback  │
                          └───────────────────────────┘
```

---

## ⚡ Quick Start & Development

### 1. Prerequisites
- Node.js (v18+)
- npm (v9+)
- Docker & Docker Compose (optional for live PostgreSQL database)

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

### 5. Production Build & Execution
```bash
npm run build
npm start
```

---

## 🛡️ Pipeline & Ingestion Workflow

1. **Document Upload**: Ingests images (`.png`, `.jpg`, `.jpeg`) or multi-page `.pdf` files up to **15 MB** stored securely under `backend/uploads/`.
2. **OpenCV Quality Gate**: Evaluates Laplacian blur score, brightness histogram, DPI resolution, and rotation angle. Rejects degraded images.
3. **Cascading OCR Engine**: Cascades from lightweight PP-v6 Mobile Edge to TrOCR Transformer on low-confidence regions.
4. **Field Validation Engine**: Evaluates regex rules (Mobile numbers, Dates, Vehicle registration IDs, Employee IDs) and computes confidence levels.
5. **Human-in-the-loop Verification**: Verifiers review bounding regions, inspect validation badges, and submit corrections without overwriting original raw OCR output.
6. **Persistence**: Saves records, corrections, job states, and audit trails to PostgreSQL with automatic development fallback.

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

> **Note**: If PostgreSQL is offline or Docker is not running, the application catches the connection error cleanly and activates a persistent development fallback store so all APIs and offline mock features remain 100% operational.

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
- **PostgreSQL Live Persistence**: Live database persistence verification requires Docker or an active local PostgreSQL server listening on port `5432`.
