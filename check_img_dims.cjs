const sharp = require('sharp');

sharp('backend/uploads/1786597180539-a5cfa119-c5e6-490b-a665-07027bda302d.png')
  .metadata()
  .then(m => {
    console.log(`Width: ${m.width}`);
    console.log(`Height: ${m.height}`);
  })
  .catch(e => console.error('Error:', e.message));
