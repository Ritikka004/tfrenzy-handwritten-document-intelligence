# Live Demonstration & Recording Walkthrough Guide

This document provides step-by-step instructions for performing a live demonstration or recorded walkthrough of the **TFrenzy Intelligent Handwritten Document Digitisation and Validation Platform**.

---

## 1. Demo Preparation & Environment Checklist

1. Ensure the Node/Express server and Vite frontend are running:
   ```bash
   cmd /c "npm run dev"
   ```
2. Open browser to `http://localhost:3000`.
3. Verify sample uploaded documents are available in `backend/uploads/`.

---

## 2. Step-by-Step Live Walkthrough Script

### Step 1: Login & System Dashboard (1 Minute)
- Log into the application as Administrator.
- Navigate to the **Data Quality Dashboard** view.
- Point out key metrics: Total Documents Processed, Straight-Through Processing (STP) Rate ($88.5\%$), Average Confidence ($91.4\%$), and Average Latency ($42.5\text{ ms}$).

### Step 2: Document Ingestion & Quality Assessment (2 Minutes)
- Navigate to **Upload Documents**.
- Select the **Visitor Register** document template.
- Upload `sample_visitor_1.jpg` or use camera capture.
- Show the **Image Quality Assessment** card: point out Laplacian blur score, brightness check, resolution DPI, and deskew angle.

### Step 3: Processing Queue & Region Detection (1 Minute)
- Navigate to **Processing Queue**.
- Watch real-time progress indicators: Preprocessing ($50\%$) $\rightarrow$ Text Detection $\rightarrow$ Dual-Tier OCR Inference $\rightarrow$ Rule Validation ($100\%$).

### Step 4: Verification Workspace & Field Corrections (3 Minutes)
- Click **"Verify Document"** to open the side-by-side verification interface.
- Highlight confidence color codes:
  - Green for high-confidence auto-accepted fields.
  - Yellow/Red for low-confidence or rule-failing fields.
- Demonstrate human correction: Edit an OCR prediction (e.g. correct `"Amit Kr"` to `"Amit Kumar"`).
- Save verification. Point out audit log creation.

### Step 5: Template Configuration & Bounding Boxes (2 Minutes)
- Open **Template Configuration**.
- Click **Visitor Register Template**. Show configured field types (Name, Mobile, Vehicle Number) and bounding box coordinate overlays.

### Step 6: Dataset Export & Model Performance (2 Minutes)
- Open **Dataset Manager**.
- Demonstrate exporting human corrections into a PyTorch/TrOCR training dataset (`.json` format).
- Open **Model Performance**. Show CER ($1.42\%$), WER ($3.18\%$), and Jetson TensorRT FP16 benchmark comparisons.

### Step 7: Data Export (1 Minute)
- Open **Export Centre**.
- Trigger a CSV export of verified records. Download and open the generated CSV file.

---

## 3. End of Demonstration Checklist

- All 9 web application screens demonstrated.
- End-to-end processing flow verified from upload to database persistence and export.
- Audit feedback loop demonstrated.
