const fs=require('fs');
const path=require('path');
(async()=>{
  const repo=process.cwd();
  const dbPath=path.join(repo,'backend','db','database.ts');
  const tmpDir=path.join(repo,'backend','tmp-crops','doc-1786597181050');
  const debugDir=path.join(repo,'backend','debug-crops','doc-1786600437660');
  const imgW=1448, imgH=1086; // known for doc-1786597181050

  const db=fs.readFileSync(dbPath,'utf8');
  // extract visitorFields block
  const visitorBlockMatch=db.match(/const visitorFields:[\s\S]*?\];/m);
  if(!visitorBlockMatch){console.error('visitorFields block not found'); process.exit(1)}
  const block=visitorBlockMatch[0];
  // find each fieldKey and boundingBox
  const fieldRegex=/fieldKey:\s*'([a-z_]+)'[\s\S]*?boundingBox:\s*\{\s*x:\s*([0-9.]+),\s*y:\s*([0-9.]+),\s*width:\s*([0-9.]+),\s*height:\s*([0-9.]+)\s*\}/g;
  const current={};
  let m; while((m=fieldRegex.exec(block))!==null){ current[m[1]]={x:parseFloat(m[2]),y:parseFloat(m[3]),width:parseFloat(m[4]),height:parseFloat(m[5])} }

  const fieldBoxes=JSON.parse(fs.readFileSync(path.join(tmpDir,'field_boxes.json')));
  const detected=JSON.parse(fs.readFileSync(path.join(tmpDir,'detected_field_boxes.json')));

  const fields=['visitor_name','mobile_number','visit_date','host_employee_id','vehicle_number','badge_quantity'];
  const rows=[];
  for(const f of fields){
    const cur=current[f];
    const calcPx={
      x: Math.round(cur.x/100*imgW),
      y: Math.round(cur.y/100*imgH),
      w: Math.round(cur.width/100*imgW),
      h: Math.round(cur.height/100*imgH)
    };
    const det=detected[f];
    // propose pixel bbox: include handwriting plus small margins, avoid label above
    // set top margin conservatively to 8 px or 10% of detected height whichever smaller
    const topMargin=Math.min(12, Math.max(6, Math.round(det.boxH*0.15)));
    const bottomMargin=Math.min(16, Math.max(8, Math.round(det.boxH*0.25)));
    let propX=Math.max(0, det.minX - 8);
    let propY=Math.max(0, det.minY - topMargin);
    let propW=Math.min(imgW - propX, det.boxW + 16);
    let propH=Math.min(imgH - propY, det.boxH + topMargin + bottomMargin);
    // ensure not including label: if propY < det.minY - (det.boxH*0.5) then clamp to det.minY - Math.floor(det.boxH*0.2)
    if(propY < det.minY - Math.floor(det.boxH*0.5)) propY = Math.max(det.minY - Math.floor(det.boxH*0.2),0);
    const propPercent={
      x: +(propX/imgW*100).toFixed(2),
      y: +(propY/imgH*100).toFixed(2),
      width: +(propW/imgW*100).toFixed(2),
      height: +(propH/imgH*100).toFixed(2)
    };
    rows.push({field:f,current:cur,calcPx,detected:det,proposedPx:{x:propX,y:propY,w:propW,h:propH},proposedPercent:propPercent});
  }
  console.log(JSON.stringify(rows,null,2));
  // Also list debug crops for latest doc
  if(fs.existsSync(debugDir)){
    const files=fs.readdirSync(debugDir);
    console.log('\nLatest debug-crops files for doc-1786600437660:');
    files.forEach(f=>console.log(' -',f));
  } else console.log('\nNo debug crops for doc-1786600437660 found');
})();
