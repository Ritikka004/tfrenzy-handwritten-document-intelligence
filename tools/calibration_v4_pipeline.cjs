const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

async function main(){
  const root = process.cwd();
  const v3path = path.join(root, 'backend','debug-crops','calibration-v3','calibration-v3-report.json');
  const outDir = path.join(root, 'backend','debug-crops','calibration-v4');
  if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const v3 = JSON.parse(fs.readFileSync(v3path,'utf8'));

  // per-field tweaks (pixel offsets and height adjustments)
  const tweaks = {
    visit_date: { offsetDown: 12, heightDelta: -20 },
    host_employee_id: { offsetDown: 12, heightDelta: -20 },
    vehicle_number: { offsetDown: 12, heightDelta: 20 },
    badge_quantity: { offsetDown: 12, heightDelta: 20 },
  };

  const worker = await Tesseract.createWorker();
  await worker.reinitialize('eng');

  const report = [];
  for(const item of v3){
    const field = item.field;
    const fullImagePath = path.join(root, item.fullImage.replace(/\\/g,'/'));
    const imgMeta = await sharp(fullImagePath).metadata();
    const prop = item.proposedCrop;
    const tweak = tweaks[field] || { offsetDown:0, heightDelta:0 };

    // compute estimated base top and height
    const baseTop = Math.max(0, prop.top + tweak.offsetDown);
    const baseHeight = Math.max(10, prop.height + tweak.heightDelta);

    const candidates = [];
    const deltas = [-6, 0, 6];
    for(let i=0;i<3;i++){
      const top = Math.max(0, baseTop + deltas[i]);
      const height = Math.max(8, baseHeight + (i===0?-6:(i===2?6:0)));
      const left = prop.left;
      const width = prop.width;
      // clamp to image
      const clampedTop = Math.min(top, imgMeta.height-1);
      const clampedLeft = Math.min(left, Math.max(0, imgMeta.width-1));
      const clampedWidth = Math.min(width, imgMeta.width - clampedLeft);
      const clampedHeight = Math.min(height, imgMeta.height - clampedTop);
      const outName = `${field}_candidate_${i+1}.png`;
      const outPath = path.join(outDir,outName);
      await sharp(fullImagePath).extract({ left: clampedLeft, top: clampedTop, width: clampedWidth, height: clampedHeight }).toFile(outPath);

      // analyze
      const buf = await sharp(outPath).grayscale().raw().toBuffer({ resolveWithObject: true });
      const data = buf.data;
      const w = buf.info.width; const h = buf.info.height;
      const area = w*h;
      let inkCount = 0;
      let topBandInk = 0; let bottomBandInk = 0; let top20Ink = 0;
      for(let y=0;y<h;y++){
        for(let x=0;x<w;x++){
          const v = data[y*w + x];
          if(v < 200){
            inkCount++;
            if(y < 2) topBandInk++;
            if(y >= h-2) bottomBandInk++;
            if(y < Math.round(h*0.2)) top20Ink++;
          }
        }
      }
      const handwriting_visible = inkCount > Math.max(5, Math.round(area*0.001));
      const clipped_top = topBandInk > 0;
      const clipped_bottom = bottomBandInk > 0;
      const handwriting_fully_visible = handwriting_visible && !clipped_top && !clipped_bottom;
      const label_visible = top20Ink > Math.max(2, Math.round(area*0.0005));

      candidates.push({ x: clampedLeft, y: clampedTop, width: clampedWidth, height: clampedHeight, imgW: imgMeta.width, imgH: imgMeta.height, path: outPath, handwriting_visible, handwriting_fully_visible, clipped_top, clipped_bottom, label_visible });
    }

    // choose best candidate: prefer handwriting_fully_visible && !label_visible
    let best = candidates.find(c=>c.handwriting_fully_visible && !c.label_visible);
    if(!best) best = candidates.find(c=>c.handwriting_fully_visible) || candidates.find(c=>c.handwriting_visible && !c.label_visible) || candidates[1];

    // run OCR on best using production-like per-field whitelist
    const whitelistMap = {
      visit_date: '0123456789/',
      host_employee_id: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      vehicle_number: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      badge_quantity: '0123456789'
    };
    const whitelist = whitelistMap[field] || '';
    // follow existing experiments: pass config to recognize
    const config = { tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY, tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE };
    if (whitelist) config.tessedit_char_whitelist = whitelist;
    const res = await worker.recognize(best.path, config);
    const ocrText = res && res.data && typeof res.data.text === 'string' ? res.data.text.trim() : '';
    const ocrConf = res && res.data ? Math.round(res.data.confidence || 0) : 0;

    report.push({ field, image: item.fullImage, imageWidth: imgMeta.width, imageHeight: imgMeta.height, candidates, selected: { x: best.x, y: best.y, width: best.width, height: best.height, path: best.path }, ocrText, ocrConf });
  }

  await worker.terminate();
  const outReportPath = path.join(outDir,'calibration-v4-report.json');
  fs.writeFileSync(outReportPath, JSON.stringify(report, null, 2));
  console.log('Wrote calibration-v4 report:', outReportPath);
}

main().catch(e=>{ console.error(e); process.exit(1); });
