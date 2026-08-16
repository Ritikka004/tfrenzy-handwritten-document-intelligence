const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function detectInkBBox(imagePath, threshold=200, topIgnorePercent=0.25, columnPercentRange=null) {
  const { data, info } = await sharp(imagePath).grayscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  // ignore the top portion (likely printed label) when locating handwriting
  const startRow = Math.max(0, Math.round(h * topIgnorePercent));
  let minRow = h, maxRow = 0;
  const rowInk = new Uint32Array(h);
  // if columnPercentRange is provided, restrict x range to that column
  let colStart = 0, colEnd = w-1;
  if (columnPercentRange && typeof columnPercentRange.x === 'number' && typeof columnPercentRange.width === 'number'){
    colStart = Math.max(0, Math.round((columnPercentRange.x/100) * w));
    colEnd = Math.min(w-1, Math.round(((columnPercentRange.x + columnPercentRange.width)/100) * w));
  }
  for (let y = startRow; y < h; y++) {
    let rowCount = 0;
    const rowStart = y * w;
    for (let x = colStart; x <= colEnd; x++) {
      if (data[rowStart + x] < threshold) rowCount++;
    }
    rowInk[y] = rowCount;
    if (rowCount > 0) {
      if (y < minRow) minRow = y;
      if (y > maxRow) maxRow = y;
    }
  }

  // if no ink found in the lower area, fallback to scanning whole image
  if (minRow > maxRow) {
    let minX = w, minY = h, maxX = 0, maxY = 0, inkCount = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = data[y * w + x];
        if (v < threshold) {
          inkCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (inkCount === 0) {
      return { x: Math.round(w * 0.2), y: Math.round(h * 0.3), width: Math.round(w * 0.6), height: Math.round(h * 0.4), imgW: w, imgH: h, inkCount };
    }
    return { x: minX, y: minY, width: (maxX - minX + 1), height: (maxY - minY + 1), imgW: w, imgH: h, inkCount };
  }

  // find minX/maxX within minRow..maxRow (restricted to column if provided)
  let minX = w, maxX = 0, inkCount = 0;
  for (let y = minRow; y <= maxRow; y++) {
    const rowStart = y * w;
    for (let x = colStart; x <= colEnd; x++) {
      if (data[rowStart + x] < threshold) {
        inkCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }
  // if no column ink found, widen to full width
  if (minX > maxX) {
    minX = 0; maxX = w - 1;
  }
  return { x: minX, y: minRow, width: (maxX - minX + 1), height: (maxRow - minRow + 1), imgW: w, imgH: h, inkCount };
}

function expandBBox(b, marginPx, imgW, imgH){
  const left = Math.max(0, Math.floor(b.x - marginPx));
  const top = Math.max(0, Math.floor(b.y - marginPx));
  const right = Math.min(imgW-1, Math.ceil(b.x + b.width -1 + marginPx));
  const bottom = Math.min(imgH-1, Math.ceil(b.y + b.height -1 + marginPx));
  return { x: left, y: top, width: right-left+1, height: bottom-top+1 };
}

function expandBBoxPercent(b, percent){
  const cx = b.x + b.width/2;
  const cy = b.y + b.height/2;
  const newW = Math.round(b.width * (1 + percent/100));
  const newH = Math.round(b.height * (1 + percent/100));
  const left = Math.round(cx - newW/2);
  const top = Math.round(cy - newH/2);
  return { x: left, y: top, width: newW, height: newH };
}

(async ()=>{
  const root = process.cwd();
  const outRoot = path.join(root, 'backend','debug-crops','calibration-v5');
  const diagDir = path.join(outRoot,'diagnostic');
  const candDir = path.join(outRoot,'candidates');
  if(!fs.existsSync(diagDir)) fs.mkdirSync(diagDir, { recursive: true });
  if(!fs.existsSync(candDir)) fs.mkdirSync(candDir, { recursive: true });

  // Map fields to full-row images (use same mapping as calibration-v3)
  // Include the DB percentage column region to restrict detection
  const fields = [
    { key: 'visit_date', source: 'backend/debug-crops/test_row2_full.png', expected: '09/08/2026', col: { x:5, width:44 } },
    { key: 'host_employee_id', source: 'backend/debug-crops/test_row2_full.png', expected: 'EMP1234', col: { x:50, width:44 } },
    { key: 'vehicle_number', source: 'backend/debug-crops/test_row3_full.png', expected: 'TN09BX1234', col: { x:5, width:44 } },
    { key: 'badge_quantity', source: 'backend/debug-crops/test_row3_full.png', expected: '02', col: { x:50, width:44 } }
  ];

  const report = [];

  for(const f of fields){
    const srcPath = path.join(root, f.source.replace(/\\/g,'/'));
    if(!fs.existsSync(srcPath)){
      console.error('Missing source image for', f.key, srcPath); continue;
    }
    const meta = await sharp(srcPath).metadata();
    const imgW = meta.width, imgH = meta.height;

    // detect ink bbox in full-row image, restricted to the template column
    const ink = await detectInkBBox(srcPath, 200, 0.25, f.col);

    // diagnostic crop: large area around ink (50% of max dimension or at least 40px)
    const largeMargin = Math.max(40, Math.round(Math.max(ink.width, ink.height) * 0.5));
    const diagBox = expandBBox(ink, largeMargin, imgW, imgH);
    const diagPath = path.join(diagDir, `${f.key}_diagnostic.png`);
    await sharp(srcPath).extract({ left: diagBox.x, top: diagBox.y, width: diagBox.width, height: diagBox.height }).png().toFile(diagPath);

    // tight bbox: ensure within image
    const tight = { x: Math.max(0, ink.x), y: Math.max(0, ink.y), width: Math.min(imgW-ink.x, ink.width), height: Math.min(imgH-ink.y, ink.height) };

    // create 5 candidates: 0%,5%,10%,15%,20%
    const margins = [0,5,10,15,20];
    const candidates = [];
    for(const m of margins){
      let box = expandBBoxPercent(tight, m);
      // clamp
      if(box.x < 0) box.x = 0;
      if(box.y < 0) box.y = 0;
      if(box.x + box.width > imgW) box.width = imgW - box.x;
      if(box.y + box.height > imgH) box.height = imgH - box.y;
      const outName = `${f.key}_candidate_margin${m}.png`;
      const outPath = path.join(candDir, outName);
      await sharp(srcPath).extract({ left: box.x, top: box.y, width: box.width, height: box.height }).png().toFile(outPath);
      candidates.push({ source: f.source, field: f.key, x: box.x, y: box.y, width: box.width, height: box.height, right: box.x + box.width -1, bottom: box.y + box.height -1, marginPercent: m, path: path.relative(root,outPath) });
    }

    report.push({ field: f.key, source: f.source, imageWidth: imgW, imageHeight: imgH, inkBbox: ink, diagnostic: path.relative(root,diagPath), candidates });
  }

  const outReport = path.join(outRoot,'calibration-v5-report.json');
  fs.writeFileSync(outReport, JSON.stringify(report, null, 2));
  console.log('Wrote calibration-v5 report:', outReport);
})().catch(e=>{ console.error(e); process.exit(1); });
