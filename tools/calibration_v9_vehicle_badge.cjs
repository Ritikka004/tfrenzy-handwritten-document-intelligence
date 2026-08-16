const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

const outDir = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v9');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const fields = [
  { key: 'vehicle_number', // baseline starting coords (from v8 success)
    start: { x: 72, y: 32, width: 634, height: 92 },
    preproc: 'threshold' },
  { key: 'badge_quantity',
    start: { x: 719, y: 27, width: 634, height: 97 },
    preproc: 'high_contrast' }
];

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

async function makeCandidates(start, imgW, imgH) {
  // produce a small curated set of candidates (not a combinatorial explosion)
  const { x, y, width, height } = start;
  const variations = [
    { dx: 0, dy: 0, dh: 0, trim: 0 }, // original
    { dx: 0, dy: -8, dh: 0, trim: 0 }, // slightly up
    { dx: 0, dy: 8, dh: 0, trim: 0 }, // slightly down
    { dx: 0, dy: -4, dh: -12, trim: 8 }, // trim top, reduce height
    { dx: 0, dy: 0, dh: -24, trim: 12 }, // more trim
    { dx: 0, dy: -12, dh: 12, trim: 0 }, // move up and increase height
    { dx: -6, dy: 0, dh: 0, trim: 0 }, // small left
    { dx: 6, dy: 0, dh: 0, trim: 0 }, // small right
    { dx: 0, dy: 4, dh: -12, trim: 4 }, // lower a bit, reduce
    { dx: 0, dy: 0, dh: 12, trim: 0 }, // taller
    { dx: 0, dy: 0, dh: 0, trim: 8 }, // trim top by 8
    { dx: 0, dy: -6, dh: -8, trim: 6 } // mixed
  ];
  const out = [];
  for (const v of variations) {
    const nx = clamp(x + v.dx, 0, imgW-1);
    const ny = clamp(y + v.dy + v.trim, 0, imgH-1);
    const nh = clamp(Math.max(8, height + v.dh - v.trim), 8, imgH - ny);
    const nw = clamp(Math.max(8, width - Math.abs(v.dx)), 8, imgW - nx);
    out.push({ x: Math.round(nx), y: Math.round(ny), width: Math.round(nw), height: Math.round(nh) });
  }
  // unique
  const uniq = new Set();
  return out.filter(c=>{ const k = `${c.x}-${c.y}-${c.width}-${c.height}`; if (uniq.has(k)) return false; uniq.add(k); return true; });
}

async function preprocessVariant(buf, name) {
  if (name === 'original') return buf;
  if (name === 'threshold') return await sharp(buf).grayscale().threshold(120).png().toBuffer();
  if (name === 'high_contrast') return await sharp(buf).grayscale().normalize().linear(1.6,-30).png().toBuffer();
  return buf;
}

async function detectInkBBox(buf) {
  // return bounding box of dark pixels after thresholding
  const img = sharp(buf).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const { data, info } = await img;
  const w = info.width, h = info.height, channels = info.channels;
  let minX = w, minY = h, maxX = 0, maxY = 0; let found = false;
  for (let yy=0; yy<h; yy++){
    for (let xx=0; xx<w; xx++){
      const idx = (yy*w + xx) * channels;
      // compute luminance approx from first channel (sharp gives grayscale before threshold if used)
      const r = data[idx];
      if (r < 220) { // dark pixel heuristic
        found = true;
        if (xx < minX) minX = xx;
        if (yy < minY) minY = yy;
        if (xx > maxX) maxX = xx;
        if (yy > maxY) maxY = yy;
      }
    }
  }
  if (!found) return null;
  return { x: minX, y: minY, width: maxX-minX+1, height: maxY-minY+1 };
}

async function runTesseractOnBuffer(worker, buf) {
  const dataUri = 'data:image/png;base64,' + buf.toString('base64');
  const res = await worker.recognize(dataUri);
  return { text: (res && res.data && res.data.text) ? res.data.text.trim() : '', confidence: (res && res.data) ? res.data.confidence : null };
}

async function processField(fieldDef) {
  // find source image: read calibration-v5 report and use its source if present; else try to locate a row image in debug-crops
  const v5path = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v5', 'calibration-v5-report.json');
  let source = null;
  if (fs.existsSync(v5path)){
    try{
      const v5 = JSON.parse(fs.readFileSync(v5path,'utf8'));
      const f = v5.find(x=>x.field===fieldDef.key);
      if (f && f.source) source = f.source.replace(/\\/g,'/');
    }catch(e){}
  }
  if (!source) {
    // try to find in calibration-v8 directory an image that starts with the field name
    const v8dir = path.join(process.cwd(),'backend','debug-crops','calibration-v8');
    if (fs.existsSync(v8dir)){
      const files = fs.readdirSync(v8dir).filter(x=>x.startsWith(fieldDef.key) && x.endsWith('.png'));
      if (files.length>0) source = path.join(v8dir, files[0]);
    }
  }
  if (!source || !fs.existsSync(source)) throw new Error('source row image not found for '+fieldDef.key+' (tried '+String(source)+')');

  const meta = await sharp(source).metadata();
  const imgW = meta.width, imgH = meta.height;

  const start = fieldDef.start;
  const candidates = await makeCandidates(start, imgW, imgH);

  const results = [];
  // initialize one worker for this field (use reinitialize pattern used elsewhere)
  const worker = await Tesseract.createWorker();
  await worker.reinitialize('eng');

  for (let i=0;i<candidates.length;i++){
    const c = candidates[i];
    const fnameBase = `${fieldDef.key}_cand_${i}`;
    const cropPath = path.join(outDir, fnameBase + '.png');
    await sharp(source).extract({ left: c.x, top: c.y, width: c.width, height: c.height }).png().toFile(cropPath);
    const originalBuf = fs.readFileSync(cropPath);
    // ensure ink fully inside: detect ink bbox on original (loose)
    const ink = await detectInkBBox(originalBuf);
    const inkInside = ink ? (ink.y > 2 && (ink.y + ink.height) < (c.height - 2)) : false;

    // create requested preprocessing variant
    const preName = fieldDef.preproc;
    const preBuf = await preprocessVariant(originalBuf, preName);
    const prePath = path.join(outDir, fnameBase + '_' + preName + '.png');
    fs.writeFileSync(prePath, preBuf);


    // run baseline OCR (PSM 6, no whitelist) using reusable worker
    let ocrRes;
    try{
      const cfg = { tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY, tessedit_pageseg_mode: 6 };
      const dataUri = 'data:image/png;base64,' + preBuf.toString('base64');
      const res = await worker.recognize(dataUri, cfg);
      ocrRes = { text: (res && res.data && res.data.text) ? res.data.text.trim() : '', confidence: (res && res.data) ? res.data.confidence : null };
    } catch(e){ ocrRes = { text: '[ERROR] '+String(e), confidence: null }; }

    results.push({ field: fieldDef.key, candidateIndex: i, x: c.x, y: c.y, width: c.width, height: c.height, preprocessing: preName, psm: 6, whitelist: false, ocr_text: ocrRes.text, ocr_confidence: ocrRes.confidence, inkInside });
  }
  await worker.terminate();
  return results;
}

(async ()=>{
  const all = [];
  for (const f of fields) {
    try{
      console.log('Processing', f.key);
      const r = await processField(f);
      all.push(...r);
    }catch(err){ console.error('failed', f.key, err); }
  }
  const outPath = path.join(outDir, 'calibration-v9-vehicle-badge-report.json');
  fs.writeFileSync(outPath, JSON.stringify(all, null, 2));
  console.log('Wrote', outPath);
})();
