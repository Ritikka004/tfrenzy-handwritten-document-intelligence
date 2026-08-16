const sharp = require('sharp');
const fs = require('fs');
(async ()=>{
  try{
    const img='backend/uploads/1786597180539-a5cfa119-c5e6-490b-a665-07027bda302d.png';
    const outDir='backend/tmp-crops/doc-1786597181050/scan';
    if(!fs.existsSync(outDir)) fs.mkdirSync(outDir,{recursive:true});
    for(let top=20; top<=200; top+=10){
      const left=40; const width=600; const height=120;
      await sharp(img).extract({left,top,width,height}).toFile(`${outDir}/scan_top_${top}.png`);
    }
    console.log('done');
  }catch(e){console.error(e)}
})();
