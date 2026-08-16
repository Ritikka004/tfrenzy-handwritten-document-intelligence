import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWorker } from 'tesseract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const uploadsDir = path.join(__dirname, '..', 'backend', 'uploads');
  const sampleFile = '1786336632633-d6063b33-5067-4f5f-8297-5625d1ffbbce.png';
  const filePath = path.join(uploadsDir, sampleFile);
  const meta = await sharp(filePath).metadata();

  console.log(`Verifying on reference image: ${sampleFile} (${meta.width}x${meta.height})`);

  const worker = await createWorker('eng');

  const visitorFields = [
    { fieldKey: 'visitor_name', label: 'Visitor Full Name', boundingBox: { x: 5, y: 20.5, width: 44, height: 7 } },
    { fieldKey: 'mobile_number', label: 'Mobile Phone Number', boundingBox: { x: 50, y: 20.5, width: 44, height: 7 } },
    { fieldKey: 'visit_date', label: 'Date of Visit', boundingBox: { x: 5, y: 34, width: 44, height: 7 } },
    { fieldKey: 'host_employee_id', label: 'Host Employee ID', boundingBox: { x: 50, y: 34, width: 44, height: 7 } },
    { fieldKey: 'vehicle_number', label: 'Vehicle Registration No.', boundingBox: { x: 5, y: 47, width: 44, height: 7 } },
    { fieldKey: 'badge_quantity', label: 'Passes Issued Quantity', boundingBox: { x: 50, y: 47, width: 44, height: 7 } }
  ];

  console.log('\n--- VERIFICATION RESULTS ---');
  for (const fld of visitorFields) {
    const bbox = fld.boundingBox;
    const pixelX = Math.round((bbox.x / 100) * meta.width);
    const pixelY = Math.round((bbox.y / 100) * meta.height);
    const pixelWidth = Math.round((bbox.width / 100) * meta.width);
    const pixelHeight = Math.round((bbox.height / 100) * meta.height);

    const cropBuffer = await sharp(filePath)
      .extract({ left: pixelX, top: pixelY, width: pixelWidth, height: pixelHeight })
      .toBuffer();

    const { data: { text } } = await worker.recognize(cropBuffer);
    const cleanText = text.replace(/\n/g, ' ').trim();

    console.log(
      `Field: ${fld.fieldKey.padEnd(18)} | ` +
      `Percent: (x:${bbox.x}%, y:${bbox.y}%, w:${bbox.width}%, h:${bbox.height}%) | ` +
      `Pixels: (x:${pixelX}, y:${pixelY}, w:${pixelWidth}, h:${pixelHeight}) | ` +
      `OCR Output: "${cleanText}"`
    );
  }

  await worker.terminate();
}

main().catch(console.error);
