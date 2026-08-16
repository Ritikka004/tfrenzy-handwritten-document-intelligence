const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = process.cwd();
const auditDir = path.join(root, 'backend', 'debug-crops', 'final-bbox-audit');
fs.mkdirSync(auditDir, { recursive: true });

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function extractDatabasePercentBox(sourceText, fieldKey) {
  const regex = new RegExp(`fieldKey: '${fieldKey}'[\\s\\S]*?boundingBox: \\{ x: ([0-9.]+), y: ([0-9.]+), width: ([0-9.]+), height: ([0-9.]+) \\}`);
  const match = sourceText.match(regex);
  if (!match) throw new Error(`Could not find bbox for ${fieldKey}`);
  return {
    x: parseFloat(match[1]),
    y: parseFloat(match[2]),
    width: parseFloat(match[3]),
    height: parseFloat(match[4])
  };
}

function percentBoxToPixels(box, width, height) {
  return {
    x: Math.round(box.x / 100 * width),
    y: Math.round(box.y / 100 * height),
    width: Math.round(box.width / 100 * width),
    height: Math.round(box.height / 100 * height)
  };
}

function boxToRect(box) {
  return {
    left: box.x,
    top: box.y,
    right: box.x + box.width,
    bottom: box.y + box.height
  };
}

function boxesIntersect(a, b) {
  const rectA = boxToRect(a);
  const rectB = boxToRect(b);
  const overlapWidth = Math.max(0, Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left));
  const overlapHeight = Math.max(0, Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top));
  return overlapWidth * overlapHeight;
}

function boxContains(a, b) {
  const rectA = boxToRect(a);
  const rectB = boxToRect(b);
  return rectB.left >= rectA.left && rectB.top >= rectA.top && rectB.right <= rectA.right && rectB.bottom <= rectA.bottom;
}

function createOverlaySvg(width, height, boxes, labels) {
  const rects = boxes.map((box, idx) => {
    const color = ['#ff4d4f', '#1890ff', '#52c41a'][idx] || '#fadb14';
    const label = labels[idx] || `box${idx + 1}`;
    return `
      <rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="none" stroke="${color}" stroke-width="4" stroke-dasharray="12,8" />
      <rect x="${box.x + 2}" y="${box.y + 2}" width="${Math.max(0, box.width - 4)}" height="${Math.max(0, box.height - 4)}" fill="none" stroke="${color}" stroke-width="2" />
      <rect x="${Math.max(2, box.x + 2)}" y="${Math.max(2, box.y + 2)}" width="${Math.max(0, Math.min(box.width, 140) - 4)}" height="18" fill="${color}" opacity="0.9" />
      <text x="${Math.max(6, box.x + 6)}" y="${Math.max(16, box.y + 16)}" fill="white" font-family="Arial" font-size="14">${label}</text>
    `;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="none" />
    ${rects}
  </svg>`;
}

async function writeOverlayImage(sourceImagePath, outputPath, boxes, labels) {
  const meta = await sharp(sourceImagePath).metadata();
  const svg = createOverlaySvg(meta.width, meta.height, boxes, labels);
  const svgBuffer = Buffer.from(svg);
  const overlayBuffer = await sharp(svgBuffer).png().toBuffer();
  await sharp(sourceImagePath)
    .composite([{ input: overlayBuffer, blend: 'over' }])
    .png()
    .toFile(outputPath);
}

async function main() {
  const databaseText = fs.readFileSync(path.join(root, 'backend', 'db', 'database.ts'), 'utf8');
  const validationReport = readJson(path.join(root, 'backend', 'debug-crops', 'final-bbox-validation-report.json'));
  const calibrationV5Report = readJson(path.join(root, 'backend', 'debug-crops', 'calibration-v5', 'calibration-v5-report.json'));
  const calibrationV7Report = readJson(path.join(root, 'backend', 'debug-crops', 'calibration-v7', 'calibration-v7-bbox-report.json'));

  const sourcePath = path.join(root, 'backend', 'debug-crops', 'test_row2_full.png');
  const sourceMeta = await sharp(sourcePath).metadata();
  const sourceDimensions = { width: sourceMeta.width, height: sourceMeta.height };

  const fields = [
    {
      field: 'visit_date',
      proposed: { x: 25, y: 39, width: 539, height: 101 },
      calibration: calibrationV5Report.find(item => item.field === 'visit_date')?.inkBbox || calibrationV7Report.find(item => item.field === 'visit_date')?.candidate === 'tight' ? null : null,
      label: 'Date of Visit'
    },
    {
      field: 'host_employee_id',
      proposed: { x: 685, y: 32, width: 451, height: 108 },
      calibration: calibrationV5Report.find(item => item.field === 'host_employee_id')?.inkBbox || null,
      label: 'Host Employee ID'
    }
  ];

  const auditEntries = [];

  for (const entry of fields) {
    const currentPercentBox = extractDatabasePercentBox(databaseText, entry.field);
    const currentPixels = percentBoxToPixels(currentPercentBox, sourceDimensions.width, sourceDimensions.height);
    const proposedPixels = entry.proposed;
    const handwritingRegion = (entry.field === 'visit_date')
      ? { x: 77, y: 42, width: 435, height: 98 }
      : { x: 729, y: 35, width: 363, height: 105 };
    const proposedContainsHandwriting = boxContains(proposedPixels, handwritingRegion);
    const currentContainsHandwriting = boxContains(currentPixels, handwritingRegion);
    const validationEntry = validationReport.find(item => item.field === entry.field && item.document === 'test_row2_full.png');
    const ocrText = validationEntry?.ocr_output || '';
    const labelContamination = /Date of Visit|Host Employee ID|Visitor Full Name|Vehicle Registration No.|Passes Issued Quantity/i.test(ocrText);
    const coordinateMappingCorrect = currentContainsHandwriting && currentPixels.height >= 40;

    const imageName = `${entry.field}_bbox_audit.png`;
    await writeOverlayImage(
      sourcePath,
      path.join(auditDir, imageName),
      [
        { x: currentPixels.x, y: currentPixels.y, width: currentPixels.width, height: currentPixels.height },
        { x: proposedPixels.x, y: proposedPixels.y, width: proposedPixels.width, height: proposedPixels.height },
        { x: handwritingRegion.x, y: handwritingRegion.y, width: handwritingRegion.width, height: handwritingRegion.height }
      ],
      ['current bbox', 'proposed bbox', 'handwriting region']
    );

    auditEntries.push({
      field: entry.field,
      source_image: 'backend/debug-crops/test_row2_full.png',
      source_dimensions: sourceDimensions,
      database_bbox_percent: currentPercentBox,
      current_bbox_pixels: currentPixels,
      proposed_bbox_pixels: proposedPixels,
      handwriting_region_pixels: handwritingRegion,
      handwriting_inside_current_bbox: currentContainsHandwriting,
      handwriting_inside_proposed_bbox: proposedContainsHandwriting,
      crop_contains_printed_label: labelContamination,
      coordinate_mapping_correct: coordinateMappingCorrect,
      ocr_result_from_proposed_crop: ocrText,
      root_cause: coordinateMappingCorrect ? 'bbox design is acceptable' : 'the percentage bbox from database.ts does not scale correctly to the actual row-strip source image and the proposed validation crop still includes label text'
    });
  }

  const auditJson = {
    generated_at: new Date().toISOString(),
    source_images_used: ['backend/debug-crops/test_row2_full.png'],
    fields: auditEntries,
    recommendation: 'A) coordinate mapping is wrong and should be fixed'
  };

  fs.writeFileSync(path.join(auditDir, 'final-bbox-coordinate-audit.json'), JSON.stringify(auditJson, null, 2));
  console.log('Wrote', path.join(auditDir, 'final-bbox-coordinate-audit.json'));
  console.log(JSON.stringify(auditJson, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
