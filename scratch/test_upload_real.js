import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';

const fileToUpload = path.join(process.cwd(), 'backend', 'uploads', '1786252087700-9f4620e5-75e5-48f2-9b0c-91c48f435370.png');

async function testUpload() {
  console.log(`[TEST] Uploading target real document: ${path.basename(fileToUpload)} (${fs.statSync(fileToUpload).size} bytes)`);

  const form = new FormData();
  form.append('file', fs.createReadStream(fileToUpload), {
    filename: '1786252087700-9f4620e5-75e5-48f2-9b0c-91c48f435370.png',
    contentType: 'image/png'
  });
  form.append('documentTypeId', 'dt-visitor');

  const res = await fetch('http://localhost:3000/api/documents/upload', {
    method: 'POST',
    body: form,
    headers: form.getHeaders()
  });

  const status = res.status;
  const json = await res.json();

  console.log(`\nHTTP ${status}`);
  console.log('COMPLETE API RESPONSE:');
  console.log(JSON.stringify(json, null, 2));
}

testUpload().catch(console.error);
