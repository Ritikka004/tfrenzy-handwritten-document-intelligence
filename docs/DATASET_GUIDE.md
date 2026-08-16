# TFrenzy Handwritten Dataset Structure & Labelling Guide

This document defines the dataset organization, JSON annotation schema, image pre-processing guidelines, and data augmentation pipeline used for fine-tuning TrOCR and PaddleOCR models on human-verified handwritten corrections.

---

## 1. Directory Hierarchy

Human verification corrections captured on the Verification Screen are packaged into training dataset versions:

```
./backend/exports/dataset_v1.4/
├── images/
│   ├── visitor_register/
│   │   ├── doc-visitor-001_visitor_name.png
│   │   ├── doc-visitor-001_mobile_number.png
│   │   └── doc-visitor-001_vehicle_number.png
│   └── vehicle_register/
│       ├── doc-vehicle-002_driver_name.png
│       └── doc-vehicle-002_badge_number.png
├── train_annotations.json
├── val_annotations.json
├── test_annotations.json
├── dataset_manifest.json
└── dataset_summary.csv
```

---

## 2. JSON Annotation Format

Each bounding box crop sample is stored with both original OCR output and human ground truth:

```json
{
  "dataset_version": "v1.4-2026-08",
  "total_samples": 1250,
  "split_ratios": { "train": 0.80, "val": 0.10, "test": 0.10 },
  "samples": [
    {
      "sample_id": "smpl-9012",
      "document_id": "doc-visitor-001",
      "field_key": "visitor_name",
      "field_type": "name",
      "image_path": "images/visitor_register/doc-visitor-001_visitor_name.png",
      "original_ocr_text": "Amit Kr",
      "ground_truth": "Amit Kumar",
      "ocr_confidence": 0.62,
      "model_version": "v1.3",
      "bounding_box_percent": {
        "x": 24.5,
        "y": 32.1,
        "w": 35.0,
        "h": 4.2
      },
      "image_dimensions": { "width": 434, "height": 73 },
      "corrected_by_user": "usr-001",
      "corrected_at": "2026-08-16T11:45:00Z"
    }
  ]
}
```

---

## 3. Data Augmentation & Preprocessing Rules

To improve TrOCR model generalization under real-world form capture conditions (varying light, tilt, pen thickness):

1. **Random Rotation**: $\pm 3^\circ$ to emulate handheld camera capture.
2. **Elastic Distortion**: Simulates paper wrinkles and perspective stretch.
3. **Contrast Adjustment**: CLAHE ($\text{clipLimit}=2.0, \text{gridSize}=8\times8$).
4. **Gaussian Noise Injection**: Additive noise ($\sigma \le 0.02$).
5. **DPI Rescaling**: Standardized to target height of $48\text{ px}$ preserving aspect ratio (padded to $320\text{ px}$ width).

---

## 4. Quality Control & Audit Rules

- Samples with character length $< 1$ or invalid unicode characters are automatically filtered.
- Fields flagged as `REJECTED` in human verification are excluded from training splits.
- All ground truth text undergoes strip trimming and Unicode normalization (NFC).
