# TFrenzy Project 1: Intelligent Handwritten Document Digitisation and Validation Platform
## Phase 1 Architecture & Technical Specification

---

## 1. System Overview & Objectives
The **TFrenzy Intelligent Handwritten Document Digitisation and Validation Platform** is an enterprise-grade document intelligence platform built to eliminate manual data entry from handwritten forms (e.g., Visitor Registers, Safety Inspection Forms, Maintenance Checklists, Vehicle Entry Registers, Employee Info Forms).

Key platform capabilities:
- **Image Quality Gatekeeper**: Detects blur, dark/overexposed frames, perspective distortion, low resolution, and rotation before processing.
- **Advanced Preprocessing Engine**: Automated deskewing, perspective warping, noise removal, CLAHE contrast enhancement, line separation, and field boundary detection.
- **Replaceable Hybrid OCR Architecture**: Modular `IOCRService` decoupled via Strategy Pattern supporting fast edge inference (PaddleOCR PP-v6 / ONNX) and deep transformer recognition (TrOCR / TFrenzy-v1.3).
- **Rule-Based Validation Engine**: Real-time evaluation of Name, Mobile, Date, Vehicle Number, Employee ID, Quantity, and Checklist fields.
- **Human-in-the-Loop Verification Workspace**: Confidence-based triage (High: Auto-Accept, Medium: Fast Review, Low: Mandatory Manual Verification).
- **Audit-Safe Feedback Storage**: Raw OCR outputs are NEVER overwritten. Corrections form golden datasets for PyTorch model retraining.
- **Enterprise Operations & Edge Deployment**: Full support for Docker, Celery/Redis background queues, PostgreSQL relational schema, TensorRT Jetson engines, and REST/Webhook exports.

---

## 2. Complete Software Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                  USER / CLIENT LAYER                              |
|   React + TypeScript + Material UI + Vite SPA (Port 3000 / Web Browser / Camera)   |
+----------------------------------------+------------------------------------------+
                                         | REST API / JSON / WebSockets
                                         v
+-----------------------------------------------------------------------------------+
|                                BACKEND APPLICATION SERVICE                        |
|                     FastAPI / Express + Node / Python Gateway                     |
|                                                                                   |
|  +---------------------+   +---------------------+   +------------------------+  |
|  | Document Controller |   | Template Controller |   | Verification Controller|  |
|  +----------+----------+   +----------+----------+   +-----------+------------+  |
|             |                         |                          |                |
|  +----------v-------------------------v--------------------------v------------+  |
|  |                             Service Layer                                  |  |
|  | (Image Processing, Validation Engine, Audit Logging, Export Engine)        |  |
|  +------------------------------------+---------------------------------------+  |
+---------------------------------------|-------------------------------------------+
                                        |
     +----------------------------------+----------------------------------+
     | Task Queue Dispatch                                                 | Query / Persist
     v                                                                     v
+------------------------------------+                    +------------------------------------+
|  CELERY / REDIS ASYNC TASK QUEUE   |                    |       POSTGRESQL DATABASE          |
|                                    |                    | (18 Normalized Relational Tables)  |
| - Ingestion Pipeline               |                    | - documents, document_pages        |
| - Preprocessing & CLAHE            |                    | - template_fields, detected_regions|
| - Duplicate Detection (Image Hash) |                    | - ocr_predictions, human_corrections|
| - Model Inference Dispatch         |                    | - dataset_versions, audit_logs     |
+-----------------+------------------+                    +------------------------------------+
                  |
                  v
+-----------------------------------------------------------------------------------+
|                            REPLACEABLE OCR MODULE LAYER                           |
|                            (IOCRService Interface)                                |
|                                                                                   |
|  +--------------------------+  +--------------------------+  +-----------------+  |
|  |   PaddleOCR PP-v6 Tier   |  |  TrOCR Transformer Tier  |  |  ONNX / TensorRT|  |
|  |   (Fast Edge Execution)  |  |  (Deep Handwriting Engine|  |  Jetson Orin/   |  |
|  |                          |  |   for Low-Confidence)    |  |  Nano Engine    |  |
|  +--------------------------+  +--------------------------+  +-----------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 3. Technology Justification Matrix

| Component | Technology Selected | Technical Justification |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript + Vite | Rapid module reloading, strict static typing, modular component breakdown, and zero bundle bloat. |
| **UI Design System** | Material UI (MUI v9) + Lucide Icons | Standardized enterprise components, accessible form controls, flexible grid layouts, and clean visual hierarchy. |
| **Backend Framework** | Express / FastAPI | Asynchronous handling, high-throughput request handling, native OpenAPI/Swagger document generation, and easy integration with Python ML scripts. |
| **Database** | PostgreSQL | Enterprise ACID compliance, robust indexing for JSON/bounding box fields, array types, full auditability, and relational integrity. |
| **Task Queue** | Redis + Celery | Offloads CPU-bound OCR and heavy image processing operations from API worker threads to background queue workers. |
| **OCR Engines** | PaddleOCR + TrOCR | **PaddleOCR**: Ultra-fast mobile/edge inference (PP-OCRv6) for structured field detection.<br>**TrOCR**: Encoder-Decoder Vision Transformer for difficult cursive handwriting recognition. |
| **Image Processing** | OpenCV | Industry standard for C++/Python matrix manipulations (deskew, Laplacian variance blur detection, perspective transform, CLAHE). |
| **Model Runtime** | ONNX Runtime / TensorRT | Accelerates inference on standard x86 CPUs, ARM Jetson Nano, and Orin edge devices with FP16 precision. |

---

## 4. OCR Execution Pipeline & Confidence Logic

1. **Upload & Ingestion**: Document PDF/Image received with document type tag.
2. **Quality Validation**:
   - Blur Detection via `cv2.Laplacian(gray).var() < 100`.
   - Brightness Check via mean pixel value (Range: 40 - 220).
   - Resolution Check (`DPI >= 200`).
3. **Preprocessing**:
   - Rotation/Deskew via Hough Line Transform or MinAreaRect contour angle.
   - Contrast Enhancement using CLAHE (`clipLimit=2.0, tileGridSize=(8,8)`).
4. **Template Matching & Region Crop**:
   - Extract bounding box slices per field configured in `template_fields`.
5. **Two-Tier Model Inference**:
   - Run **Fast Edge Model** (PaddleOCR).
   - If confidence $< 0.75$, trigger **TrOCR Transformer Model** for refined handwriting prediction.
6. **Rule Validation**:
   - Regex & type check (Phone: 10 digits, Date: ISO, Vehicle: Reg pattern, Employee ID: Regex).
7. **Human-in-the-Loop Routing**:
   - **High Confidence ($\ge 0.85$) & Valid Rule**: Auto-accepted into `structured_records`.
   - **Medium Confidence ($0.65 - 0.84$)**: Highlighted on Verification Screen for fast review.
   - **Low Confidence ($< 0.65$) or Invalid Rule**: Flagged for mandatory human correction.
8. **Feedback Loop**:
   - Human corrections saved to `human_corrections` without altering original `ocr_predictions`.
   - Automated trigger to compile datasets in `dataset_versions` for fine-tuning PyTorch models.

---

## 5. Development Environment & Docker Setup
The repository includes containerized development and production Docker setups supporting GPU pass-through for Jetson devices and multi-container orchestration.
