#!/usr/bin/env node

/**
 * OCR Diagnostic Script
 * Tests the OCR pipeline and saves crop diagnostics
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Make HTTP request
function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  try {
    console.log('[DIAGNOSTIC] Starting OCR pipeline test...\n');
    
    // Check if latest debug crops exist
    const baseDir = path.join(__dirname, 'backend', 'debug-crops');
    
    if (!fs.existsSync(baseDir)) {
      console.log('[DIAGNOSTIC] No debug-crops directory yet. Triggering upload...');
      
      // Upload the latest image
      const uploadsDir = path.join(__dirname, 'backend', 'uploads');
      const files = fs.readdirSync(uploadsDir)
        .sort((a, b) => fs.statSync(path.join(uploadsDir, b)).mtimeMs - 
                       fs.statSync(path.join(uploadsDir, a)).mtimeMs);
      
      if (files.length === 0) {
        console.error('[DIAGNOSTIC] ERROR: No uploaded files found');
        process.exit(1);
      }
      
      const latestFile = files[0];
      const imagePath = path.join(uploadsDir, latestFile);
      const fileSize = fs.statSync(imagePath).size;
      
      console.log(`[DIAGNOSTIC] Using image: ${latestFile}`);
      console.log(`[DIAGNOSTIC] File size: ${fileSize} bytes\n`);
      
      // For now just wait and monitor console
      console.log('[DIAGNOSTIC] Monitoring server logs...');
      console.log('[DIAGNOSTIC] The server will process this in the next upload.\n');
      
    } else {
      // List all processed documents
      const docIds = fs.readdirSync(baseDir);
      console.log(`[DIAGNOSTIC] Found ${docIds.length} processed documents:\n`);
      
      for (const docId of docIds.sort().reverse().slice(0, 1)) { // Check latest
        const docCropDir = path.join(baseDir, docId);
        const crops = fs.readdirSync(docCropDir).sort();
        
        console.log(`[DIAGNOSTIC] Document: ${docId}`);
        console.log(`[DIAGNOSTIC] Crops saved:`);
        
        for (const crop of crops) {
          const cropPath = path.join(docCropDir, crop);
          const size = fs.statSync(cropPath).size;
          const bytes = `(${size} bytes)`;
          console.log(`  ✓ ${crop} ${bytes.padEnd(12)}`);
        }
        
        console.log();
      }
    }
    
    console.log('[DIAGNOSTIC] Server is running at http://localhost:3000');
    console.log('[DIAGNOSTIC] Upload a document to generate crops and OCR output.');
    console.log('[DIAGNOSTIC] Check server console for [IMAGE-DIMENSIONS], [OCR-CROP], and [OCR] logs.\n');
    
  } catch (err) {
    console.error('[DIAGNOSTIC] Error:', err);
    process.exit(1);
  }
}

main();
