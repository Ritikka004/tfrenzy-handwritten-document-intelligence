import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Import template fields from database.ts logic
const visitorFields = [
  { fieldKey: 'visitor_name', boundingBox: { x: 5, y: 20.5, width: 44, height: 7 } },
  { fieldKey: 'mobile_number', boundingBox: { x: 50, y: 20.5, width: 44, height: 7 } },
  { fieldKey: 'visit_date', boundingBox: { x: 5.35, y: 30, width: 30.25, height: 70 } },
  { fieldKey: 'host_employee_id', boundingBox: { x: 50.7, y: 25, width: 25.24, height: 75 } },
  { fieldKey: 'vehicle_number', boundingBox: { x: 5, y: 47, width: 44, height: 7 } },
  { fieldKey: 'badge_quantity', boundingBox: { x: 50, y: 47, width: 44, height: 7 } }
];

const imgPath = path.join(process.cwd(), 'backend', 'uploads', '1786252087700-9f4620e5-75e5-48f2-9b0c-91c48f435370.png');
const outDir = path.join(process.cwd(), 'scratch', 'current_crops');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  const metadata = await sharp(imgPath).metadata();
  console.log(`Image dimensions: ${metadata.width} x ${metadata.height}`);
  const imageWidth = metadata.width;
  const imageHeight = metadata.height;

  for (const field of visitorFields) {
    const bboxPercent = field.boundingBox;
    const pixelX = Math.round((bboxPercent.x / 100) * imageWidth);
    const pixelY = Math.round((bboxPercent.y / 100) * imageHeight);
    const pixelWidth = Math.round((bboxPercent.width / 100) * imageWidth);
    const pixelHeight = Math.round((bboxPercent.height / 100) * imageHeight);

    const croppedX = Math.max(0, pixelX);
    const croppedY = Math.max(0, pixelY);
    const croppedWidth = Math.min(pixelWidth, imageWidth - croppedX);
    const croppedHeight = Math.min(pixelHeight, imageHeight - croppedY);

    console.log(`Field: ${field.fieldKey}`);
    console.log(`  BBox %:`, bboxPercent);
    console.log(`  Pixel Crop: x=${croppedX}, y=${croppedY}, w=${croppedWidth}, h=${croppedHeight}`);

    const cropPath = path.join(outDir, `${field.fieldKey}.png`);
    await sharp(imgPath)
      .extract({ left: croppedX, top: croppedY, width: croppedWidth, height: croppedHeight })
      .toFile(cropPath);
  }
}

run().catch(err => console.error(err));
