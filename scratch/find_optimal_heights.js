import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWorker } from 'tesseract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const uploadsDir = path.join(__dirname, '..', 'backend', 'uploads');
  const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.png') && fs.statSync(path.join(uploadsDir, f)).size > 1000);
  const sampleFile = files[files.length - 1];
  const filePath = path.join(uploadsDir, sampleFile);
  const meta = await sharp(filePath).metadata();

  const worker = await createWorker('eng');

  const configs = [
    // Row 1
    { key: 'visitor_name', x: 5, y: 20.5, w: 43, h: 7 },
    { key: 'mobile_number', x: 50, y: 20.5, w: 43, h: 7 },

    // Row 2
    { key: 'visit_date', x: 5, y: 34, w: 43, h: 7 },
    { key: 'host_employee_id', x: 50, y: 34, w: 43, h: 7 },

    // Row 3
    { key: 'vehicle_number', x: 5, y: 47, w: 43, h: 7 },
    { key: 'badge_quantity', x: 50, y: 47, w: 43, h: 7 },
  ];

  console.log('--- TESTING FINAL CONFIGURATION MATRIX ---');
  for (const cfg of configs) {
    const pxX = Math.round((cfg.x / 100) * meta.width);
    const pxY = Math.round((cfg.y / 100) * meta.height);
    const pxW = Math.round((cfg.w / 100) * meta.width);
    const pxH = Math.round((cfg.h / 100) * meta.height);

    const cropBuffer = await sharp(filePath)
      .extract({ left: pxX, top: pxY, width: pxW, height: pxH })
      .toBuffer();

    const { data: { text } } = await worker.recognize(cropBuffer);
    const cleanText = text.replace(/\n/g, ' ').trim();
    console.log(`[${cfg.key}] bbox={x:${cfg.x}%, y:${cfg.y}%, w:${cfg.w}%, h:${cfg.h}%} px=(x:${pxX}, y:${pxY}, w:${pxW}, h:${pxH}) -> OCR: "${cleanText}"`);
  }

  await worker.terminate();
}

main().catch(console.error);
