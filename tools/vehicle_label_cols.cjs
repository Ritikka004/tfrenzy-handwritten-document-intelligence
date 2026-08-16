const sharp = require('sharp');
const path = require('path');
const f = path.join(process.cwd(),'backend','debug-crops','calibration-v11','crops','vehicle_number_v11_c0.png');
(async ()=>{
  const labelTop = 2, labelBottom = 7;
  const obj = await sharp(f).grayscale().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = obj; const w = info.width, h = info.height, c = info.channels;
  const colCounts = new Array(w).fill(0);
  for (let y=labelTop;y<=labelBottom;y++){ for (let x=0;x<w;x++){ if (data[(y*w + x)*c] < 200) colCounts[x]++; } }
  const cols = [];
  for (let x=0;x<w;x++) if (colCounts[x] > 0) cols.push(x);
  console.log('label cols range:', cols[0], cols[cols.length-1], 'count', cols.length);
})();
