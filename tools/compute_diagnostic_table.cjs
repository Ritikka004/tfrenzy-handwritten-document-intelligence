const fs=require('fs');
(async()=>{
  const doc='doc-1786597181050';
  const base='backend/tmp-crops/'+doc;
  const debug='backend/debug-crops/'+doc;
  const fb=JSON.parse(fs.readFileSync(base+'/field_boxes.json'));
  const det=JSON.parse(fs.readFileSync(base+'/detected_field_boxes.json'));
  const fields=Object.keys(fb);
  const rows=[];
  for(const f of fields){
    const calc={x:fb[f].minX,y:fb[f].minY,w:fb[f].boxW,h:fb[f].boxH};
    const detected=det[f]||{found:false};
    const rawPath=debug+'/'+f+'.png';
    const ocrPath=debug+'/'+f+'_ocr_input.png';
    const rawMeta=fs.existsSync(rawPath)?await require('sharp')(rawPath).metadata():null;
    const ocrMeta=fs.existsSync(ocrPath)?await require('sharp')(ocrPath).metadata():null;
    const deltas = detected.found===false ? null : {
      dx: (detected.minX - calc.x),
      dy: (detected.minY - calc.y),
      dw: (detected.boxW - calc.w),
      dh: (detected.boxH - calc.h)
    };
    rows.push({field:f,calc,detected,rawSize: rawMeta?{w:rawMeta.width,h:rawMeta.height}:null,ocrSize: ocrMeta?{w:ocrMeta.width,h:ocrMeta.height}:null,deltas});
  }
  console.log('Field, calc(x,y,w,h), detected(minX,minY,boxW,boxH), delta(dx,dy,dw,dh), rawSize(wxh), ocrSize(wxh)');
  for(const r of rows){
    console.log(`${r.field}, (${r.calc.x},${r.calc.y},${r.calc.w},${r.calc.h}), (${r.detected.minX},${r.detected.minY},${r.detected.boxW},${r.detected.boxH}), ${r.deltas?`(${r.deltas.dx},${r.deltas.dy},${r.deltas.dw},${r.deltas.dh})`:'(no-detected)'}, ${r.rawSize?w(r.rawSize):'missing'}, ${r.ocrSize?w(r.ocrSize):'missing'}`);
  }
  function w(s){return `${s.w}x${s.h}`}
})();
