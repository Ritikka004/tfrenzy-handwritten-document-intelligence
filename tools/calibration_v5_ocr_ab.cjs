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

const configs = [
  { id: 'A', desc: 'prod (SINGLE_LINE + whitelist)', psm: Tesseract.PSM.SINGLE_LINE, useWhitelist: true },
  { id: 'B', desc: 'SINGLE_LINE no whitelist', psm: Tesseract.PSM.SINGLE_LINE, useWhitelist: false },
  { id: 'C', desc: 'SINGLE_WORD + whitelist', psm: Tesseract.PSM.SINGLE_WORD, useWhitelist: true },
  { id: 'D', desc: 'SINGLE_WORD no whitelist', psm: Tesseract.PSM.SINGLE_WORD, useWhitelist: false }
];

function normalize(field, text) {
  if (!text) return '';
  const t = String(text).trim();
  if (field === 'host_employee_id') return t.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (field === 'vehicle_number') return t.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (field === 'badge_quantity') return (parseInt(t.replace(/[^0-9]/g, ''), 10) || 0).toString();
  if (field === 'visit_date') return t.replace(/[^0-9]/g, '');
  return t.toUpperCase();
}

(async ()=>{
  const worker = await Tesseract.createWorker();
  await worker.reinitialize('eng');

  const results = [];

  for (const it of items) {
    const fpath = path.join(base, it.file);
    if (!fs.existsSync(fpath)) {
      console.warn('missing', fpath);
      continue;
    }
    const dataUri = 'data:image/png;base64,' + fs.readFileSync(fpath).toString('base64');
    const whitelist = getWhitelist(it.field);

    for (const cfg of configs) {
      const config = { tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY, tessedit_pageseg_mode: cfg.psm };
      if (cfg.useWhitelist && whitelist) config.tessedit_char_whitelist = whitelist;
      try {
        const res = await worker.recognize(dataUri, config);
        const rawText = (res && res.data && typeof res.data.text === 'string') ? res.data.text.trim() : '';
        const rawConf = res && res.data ? res.data.confidence : null;

        const exactMatch = rawText === it.expected;
        const normRaw = normalize(it.field, rawText);
        const normExp = normalize(it.field, it.expected);
        const normalizedMatch = normRaw && normExp ? normRaw === normExp : false;

        results.push({
          field: it.field,
          candidate: path.relative(process.cwd(), fpath),
          configuration: cfg.id,
          config_desc: cfg.desc,
          psm: cfg.psm,
          whitelist: cfg.useWhitelist,
          ocr_text: rawText,
          raw_confidence: rawConf,
          expected_value: it.expected,
          exact_match: exactMatch,
          normalized_match: normalizedMatch
        });

        console.log(`${it.field} ${cfg.id} => "${rawText}" conf=${String(rawConf)} exact=${exactMatch} norm=${normalizedMatch}`);
      } catch (err) {
        results.push({ field: it.field, candidate: path.relative(process.cwd(), fpath), configuration: cfg.id, config_desc: cfg.desc, psm: cfg.psm, whitelist: cfg.useWhitelist, ocr_text: `[ERROR] ${String(err)}`, raw_confidence: null, expected_value: it.expected, exact_match: false, normalized_match: false });
        console.error('ocr err', it.field, cfg.id, err && err.message ? err.message : err);
      }
    }
  }

  await worker.terminate();
  const out = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v5', 'calibration-v5-ocr-ab-report.json');
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  console.log('Wrote AB report ->', out);
})();
