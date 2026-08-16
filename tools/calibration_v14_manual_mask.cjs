const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

const outRoot = path.join(process.cwd(),'backend','debug-crops','calibration-v14');
if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });

const v11Path = path.join(process.cwd(),'backend','debug-crops','calibration-v11','calibration-v11-report.json');
const v11 = fs.existsSync(v11Path) ? JSON.parse(fs.readFileSync(v11Path,'utf8')) : [];

const fields = ['vehicle_number','badge_quantity'];
const expected = { vehicle_number: 'TN09BX1234', badge_quantity: '02' };

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

async function horizontalProj(buf){
  const obj = await sharp(buf).grayscale().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = obj; const w = info.width, h = info.height, c = info.channels;
  const proj = new Array(h).fill(0);
  for (let y=0;y<h;y++){ let s=0; for (let x=0;x<w;x++){ if (data[(y*w + x)*c] < 200) s++; } proj[y]=s; }
  return { proj, width: w, height: h };
}

async function verticalProj(buf){
  const obj = await sharp(buf).grayscale().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = obj; const w = info.width, h = info.height, c = info.channels;
  const proj = new Array(w).fill(0);
  for (let x=0;x<w;x++){ let s=0; for (let y=0;y<h;y++){ if (data[(y*w + x)*c] < 200) s++; } proj[x]=s; }
  return { proj, width: w, height: h };
}

function consolidateRows(rows){ if (!rows.length) return []; rows.sort((a,b)=>a-b); const groups=[]; let g=[rows[0]]; for (let i=1;i<rows.length;i++){ if (rows[i]===rows[i-1]+1) g.push(rows[i]); else { groups.push({top:g[0],bottom:g[g.length-1]}); g=[rows[i]]; } } groups.push({top:g[0],bottom:g[g.length-1]}); return groups; }

async function run(){
  const report = [];
  for (const f of fields){
    const rec = { field: f };
    const v11e = v11.find(x=>x.field===f);
    if (!v11e || !v11e.selected){ rec.error='no v11 selected bbox'; report.push(rec); continue; }
    const sel = v11e.selected; rec.crop_bbox = sel; const cropPath = sel.path;
    const cropBuf = fs.readFileSync(cropPath);

    // compute horizontal projection
    const { proj, width, height } = await horizontalProj(cropBuf);
    // detect candidate label rows near top: examine first 40% of rows up to handwriting
    // estimate handwriting top by ink bbox if available
    const inkRelY = v11e.inkBbox ? Math.max(0, v11e.inkBbox.y - sel.y) : Math.floor(height*0.5);
    const searchTop = 0; const searchBottom = clamp(Math.max(0, inkRelY-4), 0, height-1);
    const window = proj.slice(searchTop, searchBottom+1);
    const maxv = Math.max(...window,0); const thresh = Math.max(5, Math.round(maxv * 0.25));
    const rows = [];
    for (let i=0;i<window.length;i++) if (window[i] >= thresh) rows.push(searchTop + i);
    const groups = consolidateRows(rows);
    // choose the topmost group as label region (if any)
    const labelRegion = groups.length ? groups[0] : null;
    // horizontal extents of label: measure vertical projection inside label rows
    let labelBBox = null;
    if (labelRegion){
      // compute vertical projection for label rows
      const vObj = await verticalProj(cropBuf);
      const cols = [];
      for (let x=0;x<vObj.width;x++){ let s=0; for (let y=labelRegion.top;y<=labelRegion.bottom;y++){ const idx = (y*vObj.width + x); /* reuse raw buffer would be better but ok */ } }
      // simpler: use sharp to extract label region and compute non-white columns
      const labelBuf = await sharp(cropBuf).extract({ left:0, top:labelRegion.top, width: width, height: labelRegion.bottom - labelRegion.top + 1 }).grayscale().raw().toBuffer({ resolveWithObject: true });
      const ld = labelBuf.data; const lw = labelBuf.info.width; const lh = labelBuf.info.height; const lc = labelBuf.info.channels;
      const colCounts = new Array(lw).fill(0);
      for (let y=0;y<lh;y++){ for (let x=0;x<lw;x++){ if (ld[(y*lw + x)*lc] < 200) colCounts[x]++; } }
      const colThresh = Math.max(2, Math.round(Math.max(...colCounts) * 0.15));
      const colIdxs = [];
      for (let x=0;x<lw;x++) if (colCounts[x] >= colThresh) colIdxs.push(x);
      if (colIdxs.length){ const left = Math.max(0, colIdxs[0]-4); const right = Math.min(width-1, colIdxs[colIdxs.length-1]+4); labelBBox = { x: left, y: labelRegion.top, width: right - left + 1, height: labelRegion.bottom - labelRegion.top + 1 }; }

    }

    // ensure labelBBox does not overlap handwriting (using ink bbox)
    let maskBox = null;
    if (labelBBox){
      const inkRel = v11e.inkBbox ? { x: v11e.inkBbox.x - sel.x, y: v11e.inkBbox.y - sel.y, width: v11e.inkBbox.width, height: v11e.inkBbox.height } : null;
      const overlap = inkRel && !( (labelBBox.y + labelBBox.height -1) < inkRel.y || labelBBox.y > (inkRel.y + inkRel.height -1) );
      if (overlap){
        // if overlap, shrink labelBBox bottom to be above inkRel.y -1
        if (inkRel) labelBBox.height = Math.max(1, inkRel.y - labelBBox.y - 2);
        if (labelBBox.height <=0) labelBBox = null;
      }
    }
    if (labelBBox) maskBox = labelBBox;

    // build variants: original, label_mask, label_mask+threshold
    const fieldOut = path.join(outRoot, f); if (!fs.existsSync(fieldOut)) fs.mkdirSync(fieldOut, { recursive: true });
    const variants = [];
    // original
    const origPath = path.join(fieldOut, `${f}_original.png`); fs.writeFileSync(origPath, cropBuf); variants.push({ name:'original', path: origPath });
    // label mask
    if (maskBox){
      const maskImg = await sharp(cropBuf).composite([{ input: { create: { width: maskBox.width, height: maskBox.height, channels: 3, background: { r:255,g:255,b:255 } } }, left: maskBox.x, top: maskBox.y }]).png().toBuffer();
      const maskPath = path.join(fieldOut, `${f}_label_mask.png`); fs.writeFileSync(maskPath, maskImg); variants.push({ name:'label_mask', path: maskPath, mask: maskBox });
      // label mask + threshold/contrast
      const thr = await sharp(maskImg).grayscale().linear(1.2,-20).threshold(140).png().toBuffer(); const thrPath = path.join(fieldOut, `${f}_label_mask_threshold.png`); fs.writeFileSync(thrPath, thr); variants.push({ name:'label_mask+threshold', path: thrPath, mask: maskBox });
    } else {
      // no label region found; create placeholder identical variants
      const nm1 = path.join(fieldOut, `${f}_label_mask.png`); fs.writeFileSync(nm1, cropBuf); variants.push({ name:'label_mask', path: nm1, mask: null });
      const nm2 = path.join(fieldOut, `${f}_label_mask_threshold.png`); fs.writeFileSync(nm2, cropBuf); variants.push({ name:'label_mask+threshold', path: nm2, mask: null });
    }

    // run OCR once per variant
    const results = [];
    for (const v of variants){
      const buf = fs.readFileSync(v.path);
      const worker = await Tesseract.createWorker(); await worker.reinitialize('eng');
      let ocr = { text:'', confidence: null };
      try{ const cfg = { tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY, tessedit_pageseg_mode: 6 }; const res = await worker.recognize('data:image/png;base64,'+buf.toString('base64'), cfg); ocr.text = (res && res.data && res.data.text) ? res.data.text.trim() : ''; ocr.confidence = (res && res.data) ? res.data.confidence : null; }catch(e){ ocr.text='[ERROR] '+String(e); }
      try{ await worker.terminate(); }catch(e){}
      // label removal check: compute dark pixels in mask area
      let labelRemoved = null; if (v.mask){ const raw = await sharp(buf).grayscale().raw().toBuffer({ resolveWithObject: true }); const { data, info } = raw; let dark=0; const rx = v.mask.x, ry=v.mask.y, rw=v.mask.width, rh=v.mask.height; for (let y=ry;y<ry+rh;y++){ for (let x=rx;x<rx+rw;x++){ if (data[(y*info.width + x)*info.channels] < 200) dark++; } } labelRemoved = (dark === 0); }
      // handwriting preserved: compare dark pixel count in ink region before/after
      const ink = v11e.inkBbox ? { x: v11e.inkBbox.x - sel.x, y: v11e.inkBbox.y - sel.y, width: v11e.inkBbox.width, height: v11e.inkBbox.height } : null;
      let handwritingPreserved = true;
      if (ink){ const beforeRaw = await sharp(cropBuf).grayscale().raw().toBuffer({ resolveWithObject: true }); const afterRaw = await sharp(buf).grayscale().raw().toBuffer({ resolveWithObject: true }); const beforeCount = (()=>{ let c=0; for (let yy=ink.y; yy<ink.y+ink.height; yy++){ for (let xx=ink.x; xx<ink.x+ink.width; xx++){ if (beforeRaw.data[(yy*beforeRaw.info.width + xx)*beforeRaw.info.channels] < 200) c++; } } return c; })(); const afterCount = (()=>{ let c=0; for (let yy=ink.y; yy<ink.y+ink.height; yy++){ for (let xx=ink.x; xx<ink.x+ink.width; xx++){ if (afterRaw.data[(yy*afterRaw.info.width + xx)*afterRaw.info.channels] < 200) c++; } } return c; })(); handwritingPreserved = (afterCount >= beforeCount * 0.7); }
      const expectedRecovered = ((ocr.text||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase().indexOf((expected[f]||'').toUpperCase()) >=0);
      const pass = Boolean(expectedRecovered && labelRemoved && handwritingPreserved);
      results.push({ preprocessing: v.name, crop_bbox: sel, label_mask_bbox: v.mask || null, ocr_text: ocr.text, confidence: ocr.confidence, label_removed: labelRemoved, handwriting_preserved: handwritingPreserved, expected_recovered: expectedRecovered, pass });
    }

    rec.variants = results; report.push(rec);
  }
  const outPath = path.join(outRoot,'calibration-v14-report.json'); fs.writeFileSync(outPath, JSON.stringify(report, null, 2)); console.log('Wrote', outPath);
}

run().catch(e=>{ console.error(e); process.exit(1); });
