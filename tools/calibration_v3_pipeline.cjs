const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

function toGray(buf, meta) {
  // Convert RGBA or RGB buffer to grayscale array (0-255)
  const { channels } = meta;
  const pixels = [];
  for (let i = 0; i < buf.length; i += channels) {
    const r = buf[i];
    const g = channels > 1 ? buf[i+1] : r;
    const b = channels > 2 ? buf[i+2] : r;
    const gray = Math.round(0.299*r + 0.587*g + 0.114*b);
    pixels.push(gray);
  }
  return { data: pixels, width: meta.width, height: meta.height };
}

async function findBestMatch(full, small) {
  // full and small are {data, width, height}
  const Wf = full.width, Hf = full.height;
  const Ws = small.width, Hs = small.height;
  let best = { x:0, y:0, score: Number.POSITIVE_INFINITY };
  // slide small over full
  for (let y=0; y<=Hf-Hs; y++) {
    for (let x=0; x<=Wf-Ws; x++) {
      let s = 0;
      // compute sum of absolute diffs with early exit
      for (let j=0; j<Hs; j++) {
        const fullRowStart = (y+j)*Wf + x;
        const smallRowStart = j*Ws;
        for (let i=0; i<Ws; i++) {
          const d = full.data[fullRowStart + i] - small.data[smallRowStart + i];
          s += d<0 ? -d : d;
          if (s > best.score) break;
        }
        if (s > best.score) break;
      }
      if (s < best.score) best = { x, y, score: s };
    }
  }
  return best;
}

function detectInkTopBottom(gray, width, height) {
  // threshold to detect ink: pixel < 220
  const thresh = 220;
  let top = null, bottom = null;
  for (let r=0; r<height; r++) {
    let rowHas = false;
    const rowStart = r*width;
    for (let c=0; c<width; c++) {
      if (gray[rowStart + c] < thresh) { rowHas = true; break; }
    }
    if (rowHas) { top = r; break; }
  }
  for (let r=height-1; r>=0; r--) {
    let rowHas = false;
    const rowStart = r*width;
    for (let c=0; c<width; c++) {
      if (gray[rowStart + c] < thresh) { rowHas = true; break; }
    }
    if (rowHas) { bottom = r; break; }
  }
  if (top === null) top = 0;
  if (bottom === null) bottom = height-1;
  return { top, bottom };
}

(async ()=>{
  const fields = [
    { key: 'visit_date', cal: 'cal_visit_date.png', full: 'backend/debug-crops/test_row2_full.png', expected: '09/08/2026' },
    { key: 'host_employee_id', cal: 'cal_host_emp.png', full: 'backend/debug-crops/test_row2_full.png', expected: 'EMP1234' },
    { key: 'vehicle_number', cal: 'cal_vehicle.png', full: 'backend/debug-crops/test_row3_full.png', expected: 'TN09BX1234' },
    { key: 'badge_quantity', cal: 'cal_passes.png', full: 'backend/debug-crops/test_row3_full.png', expected: '02' }
  ];

  const report = [];
  const outDir = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v3');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const f of fields) {
    const calPath = path.join(process.cwd(), 'backend', 'debug-crops', f.cal);
    const fullPath = path.join(process.cwd(), f.full);
    if (!fs.existsSync(calPath) || !fs.existsSync(fullPath)) {
      console.error('Missing files for', f.key); continue;
    }

    const calBuf = await sharp(calPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const fullBuf = await sharp(fullPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    const calGray = toGray(calBuf.data, calBuf.info);
    const fullGray = toGray(fullBuf.data, fullBuf.info);

    const match = await findBestMatch(fullGray, calGray);

    // detect ink top/bottom in cal image
    const ink = detectInkTopBottom(calGray.data, calGray.width, calGray.height);

    // map to full image coordinates
    const inkTopInFull = match.y + ink.top;
    const inkBottomInFull = match.y + ink.bottom;

    // propose crop: start a few pixels above ink top, end a few pixels below ink bottom
    const marginTop = Math.max(2, Math.round(calGray.height * 0.05));
    const marginBottom = Math.max(2, Math.round(calGray.height * 0.05));
    let propTop = Math.max(0, inkTopInFull - marginTop);
    let propBottom = Math.min(fullGray.height-1, inkBottomInFull + marginBottom);
    let propHeight = propBottom - propTop + 1;

    // keep original width and left as matched
    const propLeft = match.x;
    const propWidth = calGray.width;

    // ensure bounds
    if (propLeft + propWidth > fullGray.width) {
      propWidth = Math.max(10, fullGray.width - propLeft);
    }

    // create crop file
    const outFile = path.join(outDir, `${f.key}_proposed.png`);
    await sharp(fullPath).extract({ left: propLeft, top: propTop, width: propWidth, height: propHeight }).png().toFile(outFile);

    // OCR this crop
    const worker = await Tesseract.createWorker();
    await worker.reinitialize('eng');
    const dataUri = 'data:image/png;base64,' + fs.readFileSync(outFile).toString('base64');
    // select whitelist
    let whitelist = '';
    const fk = f.key;
    if (fk.includes('date')) whitelist = '0123456789/-';
    if (fk.includes('emp')) whitelist = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-';
    if (fk.includes('vehicle')) whitelist = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -';
    if (fk.includes('badge') || fk.includes('quantity')) whitelist = '0123456789';
    const config = { tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY, tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE };
    if (whitelist) config.tessedit_char_whitelist = whitelist;
    const res = await worker.recognize(dataUri, config);
    await worker.terminate();

    const ocrText = res && res.data && typeof res.data.text === 'string' ? res.data.text.trim() : '';
    const rawConf = res && res.data ? res.data.confidence : null;

    const result = {
      field: f.key,
      fullImage: path.relative(process.cwd(), fullPath),
      fullImageWidth: fullGray.width,
      fullImageHeight: fullGray.height,
      originalBboxPercent: null, // we'll read database.ts? but we can set from earlier knowledge
      matchedCalPath: path.relative(process.cwd(), calPath),
      matchedTop: match.y,
      matchedLeft: match.x,
      calWidth: calGray.width,
      calHeight: calGray.height,
      inkTopInCal: ink.top,
      inkBottomInCal: ink.bottom,
      inkTopInFull: inkTopInFull,
      inkBottomInFull: inkBottomInFull,
      proposedCrop: { left: propLeft, top: propTop, width: propWidth, height: propHeight },
      proposedCropPercent: { x: (propLeft/fullGray.width*100), y: (propTop/fullGray.height*100), width: (propWidth/fullGray.width*100), height: (propHeight/fullGray.height*100) },
      proposedCropPath: path.relative(process.cwd(), outFile),
      ocrText, rawConf,
      expected: f.expected
    };

    report.push(result);
  }

  const outReport = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v3', 'calibration-v3-report.json');
  fs.writeFileSync(outReport, JSON.stringify(report, null, 2));
  console.log('Wrote calibration-v3 report:', outReport);
})();
