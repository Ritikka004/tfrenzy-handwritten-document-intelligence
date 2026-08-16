import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const debugDir = path.join(__dirname, '..', 'backend', 'debug-crops');

const entries = fs.readdirSync(debugDir);
for (const entry of entries) {
  const fullPath = path.join(debugDir, entry);
  if (fs.statSync(fullPath).isDirectory()) {
    const files = fs.readdirSync(fullPath);
    console.log(`Directory ${entry}: ${files.length} files -> [${files.join(', ')}]`);
  }
}
