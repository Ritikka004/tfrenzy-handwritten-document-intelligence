const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

const outRoot = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v15');
if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });

const v11Path = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v11', 'calibration-v11-report.json');
const v11Data = JSON.parse(fs.readFileSync(v11Path, 'utf8'));

const fields = [
  { field: 'vehicle_number', expected: 'TN09BX1234' },
  { field: 'badge_quantity', expected: '02' }
];

function normalize(text) {
  return (text || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

async function loadGrayscalePixels(buffer) {
  const obj = await sharp(buffer).grayscale().raw().toBuffer({ resolveWithObject: true });
  return {
    width: obj.info.width,
    height: obj.info.height,
    data: new Uint8Array(obj.data)
  };
}

async function saveGrayscaleImage(data, width, height, outPath) {
  const png = await sharp(Buffer.from(data), { raw: { width, height, channels: 1 } }).png().toBuffer();
  fs.writeFileSync(outPath, png);
}

function adaptiveThreshold(gray, width, height) {
  const out = new Uint8Array(gray.length);
  const block = 15;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let yy = Math.max(0, y - Math.floor(block / 2)); yy <= Math.min(height - 1, y + Math.floor(block / 2)); yy++) {
        for (let xx = Math.max(0, x - Math.floor(block / 2)); xx <= Math.min(width - 1, x + Math.floor(block / 2)); xx++) {
          sum += gray[yy * width + xx];
          count++;
        }
      }
      const thresh = sum / count - 12;
      out[y * width + x] = gray[y * width + x] > thresh ? 255 : 0;
    }
  }
  return out;
}

function removeHorizontalLines(gray, width, height) {
  const out = Uint8Array.from(gray);
  const rowStats = [];
  for (let y = 0; y < height; y++) {
    let dark = 0;
    for (let x = 0; x < width; x++) {
      if (gray[y * width + x] < 170) dark++;
    }
    rowStats.push(dark);
  }
  for (let y = 0; y < height; y++) {
    const dark = rowStats[y];
    const prev = y > 0 ? rowStats[y - 1] : 0;
    const next = y < height - 1 ? rowStats[y + 1] : 0;
    if (dark > width * 0.55 && (prev > width * 0.45 || next > width * 0.45)) {
      for (let x = 0; x < width; x++) out[y * width + x] = 255;
    }
  }
  return out;
}

function removeVerticalLines(gray, width, height) {
  const out = Uint8Array.from(gray);
  const colStats = [];
  for (let x = 0; x < width; x++) {
    let dark = 0;
    for (let y = 0; y < height; y++) {
      if (gray[y * width + x] < 170) dark++;
    }
    colStats.push(dark);
  }
  for (let x = 0; x < width; x++) {
    const dark = colStats[x];
    const prev = x > 0 ? colStats[x - 1] : 0;
    const next = x < width - 1 ? colStats[x + 1] : 0;
    if (dark > height * 0.55 && (prev > height * 0.45 || next > height * 0.45)) {
      for (let y = 0; y < height; y++) out[y * width + x] = 255;
    }
  }
  return out;
}

function connectedComponents(mask, width, height) {
  const visited = new Uint8Array(mask.length);
  const comps = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (mask[idx] === 0 || visited[idx]) continue;
      const stack = [[x, y]];
      visited[idx] = 1;
      const pixels = [];
      let minX = x, maxX = x, minY = y, maxY = y;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        const pidx = cy * width + cx;
        pixels.push(pidx);
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const nidx = ny * width + nx;
            if (mask[nidx] === 0 || visited[nidx]) continue;
            visited[nidx] = 1;
            stack.push([nx, ny]);
          }
        }
      }
      comps.push({ pixels, minX, maxX, minY, maxY, area: pixels.length });
    }
  }
  return comps;
}

function filterComponents(gray, width, height, fieldName) {
  const mask = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) mask[i] = gray[i] < 170 ? 1 : 0;
  const comps = connectedComponents(mask, width, height);
  const out = Uint8Array.from(gray);
  const labelBandTop = fieldName === 'vehicle_number' ? Math.round(height * 0.08) : Math.round(height * 0.25);
  for (const comp of comps) {
    const w = comp.maxX - comp.minX + 1;
    const h = comp.maxY - comp.minY + 1;
    const aspect = w / Math.max(1, h);
    const density = comp.area / (w * h);
    const nearLabel = comp.minY <= labelBandTop;
    const small = comp.area < Math.max(20, width * height * 0.002);
    const looksPrinted = nearLabel && small && density > 0.55 && (aspect < 1.5 || h <= 3);
    if (looksPrinted) {
      for (const idx of comp.pixels) out[idx] = 255;
    }
  }
  return out;
}

function countDarkPixels(data, width, height, rect) {
  let count = 0;
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    for (let x = rect.x; x < rect.x + rect.width; x++) {
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      if (data[y * width + x] < 200) count++;
    }
  }
  return count;
}

async function ocrImage(buffer) {
  const worker = await Tesseract.createWorker();
  await worker.reinitialize('eng');
  try {
    const cfg = {
      tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
      tessedit_pageseg_mode: 6
    };
    const res = await worker.recognize('data:image/png;base64,' + buffer.toString('base64'), cfg);
    return {
      text: (res && res.data && res.data.text) ? res.data.text.trim() : '',
      confidence: (res && res.data && typeof res.data.confidence === 'number') ? res.data.confidence : null
    };
  } finally {
    try { await worker.terminate(); } catch (_) {}
  }
}

async function run() {
  const report = [];
  const variants = [
    'original',
    'grayscale_adaptive_threshold',
    'horizontal_line_removal',
    'vertical_line_removal',
    'connected_component_filtering',
    'line_removal_plus_cc_filtering',
    'cc_filtering_plus_light_threshold'
  ];

  for (const entry of fields) {
    const fieldEntry = v11Data.find(x => x.field === entry.field);
    if (!fieldEntry || !fieldEntry.selected) {
      report.push({ field: entry.field, preprocessing: 'none', ocr_text: '', confidence: null, handwriting_preserved: false, printed_label_reduced: false, expected_value_recovered: false, pass: false, error: 'missing v11 selection' });
      continue;
    }

    const selected = fieldEntry.selected;
    const cropPath = selected.path;
    const cropBuf = fs.readFileSync(cropPath);
    const fieldOutDir = path.join(outRoot, entry.field);
    if (!fs.existsSync(fieldOutDir)) fs.mkdirSync(fieldOutDir, { recursive: true });

    const originalPixels = await loadGrayscalePixels(cropBuf);
    const originalPath = path.join(fieldOutDir, `${entry.field}_original.png`);
    await saveGrayscaleImage(originalPixels.data, originalPixels.width, originalPixels.height, originalPath);

    const origDark = countDarkPixels(originalPixels.data, originalPixels.width, originalPixels.height, { x: 0, y: 0, width: originalPixels.width, height: originalPixels.height });
    const inkRect = {
      x: Math.max(0, Math.round(selected.x - selected.x)),
      y: Math.max(0, Math.round(selected.y - selected.y)),
      width: Math.min(originalPixels.width, selected.width),
      height: Math.min(originalPixels.height, selected.height)
    };
    const inkBefore = countDarkPixels(originalPixels.data, originalPixels.width, originalPixels.height, inkRect);

    const labelRect = fieldEntry.field === 'vehicle_number'
      ? { x: 0, y: 0, width: originalPixels.width, height: Math.max(8, Math.round(originalPixels.height * 0.08)) }
      : { x: 0, y: Math.max(0, Math.round(originalPixels.height * 0.28)), width: originalPixels.width, height: Math.max(8, Math.round(originalPixels.height * 0.12)) };
    const labelBefore = countDarkPixels(originalPixels.data, originalPixels.width, originalPixels.height, labelRect);

    for (const variant of variants) {
      let pixels = null;
      let outBuf = cropBuf;
      if (variant === 'grayscale_adaptive_threshold') {
        const adapted = adaptiveThreshold(originalPixels.data, originalPixels.width, originalPixels.height);
        pixels = adapted;
      } else if (variant === 'horizontal_line_removal') {
        pixels = removeHorizontalLines(originalPixels.data, originalPixels.width, originalPixels.height);
      } else if (variant === 'vertical_line_removal') {
        pixels = removeVerticalLines(originalPixels.data, originalPixels.width, originalPixels.height);
      } else if (variant === 'connected_component_filtering') {
        pixels = filterComponents(originalPixels.data, originalPixels.width, originalPixels.height, entry.field);
      } else if (variant === 'line_removal_plus_cc_filtering') {
        const horiz = removeHorizontalLines(originalPixels.data, originalPixels.width, originalPixels.height);
        pixels = filterComponents(horiz, originalPixels.width, originalPixels.height, entry.field);
      } else if (variant === 'cc_filtering_plus_light_threshold') {
        const filtered = filterComponents(originalPixels.data, originalPixels.width, originalPixels.height, entry.field);
        pixels = adaptiveThreshold(filtered, originalPixels.width, originalPixels.height);
      } else {
        pixels = originalPixels.data;
      }

      const outPath = path.join(fieldOutDir, `${entry.field}_${variant}.png`);
      if (variant === 'original') {
        fs.copyFileSync(originalPath, outPath);
      } else {
        await saveGrayscaleImage(pixels, originalPixels.width, originalPixels.height, outPath);
      }

      const outBufPath = path.join(fieldOutDir, `${entry.field}_${variant}.png`);
      const outBufData = fs.readFileSync(outBufPath);
      const ocr = await ocrImage(outBufData);
      const afterInk = countDarkPixels(pixels, originalPixels.width, originalPixels.height, inkRect);
      const afterLabel = countDarkPixels(pixels, originalPixels.width, originalPixels.height, labelRect);
      const handwritingPreserved = afterInk >= inkBefore * 0.7;
      const printedLabelReduced = afterLabel <= labelBefore * 0.7;
      const expectedRecovered = normalize(ocr.text).includes(normalize(entry.expected));
      const pass = Boolean(handwritingPreserved && printedLabelReduced && expectedRecovered);

      report.push({
        field: entry.field,
        preprocessing: variant,
        ocr_text: ocr.text,
        confidence: ocr.confidence,
        handwriting_preserved: handwritingPreserved,
        printed_label_reduced: printedLabelReduced,
        expected_value_recovered: expectedRecovered,
        pass,
        image_path: outBufPath.replace(/\\/g, '/')
      });
    }
  }

  const outPath = path.join(outRoot, 'calibration-v15-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('Wrote', outPath);
  console.log(JSON.stringify(report, null, 2));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
