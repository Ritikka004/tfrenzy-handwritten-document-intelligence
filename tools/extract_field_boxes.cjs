const sharp = require('sharp');
const fs = require('fs');
(async ()=>{
  try{
    const img = 'backend/uploads/1786597180539-a5cfa119-c5e6-490b-a665-07027bda302d.png';
    const {data, info} = await sharp(img).grayscale().raw().toBuffer({resolveWithObject:true});
    const w = info.width, h = info.height;
    const fieldsDef = {
      visitor_name:{top:45,bottom:120,left:40,right:720},
      mobile_number:{top:45,bottom:120,left:720,right:1410},
      visit_date:{top:120,bottom:220,left:40,right:720},
      host_employee_id:{top:120,bottom:220,left:720,right:1410},
      vehicle_number:{top:220,bottom:320,left:40,right:720},
      badge_quantity:{top:220,bottom:320,left:720,right:1410}
    };
    const results = {};
    const outDir = 'backend/tmp-crops/doc-1786597181050';
    if(!fs.existsSync(outDir)) fs.mkdirSync(outDir,{recursive:true});
    for(const k of Object.keys(fieldsDef)){
      const r = fieldsDef[k];
      let minX = r.right, maxX = r.left, minY = r.bottom, maxY = r.top;
      for(let y=r.top;y<=r.bottom;y++){
        for(let x=r.left;x<=r.right;x++){
          if(data[y*w+x] < 160){
            if(x < minX) minX = x;
            if(x > maxX) maxX = x;
            if(y < minY) minY = y;
            if(y > maxY) maxY = y;
          }
        }
      }
      if(maxX > 0){
        const boxW = maxX - minX + 1;
        const boxH = maxY - minY + 1;
        results[k] = {minX, minY, boxW, boxH};
        try{
          await sharp(img).extract({left:minX,top:minY,width:boxW,height:boxH}).toFile(`${outDir}/calc_${k}.png`);
        }catch(e){ console.error('extract error',k,e.message); }
      } else {
        results[k] = {found:false};
      }
    }
    fs.writeFileSync(`${outDir}/field_boxes.json`, JSON.stringify(results, null, 2));
    console.log('done');
  }catch(e){console.error(e)}
})();
