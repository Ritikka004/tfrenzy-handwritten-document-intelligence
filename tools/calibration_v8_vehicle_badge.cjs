const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

const v5reportPath = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v5', 'calibration-v5-report.json');
if (!fs.existsSync(v5reportPath)) throw new Error('missing v5 report');
const v5 = JSON.parse(fs.readFileSync(v5reportPath, 'utf8'));

const outDir = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v8');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const fieldsToDo = ['vehicle_number','badge_quantity'];

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

function getWhitelist(fieldKey) {
  const fk = fieldKey.toLowerCase();
  if (fk.includes('emp')) return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-';
  if (fk.includes('vehicle')) return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -';
  if (fk.includes('badge') || fk.includes('quantity')) return '0123456789';
  if (fk.includes('date')) return '0123456789/-';
  return '';
}

async function makeShiftedCandidates(ink, imgW, imgH) {
  const x = ink.x, y = ink.y, w = ink.width, h = ink.height;
  const shift = Math.max(2, Math.round(h*0.06));
  const widen = Math.max(4, Math.round(w*0.08));
  const narrow = Math.max(4, Math.round(w*0.08));

  const candidates = [];
  // original
  candidates.push({ name: 'original', x:x, y:y, width:w, height:h });
  // slightly up
  candidates.push({ name: 'up', x: x, y: clamp(y - shift,0,imgH-1), width: w, height: h });
  // slightly down
  candidates.push({ name: 'down', x: x, y: clamp(y + shift,0,imgH-1), width: w, height: h });
  // slightly wider
  const lw = clamp(x - Math.round(widen/2),0,imgW-1);
  const rw = clamp(x + w + Math.round(widen/2),0,imgW);
  candidates.push({ name: 'wider', x: lw, y: y, width: rw - lw, height: h });
  // slightly narrower (centered)
  const nx = x + Math.round(narrow/2);
  const nw = Math.max(8, w - narrow);
  candidates.push({ name: 'narrow', x: clamp(nx,0,imgW-1), y: y, width: clamp(nw,8,imgW), height: h });
  // balanced (expand both directions a bit)
  const bexpW = Math.round(w*0.15);
  const bexpH = Math.round(h*0.15);
  const bl = clamp(x - Math.round(bexpW/2),0,imgW-1);
  const br = clamp(x + w + Math.round(bexpW/2),0,imgW);
  const bt = clamp(y - Math.round(bexpH/3),0,imgH-1);
  const bb = clamp(y + h + Math.round(bexpH/2),0,imgH);
  candidates.push({ name: 'balanced', x: bl, y: bt, width: br-bl, height: bb-bt });

  // ensure unique and within bounds
  const uniq = [];
  for (const c of candidates) {
    c.x = clamp(Math.round(c.x),0,imgW-1);
    c.y = clamp(Math.round(c.y),0,imgH-1);
    c.width = clamp(Math.round(c.width),8,imgW - c.x);
    c.height = clamp(Math.round(c.height),8,imgH - c.y);
    const key = `${c.x}-${c.y}-${c.width}-${c.height}`;
    if (!uniq.find(u=>u.key===key)) uniq.push({ key, c });
  }
  return uniq.map(u=>u.c);
}

async function makePreprocessVariants(field, buf, allowAggressiveThreshold=false) {
  const variants = {};
  variants.original = buf;
  variants.grayscale = await sharp(buf).grayscale().png().toBuffer();
  variants.high_contrast = await sharp(buf).grayscale().normalize().linear(1.6, -30).png().toBuffer();
  const m = await sharp(buf).metadata();
  variants.upscale2x = await sharp(buf).resize({ width: Math.round(m.width*2), height: Math.round(m.height*2), kernel: sharp.kernel.cubic }).png().toBuffer();
  const thr = allowAggressiveThreshold ? 150 : 120;
  variants.threshold = await sharp(buf).grayscale().threshold(thr).png().toBuffer();
  variants.inv_threshold = await sharp(buf).grayscale().threshold(thr).negate().png().toBuffer();
  return variants;
}

async function analyzeField(fieldObj) {
  const field = fieldObj.field;
  const ink = fieldObj.inkBbox;
  const imgW = fieldObj.imageWidth, imgH = fieldObj.imageHeight;
  const src = path.join(process.cwd(), fieldObj.source.replace(/\\/g,'/'));
  if (!fs.existsSync(src)) { console.warn('missing',src); return []; }

  const candidates = await makeShiftedCandidates(ink, imgW, imgH);
  const allowAggressiveThreshold = field === 'vehicle_number' ? true : false;

  const results = [];

  for (const c of candidates) {
    const cropPath = path.join(outDir, `${field}_${c.name}.png`);
    await sharp(src).extract({ left: c.x, top: c.y, width: c.width, height: c.height }).png().toFile(cropPath);
    const buf = fs.readFileSync(cropPath);
    const variants = await makePreprocessVariants(field, buf, allowAggressiveThreshold);

    for (const [vname, vbuf] of Object.entries(variants)) {
      const vpath = path.join(outDir, `${field}_${c.name}_${vname}.png`);
      fs.writeFileSync(vpath, vbuf);
    }

    // OCR tests to run: PSMs [6,7,8,13] and whitelist/no-whitelist
    const psmList = [6,7,8,13];
    const preNames = Object.keys(variants);

    for (const vname of preNames) {
      const vbuf = variants[vname];
      const dataUri = 'data:image/png;base64,' + vbuf.toString('base64');
      for (const psm of psmList) {
        for (const useWhitelist of [false,true]) {
          const config = { tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY, tessedit_pageseg_mode: psm };
          const whitelist = getWhitelist(field);
          if (useWhitelist && whitelist) config.tessedit_char_whitelist = whitelist;
          try {
            const worker = await Tesseract.createWorker();
            await worker.reinitialize('eng');
            const res = await worker.recognize(dataUri, config);
            await worker.terminate();
            const rawText = (res && res.data && typeof res.data.text === 'string') ? res.data.text.trim() : '';
            const rawConf = res && res.data ? res.data.confidence : null;
            results.push({ field, candidate: c.name, x: c.x, y: c.y, width: c.width, height: c.height, preprocessing: vname, psm, whitelist: !!useWhitelist, ocr_text: rawText, ocr_confidence: rawConf });
          } catch (err) {
            results.push({ field, candidate: c.name, x: c.x, y: c.y, width: c.width, height: c.height, preprocessing: vname, psm, whitelist: !!useWhitelist, ocr_text: `[ERROR] ${String(err)}`, ocr_confidence: null });
          }
        }
      }
    }
  }
  return results;
}

(async ()=>{
  const toProcess = v5.filter(f=>fieldsToDo.includes(f.field));
  const allResults = [];
  for (const f of toProcess) {
    console.log('Processing', f.field);
    const r = await analyzeField(f);
    allResults.push(...r);
  }
  const out = path.join(outDir, 'calibration-v8-vehicle-badge-report.json');
  fs.writeFileSync(out, JSON.stringify(allResults, null, 2));
  console.log('Wrote', out);
})();
