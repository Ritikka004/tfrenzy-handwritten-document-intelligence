const sharp = require('sharp');
const path = require('path');
const f = path.join(process.cwd(),'backend','debug-crops','calibration-v11','crops','badge_quantity_v11_c2.png');
(async ()=>{
  const top=38,bottom=41;
  const obj = await sharp(f).grayscale().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = obj; const w = info.width, h = info.height, c = info.channels;
  const cols=[];
  for (let x=0;x<w;x++){ let s=0; for (let y=top;y<=bottom;y++){ if (data[(y*w + x)*c] < 200) s++; } if (s>0) cols.push(x); }
  console.log('cols range', cols[0], cols[cols.length-1], 'count', cols.length);
})();
