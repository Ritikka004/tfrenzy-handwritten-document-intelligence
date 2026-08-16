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
  const sampleFile = files[files.length - 1]; // Latest file
  const filePath = path.join(uploadsDir, sampleFile);
  
  const meta = await sharp(filePath).metadata();
  console.log(`Image: ${sampleFile} (${meta.width}x${meta.height})`);

  const worker = await createWorker('eng');

  // Test field coordinates candidate matrix
  const candidates = [
    // ROW 1
    { key: 'visitor_name (left)', xPercent: 5, yPercent: 21, wPercent: 43, hPercent: 6 },
    { key: 'visitor_name (left y22)', xPercent: 5, yPercent: 22, wPercent: 43, hPercent: 6 },
    { key: 'mobile_number (right y21)', xPercent: 50, yPercent: 21, wPercent: 43, hPercent: 6 },
    { key: 'mobile_number (right y22)', xPercent: 50, yPercent: 22, wPercent: 43, hPercent: 6 },

    // ROW 2
    { key: 'visit_date (left y34)', xPercent: 5, yPercent: 34, wPercent: 43, hPercent: 6 },
    { key: 'visit_date (left y35)', xPercent: 5, yPercent: 35, wPercent: 43, hPercent: 6 },
    { key: 'host_employee_id (right y34)', xPercent: 50, yPercent: 34, wPercent: 43, hPercent: 6 },
    { key: 'host_employee_id (right y35)', xPercent: 50, yPercent: 35, wPercent: 43, hPercent: 6 },

    // ROW 3
    { key: 'vehicle_number (left y47)', xPercent: 5, yPercent: 47, wPercent: 43, hPercent: 6 },
    { key: 'vehicle_number (left y48)', xPercent: 5, yPercent: 48, wPercent: 43, hPercent: 6 },
    { key: 'badge_quantity (right y47)', xPercent: 50, yPercent: 47, wPercent: 43, hPercent: 6 },
    { key: 'badge_quantity (right y48)', xPercent: 50, yPercent: 48, wPercent: 43, hPercent: 6 },
  ];

  console.log('\n--- TESTING CANDIDATE CROPS WITH REAL TESSERACT OCR ---');
  for (const cand of candidates) {
    const pxX = Math.round((cand.xPercent / 100) * meta.width);
    const pxY = Math.round((cand.yPercent / 100) * meta.height);
    const pxW = Math.round((cand.wPercent / 100) * meta.width);
    const pxH = Math.round((cand.hPercent / 100) * meta.height);

    const cropBuffer = await sharp(filePath)
      .extract({ left: pxX, top: pxY, width: pxW, height: pxH })
      .toBuffer();

    const { data: { text } } = await worker.recognize(cropBuffer);
    const cleanText = text.replace(/\n/g, ' ').trim();
    console.log(`[${cand.key}] px=(x:${pxX}, y:${pxY}, w:${pxW}, h:${pxH}) -> OCR: "${cleanText}"`);
  }

  await worker.terminate();
}

main().catch(console.error);
