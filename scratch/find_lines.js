import sharp from 'sharp';
import path from 'path';

const imgPath = path.join(process.cwd(), 'backend', 'uploads', '1786252087700-9f4620e5-75e5-48f2-9b0c-91c48f435370.png');

async function findHorizontalLines() {
  const { data, info } = await sharp(imgPath)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;

  console.log(`Image: ${width}x${height}`);

  // Calculate average dark pixel ratio per horizontal line between x=100 and x=1400
  const rowDarkness = [];
  for (let y = 0; y < height; y++) {
    let darkCount = 0;
    for (let x = 100; x < 1400; x++) {
      const idx = y * width + x;
      if (data[idx] < 100) darkCount++;
    }
    const ratio = darkCount / (1400 - 100);
    rowDarkness.push({ y, ratio });
  }

  // Find peaks (lines)
  const lines = rowDarkness.filter(r => r.ratio > 0.20);
  console.log("Horizontal line y-coordinates (pixels & percentages):");
  lines.forEach(l => {
    console.log(`y=${l.y}px (${((l.y / height) * 100).toFixed(2)}%) - darkRatio=${(l.ratio * 100).toFixed(1)}%`);
  });
}

findHorizontalLines().catch(console.error);
