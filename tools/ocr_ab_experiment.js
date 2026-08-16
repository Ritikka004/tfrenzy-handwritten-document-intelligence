const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');

const cropsDir = path.join(process.cwd(), 'backend', 'debug-crops');

const fields = [
  { key: 'mobile_number', file: 'final_mobile_number.png', type: 'phone' },
  { key: 'visit_date', file: 'final_visit_date.png', type: 'date' },
  { key: 'host_employee_id', file: 'final_host_emp_id.png', type: 'employee_id' },
  { key: 'vehicle_number', file: 'final_vehicle_reg.png', type: 'vehicle_number' },
  { key: 'badge_quantity', file: 'final_passes_qty.png', type: 'quantity' }
];

function toDataUri(filePath) {
  const buf = fs.readFileSync(filePath);
  const base64 = buf.toString('base64');
  return `data:image/png;base64,${base64}`;
}

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

// Tests definitions
const tests = [
  { name: 'A (prod)', psm: Tesseract.PSM.SINGLE_LINE, useWhitelist: true, preprocess: false },
  { name: 'B (no-whitelist)', psm: Tesseract.PSM.SINGLE_LINE, useWhitelist: false, preprocess: false },
  { name: 'C (single-word)', psm: Tesseract.PSM.SINGLE_WORD, useWhitelist: false, preprocess: false },
  { name: 'D (with-preprocess)', psm: Tesseract.PSM.SINGLE_LINE, useWhitelist: true, preprocess: true }
];

// Heuristics for format matching
function formatScore(fieldKey, text) {
  if (!text) return 0;
  const t = text.trim();
  if (fieldKey === 'mobile_number') {
    const digits = (t.match(/\d/g) || []).join('');
    return (digits.length === 10) ? 1 : (digits.length >= 7 ? 0.5 : 0);
  }
  if (fieldKey === 'visit_date') {
    return /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(t) ? 1 : 0;
  }
  if (fieldKey === 'host_employee_id') {
    return /[A-Za-z0-9\-]{3,}/.test(t) ? 1 : 0;
  }
  if (fieldKey === 'vehicle_number') {
    return /[A-Za-z0-9]{2,}/.test(t) ? 1 : 0;
  }
  if (fieldKey === 'badge_quantity') {
    return /^\d+$/.test(t) ? 1 : 0;
  }
  return 0;
}

(async () => {
  const worker = await Tesseract.createWorker();
  await worker.reinitialize('eng');

  const allResults = [];

  for (const f of fields) {
    const filePath = path.join(cropsDir, f.file);
    if (!fs.existsSync(filePath)) {
      console.error(`Missing crop image for ${f.key}: ${filePath}`);
      continue;
    }

    const originalImage = toDataUri(filePath);

    for (const t of tests) {
      // prepare image (preprocess simulated by returning same image as current TS pipeline is no-op)
      let imageToUse = originalImage;
      if (t.preprocess) {
        // The TypeScript pipeline currently returns the same image; simulate exactly that.
        imageToUse = originalImage;
      }

      const whitelist = t.useWhitelist ? getWhitelist(f.type, f.key) : '';

      const config = {
        tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
        tessedit_pageseg_mode: t.psm
      };
      if (whitelist) config.tessedit_char_whitelist = whitelist;

      console.log(`\nField=${f.key}  Test=${t.name}  PSM=${t.psm}  whitelist=${whitelist ? 'YES' : 'NO'}`);

      try {
        const res = await worker.recognize(imageToUse, config);
        const rawText = (res && res.data && typeof res.data.text === 'string') ? res.data.text.trim() : '';
        const rawConf = res && res.data ? res.data.confidence : undefined;
        console.log(`OCR text: "${rawText}"`);
        console.log(`raw result.data.confidence: ${String(rawConf)}`);

        const appConfidence = (typeof rawConf === 'number') ? Math.max(0, Math.min(1, rawConf / 100)) : null;

        allResults.push({ field: f.key, test: t.name, psm: t.psm, whitelist: Boolean(whitelist), ocrText: rawText, rawConfidence: rawConf, appConfidence });
      } catch (err) {
        console.error('Error recognizing:', err.message || err);
        allResults.push({ field: f.key, test: t.name, psm: t.psm, whitelist: Boolean(whitelist), ocrText: `[ERROR: ${err.message || err}]`, rawConfidence: null, appConfidence: 0 });
      }
    }
  }

  await worker.terminate();

  // Summarize best config per field by appConfidence + formatScore
  const bestByField = {};
  for (const f of fields) {
    const candidates = allResults.filter(r => r.field === f.key);
    let best = null;
    for (const c of candidates) {
      const conf = (c.appConfidence === null || c.appConfidence === undefined) ? 0 : c.appConfidence;
      const fmt = formatScore(f.key, c.ocrText);
      const score = conf + fmt * 0.15; // small bonus for format match
      if (!best || score > best.score) {
        best = { ...c, score };
      }
    }
    if (best) bestByField[f.key] = best;
  }

  // Print results table
  console.log('\n\n=== DETAILED RESULTS ===');
  console.log('field | test | PSM | whitelist | OCR text | raw confidence');
  for (const r of allResults) {
    console.log(`${r.field} | ${r.test} | ${r.psm} | ${r.whitelist ? 'YES' : 'NO'} | ${r.ocrText} | ${String(r.rawConfidence)}`);
  }

  console.log('\n\n=== BEST CONFIG PER FIELD (by confidence + format) ===');
  for (const key of Object.keys(bestByField)) {
    const b = bestByField[key];
    console.log(`${key}: Test=${b.test} PSM=${b.psm} whitelist=${b.whitelist ? 'YES' : 'NO'} OCR="${b.ocrText}" rawConf=${String(b.rawConfidence)}`);
  }

  // Also write JSON summary to tools/ocr_ab_experiment_results.json
  const outPath = path.join(process.cwd(), 'tools', 'ocr_ab_experiment_results.json');
  fs.writeFileSync(outPath, JSON.stringify({ results: allResults, best: bestByField }, null, 2));
  console.log(`\nWrote JSON summary to: ${outPath}`);
})();
