# TFrenzy Intelligent Handwritten Document Platform - User Guide

Welcome to the **TFrenzy Intelligent Handwritten Document Digitisation and Validation Platform**! This end-user guide walks you through every screen, feature, and operational workflow of the application.

---

## Table of Contents
1. [Overview & Quick Start](#1-overview--quick-start)
2. [Upload Documents Page](#2-upload-documents-page)
3. [Processing Queue Page](#3-processing-queue-page)
4. [Verification Workspace Screen](#4-verification-workspace-screen)
5. [Document Search Page](#5-document-search-page)
6. [Template Configuration Page](#6-template-configuration-page)
7. [Data Quality Dashboard](#7-data-quality-dashboard)
8. [Export Centre](#8-export-centre)
9. [Model Performance Page](#9-model-performance-page)
10. [Dataset Manager Page](#10-dataset-manager-page)

---

## 1. Overview & Quick Start

The platform digitizes handwritten forms (Visitor Registers, Vehicle Registers, Safety Inspection Forms) into structured database records with automated rule validation and human-assisted verification.

### Launching the Application:
- Open your browser to `http://localhost:3000`
- Log in using your email and role credentials (`admin` / `verifier` / `auditor`).

---

## 2. Upload Documents Page

- **Upload Area**: Drag & drop image files (`.png`, `.jpg`, `.jpeg`) or multi-page PDFs.
- **Camera Capture**: Click **"Use Live Camera"** to capture forms directly from your webcam or tablet camera.
- **Document Type Selector**: Choose target template (e.g. *Visitor Register*, *Vehicle Entry Register*).
- **Quality Gatekeeper Alert**: If the image is blurry, too dark, or rotated, the system immediately flags quality issues and prompts for recapture before running OCR.

---

## 3. Processing Queue Page

- View all pending, processing, completed, and failed document jobs.
- Monitor real-time progress bars for preprocessing, region cropping, OCR recognition, and validation rule evaluation.
- Click **"View Document Details"** or **"Verify Document"** for completed jobs.

---

## 4. Verification Workspace Screen

- Side-by-Side Comparison: View original handwritten image crop alongside extracted OCR values.
- Confidence Highlighting:
  - 🟩 **Green (High Confidence $\ge 85\%$)**: Auto-accepted values.
  - 🟨 **Yellow (Medium Confidence $65\% - 84\%$)**: Highlighted for quick check.
  - 🟥 **Red (Low Confidence $< 65\%$ or Rule Failure)**: Requires manual editing.
- Save Corrections: Click **"Save Verification & Approve"**. All human edits are stored as audit records for model retraining.

---

## 5. Document Search Page

- Filter processed records by document type, verification status, date range, or keyword search.
- View extracted field details, audit history, and individual crop bounding boxes.

---

## 6. Template Configuration Page

- Define form field definitions: Name, Mobile Number, Date, Vehicle Number, Employee ID, Quantity, Checklist.
- Configure validation rules: Expected digit count, regex patterns, allowed numeric ranges.
- Draw and adjust bounding box percentages (`bboxX`, `bboxY`, `bboxWidth`, `bboxHeight`).

---

## 7. Data Quality Dashboard

- Track overall system KPIs:
  - Total Documents Processed
  - Documents Awaiting Verification
  - Straight-Through Processing (STP) Rate
  - Average Processing Time & Confidence
  - Fields Corrected by Users
- View charts for **Accuracy by Field** and **Most Frequently Misread Characters**.

---

## 8. Export Centre

- Export verified structured records to **CSV**, **Excel (.xlsx)**, or **JSON API Webhooks**.
- Filter exports by date range and document type.

---

## 9. Model Performance Page

- Compare accuracy metrics across OCR models: PaddleOCR PP-OCRv6, TrOCR Transformer, and TFrenzy Fine-Tuned v1.3.
- Evaluate Character Error Rate (CER), Word Error Rate (WER), and Jetson memory/latency stats.

---

## 10. Dataset Manager Page

- Package human corrections into fine-tuning datasets.
- Export annotations in standard JSON/COCO format with train/val/test splits for PyTorch training.
