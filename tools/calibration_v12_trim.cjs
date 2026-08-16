const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

const outDir = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v12');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const diagDir = path.join(outDir, 'diagnostic'); if (!fs.existsSync(diagDir)) fs.mkdirSync(diagDir, { recursive: true });
const cropsDir = path.join(outDir, 'crops'); if (!fs.existsSync(cropsDir)) fs.mkdirSync(cropsDir, { recursive: true });

const v10Path = path.join(process.cwd(),'backend','debug-crops','calibration-v10','calibration-v10-source-mapping-report.json');
const v10 = fs.existsSync(v10Path) ? JSON.parse(fs.readFileSync(v10Path,'utf8')) : [];

const source = path.join(process.cwd(),'backend','debug-crops','test_row3_full.png');
if (!fs.existsSync(source)) { console.error('source missing', source); process.exit(1); }

const fields = [
  { key: 'vehicle_number' },
  { key: 'badge_quantity' }
];

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

async function horizontalProjection(buf, left, right){
  const img = sharp(buf).extract({ left, top:0, width: right-left, height: (await sharp(buf).metadata()).height }).grayscale().threshold(160).raw();
  const { data, info } = await img.toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, c = info.channels;
  const proj = new Array(h).fill(0);
  for (let y=0;y<h;y++){
    let sum=0;
    for (let x=0;x<w;x++){
      const v = data[(y*w + x)*c];
      if (v === 0) sum++;
    }
    proj[y] = sum;
  }
  return proj;
}

function findLabelRegion(proj, top, bottom){
  // find rows with value > 20% of max in window
  const window = proj.slice(top, bottom+1);
  const maxv = Math.max(...window, 0);
  const thresh = Math.max(10, Math.round(maxv * 0.2));
  const rows = [];
  for (let i=0;i<window.length;i++){ if (window[i] > thresh) rows.push(top + i); }
  if (rows.length===0) return null;
  // pick the contiguous group nearest the top (smallest row index)
  let groups = []; let g = [rows[0]];
  for (let i=1;i<rows.length;i++){ if (rows[i] === rows[i-1]+1) g.push(rows[i]); else { groups.push(g); g = [rows[i]]; } }
  groups.push(g);
  groups.sort((a,b)=> a[0]-b[0]);
  const chosen = groups[0];
  return { top: chosen[0], bottom: chosen[chosen.length-1] };
}

function makeAnnotatedSvg(imgW,imgH,template,labelRegion,ink,finalCrop){
  const parts = [];
  parts.push(`<rect x="${template.x}" y="${template.y}" width="${template.width}" height="${template.height}" fill="none" stroke="red" stroke-width="3"/>`);
  if (labelRegion) parts.push(`<rect x="0" y="${labelRegion.top}" width="${imgW}" height="${labelRegion.bottom - labelRegion.top +1}" fill="#ff990033" stroke="#ff9900" stroke-width="2"/>`);
  if (ink) parts.push(`<rect x="${ink.x}" y="${ink.y}" width="${ink.width}" height="${ink.height}" fill="none" stroke="lime" stroke-width="3"/>`);
  if (finalCrop) parts.push(`<rect x="${finalCrop.x}" y="${finalCrop.y}" width="${finalCrop.width}" height="${finalCrop.height}" fill="none" stroke="#00f" stroke-width="3"/>`);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}">`+parts.join('')+`</svg>`);
}

async function run(){
  const meta = await sharp(source).metadata();
  const buf = fs.readFileSync(source);
  const report = [];
  for (const f of fields){
    const rec = { field: f.key, source: 'backend/debug-crops/test_row3_full.png' };
    const v10e = v10.find(x=>x.field===f.key);
    if (!v10e || !v10e.inkBbox){ rec.error='no v10 ink bbox'; report.push(rec); continue; }
    const template = v10e.template; const ink = v10e.inkBbox;
    rec.template = template; rec.inkBbox = ink;

    // compute horizontal projection focused on template x-range (extended 10px each side)
    const left = clamp((template? template.x : ink.x) - 10, 0, meta.width-1);
    const right = clamp((template? template.x + template.width : ink.x + ink.width) + 10, 0, meta.width);
    const proj = await horizontalProjection(buf, left, right);

    // find label region between template.top-20 and ink.y-1
    const winTop = clamp((template? template.y - 20 : 0), 0, meta.height-1);
    const winBottom = clamp(ink.y - 1, 0, meta.height-1);
    let labelRegion = null;
    if (winBottom > winTop) labelRegion = findLabelRegion(proj, winTop, winBottom);
    rec.labelRegion = labelRegion;

    // determine separation: valley between label bottom and ink.top
    let separation = null; let cannotSeparate=false;
    if (labelRegion){
      const valleyTop = labelRegion.bottom + 1; const valleyBottom = ink.y - 1;
      if (valleyBottom >= valleyTop){
        // find minimal projection row in valley
        let minVal = Infinity; let minRow = valleyTop;
        for (let r=valleyTop;r<=valleyBottom;r++){ if (proj[r] < minVal){ minVal = proj[r]; minRow = r; } }
        separation = minRow;
      } else { cannotSeparate = true; }
    } else {
      // no label region found; assume printable label absent or can't detect
      rec.note = 'label region not detected';
      cannotSeparate = true;
    }

    rec.separationRow = separation;

    // compute final crop: margin 6px around ink, but must start below printed label
    const vMargin = 6; const hMargin = 5;
    if (separation === null){ rec.issue = 'cannot reliably separate label and handwriting'; rec.visual_verdict='OVERLAP_OR_UNKNOWN'; rec.ready='NOT READY'; report.push(rec); continue; }

    const cropTopCandidate = ink.y - vMargin; // include margin above handwriting
    const minTop = separation + 3; // must start below label bottom + 3
    if (cropTopCandidate <= minTop){
      // cannot place crop below label without clipping handwriting
      rec.issue = 'label and handwriting overlap; cannot exclude label without clipping';
      rec.visual_verdict='OVERLAP'; rec.ready='NOT READY';
      // still produce a conservative crop that includes handwriting fully but note label present
      const leftX = (template && template.x) || ink.x;
      const cropLeft = clamp( (ink.x - hMargin) < leftX ? ink.x - hMargin : leftX, 0, meta.width-1 );
      const cropRight = clamp(Math.max((template? template.x + template.width: ink.x + ink.width), ink.x + ink.width + hMargin), 0, meta.width);
      const cropTop = clamp(Math.min(cropTopCandidate, minTop), 0, meta.height-1);
      const cropBottom = clamp(ink.y + ink.height + vMargin, 0, meta.height);
      const final = { x: Math.round(cropLeft), y: Math.round(cropTop), width: Math.round(cropRight - cropLeft), height: Math.round(cropBottom - cropTop) };
      const outPath = path.join(cropsDir, `${f.key}_v12_final.png`);
      await sharp(source).extract({ left: final.x, top: final.y, width: final.width, height: final.height }).png().toFile(outPath);
      // annotate
      const svg = makeAnnotatedSvg(meta.width, meta.height, template, labelRegion, ink, final);
      const diagPath = path.join(diagDir, `${f.key}_v12_diag.png`);
      await sharp(source).composite([{ input: svg, blend: 'over' }]).png().toFile(diagPath);
      rec.finalCrop = final; rec.diagnostic = diagPath; rec.cropPath = outPath; rec.handwritingComplete = true; rec.labelExcluded = false; rec.clipping = false;
      // OCR
      const dataUri = 'data:image/png;base64,' + fs.readFileSync(outPath).toString('base64');
      const worker = await Tesseract.createWorker(); await worker.reinitialize('eng');
      try{ const cfg = { tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY, tessedit_pageseg_mode: 6 }; const res = await worker.recognize(dataUri, cfg); rec.ocr = { text: (res && res.data && res.data.text) ? res.data.text.trim() : '', confidence: (res && res.data) ? res.data.confidence : null }; }catch(e){ rec.ocr = { text: '[ERROR] '+String(e), confidence: null }; }
      try{ await worker.terminate(); }catch(e){}
      report.push(rec); continue;
    }

    // otherwise we can place a crop starting at ink.y - vMargin which is below label
    const cropTop = clamp(ink.y - vMargin, 0, meta.height-1);
    const cropBottom = clamp(ink.y + ink.height + vMargin, 0, meta.height);
    const leftX = (template && template.x) || ink.x;
    let cropLeft = leftX;
    // adjust left if needed to include ink
    if (ink.x - hMargin < cropLeft) cropLeft = clamp(ink.x - hMargin, 0, meta.width-1);
    let cropRight = clamp(Math.max((template? template.x + template.width: ink.x + ink.width), ink.x + ink.width + hMargin), 0, meta.width);
    const final = { x: Math.round(cropLeft), y: Math.round(cropTop), width: Math.round(cropRight - cropLeft), height: Math.round(cropBottom - cropTop) };
    // ensure not clipping
    const handwritingComplete = (ink.x >= final.x) && (ink.y >= final.y) && (ink.x + ink.width <= final.x + final.width) && (ink.y + ink.height <= final.y + final.height);
    // check label excluded: label rows < separation, final.y must be > label.bottom
    const labelExcluded = labelRegion ? (final.y > labelRegion.bottom) : false;

    // save crop and diagnostic
    const outPath = path.join(cropsDir, `${f.key}_v12_final.png`);
    await sharp(source).extract({ left: final.x, top: final.y, width: final.width, height: final.height }).png().toFile(outPath);
    const svg = makeAnnotatedSvg(meta.width, meta.height, template, labelRegion, ink, final);
    const diagPath = path.join(diagDir, `${f.key}_v12_diag.png`);
    await sharp(source).composite([{ input: svg, blend: 'over' }]).png().toFile(diagPath);

    // OCR once
    const dataUri = 'data:image/png;base64,' + fs.readFileSync(outPath).toString('base64');
    const worker2 = await Tesseract.createWorker(); await worker2.reinitialize('eng');
    try{ const cfg = { tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY, tessedit_pageseg_mode: 6 }; const res = await worker2.recognize(dataUri, cfg); rec.ocr = { text: (res && res.data && res.data.text) ? res.data.text.trim() : '', confidence: (res && res.data) ? res.data.confidence : null }; }catch(e){ rec.ocr = { text: '[ERROR] '+String(e), confidence: null }; }
    try{ await worker2.terminate(); }catch(e){}

    rec.finalCrop = final; rec.diagnostic = diagPath; rec.cropPath = outPath; rec.handwritingComplete = handwritingComplete; rec.labelExcluded = labelExcluded; rec.clipping = !handwritingComplete; rec.visual_verdict = (labelExcluded && handwritingComplete && !rec.clipping) ? 'GOOD' : (labelExcluded ? 'OK' : 'LABEL_PRESENT'); rec.ready = (labelExcluded && handwritingComplete && !rec.clipping) ? 'READY' : 'NOT READY';
    report.push(rec);
  }

  const outPath = path.join(outDir,'calibration-v12-report.json'); fs.writeFileSync(outPath, JSON.stringify(report, null, 2)); console.log('Wrote', outPath);
}

run().catch(e=>{ console.error(e); process.exit(1); });
