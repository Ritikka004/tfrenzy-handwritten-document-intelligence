const fs=require('fs');
const sharp=require('sharp');
(async()=>{
  const doc='doc-1786597181050';
  const base='backend/tmp-crops/'+doc;
  const debug='backend/debug-crops/'+doc;
  const imgPath='backend/uploads/1786597180539-a5cfa119-c5e6-490b-a665-07027bda302d.png';
  const fb=JSON.parse(fs.readFileSync(base+'/field_boxes.json'));
  const det=JSON.parse(fs.readFileSync(base+'/detected_field_boxes.json'));
  const img=sharp(imgPath);
  const meta=await img.metadata();
  const W=meta.width,H=meta.height;
  // Build SVG overlay
  let svg=`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`;
  const colors = {calc:'#ff0000',det:'#00ff00'};
  let idx=0;
  for(const k of Object.keys(fb)){
    const c=fb[k];
    const d=det[k];
    // calc box (red)
    svg += `<rect x="${c.minX}" y="${c.minY}" width="${c.boxW}" height="${c.boxH}" fill="none" stroke="${colors.calc}" stroke-width="4" />`;
    svg += `<text x="${c.minX+4}" y="${Math.max(12,c.minY+14)}" font-size="18" fill="${colors.calc}">${k} (calc)</text>`;
    if(d && d.minX!=null){
      svg += `<rect x="${d.minX}" y="${d.minY}" width="${d.boxW}" height="${d.boxH}" fill="none" stroke="${colors.det}" stroke-width="4" />`;
      svg += `<text x="${d.minX+4}" y="${Math.max(12,d.minY+14)}" font-size="18" fill="${colors.det}">${k} (det)</text>`;
    }
    idx++;
  }
  svg += `</svg>`;
  const outPath=debug+'/bbox-comparison.png';
  if(!fs.existsSync(debug))fs.mkdirSync(debug,{recursive:true});
  const buffer = await img.composite([{ input: Buffer.from(svg), blend: 'over' }]).toBuffer();
  fs.writeFileSync(outPath, buffer);
  console.log('Wrote', outPath);
})();
