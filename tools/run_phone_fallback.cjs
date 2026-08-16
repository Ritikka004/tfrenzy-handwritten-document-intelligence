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

    const origBuf = fs.readFileSync(cropPath);
    // Preprocess per production phone branch: linear, gamma, sharpen, threshold, upscale x3
    let img = sharp(origBuf).grayscale().normalize();
    try {
      img = img.linear(1.25, -10).gamma(1.05).sharpen({ sigma: 1.0 }).threshold(130);
    } catch (e) {
      img = img.sharpen({ sigma: 1.0 }).threshold(140);
    }
    const meta = await img.metadata();
    const width = meta.width || 200;
    const preBuf = await img.resize({ width: Math.round(width * 3) }).png().toBuffer();

    const worker = await Tesseract.createWorker();
    await worker.reinitialize('eng');

    // Create binary raw
    const bin = await sharp(preBuf).grayscale().threshold(150).raw().toBuffer({ resolveWithObject: true });
    const { data, info } = bin;
    const w = info.width; const h = info.height; const channels = info.channels || 1;

    // Vertical projection
    const colInk = new Array(w).fill(0);
    for (let x=0;x<w;x++){
      let sum=0;
      for (let y=0;y<h;y++){ const idx=(y*w+x)*channels; const v=data[idx]; if (v<128) sum++; }
      colInk[x]=sum;
    }
    const inkMask = colInk.map(v => v > Math.max(1, Math.floor(h * 0.01)));
    const segments=[]; let inSeg=false; let segStart=0;
    for (let x=0;x<w;x++){
      if (inkMask[x]){ if(!inSeg){ inSeg=true; segStart=x; } }
      else{ if(inSeg){ inSeg=false; segments.push({left:segStart,right:x-1}); } }
    }
    if(inSeg) segments.push({left:segStart,right:w-1});

    console.log('Detected segments:', segments.map(s=>`(${s.left}-${s.right})`).join(','));
    const filtered = segments.filter(s => (s.right - s.left) > Math.max(1, Math.floor(w * 0.01)));
    console.log('Filtered segments:', filtered.map(s=>`(${s.left}-${s.right})`).join(','));

    let charRegions = [];
    if (filtered.length >= 6 && filtered.length <= 12) {
      for (const s of filtered) {
        const l = Math.max(0, s.left - 2);
        const r = Math.min(w - 1, s.right + 2);
        charRegions.push({ left: l, width: r - l + 1 });
      }
    } else {
      const sliceW = Math.floor(w / 10);
      for (let i=0;i<10;i++){ const l=i*sliceW; const segW=(i===9)?(w-l):sliceW; charRegions.push({left:l,width:Math.max(1,segW)}); }
      console.log('Using 10 slices fallback');
    }

    const digits=[]; let idx=0;
    for (const r of charRegions){ idx++; try{
      const cropBuf = await sharp(preBuf).extract({ left: r.left, top:0, width: r.width, height: h }).png().toBuffer();
      const dataUri = `data:image/png;base64,${cropBuf.toString('base64')}`;
      const res = await worker.recognize(dataUri, { tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY, tessedit_pageseg_mode: Tesseract.PSM.SINGLE_CHAR, tessedit_char_whitelist: '0123456789' });
      const ch = (res && res.data && typeof res.data.text === 'string') ? res.data.text.trim() : '';
      const digit = (ch && ch.match(/\d/)) ? ch.match(/\d/)[0] : '';
      console.log(`segment ${idx} pos=${r.left}/${r.width} -> raw="${ch}" digit="${digit}"`);
      digits.push(digit);
    } catch (e){ console.warn('segment error', e); digits.push(''); } }

    const reconstructed = digits.join('').replace(/\D/g,'');
    console.log('Reconstructed:', reconstructed);

    await worker.terminate();
    process.exit(0);
  } catch (err){ console.error(err); process.exit(3); }
})();
