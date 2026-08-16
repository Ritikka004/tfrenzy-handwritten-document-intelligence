const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

const outRoot = path.join(process.cwd(), 'backend', 'debug-crops');
const outPath = path.join(outRoot, 'final-bbox-validation-report.json');

const imageCandidates = [
  'backend/debug-crops/test_row2_full.png',
  'backend/debug-crops/test_row3_full.png',
  'backend/debug-crops/test2_date_hand.png',
  'backend/debug-crops/test2_host_emp_hand.png',
  'backend/debug-crops/final_visit_date.png',
  'backend/debug-crops/final_host_emp_id.png',
  'backend/debug-crops/cal_visit_date.png',
  'backend/debug-crops/cal_host_emp.png'
];

const fieldSpecs = [
  {
    field: 'visit_date',
    expected: '09/08/2026',
    bbox: { x: 25, y: 39, width: 539, height: 101 },
    preprocess: 'upscale2x',
    psm: 6,
    whitelist: false
  },
  {
    field: 'host_employee_id',
    expected: 'EMP1234',
    bbox: { x: 685, y: 32, width: 451, height: 108 },
    preprocess: 'high_contrast',
    psm: 6,
    whitelist: false
  }
];

function normalizeHostEmployeeId(text) {
  const cleaned = (text || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return cleaned.replace(/^EMP/, 'EMP');
}

function normalizeValue(field, text) {
  if (field === 'host_employee_id') return normalizeHostEmployeeId(text);
  return (text || '').replace(/[^A-Za-z0-9/]/g, '').toUpperCase();
}

function expectedNormalized(field, expected) {
  if (!expected) return null;
  return normalizeValue(field, expected);
}

async function preprocessImage(buf, mode) {
  let img = sharp(buf);
  const meta = await img.metadata();
  if (mode === 'upscale2x') {
    img = img.resize({ width: Math.round((meta.width || 0) * 2), height: Math.round((meta.height || 0) * 2) });
  }
  if (mode === 'high_contrast') {
    img = img.grayscale().linear(1.25, -20);
  }
  return img.png().toBuffer();
}

async function cropForBBox(buf, bbox) {
  const meta = await sharp(buf).metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  const left = Math.max(0, Math.floor(bbox.x));
  const top = Math.max(0, Math.floor(bbox.y));
  if (left >= width || top >= height) return null;
  const cropWidth = Math.max(1, Math.min(Math.floor(bbox.width), width - left));
  const cropHeight = Math.max(1, Math.min(Math.floor(bbox.height), height - top));
  if (cropWidth <= 0 || cropHeight <= 0) return null;
  const image = sharp(buf);
  return image.extract({ left, top, width: cropWidth, height: cropHeight }).png().toBuffer();
}

async function ocrBuffer(buf, field) {
  const worker = await Tesseract.createWorker();
  await worker.reinitialize('eng');
  try {
    const cfg = {
      tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
      tessedit_pageseg_mode: 6
    };
    const res = await worker.recognize('data:image/png;base64,' + buf.toString('base64'), cfg);
    return {
      text: (res && res.data && res.data.text) ? res.data.text.trim() : '',
      confidence: (res && res.data && typeof res.data.confidence === 'number') ? res.data.confidence : null
    };
  } finally {
    try { await worker.terminate(); } catch (_) {}
  }
}

async function computeVisualQuality(buf) {
  const meta = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const { data, info } = meta;
  let dark = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] < 200) dark++;
  }
  const ratio = dark / (info.width * info.height);
  if (ratio > 0.02) return 'good';
  if (ratio > 0.005) return 'fair';
  return 'poor';
}

async function run() {
  const report = [];
  for (const imagePath of imageCandidates) {
    const absPath = path.join(process.cwd(), imagePath);
    if (!fs.existsSync(absPath)) continue;
    const buf = fs.readFileSync(absPath);
    const meta = await sharp(buf).metadata();
    const imageName = path.basename(imagePath);

    for (const spec of fieldSpecs) {
      const bbox = spec.bbox;
      const cropBuf = await cropForBBox(buf, bbox);
      if (!cropBuf) {
        report.push({
          document: imageName,
          field: spec.field,
          bbox: { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height },
          expected_value: spec.expected,
          ocr_output: '',
          normalized_output: '',
          confidence: null,
          exact_match: null,
          visual_crop_quality: 'skipped',
          skip_reason: 'bbox_out_of_bounds'
        });
        continue;
      }
      const preprocessed = await preprocessImage(cropBuf, spec.preprocess);
      const ocr = await ocrBuffer(preprocessed, spec.field);
      const normalizedOutput = normalizeValue(spec.field, ocr.text);
      const expectedNorm = expectedNormalized(spec.field, spec.expected);
      const exactMatch = expectedNorm ? normalizedOutput === expectedNorm : null;
      report.push({
        document: imageName,
        field: spec.field,
        bbox: { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height },
        expected_value: spec.expected,
        ocr_output: ocr.text,
        normalized_output: normalizedOutput,
        confidence: ocr.confidence,
        exact_match: exactMatch,
        visual_crop_quality: await computeVisualQuality(preprocessed)
      });
    }
  }

  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('Wrote ' + outPath);
  console.log(JSON.stringify(report, null, 2));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
