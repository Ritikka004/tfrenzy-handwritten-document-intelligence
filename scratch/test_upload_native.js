import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'backend', 'uploads', '1786252087700-9f4620e5-75e5-48f2-9b0c-91c48f435370.png');
const fileBuffer = fs.readFileSync(filePath);

async function testUpload() {
  console.log(`[TEST] Uploading file: ${path.basename(filePath)} (${fileBuffer.length} bytes)`);

  const blob = new Blob([fileBuffer], { type: 'image/png' });
  const formData = new FormData();
  formData.append('file', blob, '1786252087700-9f4620e5-75e5-48f2-9b0c-91c48f435370.png');
  formData.append('documentTypeId', 'dt-visitor');

  const res = await fetch('http://localhost:3000/api/documents/upload', {
    method: 'POST',
    body: formData
  });

  const status = res.status;
  const json = await res.json();

  console.log(`\nHTTP ${status}`);
  console.log('COMPLETE API RESPONSE:');
  console.log(JSON.stringify(json, null, 2));
}

testUpload().catch(console.error);
