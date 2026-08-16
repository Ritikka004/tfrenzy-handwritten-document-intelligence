const sharp = require('sharp');
const path = require('path');
const files = [
  path.join(process.cwd(),'backend','debug-crops','calibration-v11','crops','vehicle_number_v11_c0.png'),
  path.join(process.cwd(),'backend','debug-crops','calibration-v11','crops','badge_quantity_v11_c2.png')
];
(async ()=>{
  for (const f of files){
    try{ const m = await sharp(f).metadata(); console.log(f, m.width, m.height); }catch(e){ console.error('err',f,e.message); }
  }
})();
