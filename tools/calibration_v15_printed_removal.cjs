const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

const outRoot = path.join(process.cwd(),'backend','debug-crops','calibration-v15');
if (!fs.existsSync(outRoot)) fs.mkdirSync(outRoot, { recursive: true });

const v11Path = path.join(process.cwd(),'backend','debug-crops','calibration-v11','calibration-v11-report.json');
if (!fs.existsSync(v11Path)) { console.error('v11 report not found', v11Path); process.exit(1); }
const v11 = JSON.parse(fs.readFileSync(v11Path,'utf8'));

const fields = ['vehicle_number','badge_quantity'];
const expected = { vehicle_number: 'TN09BX1234', badge_quantity: '02' };

async function ocrBuffer(buf){ const worker = await Tesseract.createWorker(); await worker.reinitialize('eng'); try{ const cfg = { tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY, tessedit_pageseg_mode: 6 }; const res = await worker.recognize('data:image/png;base64,'+buf.toString('base64'), cfg); await worker.terminate(); return { text: (res && res.data && res.data.text) ? res.data.text.trim() : '', confidence: (res && res.data) ? res.data.confidence : null }; }catch(e){ try{ await worker.terminate(); }catch(_){} return { text: '[ERROR] '+String(e), confidence: null }; }

function toBin(raw, info, thresh=160){ const w=info.width,h=info.height,channels=info.channels; const bin=new Uint8Array(w*h); for(let y=0;y<h;y++){ for(let x=0;x<w;x++){ const v=raw[(y*w+x)*channels]; bin[y*w+x]= v < thresh ? 1:0; } } return {bin,w,h}; }

function computeDarkCount(rawInfo, bbox){ const {data,info} = rawInfo; const w=info.width; let c=0; for(let y=bbox.y;y<Math.min(info.height,bbox.y+bbox.height);y++){ for(let x=bbox.x;x<Math.min(w,bbox.x+bbox.width);x++){ if (data[(y*w+x)*info.channels] < 200) c++; } } return c; }

function floodComponents(bin,w,h){ const visited=new Uint8Array(w*h); const comps=[]; for(let i=0;i<w*h;i++){ if(bin[i] && !visited[i]){ let stack=[i]; visited[i]=1; let minx=w,maxx=0,miny=h,maxy=0,area=0; while(stack.length){ const idx=stack.pop(); const y=Math.floor(idx/w), x=idx%w; area++; minx=Math.min(minx,x); maxx=Math.max(maxx,x); miny=Math.min(miny,y); maxy=Math.max(maxy,y); const nbs=[idx-1,idx+1,idx-w,idx+w]; for(const nb of nbs){ if(nb>=0 && nb<w*h && !visited[nb] && bin[nb]){ visited[nb]=1; stack.push(nb); } } } comps.push({x:minx,y:miny,width:maxx-minx+1,height:maxy-miny+1,area}); } } return comps; }

function maskComponents(bin,w,h, compsToRemove){ const out=new Uint8Array(bin); for(const c of compsToRemove){ for(let yy=c.y;yy<c.y+c.height;yy++){ for(let xx=c.x;xx<c.x+c.width;xx++){ out[yy*w+xx]=0; } } } return out; }

function binToBuffer(bin,w,h){ const buf=Buffer.alloc(w*h); for(let i=0;i<w*h;i++){ buf[i]= bin[i]?0:255; } return {data:buf, info:{width:w,height:h,channels:1}}; }

async function removeHorizontalLines(rawInfo, thresholdFraction=0.6, lineHeight=4){ const {data,info}=rawInfo; const w=info.width,h=info.height; const out=new Uint8ClampedArray(data); // copy
  for(let y=0;y<h;y++){ let run=0; for(let x=0;x<w;x++){ if(data[(y*w+x)*info.channels] < 200) run++; } if(run > w*thresholdFraction){ // clear small band
      for(let yy=Math.max(0,y-Math.floor(lineHeight/2)); yy<=Math.min(h-1,y+Math.floor(lineHeight/2)); yy++){ for(let x=0;x<w;x++){ out[(yy*w+x)*info.channels]=255; } } }
  }
  return {data:Buffer.from(out), info}; }

async function removeVerticalLines(rawInfo, thresholdFraction=0.6, lineWidth=4){ const {data,info}=rawInfo; const w=info.width,h=info.height; const out=new Uint8ClampedArray(data);
  for(let x=0;x<w;x++){ let run=0; for(let y=0;y<h;y++){ if(data[(y*w+x)*info.channels] < 200) run++; } if(run > h*thresholdFraction){ for(let xx=Math.max(0,x-Math.floor(lineWidth/2)); xx<=Math.min(w-1,x+Math.floor(lineWidth/2)); xx++){ for(let y=0;y<h;y++){ out[(y*w+xx)*info.channels]=255; } } } }
  return {data:Buffer.from(out), info}; }

async function run(){ console.log('calibration-v15: start'); const report=[];
  for(const f of fields){ const rec={field:f}; const v11e=v11.find(x=>x.field===f); if(!v11e || !v11e.selected){ rec.error='v11 selected crop missing'; report.push(rec); continue; }
    const sel=v11e.selected; const cropPath=sel.path; const cropBuf=fs.readFileSync(cropPath);
    const fieldOut=path.join(outRoot,f); if(!fs.existsSync(fieldOut)) fs.mkdirSync(fieldOut,{recursive:true});
    // A original
    fs.writeFileSync(path.join(fieldOut,'A_original.png'), cropBuf);

    // prepare raw grayscale
    const rawObj = await sharp(cropBuf).grayscale().raw().toBuffer({resolveWithObject:true});
    const {data,info}=rawObj; const w=info.width,h=info.height;
    const rawInfo={data,info};

    // compute baseline ink counts
    const inkBbox = v11e.inkBbox ? { x: v11e.inkBbox.x - sel.x, y: v11e.inkBbox.y - sel.y, width: v11e.inkBbox.width, height: v11e.inkBbox.height } : null;
    const beforeInkCount = inkBbox ? computeDarkCount(rawObj, inkBbox) : null;

    // detect printed label rows via horizontal projection peaks
    const rowCounts = new Array(h).fill(0); for(let y=0;y<h;y++){ for(let x=0;x<w;x++){ if(data[(y*w+x)*info.channels]<200) rowCounts[y]++; } }
    // label rows: rows with count > 0.5*max
    const maxRow = Math.max(...rowCounts); const labelRows=[]; for(let y=0;y<h;y++){ if(rowCounts[y] > maxRow*0.5) labelRows.push(y); }
    const labelRegion = labelRows.length ? { y: Math.max(0, Math.min(...labelRows)-2), height: Math.min(h, Math.max(...labelRows)+2) - Math.max(0, Math.min(...labelRows)-2) } : null;

    // B adaptive-ish threshold: local mean in tiles
    const tile=32; const thrImgBuf=Buffer.alloc(w*h);
    for(let ty=0; ty<h; ty+=tile){ for(let tx=0; tx<w; tx+=tile){ let sum=0,count=0; for(let y=ty;y<Math.min(h,ty+tile);y++){ for(let x=tx;x<Math.min(w,tx+tile);x++){ sum += data[(y*w+x)*info.channels]; count++; } } const mean = Math.round(sum/count); for(let y=ty;y<Math.min(h,ty+tile);y++){ for(let x=tx;x<Math.min(w,tx+tile);x++){ const v = data[(y*w+x)*info.channels]; thrImgBuf[y*w+x] = v < mean-10 ? 0:255; } } } }
    const thrBufObj = { data: thrImgBuf, info:{width:w,height:h,channels:1} };
    await sharp(Buffer.from(thrImgBuf), { raw:{ width:w, height:h, channels:1 } }).png().toFile(path.join(fieldOut,'B_grayscale_adaptive_threshold.png'));

    // C remove long horizontal lines
    const horizRemoved = await removeHorizontalLines(rawInfo, 0.6, 4);
    await sharp(horizRemoved.data, {raw:{width:w,height:h,channels:1}}).png().toFile(path.join(fieldOut,'C_no_horizontal.png'));

    // D remove long vertical lines
    const vertRemoved = await removeVerticalLines(rawInfo, 0.6, 4);
    await sharp(vertRemoved.data, {raw:{width:w,height:h,channels:1}}).png().toFile(path.join(fieldOut,'D_no_vertical.png'));

    // E connected-component filtering targeting printed small components
    const bin = toBin(data,info,160).bin; const binObj = {bin,w,h}; const comps = floodComponents(bin,w,h);
    // heuristics: remove comps inside labelRegion or small height<=8 and area<400 and aspect ratio >1.2 (wide) or <0.4 (tall thin)
    const compsToRemove = comps.filter(c=>{
      if(labelRegion && c.y >= labelRegion.y-2 && c.y + c.height <= (labelRegion.y + (labelRegion.height||0)+2)) return true;
      if(c.height <=8 && c.area < 400 && (c.width / c.height > 1.2 || c.width / c.height < 0.4)) return true;
      return false;
    });
    const binAfterE = maskComponents(bin,w,h,compsToRemove);
    const bufE = Buffer.alloc(w*h); for(let i=0;i<w*h;i++) bufE[i]= binAfterE[i]?0:255; await sharp(Buffer.from(bufE),{raw:{width:w,height:h,channels:1}}).png().toFile(path.join(fieldOut,'E_cc_filtered.png'));

    // F line removal + connected-component filtering (apply horiz then cc remove)
    const horizThen = await removeHorizontalLines(rawInfo,0.6,4);
    const bobj = toBin(horizThen.data,horizThen.info,160); const comps2 = floodComponents(bobj.bin,w,h);
    const compsToRemove2 = comps2.filter(c=> c.height<=8 && c.area<400);
    const binF = maskComponents(bobj.bin,w,h,compsToRemove2);
    const bufF = Buffer.alloc(w*h); for(let i=0;i<w*h;i++) bufF[i]= binF[i]?0:255; await sharp(Buffer.from(bufF),{raw:{width:w,height:h,channels:1}}).png().toFile(path.join(fieldOut,'F_line_cc.png'));

    // G connected-component filtering + light threshold (apply E then light thresholding)
    const lightThreshBuf = Buffer.alloc(w*h);
    for(let i=0;i<w*h;i++){ const v = binAfterE[i]?0:255; lightThreshBuf[i]= v < 180 ? 0:255; }
    await sharp(Buffer.from(lightThreshBuf),{raw:{width:w,height:h,channels:1}}).png().toFile(path.join(fieldOut,'G_cc_light_threshold.png'));

    // Now OCR each variant
    const variants = [ ['A_original.png','A_original.png'], ['B_grayscale_adaptive_threshold.png','B_grayscale_adaptive_threshold.png'], ['C_no_horizontal.png','C_no_horizontal.png'], ['D_no_vertical.png','D_no_vertical.png'], ['E_cc_filtered.png','E_cc_filtered.png'], ['F_line_cc.png','F_line_cc.png'], ['G_cc_light_threshold.png','G_cc_light_threshold.png'] ];
    const results=[];
    for(const [fname,rel] of variants){ const p=path.join(fieldOut,fname); if(!fs.existsSync(p)){ results.push({preprocessing:fname, error:'missing file'}); continue; } const buf=fs.readFileSync(p); const ocr=await ocrBuffer(buf);
      // handwriting preserved check
      let handwritingPreserved=true; if(inkBbox){ const afterRaw = await sharp(buf).grayscale().raw().toBuffer({resolveWithObject:true}); const afterCount = computeDarkCount(afterRaw, inkBbox); handwritingPreserved = beforeInkCount ? afterCount >= beforeInkCount * 0.7 : true; }
      // label reduced: compare dark count in labelRegion
      let labelReduced=null; if(labelRegion){ const beforeLabelCount = (()=>{ let c=0; for(let y=labelRegion.y;y<Math.min(h,labelRegion.y+labelRegion.height);y++){ for(let x=0;x<w;x++){ if(data[(y*w+x)*info.channels]<200) c++; } } return c; })(); const afterRaw2 = await sharp(buf).grayscale().raw().toBuffer({resolveWithObject:true}); const afterLabelCount = (()=>{ let c=0; for(let y=labelRegion.y;y<Math.min(h,labelRegion.y+labelRegion.height);y++){ for(let x=0;x<w;x++){ if(afterRaw2.data[(y*w+x)*afterRaw2.info.channels]<200) c++; } } return c; })(); labelReduced = beforeLabelCount===0 ? null : (afterLabelCount <= beforeLabelCount*0.3);
      const expectedRecovered = ((ocr.text||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase().indexOf((expected[f]||'').toUpperCase())>=0);
      const pass = Boolean(expectedRecovered && handwritingPreserved && labelReduced);
      results.push({ field:f, preprocessing: fname.replace('.png',''), ocr_text: ocr.text, confidence: ocr.confidence, handwriting_preserved: handwritingPreserved, label_reduced: labelReduced, expected_recovered: expectedRecovered, pass }); }

    rec.variants = results; report.push(rec);
  }
  const outPath = path.join(outRoot,'calibration-v15-report.json'); fs.writeFileSync(outPath, JSON.stringify(report,null,2)); console.log('Wrote', outPath);
}

run().catch(e=>{ console.error(e); process.exit(1); });
}
}
