#!/usr/bin/env node

/**
 * Coordinate System Analysis
 * Traces the flow of bounding boxes through different coordinate systems
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function analyzeCoordinates() {
  console.log('='.repeat(80));
  console.log('COORDINATE SYSTEM ANALYSIS');
  console.log('='.repeat(80));

  // Step 1: Check template definitions in database.ts
  console.log('\n1. TEMPLATE DEFINITIONS (from database.ts)');
  console.log('-'.repeat(80));
  
  const templatePercents = {
    visitor_name: { x: 3.45, y: 10.31, width: 46.89, height: 6.63 },
    mobile_number: { x: 49.17, y: 10.31, width: 48.83, height: 6.63 },
    visit_date: { x: 3.38, y: 14.83, width: 29.42, height: 7.83 },
    host_employee_id: { x: 50.14, y: 14.83, width: 47.86, height: 7.83 },
    vehicle_number: { x: 3.31, y: 20.17, width: 30.59, height: 9.02 },
    badge_quantity: { x: 50.14, y: 20.17, width: 47.86, height: 9.02 }
  };

  for (const [field, bbox] of Object.entries(templatePercents)) {
    console.log(`${field}: x=${bbox.x}% y=${bbox.y}% w=${bbox.width}% h=${bbox.height}%`);
  }

  // Step 2: Check tool definitions
  console.log('\n2. TOOL DEFINITIONS - extract_field_boxes.cjs (CORRECT)');
  console.log('-'.repeat(80));
  
  const correctBoxes = {
    visitor_name: { top: 45, bottom: 120, left: 40, right: 720 },
    mobile_number: { top: 45, bottom: 120, left: 720, right: 1410 },
    visit_date: { top: 120, bottom: 220, left: 40, right: 720 },
    host_employee_id: { top: 120, bottom: 220, left: 720, right: 1410 },
    vehicle_number: { top: 220, bottom: 320, left: 40, right: 720 },
    badge_quantity: { top: 220, bottom: 320, left: 720, right: 1410 }
  };

  for (const [field, box] of Object.entries(correctBoxes)) {
    const w = box.right - box.left;
    const h = box.bottom - box.top;
    console.log(`${field}: top=${box.top} bottom=${box.bottom} left=${box.left} right=${box.right} => w=${w} h=${h}`);
  }

  console.log('\n3. TOOL DEFINITIONS - detect_fields.cjs (WRONG - captures labels)');
  console.log('-'.repeat(80));
  
  const wrongBoxes = {
    visitor_name: { top: 120, bottom: 170, left: 40, right: 720 },
    mobile_number: { top: 120, bottom: 170, left: 720, right: 1410 },
    visit_date: { top: 170, bottom: 230, left: 40, right: 720 },
    host_employee_id: { top: 170, bottom: 230, left: 720, right: 1410 },
    vehicle_number: { top: 230, bottom: 300, left: 40, right: 720 },
    badge_quantity: { top: 230, bottom: 300, left: 720, right: 1410 }
  };

  for (const [field, box] of Object.entries(wrongBoxes)) {
    const w = box.right - box.left;
    const h = box.bottom - box.top;
    console.log(`${field}: top=${box.top} bottom=${box.bottom} left=${box.left} right=${box.right} => w=${w} h=${h}`);
  }

  // Step 3: Check actual detected boxes
  console.log('\n4. ACTUAL DETECTED BOXES - field_boxes.json (from extract_field_boxes)');
  console.log('-'.repeat(80));
  
  try {
    const fbPath = path.join(__dirname, 'backend/tmp-crops/doc-1786597181050/field_boxes.json');
    if (fs.existsSync(fbPath)) {
      const fb = JSON.parse(fs.readFileSync(fbPath, 'utf8'));
      for (const [field, box] of Object.entries(fb)) {
        console.log(`${field}: minX=${box.minX} minY=${box.minY} boxW=${box.boxW} boxH=${box.boxH}`);
      }
    } else {
      console.log('(field_boxes.json not found)');
    }
  } catch (e) {
    console.log('Error reading field_boxes.json:', e.message);
  }

  console.log('\n5. ACTUALLY DETECTED BOXES - detected_field_boxes.json (from server cropping)');
  console.log('-'.repeat(80));
  
  try {
    const dfPath = path.join(__dirname, 'backend/tmp-crops/doc-1786597181050/detected_field_boxes.json');
    if (fs.existsSync(dfPath)) {
      const df = JSON.parse(fs.readFileSync(dfPath, 'utf8'));
      for (const [field, box] of Object.entries(df)) {
        console.log(`${field}: minX=${box.minX} minY=${box.minY} boxW=${box.boxW} boxH=${box.boxH}`);
      }
    } else {
      console.log('(detected_field_boxes.json not found)');
    }
  } catch (e) {
    console.log('Error reading detected_field_boxes.json:', e.message);
  }

  // Step 4: Reverse-engineer image dimensions
  console.log('\n6. REVERSE-ENGINEER IMAGE DIMENSIONS');
  console.log('-'.repeat(80));
  
  // Using the wrong detected boxes and template percentages, deduce what image dimensions were used
  const wrongDetected = {
    visitor_name: { minY: 120, boxH: 51 }
  };
  
  // If template y=10.31% and detected minY=120, what is the image height?
  const templateY = 10.31;
  const detectedMinY = 120;
  
  // Formula: detectedMinY = (templateY / 100) * imageHeight
  // imageHeight = detectedMinY / (templateY / 100)
  const deducedHeight = detectedMinY / (templateY / 100);
  console.log(`Using visitor_name wrong detection (minY=${detectedMinY}) and template (y=${templateY}%)`);
  console.log(`Deduced image height: ${Math.round(deducedHeight)}`);
  console.log(`(If these match, template percentages are applied to this height)`);

  // Do the same for X
  const templateX = 3.45;
  const templateW = 46.89;
  const wrongDetectedW = 663;
  
  const deducedWidth = wrongDetectedW / (templateW / 100);
  console.log(`\nUsing visitor_name template (x=${templateX}% w=${templateW}%) and wrong detected (w=${wrongDetectedW})`);
  console.log(`Deduced image width: ${Math.round(deducedWidth)}`);

  // Step 5: Check for actual image dimensions
  console.log('\n7. ACTUAL UPLOADED IMAGE DIMENSIONS');
  console.log('-'.repeat(80));
  
  try {
    const uploadsDir = path.join(__dirname, 'backend/uploads');
    const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.png'));
    
    if (files.length > 0) {
      // Check the most recent few
      for (const file of files.slice(0, 3)) {
        const filePath = path.join(uploadsDir, file);
        try {
          const metadata = await sharp(filePath).metadata();
          console.log(`${file}`);
          console.log(`  Width: ${metadata.width}, Height: ${metadata.height}`);
        } catch (e) {
          console.log(`${file}: Error reading metadata`);
        }
      }
    }
  } catch (e) {
    console.log('Error checking uploaded images:', e.message);
  }

  // Step 6: Compute what the template percentages SHOULD be
  console.log('\n8. CORRECTED TEMPLATE PERCENTAGES (based on correct tool definitions)');
  console.log('-'.repeat(80));
  console.log('Assuming image is 1410 x 320 pixels (based on tool definitions)\n');
  
  // From correctBoxes - these are the CORRECT pixel ranges
  const assumedWidth = 1410;
  const assumedHeight = 320;
  
  for (const [field, box] of Object.entries(correctBoxes)) {
    const x_percent = (box.left / assumedWidth) * 100;
    const y_percent = (box.top / assumedHeight) * 100;
    const w_percent = ((box.right - box.left) / assumedWidth) * 100;
    const h_percent = ((box.bottom - box.top) / assumedHeight) * 100;
    
    console.log(`${field}: x=${x_percent.toFixed(2)}% y=${y_percent.toFixed(2)}% w=${w_percent.toFixed(2)}% h=${h_percent.toFixed(2)}%`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('KEY FINDINGS:');
  console.log('='.repeat(80));
  console.log('1. Template percentages in database.ts produce WRONG crops');
  console.log('2. These percentages match the detect_fields.cjs (wrong) definitions');
  console.log('3. The correct boxes are defined in extract_field_boxes.cjs');
  console.log('4. There appears to be a coordinate SPACE mismatch');
  console.log('5. Need to identify: what image dimensions are actually used in server.ts?');
  console.log('6. Need to trace: getImageDimensions() -> what value does it return?');
  console.log('='.repeat(80));
}

analyzeCoordinates().catch(console.error);
