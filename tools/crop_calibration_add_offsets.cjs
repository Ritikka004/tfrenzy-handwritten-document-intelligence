const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outDir = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v2');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { key: 'visit_date', src: path.join(process.cwd(), 'backend', 'debug-crops', 'test_row2_full.png'), bbox: { x:5, y:34, width:44, height:7 }, offsets:[5,7] },
  { key: 'host_employee_id', src: path.join(process.cwd(), 'backend', 'debug-crops', 'test_row2_full.png'), bbox: { x:50, y:34, width:44, height:7 }, offsets:[5,7] },
  { key: 'vehicle_number', src: path.join(process.cwd(), 'backend', 'debug-crops', 'test_row3_full.png'), bbox: { x:5, y:47, width:44, height:7 }, offsets:[7,9] },
  { key: 'badge_quantity', src: path.join(process.cwd(), 'backend', 'debug-crops', 'test_row3_full.png'), bbox: { x:50, y:47, width:44, height:7 }, offsets:[7,9] }
];

(async () => {
  for (const t of targets) {
    if (!fs.existsSync(t.src)) { console.error('Missing source', t.src); continue; }
    const img = sharp(t.src);
    const meta = await img.metadata();
    const W = meta.width; const H = meta.height;
    const orig = t.bbox;
    const extraHeightPercent = 6;
    const cropHeightPercent = orig.height + extraHeightPercent;
    for (const off of t.offsets) {
      const newYPercent = orig.y + off;
      const left = Math.round((orig.x/100)*W);
      const top = Math.round((newYPercent/100)*H);
      const width = Math.round((orig.width/100)*W);
      let height = Math.round((cropHeightPercent/100)*H);
      if (top + height > H) height = Math.max(10, H - top);
      const outName = `${t.key}_yplus${off}.png`;
      const outPath = path.join(outDir, outName);
      await img.clone().extract({ left, top, width, height }).png().toFile(outPath);
      console.log('wrote', outPath);
    }
  }
})();
