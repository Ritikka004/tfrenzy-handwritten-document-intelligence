const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outDir = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v2');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Map fields to full-row source images and bounding boxes (percentages) from database.ts
const fieldConfigs = [
  {
    key: 'visit_date',
    src: path.join(process.cwd(), 'backend', 'debug-crops', 'test_row2_full.png'),
    bbox: { x: 5, y: 34, width: 44, height: 7 }
  },
  {
    key: 'host_employee_id',
    src: path.join(process.cwd(), 'backend', 'debug-crops', 'test_row2_full.png'),
    bbox: { x: 50, y: 34, width: 44, height: 7 }
  },
  {
    key: 'vehicle_number',
    src: path.join(process.cwd(), 'backend', 'debug-crops', 'test_row3_full.png'),
    bbox: { x: 5, y: 47, width: 44, height: 7 }
  },
  {
    key: 'badge_quantity',
    src: path.join(process.cwd(), 'backend', 'debug-crops', 'test_row3_full.png'),
    bbox: { x: 50, y: 47, width: 44, height: 7 }
  }
];

const yOffsets = [2,4,6,8,10]; // percent offsets to add to bbox.y

(async () => {
  const report = [];

  for (const cfg of fieldConfigs) {
    if (!fs.existsSync(cfg.src)) {
      console.error(`Source full image missing for ${cfg.key}: ${cfg.src}`);
      continue;
    }

    const img = sharp(cfg.src);
    const meta = await img.metadata();
    const W = meta.width;
    const H = meta.height;

    const orig = cfg.bbox;
    const origPx = {
      x: Math.round((orig.x/100) * W),
      y: Math.round((orig.y/100) * H),
      width: Math.round((orig.width/100) * W),
      height: Math.round((orig.height/100) * H)
    };

    const tested = [];

    for (const off of yOffsets) {
      const newYPercent = orig.y + off;
      let newYpx = Math.round((newYPercent/100) * H);
      // Increase crop height slightly to ensure handwritten ink is captured
      const extraHeightPercent = 6; // add 6% height to original bbox
      const cropHeightPercent = orig.height + extraHeightPercent;
      let cropHeight = Math.round((cropHeightPercent/100) * H);

      // Ensure crop stays in image bounds
      if (newYpx < 0) newYpx = 0;
      if (newYpx + cropHeight > H) {
        cropHeight = Math.max(10, H - newYpx);
      }

      const left = origPx.x;
      const top = newYpx;
      const width = origPx.width;
      const height = cropHeight;

      const outName = `${cfg.key}_yplus${off}.png`;
      const outPath = path.join(outDir, outName);

      try {
        await img.clone().extract({ left: left, top: top, width: width, height: height }).png().toFile(outPath);
      } catch (err) {
        // If extraction fails (e.g., width/height out of bounds), adjust and retry
        const safeLeft = Math.max(0, Math.min(left, W-10));
        const safeTop = Math.max(0, Math.min(top, H-10));
        const safeWidth = Math.max(10, Math.min(width, W - safeLeft));
        const safeHeight = Math.max(10, Math.min(height, H - safeTop));
        await img.clone().extract({ left: safeLeft, top: safeTop, width: safeWidth, height: safeHeight }).png().toFile(outPath);
      }

      const outMeta = await sharp(outPath).metadata();
      tested.push({ offsetPercent: off, newYPercent, outPath: path.relative(process.cwd(), outPath), cropPixels: { left, top, width, height: outMeta.height ? outMeta.width : width, height: outMeta.height } });
    }

    report.push({ field: cfg.key, sourceImage: path.relative(process.cwd(), cfg.src), originalBbox: orig, tested });
  }

  const outReport = path.join(process.cwd(), 'tools', 'crop_calibration_v2_report.json');
  fs.writeFileSync(outReport, JSON.stringify(report, null, 2));
  console.log(`Wrote calibration crops to: ${path.relative(process.cwd(), outDir)}`);
  console.log(`Wrote report to: ${outReport}`);
})();
