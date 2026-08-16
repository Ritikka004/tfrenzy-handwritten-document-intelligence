import fs from "fs";
import path from "path";
const uploadsDir = path.join(process.cwd(), "backend", "uploads");
const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')).map(f => ({ name: f, time: fs.statSync(path.join(uploadsDir, f)).mtimeMs })).sort((a,b)=>b.time-b.time);
if (files.length === 0) {
  console.error('No upload images found');
  process.exit(1);
}
const latest = files[0];
const filePath = path.join(uploadsDir, latest.name);
console.log('Uploading', latest.name);

const data = await fs.promises.readFile(filePath);
const blob = new Blob([new Uint8Array(data)], { type: 'image/png' });
const form = new FormData();
form.append('file', blob, latest.name);
form.append('documentTypeId', 'dt-visitor');

const res = await fetch('http://127.0.0.1:3000/api/documents/upload', { method: 'POST', body: form });
const text = await res.text();
console.log('Status', res.status);
console.log(text);