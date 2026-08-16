const fs = require('fs');
const path = require('path');

const baseReportPath = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v5', 'calibration-v5-report.json');
const ocrResultsPath = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v5', 'calibration-v5-ocr-results.json');
const outPath = path.join(process.cwd(), 'backend', 'debug-crops', 'calibration-v5', 'calibration-v5-validation-report.json');

if (!fs.existsSync(baseReportPath)) throw new Error('missing base report');
if (!fs.existsSync(ocrResultsPath)) throw new Error('missing ocr results');

const base = JSON.parse(fs.readFileSync(baseReportPath, 'utf8'));
const ocr = JSON.parse(fs.readFileSync(ocrResultsPath, 'utf8'));

// selection mapping (field -> margin chosen)
const selections = {
  visit_date: 0,
  host_employee_id: 5,
  vehicle_number: 10,
  badge_quantity: 0
};

// visual judgments determined by manual inspection earlier
const visuals = {
  visit_date: { handwriting_complete: true, label_contamination: true, border_contamination: false, clipping: false, excessive_whitespace: false, other_field_ink: false },
  host_employee_id: { handwriting_complete: true, label_contamination: true, border_contamination: false, clipping: false, excessive_whitespace: false, other_field_ink: false },
  vehicle_number: { handwriting_complete: true, label_contamination: true, border_contamination: false, clipping: false, excessive_whitespace: false, other_field_ink: false },
  badge_quantity: { handwriting_complete: true, label_contamination: true, border_contamination: false, clipping: false, excessive_whitespace: false, other_field_ink: false }
};

function findCandidate(fieldObj, margin) {
  return (fieldObj.candidates || []).find(c => c.marginPercent === margin);
}

function findOcr(fieldName) {
  return ocr.find(r => r.field === fieldName) || null;
}

const results = [];

for (const f of base) {
  const field = f.field;
  const margin = selections[field];
  const cand = findCandidate(f, margin);
  const ocrRes = findOcr(field);
  const expected = (ocrRes && ocrRes.expected) || '';
  const ocrText = ocrRes && ocrRes.ocrText ? ocrRes.ocrText : '';
  const ocrConf = ocrRes && typeof ocrRes.rawConfidence !== 'undefined' ? ocrRes.rawConfidence : null;

  const visual = visuals[field] || {};

  const ocrPass = (()=>{
    if (!ocrText) return false;
    const norm = ocrText.replace(/\s+/g,'').toUpperCase();
    const exp = (expected||'').replace(/\s+/g,'').toUpperCase();
    return exp && norm.includes(exp);
  })();

  const visualPass = visual.handwriting_complete && !visual.clipping;

  results.push({
    field,
    selected_candidate: cand ? path.relative(process.cwd(), cand.path) : null,
    x: cand ? cand.x : null,
    y: cand ? cand.y : null,
    width: cand ? cand.width : null,
    height: cand ? cand.height : null,
    handwriting_complete: !!visual.handwriting_complete,
    label_contamination: !!visual.label_contamination,
    border_contamination: !!visual.border_contamination,
    clipping: !!visual.clipping,
    excessive_whitespace: !!visual.excessive_whitespace,
    other_field_ink: !!visual.other_field_ink,
    ocr_text: ocrText,
    ocr_confidence: ocrConf,
    expected_value: expected,
    ocr_pass: ocrPass,
    visual_pass: visualPass
  });
}

fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log('Wrote validation report ->', outPath);
