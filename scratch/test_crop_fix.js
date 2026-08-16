import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import Tesseract from 'tesseract.js';

const visitorFields = [
  { fieldKey: 'visitor_name', label: 'Visitor Full Name', fieldType: 'name', boundingBox: { x: 43.0, y: 23.54, width: 30.0, height: 8.20 } },
  { fieldKey: 'mobile_number', label: 'Mobile Phone Number', fieldType: 'phone', boundingBox: { x: 43.0, y: 32.91, width: 30.0, height: 7.03 } },
  { fieldKey: 'visit_date', label: 'Date of Visit', fieldType: 'date', boundingBox: { x: 43.0, y: 41.11, width: 30.0, height: 7.13 } },
  { fieldKey: 'vehicle_number', label: 'Vehicle Registration No.', fieldType: 'vehicle_number', boundingBox: { x: 43.0, y: 49.41, width: 30.0, height: 7.23 } },
  { fieldKey: 'host_employee_id', label: 'Host Employee ID', fieldType: 'employee_id', boundingBox: { x: 43.0, y: 57.81, width: 30.0, height: 6.93 } },
  { fieldKey: 'badge_quantity', label: 'Passes Issued Quantity', fieldType: 'quantity', boundingBox: { x: 43.0, y: 65.92, width: 30.0, height: 6.74 } }
];

const imgPath = path.join(process.cwd(), 'backend', 'uploads', '1786252087700-9f4620e5-75e5-48f2-9b0c-91c48f435370.png');
const outDir = path.join(process.cwd(), 'scratch', 'fixed_crops');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  const metadata = await sharp(imgPath).metadata();
  console.log(`Image dimensions: ${metadata.width} x ${metadata.height}`);
  const imageWidth = metadata.width;
  const imageHeight = metadata.height;

  const worker = await Tesseract.createWorker();
  await worker.reinitialize('eng');

  for (const field of visitorFields) {
    const bboxPercent = field.boundingBox;
    const pixelX = Math.round((bboxPercent.x / 100) * imageWidth);
    const pixelY = Math.round((bboxPercent.y / 100) * imageHeight);
    const pixelWidth = Math.round((bboxPercent.width / 100) * imageWidth);
    const pixelHeight = Math.round((bboxPercent.height / 100) * imageHeight);

    const cropPath = path.join(outDir, `${field.fieldKey}.png`);
    // Extract crop, resize 2x for OCR resolution, and add white padding around text
    const croppedBuffer = await sharp(imgPath)
      .extract({ left: pixelX, top: pixelY, width: pixelWidth, height: pixelHeight })
      .resize({ height: Math.round(pixelHeight * 2), kernel: 'lanczos3' })
      .extend({ top: 15, bottom: 15, left: 15, right: 15, background: { r: 255, g: 255, b: 255 } })
      .toBuffer();

    await sharp(croppedBuffer).toFile(cropPath);

    let whitelist = '';
    if (field.fieldType === 'phone') whitelist = '0123456789';
    else if (field.fieldType === 'employee_id') whitelist = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-';
    else if (field.fieldType === 'vehicle_number') whitelist = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
    else if (field.fieldType === 'quantity') whitelist = '0123456789';
    else if (field.fieldType === 'date') whitelist = '0123456789/-';

    const res = await worker.recognize(croppedBuffer, {
      tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
      ...(whitelist !== '' ? { tessedit_char_whitelist: whitelist } : {})
    });

    console.log(`Field: ${field.fieldKey} (${field.label})`);
    console.log(`  Raw Text: "${res.data.text.trim()}"`);
    console.log(`  Confidence: ${(res.data.confidence / 100).toFixed(2)}`);
  }

  await worker.terminate();
}

run().catch(err => console.error(err));
