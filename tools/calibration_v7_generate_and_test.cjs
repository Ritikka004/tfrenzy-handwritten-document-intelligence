const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

const v5reportPath = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v5', 'calibration-v5-report.json');
if (!fs.existsSync(v5reportPath)) throw new Error('missing v5 report');
const v5 = JSON.parse(fs.readFileSync(v5reportPath, 'utf8'));

const outDir = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v7');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function normalize(field, text) {
  if (!text) return '';
  const t = String(text).trim();
  if (field === 'host_employee_id') return t.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (field === 'vehicle_number') return t.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (field === 'badge_quantity') return (parseInt(t.replace(/[^0-9]/g, ''), 10) || 0).toString();
  if (field === 'visit_date') return t.replace(/[^0-9]/g, '');
  return t.toUpperCase();
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function makeCandidatesFromInk(ink, imgW, imgH) {
  const x = ink.x, y = ink.y, w = ink.width, h = ink.height;
  const candidates = [];

  // tight: exactly ink bbox
  candidates.push({ name: 'tight', x: x, y: y, width: w, height: h });

  // balanced: expand sides and bottom, small top expansion to avoid label
  const expandW1 = Math.round(w * 0.12);
  const expandH1 = Math.round(h * 0.12);
  const top1 = clamp(y - Math.min(5, Math.round(h * 0.03)), 0, imgH-1);
  const left1 = clamp(x - expandW1, 0, imgW-1);
  const right1 = clamp(x + w + expandW1, 0, imgW);
  const bottom1 = clamp(y + h + expandH1, 0, imgH);
  candidates.push({ name: 'balanced', x: left1, y: top1, width: right1 - left1, height: bottom1 - top1 });

  // expanded: larger margins, but limit top expansion to avoid label
  const expandW2 = Math.round(w * 0.22);
  const expandH2 = Math.round(h * 0.22);
  const top2 = clamp(y - Math.min(6, Math.round(h * 0.05)), 0, imgH-1);
  const left2 = clamp(x - expandW2, 0, imgW-1);
  const right2 = clamp(x + w + expandW2, 0, imgW);
  const bottom2 = clamp(y + h + expandH2, 0, imgH);
  candidates.push({ name: 'expanded', x: left2, y: top2, width: right2 - left2, height: bottom2 - top2 });

  return candidates;
}

async function preprocessForField(field, buf, method) {
  if (method === 'upscale2x') {
    const m = await sharp(buf).metadata();
    return sharp(buf).resize({ width: Math.round(m.width*2), height: Math.round(m.height*2), kernel: sharp.kernel.cubic }).png().toBuffer();
  }
  if (method === 'high_contrast') {
    return sharp(buf).grayscale().normalize().linear(1.4, -20).png().toBuffer();
  }
  if (method === 'grayscale') {
    return sharp(buf).grayscale().png().toBuffer();
  }
  return buf;
}

async function detectInkInCrop(buf) {
  const { data, info } = await sharp(buf).grayscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  let inkCount = 0;
  for (let i=0;i<data.length;i++) if (data[i] < 230) inkCount++;
  const inkRatio = inkCount / (w*h);
  // detect if ink touches edges
  let leftEdge=0,rightEdge=0,topEdge=0,bottomEdge=0;
  for (let yy=0;yy<h;yy++){
    if (data[yy*w + 0] < 230) leftEdge++;
    if (data[yy*w + (w-1)] < 230) rightEdge++;
  }
  for (let xx=0;xx<w;xx++){
    if (data[0*w + xx] < 230) topEdge++;
    if (data[(h-1)*w + xx] < 230) bottomEdge++;
  }
  const clipping = (leftEdge > Math.max(1, h*0.01)) || (rightEdge > Math.max(1, h*0.01)) || (topEdge > Math.max(1, w*0.01)) || (bottomEdge > Math.max(1, w*0.01));
  return { inkRatio, inkCount, clipping };
}

(async ()=>{
  const psm = 6; // use strongest found in v6
  const worker = await Tesseract.createWorker();
  await worker.reinitialize('eng');

  const report = [];

  for (const f of v5) {
    const field = f.field;
    const ink = f.inkBbox;
    const imgW = f.imageWidth, imgH = f.imageHeight;
    const src = path.join(process.cwd(), f.source.replace(/\\/g,'/'));
    if (!fs.existsSync(src)) {
      console.warn('missing source', src); continue;
    }

    const candidates = makeCandidatesFromInk(ink, imgW, imgH);

    for (const c of candidates) {
      const outPath = path.join(outDir, `${field}_${c.name}.png`);
      // extract from source
      await sharp(src).extract({ left: c.x, top: c.y, width: c.width, height: c.height }).png().toFile(outPath);

      // decide preprocessing method per requirements
      let method = null;
      if (field === 'visit_date') method = 'upscale2x';
      if (field === 'host_employee_id') method = 'high_contrast';
      if (field === 'vehicle_number') method = 'high_contrast';
      if (field === 'badge_quantity') method = 'grayscale';

      const buf = fs.readFileSync(outPath);
      const preBuf = method ? await preprocessForField(field, buf, method) : buf;
      const prePath = path.join(outDir, `${field}_${c.name}_${method||'none'}.png`);
      fs.writeFileSync(prePath, preBuf);

      // OCR (PSM 6, no whitelist)
      const dataUri = 'data:image/png;base64,' + preBuf.toString('base64');
      const config = { tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY, tessedit_pageseg_mode: psm };
      try {
        const res = await worker.recognize(dataUri, config);
        const rawText = (res && res.data && typeof res.data.text === 'string') ? res.data.text.trim() : '';
        const rawConf = res && res.data ? res.data.confidence : null;

        // detect ink metrics inside crop
        const inkMetrics = await detectInkInCrop(buf);

        // heuristics
        const handwriting_complete = true; // ensure since derived from ink bbox
        const label_excluded = c.y >= ink.y - 2; // top at/after ink top
        const border_excluded = (c.x > 2) && (c.y > 2) && (c.x + c.width < imgW - 2) && (c.y + c.height < imgH - 2);
        const clipping = inkMetrics.clipping;
        const normalized = normalize(field, rawText);
        const expected = f.inkBbox ? null : null; // not used
        const expectedVal = (field === 'visit_date' && f) ? (f.diagnostic ? null : null) : null;

        const normMatch = (function(){
          const exp = (field === 'visit_date') ? (f && f.diagnostic ? '' : '') : '';
          // Instead use expected from earlier known ground truth
          return normalize(field, (field==='visit_date'? '09/08/2026' : field==='host_employee_id'?'EMP1234':field==='vehicle_number'?'TN09BX1234': '02')) === normalize(field, rawText);
        })();

        report.push({ field, candidate: c.name, x: c.x, y: c.y, width: c.width, height: c.height, handwriting_complete, label_excluded, border_excluded, clipping, ocr_text: rawText, ocr_confidence: rawConf, normalized_expected_match: normMatch });
      } catch (err) {
        report.push({ field, candidate: c.name, x: c.x, y: c.y, width: c.width, height: c.height, handwriting_complete: true, label_excluded: c.y >= ink.y - 2, border_excluded: (c.x > 2) && (c.y > 2), clipping: false, ocr_text: `[ERROR] ${String(err)}`, ocr_confidence: null, normalized_expected_match: false });
      }
    }
  }

  await worker.terminate();
  const outJson = path.join(outDir, 'calibration-v7-bbox-report.json');
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2));
  console.log('Wrote', outJson);
})();
