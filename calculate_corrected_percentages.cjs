/**
 * Calculate Corrected Template Percentages
 * 
 * Based on:
 * - Diagnostic reference image: 1448x1086 pixels
 * - Correct pixel boxes from extract_field_boxes.cjs
 * - These are verified to capture handwritten content, not printed labels
 */

// Correct pixel boxes (from extract_field_boxes.cjs that finds handwriting)
const correctBoxes = {
  visitor_name: { top: 45, bottom: 120, left: 40, right: 720 },
  mobile_number: { top: 45, bottom: 120, left: 720, right: 1410 },
  visit_date: { top: 120, bottom: 220, left: 40, right: 720 },
  host_employee_id: { top: 120, bottom: 220, left: 720, right: 1410 },
  vehicle_number: { top: 220, bottom: 320, left: 40, right: 720 },
  badge_quantity: { top: 220, bottom: 320, left: 720, right: 1410 }
};

// Reference image dimensions
const refWidth = 1448;
const refHeight = 1086;

console.log('='.repeat(80));
console.log('CORRECTED TEMPLATE PERCENTAGES');
console.log('='.repeat(80));
console.log(`\nBased on reference image: ${refWidth}x${refHeight}`);
console.log(`Using correct pixel boxes from extract_field_boxes.cjs\n`);

const corrected = {};

for (const [field, box] of Object.entries(correctBoxes)) {
  const x_percent = (box.left / refWidth) * 100;
  const y_percent = (box.top / refHeight) * 100;
  const width_percent = ((box.right - box.left) / refWidth) * 100;
  const height_percent = ((box.bottom - box.top) / refHeight) * 100;
  
  corrected[field] = {
    x: parseFloat(x_percent.toFixed(2)),
    y: parseFloat(y_percent.toFixed(2)),
    width: parseFloat(width_percent.toFixed(2)),
    height: parseFloat(height_percent.toFixed(2))
  };
  
  console.log(`${field}:`);
  console.log(`  Current (WRONG): x: 3.45, y: 10.31, width: 46.89, height: 6.63`);
  console.log(`  Corrected:       x: ${corrected[field].x}, y: ${corrected[field].y}, width: ${corrected[field].width}, height: ${corrected[field].height}`);
  console.log();
}

console.log('='.repeat(80));
console.log('VERIFICATION: Apply to different image sizes\n');

const testSizes = [
  { name: 'Diagnostic reference', w: 1448, h: 1086 },
  { name: 'Actual uploaded (newer)', w: 1402, h: 1122 },
  { name: 'Template default', w: 1240, h: 1754 }
];

for (const size of testSizes) {
  console.log(`\n${size.name} (${size.w}x${size.h}):`);
  const field = 'visitor_name';
  const bbox = corrected[field];
  
  const pixelX = Math.round((bbox.x / 100) * size.w);
  const pixelY = Math.round((bbox.y / 100) * size.h);
  const pixelW = Math.round((bbox.width / 100) * size.w);
  const pixelH = Math.round((bbox.height / 100) * size.h);
  
  console.log(`  visitor_name: x=${pixelX} y=${pixelY} w=${pixelW} h=${pixelH}`);
  
  if (size.name.includes('Diagnostic')) {
    console.log(`  ✓ Should match correct box: top=45, left=40, w=680, h=75`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('\nJSON for database.ts:\n');

for (const [field, bbox] of Object.entries(corrected)) {
  console.log(`{`);
  console.log(`  fieldKey: '${field}',`);
  console.log(`  boundingBox: { x: ${bbox.x}, y: ${bbox.y}, width: ${bbox.width}, height: ${bbox.height} }`);
  console.log(`},`);
}
