const Tesseract = require('tesseract.js');
(async ()=>{
  const worker = await Tesseract.createWorker();
  console.log('worker keys:', Object.keys(worker));
  console.log('has reinitialize:', typeof worker.reinitialize);
  console.log('has load:', typeof worker.load);
  console.log('has loadLanguage:', typeof worker.loadLanguage);
  try{ await worker.terminate(); }catch(e){}
})();
