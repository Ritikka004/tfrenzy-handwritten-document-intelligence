# TFrenzy Handwritten Document Intelligence Platform - REST API Reference

Comprehensive documentation for all REST API endpoints provided by the TFrenzy platform server (`server.ts`).

---

## 1. Authentication & Security Gateway

### 1.1 `POST /api/auth/login`
Authenticates user credentials and issues a JWT session token.

- **Request Body**:
  ```json
  {
    "email": "rithika@tfrenzy.ai",
    "password": "secretpassword",
    "role": "admin"
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user": {
      "id": "usr-001",
      "email": "rithika@tfrenzy.ai",
      "full_name": "Rithika",
      "role": "admin",
      "is_active": true
    }
  }
  ```

### 1.2 `GET /api/auth/me`
Retrieves currently authenticated user metadata.

- **Headers**: `Authorization: Bearer <access_token>`
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "id": "usr-001",
      "email": "rithika@tfrenzy.ai",
      "full_name": "Rithika",
      "role": "admin"
    }
  }
  ```

---

## 2. Preprocessing & Quality Assessment APIs

### 2.1 `POST /api/preprocessing/assess`
Evaluates raw document image quality (blur, illumination, resolution, tilt).

- **Content-Type**: `multipart/form-data` or `application/json`
- **Parameters**: `image` (file) or `imageBase64`
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "isBlurred": false,
      "blurScore": 245.8,
      "isDark": false,
      "brightnessScore": 142.5,
      "isOverexposed": false,
      "isCutOff": false,
      "estimatedRotationAngle": 0.0,
      "resolutionDpi": 300,
      "isAcceptable": true,
      "qualityIssues": []
    }
  }
  ```

### 2.2 `POST /api/preprocessing/process`
Executes OpenCV deskewing, perspective correction, CLAHE contrast tuning, and denoise filtering.

- **Request Body**:
  ```json
  {
    "imageBase64": "data:image/jpeg;base64,...",
    "enableDeskew": true,
    "enablePerspective": true,
    "enableClahe": true,
    "enableDenoise": true
  }
  ```

---

## 3. Document Ingestion & Processing Pipeline

### 3.1 `POST /api/documents/upload`
Uploads raw image or PDF form to the document ingestion pipeline.

- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `document`: Binary file (PNG, JPG, PDF up to 15MB)
  - `documentTypeId`: Document type ID (e.g. `doc-type-visitor`)
  - `templateId`: Template ID (e.g. `tpl-visitor-v1`)
  - `autoProcess`: `true` | `false`
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "id": "doc-visitor-104",
      "fileName": "visitor_log_aug16.jpg",
      "status": "preprocessing",
      "currentStage": "quality_check",
      "documentTypeId": "doc-type-visitor",
      "overallConfidence": 0.0,
      "uploadedAt": "2026-08-16T11:53:52Z"
    }
  }
  ```

### 3.2 `POST /api/documents/:id/process`
Triggers full asynchronous OCR extraction pipeline for uploaded document.

---

## 4. Verification Workspace & Field Corrections

### 4.1 `GET /api/documents/:id`
Retrieves document fields, OCR predictions, image quality metrics, and existing corrections.

### 4.2 `POST /api/documents/:id/corrections`
Saves human verifier corrections and updates field validation status without mutating original predictions.

- **Request Body**:
  ```json
  {
    "corrections": [
      {
        "fieldKey": "visitor_name",
        "originalText": "Amit Kr",
        "correctedText": "Amit Kumar",
        "notes": "Verified against ID proof"
      }
    ],
    "verifiedBy": "usr-001"
  }
  ```

---

## 5. Template Configuration APIs

### 5.1 `GET /api/templates` & `POST /api/templates`
Retrieves and creates document layout templates with field bounding boxes (`bboxX`, `bboxY`, `bboxWidth`, `bboxHeight`).

---

## 6. Analytics, Export & Model Evaluation APIs

### 6.1 `GET /api/dashboard/metrics`
Returns system KPIs (Straight-Through Rate, Average Confidence, HCR, Processing Time).

### 6.2 `POST /api/export/trigger`
Exports verified structured records to CSV, Excel, or JSON webhook.

### 6.3 `GET /api/dataset-versions` & `POST /api/dataset-versions/export`
Generates training datasets from human corrections for TrOCR model fine-tuning.
