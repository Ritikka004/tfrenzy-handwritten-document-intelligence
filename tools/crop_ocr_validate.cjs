const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');

const cropsBase = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v2');

const fields = [
  { key: 'visit_date', expected: '09/08/2026', offsets: [5,6,7] },
  { key: 'host_employee_id', expected: 'EMP1234', offsets: [5,6,7] },
  { key: 'vehicle_number', expected: 'TN09BX1234', offsets: [7,8,9] },
  { key: 'badge_quantity', expected: '02', offsets: [7,8,9] }
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

  for (const f of fields) {
    for (const off of f.offsets) {
      const fname = `${f.key}_yplus${off}.png`;
      const fpath = path.join(cropsBase, fname);
      if (!fs.existsSync(fpath)) {
        console.warn('missing', fpath); continue;
      }
      const dataUri = 'data:image/png;base64,' + fs.readFileSync(fpath).toString('base64');
      const whitelist = getWhitelist(f.key);
      const config = { tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY, tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE };
      if (whitelist) config.tessedit_char_whitelist = whitelist;
      try {
        const res = await worker.recognize(dataUri, config);
        const rawText = (res && res.data && typeof res.data.text === 'string') ? res.data.text.trim() : '';
        const rawConf = res && res.data ? res.data.confidence : null;
        results.push({ field: f.key, offset: off, file: path.relative(process.cwd(), fpath), ocrText: rawText, rawConfidence: rawConf, expected: f.expected });
        console.log(`${f.key} y+${off} => "${rawText}" conf=${String(rawConf)}`);
      } catch (err) {
        results.push({ field: f.key, offset: off, file: path.relative(process.cwd(), fpath), ocrText: `[ERROR] ${String(err)}`, rawConfidence: null, expected: f.expected });
        console.error('ocr err', fpath, err && err.message ? err.message : err);
      }
    }
  }

  await worker.terminate();
  const out = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v2', 'crop_ocr_validation_report.json');
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  console.log('Wrote report ->', out);
})();
