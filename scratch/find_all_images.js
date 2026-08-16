import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

function searchImages(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist' && entry.name !== 'debug-crops') {
        results.push(...searchImages(fullPath));
      }
    } else if (/\.(png|jpg|jpeg|webp|gif)$/i.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

async function main() {
  const images = searchImages(projectRoot);
  console.log(`Found ${images.length} images:`);
  for (const img of images) {
    try {
      const meta = await sharp(img).metadata();
      console.log(`Path: ${path.relative(projectRoot, img)} | Dimensions: ${meta.width}x${meta.height}`);
    } catch (e) {
      console.error(`Error reading ${img}:`, e.message);
    }
  }
}

main();
