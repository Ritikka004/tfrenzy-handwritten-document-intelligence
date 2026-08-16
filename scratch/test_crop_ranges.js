import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWorker } from 'tesseract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const uploadsDir = path.join(__dirname, '..', 'backend', 'uploads');
  // Get latest 1448x1086 or 1536x1024 uploaded file
  const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.png') && fs.statSync(path.join(uploadsDir, f)).size > 1000);
  const sampleFile = files[files.length - 1]; // Latest file
  const filePath = path.join(uploadsDir, sampleFile);
  
  const meta = await sharp(filePath).metadata();
  console.log(`Testing image: ${sampleFile} (${meta.width}x${meta.height})`);

  // Let's create a visual grid / slice of the top 600 pixels in steps of 30px
  const outputDir = path.join(__dirname, 'crop_slices');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // Initialize Tesseract worker
  const worker = await createWorker('eng');

  console.log('\n--- SCANNING Y COORDINATES FROM Y=50 to Y=600 in steps of 30px ---');
  for (let y = 50; y <= 600; y += 30) {
    const cropBuffer = await sharp(filePath)
      .extract({ left: 70, top: y, width: 600, height: 60 })
      .toBuffer();
    
    const slicePath = path.join(outputDir, `slice_y${y}.png`);
    fs.writeFileSync(slicePath, cropBuffer);

    const { data: { text } } = await worker.recognize(cropBuffer);
    const cleanText = text.replace(/\n/g, ' ').trim();
    console.log(`Y=${y}px (${(y/meta.height*100).toFixed(1)}%): "${cleanText}"`);
  }

  await worker.terminate();
}

main().catch(console.error);
