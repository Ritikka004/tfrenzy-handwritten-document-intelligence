import React, { useState } from 'react';
import { FileCode, Database, Layers, Server, Cpu, CheckCircle2, Copy, Terminal } from 'lucide-react';

export const SystemArchitectureView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'database' | 'api' | 'jetson'>('architecture');

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-md">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <FileCode className="w-6 h-6 text-blue-400" />
          <span>Phase 1 Architecture, Database Schema & API Specifications</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Complete engineering reference documentation covering OCR pipeline design, PostgreSQL 18-table relational DDL, OpenAPI endpoint definitions, and Jetson ONNX setup.
        </p>

        {/* Tab Buttons */}
        <div className="flex space-x-2 mt-6 border-b border-slate-800 pb-2">
          {[
            { id: 'architecture', label: '1. Software Architecture & Flow' },
            { id: 'database', label: '2. Database Schema (18 Tables)' },
            { id: 'api', label: '3. REST API OpenAPI Specs' },
            { id: 'jetson', label: '4. Jetson & Docker Deployment' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === t.id
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Architecture */}
      {activeTab === 'architecture' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
          <h2 className="text-sm font-bold text-slate-200">End-to-End Handwritten Processing Pipeline</h2>
          <pre className="bg-slate-950 p-4 rounded-lg font-mono text-[11px] text-blue-300 leading-relaxed overflow-x-auto border border-slate-800">
{`DOCUMENT UPLOAD / CAMERA CAPTURE
       │
       ▼
IMAGE QUALITY GATEKEEPER  ──[Blur < 100 or Dark < 40]──► REJECT / RECAPTURE REQUEST
       │
       ▼
PREPROCESSING & CLAHE (Deskew, Perspective Warp, Line Separation)
       │
       ▼
DOCUMENT & FIELD REGION DETECTION (Template Boundary BBox Match)
       │
       ▼
REPLACEABLE HYBRID OCR SERVICE LAYER (IOCRService Interface)
  ├── Tier 1: Fast Edge Model (PaddleOCR PP-v6 / ONNX)
  └── Tier 2: Deep Vision Transformer (TrOCR) if Confidence < 0.75
       │
       ▼
CONFIDENCE SCORING & RULE-BASED DATA TYPE VALIDATION
  ├── Name: Alphabetic check
  ├── Phone: 10-12 Numerical Digits
  ├── Date: YYYY-MM-DD / Valid Calendar
  ├── Vehicle: Reg Pattern (e.g. KA01AB1234)
  └── Employee ID: Regex Match (EMP-XXXX)
       │
       ▼
HUMAN-IN-THE-LOOP VERIFICATION WORKSPACE
  ├── High Confidence (>= 0.85): Auto Accept
  ├── Medium Confidence (0.65 - 0.84): Highlight for Fast Review
  └── Low Confidence (< 0.65) / Rule Fail: Mandatory Manual Correction
       │
       ▼
AUDIT-SAFE DATABASE PERSISTENCE (Original OCR Preserved, Correction Logged)
       │
       ▼
EXPORT CENTRE (CSV, Excel, JSON, Webhook) & GOLDEN DATASET RETRAINING`}</pre>
        </div>
      )}

      {/* Tab 2: Database */}
      {activeTab === 'database' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
          <h2 className="text-sm font-bold text-slate-200">PostgreSQL DDL Relational Schema (All 18 Required Tables)</h2>
          <p className="text-xs text-slate-400">Located at <code className="text-blue-400 font-mono">/docs/DATABASE_SCHEMA.sql</code></p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs text-slate-300">
            {[
              '1. document_types', '2. document_templates', '3. template_fields', '4. documents',
              '5. document_pages', '6. processing_jobs', '7. detected_regions', '8. ocr_predictions',
              '9. extracted_fields', '10. field_validations', '11. human_corrections', '12. structured_records',
              '13. duplicate_matches', '14. model_versions', '15. dataset_versions', '16. export_jobs',
              '17. users', '18. audit_logs'
            ].map(t => (
              <div key={t} className="p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 font-semibold">
                {t}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: API */}
      {activeTab === 'api' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-3 text-xs text-slate-300">
          <h2 className="text-sm font-bold text-slate-200">Complete REST API Endpoints Specification</h2>
          <div className="space-y-2 font-mono text-[11px]">
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded flex justify-between items-center">
              <div><span className="text-emerald-400 font-bold mr-2">GET</span>/api/dashboard/metrics</div>
              <span className="text-slate-500">Executive dashboard KPIs & accuracy metrics</span>
            </div>
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded flex justify-between items-center">
              <div><span className="text-emerald-400 font-bold mr-2">GET</span>/api/documents</div>
              <span className="text-slate-500">List and filter ingested document records</span>
            </div>
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded flex justify-between items-center">
              <div><span className="text-blue-400 font-bold mr-2">POST</span>/api/documents/upload</div>
              <span className="text-slate-500">Ingest form image & execute OCR pipeline</span>
            </div>
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded flex justify-between items-center">
              <div><span className="text-blue-400 font-bold mr-2">POST</span>/api/verification/correct</div>
              <span className="text-slate-500">Submit human verification field corrections</span>
            </div>
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded flex justify-between items-center">
              <div><span className="text-emerald-400 font-bold mr-2">GET</span>/api/queue</div>
              <span className="text-slate-500">Celery Redis task status queue</span>
            </div>
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded flex justify-between items-center">
              <div><span className="text-blue-400 font-bold mr-2">POST</span>/api/export</div>
              <span className="text-slate-500">Export structured verified data</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Jetson & Docker */}
      {activeTab === 'jetson' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
          <h2 className="text-sm font-bold text-slate-200">Jetson Orin Nano & Docker Startup Commands</h2>
          <pre className="bg-slate-950 p-4 rounded-lg font-mono text-[11px] text-amber-300 leading-relaxed overflow-x-auto border border-slate-800">
{`# 1. Build Multi-stage Container
docker-compose up --build -d

# 2. Convert PyTorch TrOCR Model to ONNX FP16
python3 -m torch.onnx.export --model trocr_v1.3.pt --output trocr_v1.3.onnx

# 3. Generate TensorRT Engine on Jetson Orin Nano
trtexec --onnx=trocr_v1.3.onnx --saveEngine=trocr_v1.3.engine --fp16`}</pre>
        </div>
      )}
    </div>
  );
};
