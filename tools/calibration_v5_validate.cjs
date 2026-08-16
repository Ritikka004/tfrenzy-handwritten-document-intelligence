const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');

const base = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v5', 'candidates');

const items = [
  { field: 'visit_date', file: 'visit_date_candidate_margin0.png', expected: '09/08/2026' },
  { field: 'host_employee_id', file: 'host_employee_id_candidate_margin5.png', expected: 'EMP1234' },
  { field: 'vehicle_number', file: 'vehicle_number_candidate_margin10.png', expected: 'TN09BX1234' },
  { field: 'badge_quantity', file: 'badge_quantity_candidate_margin0.png', expected: '02' }
];

function getWhitelist(fieldKey) {
  const fk = fieldKey.toLowerCase();
  if (fk.includes('mobile') || fk.includes('phone')) return '0123456789';
  if (fk.includes('emp')) return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-';
  if (fk.includes('vehicle')) return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -';
  if (fk.includes('badge') || fk.includes('quantity')) return '0123456789';
  if (fk.includes('date')) return '0123456789/-';
  return '';
}

(async ()=>{
  const worker = await Tesseract.createWorker();
  await worker.reinitialize('eng');

  const results = [];

  for (const it of items) {
    const fpath = path.join(base, it.file);
    if (!fs.existsSync(fpath)) {
      console.warn('missing', fpath);
      results.push({ field: it.field, file: path.relative(process.cwd(), fpath), error: 'missing file', expected: it.expected });
      continue;
    }
    const dataUri = 'data:image/png;base64,' + fs.readFileSync(fpath).toString('base64');
    const whitelist = getWhitelist(it.field);
    const config = { tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY, tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE };
    if (whitelist) config.tessedit_char_whitelist = whitelist;
    try {
      const res = await worker.recognize(dataUri, config);
      const rawText = (res && res.data && typeof res.data.text === 'string') ? res.data.text.trim() : '';
      const rawConf = res && res.data ? res.data.confidence : null;
      results.push({ field: it.field, file: path.relative(process.cwd(), fpath), ocrText: rawText, rawConfidence: rawConf, expected: it.expected });
      console.log(`${it.field} => "${rawText}" conf=${String(rawConf)}`);
    } catch (err) {
      results.push({ field: it.field, file: path.relative(process.cwd(), fpath), ocrText: `[ERROR] ${String(err)}`, rawConfidence: null, expected: it.expected });
      console.error('ocr err', fpath, err && err.message ? err.message : err);
    }
  }

  await worker.terminate();
  const out = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v5', 'calibration-v5-ocr-results.json');
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  console.log('Wrote OCR results ->', out);
})();
