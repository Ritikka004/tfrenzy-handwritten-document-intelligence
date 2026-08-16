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
  
  const worker = await createWorker('eng');

  const configs = [
    { key: 'visitor_name', x: 5, y: 20.5, w: 43, h: 7 },
    { key: 'visit_date', x: 5, y: 34, w: 43, h: 7 },
    { key: 'vehicle_number', x: 5, y: 47, w: 43, h: 7 }
  ];

  console.log('--- TESTING ALL UPLOADED IMAGES WITH CALIBRATED PERCENTAGE BBOXES ---');
  for (const file of files) {
    const filePath = path.join(uploadsDir, file);
    const meta = await sharp(filePath).metadata();
    console.log(`\nImage: ${file} (${meta.width}x${meta.height})`);

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
      console.log(`  [${cfg.key}] -> OCR: "${cleanText}"`);
    }
  }

  await worker.terminate();
}

main().catch(console.error);
