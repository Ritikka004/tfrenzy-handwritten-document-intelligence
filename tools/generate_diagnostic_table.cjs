const fs=require('fs');
const sharp=require('sharp');
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
    const rawMeta=fs.existsSync(rawPath)?await sharp(rawPath).metadata():null;
    const ocrMeta=fs.existsSync(ocrPath)?await sharp(ocrPath).metadata():null;
    rows.push({field:f,calc,detected,rawPath,ocrPath,rawMeta,ocrMeta});
  }
  console.log(JSON.stringify(rows,null,2));
})();
