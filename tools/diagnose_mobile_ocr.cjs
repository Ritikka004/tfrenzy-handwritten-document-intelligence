const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

(async () => {
  try {
    const docId = 'doc-1786428783600';
    const cropPath = path.join(__dirname, '..', 'backend', 'debug-crops', docId, 'mobile_number.png');
    if (!fs.existsSync(cropPath)) {
      console.error('Crop not found:', cropPath);
      process.exit(2);
    }

    const tmpDir = path.join(__dirname, 'tmp_diagnose');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const origBuf = fs.readFileSync(cropPath);
    const origMeta = await sharp(origBuf).metadata();
    const origOut = path.join(tmpDir, 'mobile_original.png');
    fs.writeFileSync(origOut, origBuf);

    // Preprocess per production phone branch: linear, gamma, sharpen, threshold, upscale x3
    let img = sharp(origBuf).grayscale().normalize();
    try {
      img = img.linear(1.25, -10).gamma(1.05).sharpen({ sigma: 1.0 }).threshold(130);
    } catch (e) {
      img = img.sharpen({ sigma: 1.0 }).threshold(140);
    }
    const meta = await img.metadata();
    const width = meta.width || origMeta.width || 200;
    const preBuf = await img.resize({ width: Math.round(width * 3) }).png().toBuffer();
    const preOut = path.join(tmpDir, 'mobile_preprocessed.png');
    fs.writeFileSync(preOut, preBuf);
    const preMeta = await sharp(preBuf).metadata();

    console.log('ORIGINAL_CROP_PATH=' + cropPath);
    console.log('ORIGINAL_DIMENSIONS=' + (origMeta.width||0) + 'x' + (origMeta.height||0));
    console.log('PREPROCESSED_PATH=' + preOut);
    console.log('PREPROCESSED_DIMENSIONS=' + (preMeta.width||0) + 'x' + (preMeta.height||0));

    // Initialize Tesseract worker (no logger to avoid cross-thread cloning issues)
    const worker = await Tesseract.createWorker();
    // Reinitialize worker for English (keeps worker ready)
    await worker.reinitialize('eng');

    const whitelist = '0123456789';
    const tests = [];

    // Test original with SINGLE_LINE
    const origRes = await worker.recognize(origOut, { tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE, tessedit_char_whitelist: whitelist });
    const origText = (origRes && origRes.data && origRes.data.text) ? origRes.data.text.trim() : '';
    const origConf = origRes && origRes.data && typeof origRes.data.confidence !== 'undefined' ? origRes.data.confidence : null;
    tests.push({ name: 'ORIGINAL_SINGLE_LINE', text: origText, confidence: origConf });

    // Preprocessed tests: SINGLE_LINE, SINGLE_WORD, SINGLE_BLOCK
    const p1 = await worker.recognize(preOut, { tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE, tessedit_char_whitelist: whitelist });
    const p1t = (p1 && p1.data && p1.data.text) ? p1.data.text.trim() : '';
    const p1c = p1 && p1.data && typeof p1.data.confidence !== 'undefined' ? p1.data.confidence : null;
    tests.push({ name: 'PREPROC_SINGLE_LINE', text: p1t, confidence: p1c });

    const p2 = await worker.recognize(preOut, { tessedit_pageseg_mode: Tesseract.PSM.SINGLE_WORD, tessedit_char_whitelist: whitelist });
    const p2t = (p2 && p2.data && p2.data.text) ? p2.data.text.trim() : '';
    const p2c = p2 && p2.data && typeof p2.data.confidence !== 'undefined' ? p2.data.confidence : null;
    tests.push({ name: 'PREPROC_SINGLE_WORD', text: p2t, confidence: p2c });

    const p3 = await worker.recognize(preOut, { tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK, tessedit_char_whitelist: whitelist });
    const p3t = (p3 && p3.data && p3.data.text) ? p3.data.text.trim() : '';
    const p3c = p3 && p3.data && typeof p3.data.confidence !== 'undefined' ? p3.data.confidence : null;
    tests.push({ name: 'PREPROC_SINGLE_BLOCK', text: p3t, confidence: p3c });

    await worker.terminate();

    console.log('\n--- TESSERACT TESTS ---');
    tests.forEach(t => {
      console.log(`${t.name}: text="${t.text}", confidence=${t.confidence}`);
    });

    // Save JSON results
    fs.writeFileSync(path.join(tmpDir, 'diagnose_results.json'), JSON.stringify({ origMeta, preMeta, tests }, null, 2));

    console.log('\nSaved preprocessed and original crops in ' + tmpDir);
    process.exit(0);
  } catch (err) {
    console.error('ERROR during diagnosis:', err);
    process.exit(3);
  }
})();
