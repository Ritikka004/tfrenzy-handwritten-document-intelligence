import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function inspectUploads() {
  const uploadsDir = path.join(__dirname, '..', 'backend', 'uploads');
  const files = fs.readdirSync(uploadsDir);
  console.log('Inspecting uploaded images:');
  for (const file of files) {
    const filePath = path.join(uploadsDir, file);
    const stat = fs.statSync(filePath);
    if (stat.size < 100) continue; // skip tiny placeholders
    try {
      const meta = await sharp(filePath).metadata();
      console.log(`File: ${file} | size: ${stat.size} bytes | dimensions: ${meta.width}x${meta.height} | format: ${meta.format}`);
    } catch (err) {
      console.error(`Error reading ${file}:`, err.message);
    }
  }
}

inspectUploads();
