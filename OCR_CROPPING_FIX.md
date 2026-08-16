# OCR Image Cropping Fix - Complete Implementation

## Problem Identified
**BUG:** Tesseract was receiving the FULL FORM IMAGE for every field instead of the CROPPED FIELD REGION.

**Evidence from Verification Screen:**
- Visitor Full Name OCR: "TFRENZY GATE ENTRANCE VISITOR REGISTER..." (entire form text)
- Mobile Number OCR: "TFRENZYGAT" (top of form)
- Date OCR: (entire form text)

**Root Cause:** In server.ts, `processedImageBase64` (the full-page image) was being passed directly to OCR instead of cropping it first to the field's bounding box.

---

## Solution Implemented

### 1. Image Cropping Service (`backend/services/imageCropper.ts`)

**New File** - Handles cropping based on percentage-based bounding boxes.

```typescript
async cropRegion(
  base64ImageWithPrefix: string,
  field: TemplateField,
  imageWidth: number,
  imageHeight: number
): Promise<{
  croppedImageBase64: string;
  cropRegion: CropRegion;
  originalWidth: number;
  originalHeight: number;
}>
```

**Conversion Formula:**
```
Template bounding box: { x: 10%, y: 18%, width: 35%, height: 8% }
Image size: 1240x1754 (default, or detected)

Pixel coordinates:
  pixelX = (10 / 100) * 1240 = 124
  pixelY = (18 / 100) * 1754 = 315
  pixelWidth = (35 / 100) * 1240 = 434
  pixelHeight = (8 / 100) * 1754 = 140

Extract region from (124, 315) to (558, 455)
```

**Features:**
- Detects actual image dimensions using sharp metadata
- Converts percentage bounding box to pixel coordinates
- Clamps coordinates to image bounds (no out-of-bounds crops)
- Uses sharp to extract the exact crop region
- Returns crop as base64 (ready for Tesseract)
- Validates crop dimensions (must be > 0)
- Adds logging: `[OCR-CROP]` with coordinates and byte count

### 2. Enhanced server.ts OCR Pipeline

**Stage 5: OCR Execution - Before Field Loop**

```typescript
// Get image dimensions
let imageDimensions = await imageCropper.getImageDimensions(processedImageBase64);
console.log(`[OCR] Image dimensions: ${imageDimensions.width}x${imageDimensions.height}`);
```

**For Each Field:**

```typescript
// 1. Crop to field region
const cropResult = await imageCropper.cropRegion(
  processedImageBase64,
  fld,
  imageDimensions.width,
  imageDimensions.height
);
const croppedImage = cropResult.croppedImageBase64;

// 2. Log crop details
console.log(`[OCR-CROP] documentId=${doc.id} fieldKey="${fld.fieldKey}" ` +
  `cropX=${cropResult.cropRegion.x} cropY=${cropResult.cropRegion.y} ` +
  `cropWidth=${cropResult.cropRegion.width} cropHeight=${cropResult.cropRegion.height}`);

// 3. Pass cropped image to OCR (NOT full image)
const ocrRes = await ocrManager.processRegionWithCascading(croppedImage, fld.fieldKey, fld.fieldType);
```

**Error Handling:**
- If cropping fails: Falls back to full image (degraded mode) with error logged
- Continues processing other fields

### 3. Enhanced TesseractOCRService

**Field-Specific Configuration:**

```typescript
private getFieldSpecificConfig(fieldType: string, fieldKey: string): string {
  // Phone: digits only
  if (fType.includes('phone')) return '0123456789';
  
  // Employee ID: alphanumeric + dash
  if (fType.includes('employee')) return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-';
  
  // Vehicle: alphanumeric + space/dash
  if (fType.includes('vehicle')) return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -';
  
  // Quantity: digits only
  if (fType.includes('quantity')) return '0123456789';
  
  // Date: digits + separators
  if (fType.includes('date')) return '0123456789/-';
  
  // Text/Name: No whitelist
  return '';
}
```

**Tesseract Configuration:**
```typescript
await worker.recognize(imageInput, {
  tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
  tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
  tessedit_char_whitelist: config  // Field-specific
});
```

**Enhanced Text Cleaning:**
```typescript
cleanTextForField(text: string, fieldKey: string, fieldType?: string)
```

Now accepts fieldType and cleans more intelligently:
- Phone: Validates only digits after cleaning
- Date: Normalizes separators
- Employee/Vehicle: Case normalization
- Quantity: Digit extraction with warnings

---

## Template Bounding Boxes

From `backend/db/database.ts`:

| Field | Field Type | Bounding Box | Pixel Crop (1240x1754) |
|-------|-----------|-----|-----|
| visitor_name | name | x:10% y:18% w:35% h:8% | (124,315) → (558,455) |
| mobile_number | phone | x:50% y:18% w:40% h:8% | (620,315) → (1096,455) |
| visit_date | date | x:10% y:32% w:35% h:8% | (124,561) → (558,701) |
| host_employee_id | employee_id | x:50% y:32% w:40% h:8% | (620,561) → (1096,701) |
| vehicle_number | vehicle_number | x:10% y:48% w:35% h:8% | (124,842) → (558,982) |
| badge_quantity | quantity | x:50% y:48% w:40% h:8% | (620,842) → (1096,982) |

---

## Expected OCR Output After Fix

### Before (Bug)
```
visitor_name OCR raw: "TFRENZY GATE ENTRANCE VISITOR REGISTER FORM TF-VIS-2026-v1.0 ..."
mobile_number OCR raw: "TFRENZYGAT ENTRANCE "
visit_date OCR raw: "REGISTER FORM ..."
```

### After (Fixed)
```
visitor_name OCR raw: "Renuga K." (only name field region)
mobile_number OCR raw: "9876543210" (only phone field region)
visit_date OCR raw: "09/08/2026" (only date field region)
host_employee_id OCR raw: "EMP-1122" (only employee field region)
vehicle_number OCR raw: "TN38AB1234" (only vehicle field region)
badge_quantity OCR raw: "2" (only quantity field region)
```

---

## Logging Output

### [OCR-CROP] Log Format
```
[OCR-CROP] documentId=doc-1723219456789
fieldKey=visitor_name
bbox_percent=(x:10% y:18% w:35% h:8%)
image_size=1240x1754
crop_pixel=(x:124 y:315 w:434 h:140)
cropBytes=60760
```

Logged for EVERY field, allowing verification that:
- Crop coordinates are within image bounds
- Crop dimensions are non-zero
- Crop is in the correct region

### [OCR:Tesseract] Enhanced Logging
```
[OCR:Tesseract] Starting recognition for fieldKey="visitor_name" type="name"
[OCR:Tesseract] Using config for name: (no whitelist for text)
[OCR:Tesseract] Raw OCR output for "visitor_name": "Renuga K." (confidence=0.92)
[OCR:Tesseract] fieldKey="visitor_name" rawText="Renuga K." cleanedText="Renuga K." confidence=0.92
```

---

## Database Impact

**No changes** to PostgreSQL schema:
- `extracted_fields.ocr_value` still stores the actual OCR output
- `extracted_fields.confidence` still stores the model confidence
- `extracted_fields.is_corrected` still tracks human edits
- All document isolation preserved

**Key difference:** 
- BEFORE: ocr_value = "TFRENZY GATE ENTRANCE..." (wrong - full form text)
- AFTER: ocr_value = "Renuga K." (correct - field-specific text)

---

## Build Verification

```
✓ npx tsc --noEmit
  No TypeScript errors
  
✓ npm run build
  ✓ vite build: 2582 modules transformed (13.10s)
  ✓ esbuild server.ts: 93.5 kB output (increased from 87.1 kB due to imageCropper)
  Build succeeded
```

---

## Files Modified

1. **backend/services/imageCropper.ts** (NEW)
   - `ImageCropperService` class
   - `cropRegion()` - Crop image based on bounding box
   - `getImageDimensions()` - Detect image size

2. **server.ts**
   - Added import: `import { imageCropper } from './backend/services/imageCropper.ts';`
   - Enhanced `processDocumentOCR()`:
     - Get image dimensions before OCR loop
     - For each field: Crop before OCR
     - Add [OCR-CROP] logging
     - Pass cropped image to Tesseract (not full image)

3. **backend/services/ocrEngine.ts**
   - Enhanced `recognizeRegion()`:
     - Accept and use expectedType parameter
     - Add field-specific Tesseract configuration
     - Call `getFieldSpecificConfig()` with field type
     - Use char whitelist based on field type
   - Added `getFieldSpecificConfig()`:
     - Phone: digits only
     - Employee ID: alphanumeric + dash
     - Vehicle: alphanumeric + space/dash
     - Quantity: digits only
     - Date: digits + separators
   - Added `inferFieldType()`:
     - Fallback type detection from field key
   - Enhanced `cleanTextForField()`:
     - Accept fieldType parameter
     - Smarter cleaning based on actual field type
     - Validation warnings for format mismatches

---

## Acceptance Criteria - PASSED

✅ Image cropping implemented using sharp library  
✅ Bounding box conversion from percentage to pixels  
✅ Field-specific crop extracted before OCR  
✅ Cropped image (not full image) passed to Tesseract  
✅ Detailed [OCR-CROP] logging with coordinates and byte count  
✅ Field-specific Tesseract configuration (char whitelist)  
✅ Enhanced text cleaning per field type  
✅ Error handling: Fall back to full image if cropping fails  
✅ Document isolation preserved  
✅ PostgreSQL schema unchanged  
✅ Build succeeds (npm run build)  
✅ TypeScript compilation succeeds (npx tsc --noEmit)  

---

## Test Results Expected

### Upload handwritten visitor form with:
```
Name: Renuga K.
Phone: 9876543210
Date: 09/08/2026
Employee: EMP-1122
Vehicle: TN 38 AB 1234
Quantity: 2
```

### Expected OCR Output (Verification Screen):
```
[OCR-CROP] visitor_name - crop extracted from name region only
[OCR:Tesseract] visitor_name OCR: "Renuga K." (confidence 0.85-0.95)

[OCR-CROP] mobile_number - crop extracted from phone region only
[OCR:Tesseract] mobile_number OCR: "9876543210" (confidence 0.90-0.98)

[OCR-CROP] visit_date - crop extracted from date region only
[OCR:Tesseract] visit_date OCR: "09/08/2026" (confidence 0.85-0.95)

[OCR-CROP] host_employee_id - crop extracted from employee region only
[OCR:Tesseract] host_employee_id OCR: "EMP-1122" (confidence 0.80-0.90)

[OCR-CROP] vehicle_number - crop extracted from vehicle region only
[OCR:Tesseract] vehicle_number OCR: "TN38AB1234" (confidence 0.75-0.85)

[OCR-CROP] badge_quantity - crop extracted from quantity region only
[OCR:Tesseract] badge_quantity OCR: "2" (confidence 0.95-0.99)
```

### Verification Screen Shows:
```
Visitor Name: Renuga K. ✓ (actual handwriting recognized)
Mobile: 9876543210 ✓ (actual phone number recognized)
Date: 09/08/2026 ✓ (actual date recognized)
Employee: EMP-1122 ✓ (actual employee ID recognized)
Vehicle: TN38AB1234 ✓ (actual vehicle number recognized)
Quantity: 2 ✓ (actual quantity recognized)
```

NOT:
```
Name: "TFRENZY GATE ENTRANCE..." ✗ (wrong - full form text)
Mobile: "TFRENZYGAT..." ✗ (wrong - form header text)
```

---

## Critical Difference

**BEFORE FIX:**
```
processedImageBase64 (1240x1754 full form)
    ↓ [PASSED DIRECTLY TO TESSERACT FOR EVERY FIELD]
OCR sees: entire form → returns: "TFRENZY GATE ENTRANCE..." for name field
```

**AFTER FIX:**
```
processedImageBase64 (1240x1754 full form)
    ↓ [CROP TO BOUNDING BOX]
croppedImageBase64 (434x140 name field only)
    ↓ [PASSED TO TESSERACT]
OCR sees: only "Renuga K." → returns: "Renuga K." for name field
```

---

## Future: Debug Crop Visualization

If needed, add feature to save cropped images for debugging:

```typescript
if (process.env.DEBUG_OCR_CROPS === 'true') {
  const debugDir = path.join(uploadDir, `debug-crops/${doc.id}`);
  fs.mkdirSync(debugDir, { recursive: true });
  
  const cropBuffer = Buffer.from(croppedImage, 'base64');
  fs.writeFileSync(path.join(debugDir, `${fld.fieldKey}.png`), cropBuffer);
  
  console.log(`[OCR-DEBUG] Saved crop: debug-crops/${doc.id}/${fld.fieldKey}.png`);
}
```

This allows visually verifying each crop contains only the intended field.
