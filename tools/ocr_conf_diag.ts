import fs from 'fs';
import path from 'path';
import Tesseract from 'tesseract.js';

const cropsDir = path.join(process.cwd(), 'backend', 'debug-crops');

const fields: { key: string; file: string; type?: string }[] = [
  { key: 'visitor_name', file: 'final_visitor_name.png', type: 'name' },
  { key: 'mobile_number', file: 'final_mobile_number.png', type: 'phone' },
  { key: 'visit_date', file: 'final_visit_date.png', type: 'date' },
  { key: 'host_employee_id', file: 'final_host_emp_id.png', type: 'employee_id' },
  { key: 'vehicle_number', file: 'final_vehicle_reg.png', type: 'vehicle_number' },
  { key: 'badge_quantity', file: 'final_passes_qty.png', type: 'quantity' }
];

function toDataUri(filePath: string) {
  const buf = fs.readFileSync(filePath);
  const base64 = buf.toString('base64');
  return `data:image/png;base64,${base64}`;
}

(async () => {
  const worker = await Tesseract.createWorker();
  // initialize similarly to application: reinitialize to 'eng'
  await worker.reinitialize('eng');

  // mimic field-specific config from the app
  function getWhitelist(fieldType: string | undefined, fieldKey: string) {
    const fType = (fieldType || '').toLowerCase();
    const fKey = (fieldKey || '').toLowerCase();
    if (fType.includes('phone') || fKey.includes('mobile')) return '0123456789';
    if (fType.includes('employee') || fKey.includes('emp')) return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-';
    if (fType.includes('vehicle') || fKey.includes('vehicle')) return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -';
    if (fType.includes('quantity') || fKey.includes('badge') || fKey.includes('quantity')) return '0123456789';
    if (fType.includes('date') || fKey.includes('date')) return '0123456789/-';
    return '';
  }

  for (const f of fields) {
    const filePath = path.join(cropsDir, f.file);
    if (!fs.existsSync(filePath)) {
      console.error(`Missing crop image for ${f.key}: ${filePath}`);
      continue;
    }

    const image = toDataUri(filePath);
    const whitelist = getWhitelist(f.type, f.key);
    const config: any = {
      tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE
    };
    if (whitelist) config.tessedit_char_whitelist = whitelist;

    console.log(`\n--- Field: ${f.key} (file: ${f.file}) ---`);
    try {
      const res = await worker.recognize(image, config as any);
      // res.data is the Tesseract result
      const rawText = (res && res.data && typeof res.data.text === 'string') ? res.data.text.trim() : '';
      const rawConf = res && res.data ? res.data.confidence : undefined;
      const rawConfType = rawConf === undefined ? 'undefined' : rawConf === null ? 'null' : rawConf === 0 ? '0' : 'number';
      const appFinalConfidence = Math.max(0, Math.min(1, (rawConf || 50) / 100));

      console.log(`OCR text: "${rawText}"`);
      console.log(`raw result.data.confidence: ${String(rawConf)} (${rawConfType})`);
      console.log(`application final confidence (as used in app): ${(appFinalConfidence * 100).toFixed(0)}%`);
    } catch (err: any) {
      console.error('Error recognizing:', err.message || err);
    }
  }

  await worker.terminate();
})();
