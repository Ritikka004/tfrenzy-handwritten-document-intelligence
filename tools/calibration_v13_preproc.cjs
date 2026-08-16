const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

const outRoot = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v13');
if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });

const v11Path = path.join(process.cwd(),'backend','debug-crops','calibration-v11','calibration-v11-report.json');
const v11 = fs.existsSync(v11Path) ? JSON.parse(fs.readFileSync(v11Path,'utf8')) : [];

const fields = ['vehicle_number','badge_quantity'];
const expected = { vehicle_number: 'TN09BX1234', badge_quantity: '02' };

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

async function getCropBuffer(sourcePath, bbox){
  return await sharp(sourcePath).extract({ left: bbox.x, top: bbox.y, width: bbox.width, height: bbox.height }).png().toBuffer();
}

async function grayscaleRaw(buf){
  return await sharp(buf).grayscale().raw().toBuffer({ resolveWithObject: true });
}

function horizontalProjectionFromRaw(obj){
  const { data, info } = obj; const w = info.width, h = info.height, c = info.channels;
  const proj = new Array(h).fill(0);
  for (let y=0;y<h;y++){
    let sum=0;
    for (let x=0;x<w;x++){ const v = data[(y*w + x)*c]; if (v < 200) sum++; }
    proj[y] = sum;
  }
  return proj;
}

function verticalProjectionFromRaw(obj){
  const { data, info } = obj; const w = info.width, h = info.height, c = info.channels;
  const proj = new Array(w).fill(0);
  for (let x=0;x<w;x++){
    let sum=0;
    for (let y=0;y<h;y++){ const v = data[(y*w + x)*c]; if (v < 200) sum++; }
    proj[x] = sum;
  }
  return proj;
}

function detectHorizontalLines(proj, width, minLen= Math.max(3, Math.round(width*0.6))){
  // returns array of {top,bottom} rows considered continuous dark line
  const lines = [];
  let start = -1; let count=0;
  for (let y=0;y<proj.length;y++){
    if (proj[y] >= minLen){ if (start===-1) start=y; count++; } else { if (start!==-1){ lines.push({ top:start, bottom:y-1 }); start=-1; count=0; } }
  }
  if (start!==-1) lines.push({ top:start, bottom: proj.length-1 });
  return lines.filter(l=> (l.bottom - l.top +1) <= 6); // narrow lines
}

function detectVerticalLines(vproj, height, minLen= Math.max(3, Math.round(height*0.6))){
  const cols = []; let start=-1;
  for (let x=0;x<vproj.length;x++){ if (vproj[x] >= minLen){ if (start===-1) start=x; } else { if (start!==-1){ cols.push({ left:start, right:x-1 }); start=-1; } } }
  if (start!==-1) cols.push({ left:start, right:vproj.length-1 });
  return cols.filter(c=> (c.right - c.left +1) <= 6);
}

function applyMaskToRaw(obj, maskRows, maskCols){
  const { data, info } = obj; const w = info.width, h = info.height, c = info.channels;
  const out = Buffer.from(data); // copy
  // set masked rows to white (255)
  for (const r of maskRows){ for (let y=r.top;y<=r.bottom;y++){ for (let x=0;x<w;x++){ out[(y*w + x)*c] = 255; } } }
  for (const col of maskCols){ for (let x=col.left;x<=col.right;x++){ for (let y=0;y<h;y++){ out[(y*w + x)*c] = 255; } } }
  return { data: out, info };
}

async function runVariantPipeline(field, bbox, sourcePath, variant, outPath, meta){
  // variants: original, grayscale, high_contrast, threshold, line_removal, label_mask, line_removal+threshold, label_mask+threshold
  const buf = await getCropBuffer(sourcePath, bbox);
  if (variant === 'original') { fs.writeFileSync(outPath, buf); return buf; }
  if (variant === 'grayscale') { const b = await sharp(buf).grayscale().png().toBuffer(); fs.writeFileSync(outPath, b); return b; }
  if (variant === 'high_contrast') { const b = await sharp(buf).grayscale().normalize().linear(1.6,-30).png().toBuffer(); fs.writeFileSync(outPath, b); return b; }
  if (variant === 'threshold') { const b = await sharp(buf).grayscale().threshold(140).png().toBuffer(); fs.writeFileSync(outPath, b); return b; }

  // for the rest we need raw grayscale
  const raw = await grayscaleRaw(buf);
  const hproj = horizontalProjectionFromRaw(raw);
  const vproj = verticalProjectionFromRaw(raw);
  const maskRows = detectHorizontalLines(hproj, raw.info.width);
  const maskCols = detectVerticalLines(vproj, raw.info.height);

  // detect label region using horizontal projection above handwriting: find top region of dark pixels
  // find first dense band from top until handwriting top (handwriting relative to crop: ink bbox - bbox.y)
  const inkRelTop = Math.max(0, (v11.find(x=>x.field===field).selected ? v11.find(x=>x.field===field).selected.y : (v11.find(x=>x.field===field).inkBbox ? v11.find(x=>x.field===field).inkBbox.y : 0)) - bbox.y);
  const searchTop = 0; const searchBottom = Math.max(0, inkRelTop - 1);
  let labelRows = [];
  if (searchBottom > searchTop){
    const window = hproj.slice(searchTop, searchBottom+1);
    const maxv = Math.max(...window,0); const thresh = Math.max(5, Math.round(maxv*0.25));
    for (let i=0;i<window.length;i++) if (window[i] >= thresh) labelRows.push(searchTop + i);
  }
  // consolidate label rows into regions
  const labelRegions = [];
  if (labelRows.length>0){ let g=[labelRows[0]]; for (let i=1;i<labelRows.length;i++){ if (labelRows[i]===labelRows[i-1]+1) g.push(labelRows[i]); else { labelRegions.push({ top:g[0], bottom:g[g.length-1]}); g=[labelRows[i]]; } } labelRegions.push({ top:g[0], bottom:g[g.length-1]}); }

  let rawOutObj = raw;
  if (variant === 'line_removal' || variant === 'line_removal+threshold'){
    rawOutObj = applyMaskToRaw(raw, maskRows, maskCols);
  }
  if (variant === 'label_mask' || variant === 'label_mask+threshold'){
    // mask label regions but ensure we don't mask handwriting area; drop any region overlapping ink
    const safeLabelRegions = [];
    const inkRel = v11.find(x=>x.field===field).selected ? { x: v11.find(x=>x.field===field).selected.x - bbox.x, y: v11.find(x=>x.field===field).selected.y - bbox.y, width: v11.find(x=>x.field===field).selected.width, height: v11.find(x=>x.field===field).selected.height } : (v11.find(x=>x.field===field).inkBbox ? { x: v11.find(x=>x.field===field).inkBbox.x - bbox.x, y: v11.find(x=>x.field===field).inkBbox.y - bbox.y, width: v11.find(x=>x.field===field).inkBbox.width, height: v11.find(x=>x.field===field).inkBbox.height } : null);
    for (const r of labelRegions){
      const overlap = inkRel ? !((r.bottom < inkRel.y) || (r.top > inkRel.y + inkRel.height)) : false;
      if (!overlap) safeLabelRegions.push(r);
    }
    rawOutObj = applyMaskToRaw(rawOutObj, safeLabelRegions, []);
  }

  let outBuf = Buffer.from(rawOutObj.data);
  // re-encode to PNG
  outBuf = await sharp(outBuf, { raw: { width: rawOutObj.info.width, height: rawOutObj.info.height, channels: rawOutObj.info.channels } }).png().toBuffer();
  if (variant === 'line_removal+threshold' || variant === 'label_mask+threshold'){
    outBuf = await sharp(outBuf).grayscale().threshold(140).png().toBuffer();
  }
  fs.writeFileSync(outPath, outBuf);
  return outBuf;
}

async function ocrBuffer(buf){
  const worker = await Tesseract.createWorker(); await worker.reinitialize('eng');
  const dataUri = 'data:image/png;base64,' + buf.toString('base64');
  try{ const cfg = { tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY, tessedit_pageseg_mode: 6 }; const res = await worker.recognize(dataUri, cfg); await worker.terminate(); return { text: (res && res.data && res.data.text) ? res.data.text.trim() : '', confidence: (res && res.data) ? res.data.confidence : null }; }catch(e){ try{ await worker.terminate(); }catch(_){} return { text: '[ERROR] '+String(e), confidence: null }; }
}

async function main(){
  const report = [];
  const sourcePath = path.join(process.cwd(),'backend','debug-crops','test_row3_full.png');
  for (const field of fields){
    const v11e = v11.find(x=>x.field===field);
    if (!v11e || !v11e.selected){ report.push({ field, error:'no v11 selected bbox' }); continue; }
    const sel = v11e.selected;
    const bbox = { x: sel.x, y: sel.y, width: sel.width, height: sel.height };
    const fieldOutDir = path.join(outRoot, field); if (!fs.existsSync(fieldOutDir)) fs.mkdirSync(fieldOutDir, { recursive: true });
    const variants = ['original','grayscale','high_contrast','threshold','line_removal','label_mask','line_removal+threshold','label_mask+threshold'];
    const records = [];
    for (const v of variants){
      const outPath = path.join(fieldOutDir, `${field}_${v}.png`);
      const buf = await runVariantPipeline(field, bbox, sourcePath, v, outPath);
      const ocr = await ocrBuffer(buf);
      // determine label presence by regex on OCR
      const txt = (ocr.text||'').toLowerCase();
      const labelPresent = field==='vehicle_number' ? /vehicle|registration|regis/.test(txt) : /passes|issued|quantity/.test(txt);
      // determine handwriting damage: compare dark pixel count inside ink region before/after
      const ink = v11e.inkBbox; const inkRel = { x: Math.max(0, ink.x - bbox.x), y: Math.max(0, ink.y - bbox.y), width: ink.width, height: ink.height };
      const beforeRaw = await grayscaleRaw(await getCropBuffer(sourcePath,bbox));
      const afterRaw = await grayscaleRaw(buf);
      function darkCountInRegion(rawObj, reg){ const { data, info } = rawObj; const w = info.width, h = info.height, c = info.channels; let cnt=0; const rx = clamp(reg.x,0,w-1); const ry = clamp(reg.y,0,h-1); const rw = Math.min(reg.width, w-rx); const rh = Math.min(reg.height, h-ry); for (let yy=ry; yy<ry+rh; yy++){ for (let xx=rx; xx<rx+rw; xx++){ if (data[(yy*w + xx)*c] < 200) cnt++; } } return cnt; }
      const beforeCnt = darkCountInRegion(beforeRaw, inkRel);
      const afterCnt = darkCountInRegion(afterRaw, inkRel);
      const damaged = (afterCnt < beforeCnt * 0.7);

      const recovered = (ocr.text||'').replace(/[^A-Za-z0-9]/g,'').includes((expected[field]||'').replace(/[^A-Za-z0-9]/g,''));

      records.push({ field, preprocessing: v, crop: bbox, path: outPath, ocr_text: ocr.text, ocr_confidence: ocr.confidence, recovered, labelPresent, handwritingDamaged: damaged });
    }
    report.push({ field, selected_bbox: bbox, variants: records });
  }
  const outPath = path.join(outRoot,'calibration-v13-report.json'); fs.writeFileSync(outPath, JSON.stringify(report, null, 2)); console.log('Wrote', outPath);
}

main().catch(e=>{ console.error(e); process.exit(1); });
