/**
 * Test Upload Script
 * Uploads the latest handwritten visitor form and monitors OCR output
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const FormData = require('form-data');

// Find the latest uploaded image
const uploadsDir = path.join(__dirname, 'backend', 'uploads');
const files = fs.readdirSync(uploadsDir)
  .map(f => ({
    name: f,
    time: fs.statSync(path.join(uploadsDir, f)).mtimeMs
  }))
  .sort((a, b) => b.time - a.time);

if (files.length === 0) {
  console.error('No uploaded files found');
  process.exit(1);
}

const latestFile = files[0].name;
const imagePath = path.join(uploadsDir, latestFile);

console.log(`[TEST] Using latest upload: ${latestFile}`);
console.log(`[TEST] File size: ${fs.statSync(imagePath).size} bytes`);

// Create form data
const form = new FormData();
form.append('file', fs.createReadStream(imagePath), {
  filename: latestFile,
  contentType: 'image/png'
});

// Upload to server
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/documents/upload',
  method: 'POST',
  headers: form.getHeaders()
};

console.log(`[TEST] Uploading to http://${options.hostname}:${options.port}${options.path}`);

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', chunk => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('\n[TEST] Upload Response:');
      console.log(JSON.stringify(response, null, 2));
      
      if (response.document && response.document.id) {
        const docId = response.document.id;
        console.log(`\n[TEST] Document ID: ${docId}`);
        
        // Wait a bit then check for debug crops
        setTimeout(() => {
          const debugDir = path.join(__dirname, 'backend', 'debug-crops', docId);
          if (fs.existsSync(debugDir)) {
            const crops = fs.readdirSync(debugDir);
            console.log(`\n[TEST] Debug crops saved:`);
            crops.forEach(crop => {
              const size = fs.statSync(path.join(debugDir, crop)).size;
              console.log(`  - ${crop} (${size} bytes)`);
            });
          } else {
            console.log(`\n[TEST] No debug crops directory found at: ${debugDir}`);
          }
          
          process.exit(0);
        }, 2000);
      }
    } catch (err) {
      console.error('[TEST] Parse error:', err);
      console.error('[TEST] Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('[TEST] Request error:', err);
  process.exit(1);
});

form.pipe(req);
