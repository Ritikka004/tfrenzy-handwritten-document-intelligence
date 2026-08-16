const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');

const cropsDir = path.join(process.cwd(), 'backend', 'debug-crops');
const outDir = path.join(process.cwd(), 'tools', 'ocr_preproc_out');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const fields = [
  { key: 'mobile_number', file: 'final_mobile_number.png', type: 'phone', expected: '916543210' },
  { key: 'visit_date', file: 'final_visit_date.png', type: 'date', expected: '09/08/2026' },
  { key: 'host_employee_id', file: 'final_host_emp_id.png', type: 'employee_id', expected: 'EMP1234' },
  { key: 'vehicle_number', file: 'final_vehicle_reg.png', type: 'vehicle_number', expected: 'TN09BX1234' },
  { key: 'badge_quantity', file: 'final_passes_qty.png', type: 'quantity', expected: '9' }
];

function getWhitelist(fieldType, fieldKey) {
  const fType = (fieldType || '').toLowerCase();
  const fKey = (fieldKey || '').toLowerCase();
  if (fType.includes('phone') || fKey.includes('mobile')) return '0123456789';
  if (fType.includes('employee') || fKey.includes('emp')) return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-';
  if (fType.includes('vehicle') || fKey.includes('vehicle')) return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -';
  if (fType.includes('quantity') || fKey.includes('badge') || fKey.includes('quantity')) return '0123456789';
  if (fType.includes('date') || fKey.includes('date')) return '0123456789/-';
  return '';
}

const variants = [
  { id: 'original', desc: 'Original crop' },
  { id: 'grayscale', desc: 'Grayscale' },
  { id: 'upscale2x', desc: 'Upscale 2x' },
  { id: 'grayscale_upscale', desc: 'Grayscale + Upscale 2x' },
  { id: 'grayscale_contrast', desc: 'Grayscale + Contrast Enhance' },
  { id: 'grayscale_thresh', desc: 'Grayscale + Threshold' },
  { id: 'grayscale_upscale_thresh', desc: 'Grayscale + Upscale + Threshold' }
];

async function applyVariant(buffer, variant) {
  const img = sharp(buffer);
  const meta = await img.metadata();
  let p = img.clone();

  if (variant === 'original') {
    return buffer;
  }

  if (variant.includes('grayscale')) p = p.grayscale();
  if (variant.includes('upscale')) {
    const w = (meta.width || 0) * 2;
    const h = (meta.height || 0) * 2;
    p = p.resize({ width: Math.round(w), height: Math.round(h), kernel: sharp.kernel.cubic });
  }
  if (variant.includes('contrast')) {
    // normalize increases contrast and stretches histogram
    p = p.normalize();
  }
  if (variant.includes('thresh')) {
    // threshold requires greyscale; use 128 as mid-point
    p = p.threshold(128);
  }

  return await p.png().toBuffer();
}

function toDataUriFromBuffer(buf) {
  return `data:image/png;base64,${buf.toString('base64')}`;
}

(async () => {
  const worker = await Tesseract.createWorker();
  await worker.reinitialize('eng');

  const results = [];

  for (const f of fields) {
    const filePath = path.join(cropsDir, f.file);
    if (!fs.existsSync(filePath)) {
      console.error(`Missing crop for ${f.key}: ${filePath}`);
      continue;
    }

    const origBuf = fs.readFileSync(filePath);
    for (const v of variants) {
      const procBuf = await applyVariant(origBuf, v.id);
      const outFile = path.join(outDir, `${f.key}__${v.id}.png`);
      fs.writeFileSync(outFile, procBuf);

      const imageDataUri = toDataUriFromBuffer(procBuf);
      const whitelist = getWhitelist(f.type, f.key);
      const config = {
        tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE
      };
      if (whitelist) config.tessedit_char_whitelist = whitelist;

      console.log(`\nField=${f.key} Variant=${v.id} (whitelist=${whitelist ? 'YES' : 'NO'})`);
      try {
        const res = await worker.recognize(imageDataUri, config);
        const rawText = (res && res.data && typeof res.data.text === 'string') ? res.data.text.trim() : '';
        const rawConf = res && res.data ? res.data.confidence : null;
        console.log(`OCR: "${rawText}"  raw.conf=${String(rawConf)}`);
        results.push({ field: f.key, variant: v.id, ocrText: rawText, rawConfidence: rawConf, expected: f.expected });
      } catch (err) {
        console.error('OCR error:', err && err.message ? err.message : err);
        results.push({ field: f.key, variant: v.id, ocrText: `[ERROR] ${String(err)}`, rawConfidence: null, expected: f.expected });
      }
    }
  }

  await worker.terminate();

  const outPath = path.join(process.cwd(), 'tools', 'ocr_preprocess_experiment_results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nWrote results to: ${outPath}`);

  // Print summary table
  console.log('\nSummary:\nfield | preprocessing | OCR text | raw confidence');
  for (const r of results) {
    console.log(`${r.field} | ${r.variant} | ${r.ocrText} | ${String(r.rawConfidence)}`);
  }
})();
