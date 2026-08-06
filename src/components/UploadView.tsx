import React, { useState } from 'react';
import { 
  Upload, Camera, CheckCircle2, AlertTriangle, RefreshCw, FileText, ArrowRight 
} from 'lucide-react';
import { DocumentType, Document } from '../types/index.ts';

interface UploadViewProps {
  documentTypes: DocumentType[];
  onUploadSuccess: (doc: Document) => void;
  onNavigateToQueue: () => void;
}

export const UploadView: React.FC<UploadViewProps> = ({
  documentTypes,
  onUploadSuccess,
  onNavigateToQueue
}) => {
  const [selectedTypeId, setSelectedTypeId] = useState<string>(documentTypes[0]?.id || 'dt-visitor');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<Document | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const handleSimulatedUpload = async (fileName: string) => {
    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('documentTypeId', selectedTypeId);
      formData.append('fileName', fileName);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentTypeId: selectedTypeId,
          fileName
        })
      });

      const json = await res.json();
      if (json.success) {
        setUploadResult(json.data.document);
        onUploadSuccess(json.data.document);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-md">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          Document Ingestion & Image Quality Gatekeeper
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Upload handwritten form images or capture via camera. Automated OpenCV checks evaluate blur, brightness, contrast, and deskew angle.
        </p>

        {/* Form Type Selector */}
        <div className="mt-6 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Select Document Category / Template
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {documentTypes.map((dt) => (
              <button
                key={dt.id}
                onClick={() => setSelectedTypeId(dt.id)}
                className={`p-3 rounded-lg border text-left text-xs transition-all ${
                  selectedTypeId === dt.id
                    ? 'border-blue-500 bg-blue-950/40 text-blue-300 font-bold'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="font-semibold text-slate-200">{dt.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{dt.code}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleSimulatedUpload(e.dataTransfer.files[0].name);
            }
          }}
          className={`mt-6 border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            dragActive
              ? 'border-blue-500 bg-blue-950/20'
              : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
          }`}
        >
          {isUploading ? (
            <div className="py-8 space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-200">Processing Image Quality & Running OCR Pipeline...</p>
              <p className="text-[11px] text-slate-500">Checking Laplacian variance blur score & CLAHE contrast</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-blue-400">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">Drag & drop handwritten document here</p>
                <p className="text-xs text-slate-500 mt-1">Supports PNG, JPG, JPEG, TIFF or PDF up to 15MB</p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  id="btn-upload-sample-1"
                  onClick={() => handleSimulatedUpload('visitor_register_gate2_sample.png')}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition"
                >
                  Upload Visitor Register
                </button>
                <button
                  id="btn-upload-sample-2"
                  onClick={() => handleSimulatedUpload('safety_inspection_sheet_aug2026.jpg')}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg border border-slate-700 transition"
                >
                  Upload Safety Inspection
                </button>
                <button
                  id="btn-camera-capture"
                  onClick={() => handleSimulatedUpload('camera_capture_live_frame.png')}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition flex items-center space-x-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Simulate Camera Capture</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Result Feedback */}
      {uploadResult && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Ingestion & Preprocessing Complete</span>
            </h2>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
              uploadResult.status === 'verification_required'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {uploadResult.status.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-lg text-xs">
            <div>
              <span className="text-slate-500">File Name:</span>
              <p className="font-semibold text-slate-200">{uploadResult.fileName}</p>
            </div>
            <div>
              <span className="text-slate-500">Laplacian Blur Score:</span>
              <p className="font-semibold text-emerald-400">{uploadResult.imageQuality.blurScore} (Acceptable)</p>
            </div>
            <div>
              <span className="text-slate-500">Overall Confidence:</span>
              <p className="font-semibold text-amber-400">{(uploadResult.overallConfidence * 100).toFixed(1)}%</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onNavigateToQueue}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg transition flex items-center space-x-1"
            >
              <span>View In Processing Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
