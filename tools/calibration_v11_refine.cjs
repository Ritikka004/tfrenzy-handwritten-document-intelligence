const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

const outDir = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v11');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const diagDir = path.join(outDir, 'diagnostic'); if (!fs.existsSync(diagDir)) fs.mkdirSync(diagDir, { recursive: true });
const cropsDir = path.join(outDir, 'crops'); if (!fs.existsSync(cropsDir)) fs.mkdirSync(cropsDir, { recursive: true });

const v10Path = path.join(process.cwd(),'backend','debug-crops','calibration-v10','calibration-v10-source-mapping-report.json');
const v10 = fs.existsSync(v10Path) ? JSON.parse(fs.readFileSync(v10Path,'utf8')) : [];

const fields = ['vehicle_number','badge_quantity'];

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

function makeSvg(imgW,imgH,template,candidates){
  const shapes = [];
  // template in red
  shapes.push(`<rect x="${template.x}" y="${template.y}" width="${template.width}" height="${template.height}" fill="none" stroke="red" stroke-width="3"/>`);
  // candidates in blue shades
  for (let i=0;i<candidates.length;i++){
    const c = candidates[i];
    const col = i===0? '#00f': (i===1? '#00c':'#008');
    shapes.push(`<rect x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}" fill="none" stroke="${col}" stroke-width="3"/>`);
    shapes.push(`<text x="${c.x+6}" y="${c.y+18}" fill="${col}" font-size="16">cand${i}</text>`);
  }
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}">`+shapes.join('')+`</svg>`);
}

async function run(){
  const reports = [];
  const worker = await Tesseract.createWorker();
  await worker.reinitialize('eng');

  const source = path.join(process.cwd(),'backend','debug-crops','test_row3_full.png');
  if (!fs.existsSync(source)) throw new Error('source not found: '+source);
  const imgMeta = await sharp(source).metadata();

  for (const key of fields){
    const entry = { field: key, source: 'backend/debug-crops/test_row3_full.png' };
    const v10entry = v10.find(x=>x.field===key);
    if (!v10entry || !v10entry.inkBbox){
      entry.error = 'no ink bbox from v10'; reports.push(entry); continue;
    }
    const ink = v10entry.inkBbox;
    entry.template = v10entry.template || null;
    entry.inkBbox = ink;

    // build 3 candidates: margins 3,5,8. Ensure inside image bounds and exclude label by staying tight to ink.
    const margins = [3,5,8];
    const candidates = [];
    for (const m of margins){
      const x = clamp(ink.x - m, 0, imgMeta.width-1);
      const y = clamp(ink.y - m, 0, imgMeta.height-1);
      const w = clamp(ink.width + m*2, 1, imgMeta.width - x);
      const h = clamp(ink.height + m*2, 1, imgMeta.height - y);
      candidates.push({ x, y, width: w, height: h, margin: m });
    }

    // create diagnostic overlay with template + candidates
    const svg = makeSvg(imgMeta.width, imgMeta.height, entry.template || {x:0,y:0,width:0,height:0}, candidates);
    const diagPath = path.join(diagDir, `${key}_diagnostic.png`);
    await sharp(source).composite([{ input: svg, blend: 'over' }]).png().toFile(diagPath);
    entry.diagnostic = diagPath;

    entry.candidates = [];
    // generate crops and run OCR once per candidate (no preprocessing)
    for (let i=0;i<candidates.length;i++){
      const c = candidates[i];
      const fname = `${key}_v11_c${i}.png`;
      const outPath = path.join(cropsDir, fname);
      const exW = Math.max(1, Math.min(c.width, imgMeta.width - c.x));
      const exH = Math.max(1, Math.min(c.height, imgMeta.height - c.y));
      await sharp(source).extract({ left: c.x, top: c.y, width: exW, height: exH }).png().toFile(outPath);
      const dataUri = 'data:image/png;base64,' + fs.readFileSync(outPath).toString('base64');
      let ocr = { text: '', confidence: null };
      try{
        const cfg = { tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY, tessedit_pageseg_mode: 6 };
        const res = await worker.recognize(dataUri, cfg);
        ocr.text = (res && res.data && res.data.text) ? res.data.text.trim() : '';
        ocr.confidence = (res && res.data) ? res.data.confidence : null;
      }catch(e){ ocr.text = '[ERROR] '+String(e); }

      // determine checks
      const inkInside = (ink.x >= c.x) && (ink.y >= c.y) && (ink.x + ink.width <= c.x + exW) && (ink.y + ink.height <= c.y + exH);
      const clipping = !inkInside;
      // detect printed label text presence by simple substring search
      const txt = (ocr.text||'').toLowerCase();
      let labelPresent = false;
      if (key==='vehicle_number') labelPresent = /vehicle|registration|regis/i.test(ocr.text);
      if (key==='badge_quantity') labelPresent = /passes|issued|quantity/i.test(ocr.text);

      entry.candidates.push({ x: c.x, y: c.y, width: exW, height: exH, margin: c.margin, path: outPath, ocr_text: ocr.text, ocr_confidence: ocr.confidence, inkFullyInside: inkInside, printedLabelPresent: Boolean(labelPresent), clipping: Boolean(clipping) });
    }

    // select best candidate by priority
    const pref = entry.candidates.slice();
    // prefer inkFullyInside && not clipping && printedLabelPresent==false
    let filtered = pref.filter(p=>p.inkFullyInside && !p.clipping && !p.printedLabelPresent);
    if (filtered.length===0) filtered = pref.filter(p=>p.inkFullyInside && !p.clipping);
    if (filtered.length===0) filtered = pref;
    // pick highest confidence
    filtered.sort((a,b)=> (b.ocr_confidence||0) - (a.ocr_confidence||0));
    entry.selected = filtered[0];
    entry.candidates = entry.candidates;

    reports.push(entry);
  }

  try{ await worker.terminate(); }catch(e){}
  const outPath = path.join(outDir,'calibration-v11-report.json');
  fs.writeFileSync(outPath, JSON.stringify(reports, null, 2));
  console.log('Wrote', outPath);
}

run().catch(e=>{ console.error(e); process.exit(1); });
