const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

const outRoot = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v14', 'manual_mask');
if (!fs.existsSync(outRoot)) {
  fs.mkdirSync(outRoot, { recursive: true });
}

const v11Path = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v11', 'calibration-v11-report.json');
const v11 = fs.existsSync(v11Path) ? JSON.parse(fs.readFileSync(v11Path, 'utf8')) : [];

const fields = ['vehicle_number', 'badge_quantity'];
const expected = {
  vehicle_number: 'TN09BX1234',
  badge_quantity: '02'
};

async function ocrBuffer(buf) {
  const worker = await Tesseract.createWorker();
  await worker.reinitialize('eng');
  try {
    const cfg = {
      tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
      tessedit_pageseg_mode: 6
    };
    const dataUri = 'data:image/png;base64,' + buf.toString('base64');
    const res = await worker.recognize(dataUri, cfg);
    await worker.terminate();
    return {
      text: res && res.data && res.data.text ? res.data.text.trim() : '',
      confidence: res && res.data ? res.data.confidence : null
    };
  } catch (e) {
    try {
      await worker.terminate();
    } catch (__) {
      // ignore
    }
    return { text: '[ERROR] ' + String(e), confidence: null };
  }
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

async function run() {
  const report = [];

  const masks = {
    vehicle_number: { x: 0, y: 2, width: 664, height: 6 },
    badge_quantity: { x: 0, y: 38, width: 674, height: 4 }
  };

  for (const f of fields) {
    const rec = { field: f };
    const v11e = v11.find(x => x.field === f);
    if (!v11e || !v11e.selected) {
      rec.error = 'no v11 selected bbox';
      report.push(rec);
      continue;
    }

    const sel = v11e.selected;
    rec.crop_bbox = sel;
    const cropPath = sel.path;
    const cropBuf = fs.readFileSync(cropPath);
    const fieldOut = path.join(outRoot, f);
    if (!fs.existsSync(fieldOut)) fs.mkdirSync(fieldOut, { recursive: true });

    const variants = [];
    const origPath = path.join(fieldOut, `${f}_original.png`);
    fs.writeFileSync(origPath, cropBuf);
    variants.push({ name: 'original', path: origPath });

    const mask = masks[f];
    const maskImg = await sharp(cropBuf)
      .composite([
        {
          input: {
            create: {
              width: mask.width,
              height: mask.height,
              channels: 3,
              background: { r: 255, g: 255, b: 255 }
            }
          },
          left: mask.x,
          top: mask.y
        }
      ])
      .png()
      .toBuffer();

    const maskPath = path.join(fieldOut, `${f}_label_mask.png`);
    fs.writeFileSync(maskPath, maskImg);
    variants.push({ name: 'label_mask', path: maskPath, mask });

    const thrImg = await sharp(maskImg).grayscale().linear(1.15, -15).threshold(140).png().toBuffer();
    const thrPath = path.join(fieldOut, `${f}_label_mask_threshold.png`);
    fs.writeFileSync(thrPath, thrImg);
    variants.push({ name: 'label_mask+threshold', path: thrPath, mask });

    const results = [];
    for (const v of variants) {
      const buf = fs.readFileSync(v.path);
      const ocr = await ocrBuffer(buf);

      let labelRemoved = null;
      if (v.mask) {
        const raw = await sharp(buf).grayscale().raw().toBuffer({ resolveWithObject: true });
        const { data, info } = raw;
        let dark = 0;
        for (let y = v.mask.y; y < v.mask.y + v.mask.height; y++) {
          for (let x = v.mask.x; x < v.mask.x + v.mask.width; x++) {
            if (data[(y * info.width + x) * info.channels] < 200) dark++;
          }
        }
        labelRemoved = dark === 0;
      }

      let handwritingPreserved = true;
      if (v11e.inkBbox) {
        const inkRel = {
          x: v11e.inkBbox.x - sel.x,
          y: v11e.inkBbox.y - sel.y,
          width: v11e.inkBbox.width,
          height: v11e.inkBbox.height
        };

        const beforeRaw = await sharp(cropBuf).grayscale().raw().toBuffer({ resolveWithObject: true });
        const afterRaw = await sharp(buf).grayscale().raw().toBuffer({ resolveWithObject: true });

        const beforeCount = (() => {
          let c = 0;
          for (let yy = inkRel.y; yy < inkRel.y + inkRel.height; yy++) {
            for (let xx = inkRel.x; xx < inkRel.x + inkRel.width; xx++) {
              if (beforeRaw.data[(yy * beforeRaw.info.width + xx) * beforeRaw.info.channels] < 200) c++;
            }
          }
          return c;
        })();

        const afterCount = (() => {
          let c = 0;
          for (let yy = inkRel.y; yy < inkRel.y + inkRel.height; yy++) {
            for (let xx = inkRel.x; xx < inkRel.x + inkRel.width; xx++) {
              if (afterRaw.data[(yy * afterRaw.info.width + xx) * afterRaw.info.channels] < 200) c++;
            }
          }
          return c;
        })();

        handwritingPreserved = afterCount >= beforeCount * 0.7;
      }

      const expectedRecovered = (ocr.text || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().indexOf((expected[f] || '').toUpperCase()) >= 0;
      const pass = Boolean(expectedRecovered && labelRemoved && handwritingPreserved);
      results.push({
        preprocessing: v.name,
        crop_bbox: sel,
        label_mask_bbox: v.mask || null,
        ocr_text: ocr.text,
        confidence: ocr.confidence,
        label_removed: labelRemoved,
        handwriting_preserved: handwritingPreserved,
        expected_recovered: expectedRecovered,
        pass
      });
    }

    rec.variants = results;
    report.push(rec);
  }

  const outPath = path.join(outRoot, 'calibration-v14-manual-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('Wrote', outPath);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
