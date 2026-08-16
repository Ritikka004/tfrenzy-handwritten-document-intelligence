const sharp = require('sharp');
const path = require('path');
const f = path.join(process.cwd(),'backend','debug-crops','calibration-v11','crops','vehicle_number_v11_c0.png');
(async ()=>{
  const obj = await sharp(f).grayscale().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = obj; const w = info.width, h = info.height, c = info.channels;
  for (let y=0;y<Math.min(60,h);y++){
    let s=0; for (let x=0;x<w;x++){ if (data[(y*w + x)*c] < 200) s++; }
    console.log(y, s);
  }
})();
