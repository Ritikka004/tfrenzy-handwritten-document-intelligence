const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

const outDir = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v6');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const items = [
  { field: 'visit_date', file: path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v5', 'candidates', 'visit_date_candidate_margin0.png'), expected: '09/08/2026' },
  { field: 'host_employee_id', file: path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v5', 'candidates', 'host_employee_id_candidate_margin5.png'), expected: 'EMP1234' },
  { field: 'vehicle_number', file: path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v5', 'candidates', 'vehicle_number_candidate_margin10.png'), expected: 'TN09BX1234' },
  { field: 'badge_quantity', file: path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v5', 'candidates', 'badge_quantity_candidate_margin0.png'), expected: '02' }
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

function normalize(field, text) {
  if (!text) return '';
  const t = String(text).trim();
  if (field === 'host_employee_id') return t.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (field === 'vehicle_number') return t.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (field === 'badge_quantity') return (parseInt(t.replace(/[^0-9]/g, ''), 10) || 0).toString();
  if (field === 'visit_date') return t.replace(/[^0-9]/g, '');
  return t.toUpperCase();
}

async function makeVariants(field, srcPath) {
  const buf = fs.readFileSync(srcPath);
  const meta = await sharp(buf).metadata();
  const width = meta.width, height = meta.height;

  const variants = {};

  // original
  variants.original = await sharp(buf).png().toBuffer();

  // grayscale
  variants.grayscale = await sharp(buf).grayscale().png().toBuffer();

  // 2x upscale (keep at 2x size)
  variants.upscale2x = await sharp(buf).resize({ width: Math.round(width*2), height: Math.round(height*2), kernel: sharp.kernel.cubic }).png().toBuffer();

  // high-contrast: normalize + linear
  variants.high_contrast = await sharp(buf).grayscale().normalize().linear(1.4, -20).png().toBuffer();

  // threshold
  variants.threshold = await sharp(buf).grayscale().threshold(150).png().toBuffer();

  // inverted threshold
  variants.inv_threshold = await sharp(buf).grayscale().threshold(150).negate().png().toBuffer();

  // save individual variant files
  for (const [name, buffer] of Object.entries(variants)) {
    const out = path.join(outDir, `${field}_${name}.png`);
    fs.writeFileSync(out, buffer);
  }

  // create montage: resize all variants to same height (use max height among them)
  const imgs = await Promise.all(Object.values(variants).map(b => sharp(b).metadata().then(m=>({buf:b,w:m.width,h:m.height}))));
  const maxH = Math.max(...imgs.map(i=>i.h));
  const resized = imgs.map(i=>sharp(i.buf).resize({ height: maxH }).png().toBuffer());
  const rb = await Promise.all(resized);
  const metas = await Promise.all(rb.map(b=>sharp(b).metadata()));
  const totalW = metas.reduce((s,m)=>s+m.width,0);
  const montage = sharp({ create: { width: totalW, height: maxH, channels: 3, background: { r:255,g:255,b:255 } } });
  let offsetX = 0;
  const comps = [];
  for (let i=0;i<rb.length;i++) {
    comps.push({ input: rb[i], left: offsetX, top: 0 });
    offsetX += metas[i].width;
  }
  const montageBuf = await montage.composite(comps).png().toBuffer();
  fs.writeFileSync(path.join(outDir, `${field}_montage.png`), montageBuf);

  return { variants: Object.keys(variants), meta };
}

async function analyzeInkMetrics(buffer) {
  // compute simple metrics: ink pixel ratio and clipping
  const { data, info } = await sharp(buffer).grayscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  let inkCount = 0;
  for (let i=0;i<data.length;i++) {
    if (data[i] < 230) inkCount++;
  }
  const inkRatio = inkCount / (w*h);
  // check top/bottom rows for clipping
  let topRowInk=0, bottomRowInk=0;
  for (let x=0;x<w;x++) {
    if (data[x] < 230) topRowInk++;
    const idx = (h-1)*w + x;
    if (data[idx] < 230) bottomRowInk++;
  }
  const clipping = (topRowInk>Math.max(2, w*0.01)) || (bottomRowInk>Math.max(2, w*0.01));
  return { inkRatio, clipping, inkCount, width: w, height: h };
}

(async ()=>{
  const psmList = [6,7,8,13];
  const worker = await Tesseract.createWorker();
  await worker.reinitialize('eng');

  const allOcrResults = [];
  const diagnosis = [];

  for (const it of items) {
    if (!fs.existsSync(it.file)) { console.warn('missing', it.file); continue; }
    const field = it.field;
    console.log('Processing', field);
    const { variants, meta } = await makeVariants(field, it.file);

    // compute visual metrics for original
    const origBuf = fs.readFileSync(path.join(outDir, `${field}_original.png`));
    const metrics = await analyzeInkMetrics(origBuf);

    let best = { normalized_match: false, confidence: -1, result: null };

    for (const v of variants) {
      const vpath = path.join(outDir, `${field}_${v}.png`);
      const dataUri = 'data:image/png;base64,' + fs.readFileSync(vpath).toString('base64');
      for (const psm of psmList) {
        for (const useWhitelist of [true, false]) {
          const cfg = { tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY, tessedit_pageseg_mode: psm };
          const whitelist = getWhitelist(field);
          if (useWhitelist && whitelist) cfg.tessedit_char_whitelist = whitelist;
          try {
            const res = await worker.recognize(dataUri, cfg);
            const rawText = (res && res.data && typeof res.data.text === 'string') ? res.data.text.trim() : '';
            const rawConf = res && res.data ? res.data.confidence : null;
            const normRaw = normalize(field, rawText);
            const normExp = normalize(field, it.expected);
            const normalizedMatch = normRaw && normExp ? normRaw === normExp : false;
            allOcrResults.push({ field, preprocessing: v, psm, whitelist: useWhitelist, ocr_text: rawText, confidence: rawConf });

            if (normalizedMatch) {
              if (!best.normalized_match || (rawConf || 0) > (best.confidence || 0)) {
                best = { normalized_match: true, confidence: rawConf, result: { field, preprocessing: v, psm, whitelist: useWhitelist, ocr_text: rawText, confidence: rawConf } };
              }
            } else if (!best.normalized_match && (rawConf || 0) > (best.confidence || 0)) {
              best = { normalized_match: false, confidence: rawConf, result: { field, preprocessing: v, psm, whitelist: useWhitelist, ocr_text: rawText, confidence: rawConf } };
            }
          } catch (err) {
            console.error('ocr err', field, v, psm, useWhitelist, err && err.message ? err.message : err);
          }
        }
      }
    }

    // choose best preprocessing/psm/whitelist
    const bestRes = best.result;

    // decide likely problems
    let likely_crop_problem = false;
    if (metrics.clipping || metrics.inkRatio < 0.001) likely_crop_problem = true;

    let likely_ocr_problem = false;
    if (bestRes && !best.normalized_match) likely_ocr_problem = true;

    const visual_quality = (metrics.inkRatio > 0.005 && metrics.clipping===false) ? 'good' : (metrics.inkRatio > 0.001 ? 'fair' : 'poor');

    diagnosis.push({ field, visual_quality, handwriting_visible: metrics.inkRatio > 0.001, complete_value_visible: !metrics.clipping, likely_crop_problem, likely_ocr_problem, best_preprocessing: bestRes ? bestRes.preprocessing : null, best_psm: bestRes ? bestRes.psm : null, best_whitelist: bestRes ? bestRes.whitelist : null, best_ocr: bestRes ? bestRes.ocr_text : null, best_confidence: bestRes ? bestRes.confidence : null });
  }

  await worker.terminate();

  fs.writeFileSync(path.join(outDir, 'calibration-v6-ocr-results.json'), JSON.stringify(allOcrResults, null, 2));
  fs.writeFileSync(path.join(outDir, 'calibration-v6-diagnosis.json'), JSON.stringify(diagnosis, null, 2));
  console.log('Wrote calibration-v6 outputs to', outDir);
})();
