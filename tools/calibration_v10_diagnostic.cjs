const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

const outDir = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v10');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const diagDir = path.join(outDir, 'diagnostic'); if (!fs.existsSync(diagDir)) fs.mkdirSync(diagDir, { recursive: true });
const cropsDir = path.join(outDir, 'crops'); if (!fs.existsSync(cropsDir)) fs.mkdirSync(cropsDir, { recursive: true });

const fields = [
  { key: 'vehicle_number', template: { x: 72, y: 32, width: 634, height: 92 } },
  { key: 'badge_quantity', template: { x: 719, y: 27, width: 634, height: 97 } }
];

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

async function findSourceForField(fieldKey){
  // prefer calibration-v5 report mapping
  const v5path = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v5', 'calibration-v5-report.json');
  if (fs.existsSync(v5path)){
    try{
      const v5 = JSON.parse(fs.readFileSync(v5path,'utf8'));
      const f = v5.find(x=>x.field===fieldKey);
      if (f && f.source) return f.source.replace(/\\/g,'/');
    }catch(e){}
  }
  // fallback: search debug-crops for a file starting with fieldKey
  const dirs = [path.join(process.cwd(),'backend','debug-crops'),'backend/debug-crops'];
  for (const d of dirs){
    if (!fs.existsSync(d)) continue;
    const files = fs.readdirSync(d).filter(x=>x.startsWith(fieldKey) && x.endsWith('.png'));
    if (files.length>0) return path.join(d, files[0]);
  }
  return null;
}

async function detectInkBBoxBuf(buf, opts){
  // opts: { left, top, width, height } region in full image coordinates
  if (opts){
    const regionBuf = await sharp(buf).extract({ left: opts.left, top: opts.top, width: opts.width, height: opts.height }).toBuffer();
    const thr = await sharp(regionBuf).grayscale().threshold(140).raw().toBuffer({ resolveWithObject: true });
    const { data, info } = thr; const w = info.width, h = info.height, c = info.channels;
    let minX=w, minY=h, maxX=0, maxY=0, count=0;
    for (let y=0;y<h;y++){
      for (let x=0;x<w;x++){
        const v = data[(y*w + x)*c];
        if (v === 0){
          count++;
          if (x<minX) minX=x; if (y<minY) minY=y; if (x>maxX) maxX=x; if (y>maxY) maxY=y;
        }
      }
    }
    if (count===0) return null;
    return { x: opts.left + minX, y: opts.top + minY, width: maxX-minX+1, height: maxY-minY+1, inkCount: count };
  }
  // full image fallback (less strict)
  const thr = await sharp(buf).grayscale().threshold(180).raw().toBuffer({ resolveWithObject: true });
  const { data, info } = thr; const w = info.width, h = info.height, c = info.channels;
  let minX=w, minY=h, maxX=0, maxY=0, count=0;
  for (let y=0;y<h;y++){
    for (let x=0;x<w;x++){
      const v = data[(y*w + x)*c];
      if (v === 0){ // dark pixel after threshold
        count++;
        if (x<minX) minX=x; if (y<minY) minY=y; if (x>maxX) maxX=x; if (y>maxY) maxY=y;
      }
    }
  }
  if (count===0) return null;
  return { x: minX, y: minY, width: maxX-minX+1, height: maxY-minY+1, inkCount: count };
}

function makeSvgOverlay(imgW,imgH,template,ink){
  // grid every 100px and crosshair at 0,0; draw template in red and ink in green
  const lines = [];
  for (let x=0;x<imgW;x+=100) lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${imgH}" stroke="#ffffff33" stroke-width="1"/>`);
  for (let y=0;y<imgH;y+=20) lines.push(`<line x1="0" y1="${y}" x2="${imgW}" y2="${y}" stroke="#ffffff22" stroke-width="1"/>`);
  const tpl = `<rect x="${template.x}" y="${template.y}" width="${template.width}" height="${template.height}" fill="none" stroke="red" stroke-width="3"/>`;
  const tplLabel = `<text x="${template.x+6}" y="${template.y+18}" fill="red" font-size="16">template</text>`;
  const inkRect = ink ? `<rect x="${ink.x}" y="${ink.y}" width="${ink.width}" height="${ink.height}" fill="none" stroke="lime" stroke-width="3"/>` : '';
  const inkLabel = ink ? `<text x="${(ink.x||0)+6}" y="${(ink.y||0)+18}" fill="lime" font-size="16">ink</text>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}">`+lines.join('')+tpl+tplLabel+inkRect+inkLabel+`</svg>`;
  return Buffer.from(svg);
}

function rectsOverlap(a,b){
  const x1 = Math.max(a.x, b.x); const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width); const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2<=x1 || y2<=y1) return { overlap: false, area: 0 };
  return { overlap: true, area: (x2-x1)*(y2-y1) };
}

async function run(){
  const out = [];
  const worker = await Tesseract.createWorker();
  await worker.reinitialize('eng');

  for (const f of fields){
    const report = { field: f.key };
    const source = await findSourceForField(f.key);
    report.source = source;
    if (!source || !fs.existsSync(source)){
      report.error = 'source not found';
      out.push(report);
      continue;
    }
    const normSource = source.replace(/\\/g,'/');
    const img = sharp(normSource);
    const meta = await img.metadata();
    report.imageWidth = meta.width; report.imageHeight = meta.height;
    report.template = f.template;

    const fullBuf = fs.readFileSync(normSource);
    // detect ink in a focused search window around template
    const winLeft = Math.max(0, Math.min(f.template.x - 12, meta.width-1));
    const winTop = Math.max(0, Math.min(f.template.y - 16, meta.height-1));
    const winW = Math.max(1, Math.min(meta.width - winLeft, f.template.width + 24));
    const winH = Math.max(1, Math.min(meta.height - winTop, f.template.height + 32));
    const ink = await detectInkBBoxBuf(fullBuf, { left: winLeft, top: winTop, width: winW, height: winH });
    // if nothing found, fallback to full-image detection
    if (!ink) {
      console.log('no focused ink found for', f.key, 'falling back to full-image detect');
      const fallback = await detectInkBBoxBuf(fullBuf);
      if (fallback) console.log('fallback ink bbox for', f.key, fallback);
      if (fallback) { report.inkBbox = fallback; } else report.inkBbox = null;
    } else { report.inkBbox = ink; }
    // report.inkBbox already set

    // determine overlaps
    if (report.inkBbox){
      const overlap = rectsOverlap(f.template, report.inkBbox);
      report.overlap = overlap.overlap; report.overlapArea = overlap.area;
      // is ink fully inside template?
      const inside = (report.inkBbox.x >= f.template.x) && (report.inkBbox.y >= f.template.y) &&
        (report.inkBbox.x + report.inkBbox.width <= f.template.x + f.template.width) &&
        (report.inkBbox.y + report.inkBbox.height <= f.template.y + f.template.height);
      report.inkFullyInsideTemplate = inside;
    } else { report.overlap = false; report.overlapArea = 0; report.inkFullyInsideTemplate = false; }

    // create diagnostic annotated image
    const svg = makeSvgOverlay(meta.width, meta.height, f.template, report.inkBbox);
    const diagPath = path.join(diagDir, `${f.key}_diagnostic.png`);
    await sharp(normSource).composite([{ input: svg, blend: 'over' }]).png().toFile(diagPath);
    report.diagnostic = diagPath;

    // pick up to 2 corrected crops based on ink bbox
    const candidates = [];
    if (report.inkBbox){
      const pad1 = 6; const pad2 = 12;
      const c1 = {
        x: clamp(report.inkBbox.x - pad1, 0, meta.width-1),
        y: clamp(report.inkBbox.y - pad1, 0, meta.height-1),
        width: clamp(report.inkBbox.width + pad1*2, 1, meta.width),
        height: clamp(report.inkBbox.height + pad1*2, 1, meta.height)
      };
      const c2 = {
        x: clamp(report.inkBbox.x - pad2, 0, meta.width-1),
        y: clamp(report.inkBbox.y - pad2, 0, meta.height-1),
        width: clamp(report.inkBbox.width + pad2*2, 1, meta.width),
        height: clamp(report.inkBbox.height + pad2*2, 1, meta.height)
      };
      candidates.push(c1);
      // only add second if meaningfully larger
      if (c2.width>c1.width+4 || c2.height>c1.height+4) candidates.push(c2);
    } else {
      // fall back to template and a small expanded version
      const t = f.template;
      candidates.push({ x: t.x, y: t.y, width: t.width, height: t.height });
      const ex = { x: clamp(t.x-8,0,meta.width-1), y: clamp(t.y-4,0,meta.height-1), width: clamp(t.width+16,1,meta.width), height: clamp(t.height+8,1,meta.height) };
      candidates.push(ex);
    }

    report.correctedCandidates = [];
    for (let i=0;i<candidates.length;i++){
      const c = candidates[i];
      const fname = `${f.key}_corrected_${i}.png`;
      const outPath = path.join(cropsDir, fname);
      const exW = Math.max(1, Math.min(c.width, meta.width - c.x));
      const exH = Math.max(1, Math.min(c.height, meta.height - c.y));
      await sharp(normSource).extract({ left: c.x, top: c.y, width: exW, height: exH }).png().toFile(outPath);
      // run tesseract once
      const dataUri = 'data:image/png;base64,' + fs.readFileSync(outPath).toString('base64');
      let ocr = { text: null, confidence: null };
      try{
        const cfg = { tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY, tessedit_pageseg_mode: 6 };
        const res = await worker.recognize(dataUri, cfg);
        ocr.text = (res && res.data && res.data.text) ? res.data.text.trim() : '';
        ocr.confidence = (res && res.data) ? res.data.confidence : null;
      }catch(e){ ocr.text = '[ERROR] '+String(e); ocr.confidence = null; }
      report.correctedCandidates.push({ x: c.x, y: c.y, width: exW, height: exH, path: outPath, ocr_text: ocr.text, ocr_confidence: ocr.confidence });
    }

    out.push(report);
  }
  try{ await worker.terminate(); }catch(e){}
  const outPath = path.join(outDir, 'calibration-v10-source-mapping-report.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('Wrote', outPath);
}

run().catch(e=>{ console.error(e); process.exit(1); });
