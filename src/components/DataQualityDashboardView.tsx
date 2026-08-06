import React, { useState, useEffect } from 'react';
import {
  BarChart2, ShieldAlert, CheckCircle2, AlertTriangle, Copy, FileText,
  UserCheck, Award, Zap, RefreshCw, Eye, Sparkles, Filter, HelpCircle
} from 'lucide-react';
import { DashboardMetrics, Document } from '../types/index.ts';

interface DataQualityDashboardViewProps {
  metrics: DashboardMetrics;
  documents?: Document[];
  onNavigateToVerification?: () => void;
}

export const DataQualityDashboardView: React.FC<DataQualityDashboardViewProps> = ({
  metrics,
  documents = [],
  onNavigateToVerification
}) => {
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const fetchDuplicates = async () => {
    try {
      const res = await fetch('/api/duplicates');
      const json = await res.json();
      if (json.success) {
        setDuplicateMatches(json.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const docTypeAccuracy = metrics.accuracyByDocumentType || {
    'Visitor Entry Register': 94.5,
    'Employee Information Form': 91.2,
    'Safety Inspection Form': 96.0,
    'Maintenance Checklist': 88.5
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Quality Analytics
            </span>
            <span className="text-xs text-slate-400">TFrenzy Data Health & Accuracy Suite</span>
          </div>
          <h1 className="text-xl font-bold text-slate-100 mt-1 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-blue-400" />
            <span>Data Quality & OCR Validation Intelligence</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            In-depth audit of document OCR accuracy, user corrections, document-type benchmarks, image degradation flags, and duplicate detection logs.
          </p>
        </div>

        {onNavigateToVerification && (
          <button
            onClick={onNavigateToVerification}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition flex items-center space-x-2 shadow self-start md:self-auto"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Review Flagged Fields</span>
          </button>
        )}
      </div>

      {/* Primary Data Quality KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Average Confidence */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Average OCR Confidence</span>
            <Award className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">{metrics.avgConfidence}%</div>
          <p className="text-[11px] text-slate-400 mt-1">Cascading PaddleOCR + TrOCR average</p>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${metrics.avgConfidence}%` }}></div>
          </div>
        </div>

        {/* KPI 2: Fields Corrected by Users */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Fields Corrected by Users</span>
            <UserCheck className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-blue-400">{metrics.totalHumanCorrections}</div>
          <p className="text-[11px] text-slate-400 mt-1">Human-in-the-loop retrained samples</p>
          <p className="text-[10px] text-blue-300 font-semibold mt-2">100% stored for model fine-tuning</p>
        </div>

        {/* KPI 3: Duplicate Documents Detected */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Duplicates Detected</span>
            <Copy className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400">{metrics.duplicateCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Perceptual hash & text match</p>
          <p className="text-[10px] text-amber-300 font-semibold mt-2">Flagged for deduplication</p>
        </div>

        {/* KPI 4: Straight Through Processing (STP) Rate */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Straight-Through Rate</span>
            <CheckCircle2 className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-indigo-400">{metrics.straightThroughProcessingRate}%</div>
          <p className="text-[11px] text-slate-400 mt-1">Auto-verified without human edit</p>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${metrics.straightThroughProcessingRate}%` }}></div>
          </div>
        </div>
      </div>

      {/* Accuracy Breakdown by Document Type & Field Level */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accuracy by Document Type */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Accuracy by Document Type</span>
            </h2>
            <span className="text-xs text-slate-400 font-normal">Target Benchmark: &gt;90%</span>
          </div>

          <div className="space-y-4">
            {Object.entries(docTypeAccuracy).map(([docTypeName, acc]) => (
              <div key={docTypeName} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-200">
                  <span>{docTypeName}</span>
                  <span className={acc >= 95 ? 'text-emerald-400' : acc >= 90 ? 'text-blue-400' : 'text-amber-400'}>
                    {acc}% Accuracy
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2.5 p-0.5 border border-slate-800">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      acc >= 95 ? 'bg-emerald-500' : acc >= 90 ? 'bg-blue-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${acc}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Lowest performing template: <strong>Maintenance Checklist (88.5%)</strong></span>
            <span className="text-[11px] text-amber-400 font-semibold">Requires Retraining</span>
          </div>
        </div>

        {/* Accuracy by Field */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Field-Level Extraction Precision</span>
            </h2>
            <span className="text-xs text-slate-400 font-normal">Validation Rules Active</span>
          </div>

          <div className="space-y-3">
            {Object.entries(metrics.fieldAccuracyMap).map(([fieldKey, acc]) => (
              <div key={fieldKey} className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-300">
                  <span className="capitalize font-mono text-slate-300">{fieldKey.replace(/_/g, ' ')}</span>
                  <span className={acc >= 95 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {acc}%
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      acc >= 95 ? 'bg-emerald-500' : acc >= 90 ? 'bg-blue-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${acc}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Duplicate Document Detection Log & Image Degradation Defect Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Duplicate Document Log */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Copy className="w-4 h-4 text-amber-400" />
              <span>Duplicate Document Detection Audit</span>
            </h2>
            <span className="text-xs text-slate-400 font-normal">{duplicateMatches.length} Recorded Match(es)</span>
          </div>

          {duplicateMatches.length > 0 ? (
            <div className="space-y-3">
              {duplicateMatches.map((dup) => (
                <div key={dup.id} className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-200">Doc: {dup.documentName || dup.documentId}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {Math.round((dup.similarityScore || 0.94) * 100)}% Similarity
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Matches existing document: <strong className="text-indigo-300">{dup.matchedDocumentName || dup.matchedDocumentId}</strong>
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Match Reason: {dup.matchReason || 'Perceptual Hash & Matching Field Values'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400 text-center">
              No duplicate documents flagged in current processing queue.
            </div>
          )}
        </div>

        {/* Misread Character Matrix */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Handwritten Character Degradation Matrix</span>
            </h2>
            <span className="text-xs text-slate-400 font-normal">Common Misread Patterns</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {metrics.mostMisreadCharacters.map((item, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-800 p-3.5 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Ground Truth</span>
                  <p className="text-xl font-black text-amber-400 font-mono">'{item.char}'</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">OCR Output</span>
                  <p className="text-xl font-black text-rose-400 font-mono">'{item.misreadAs}'</p>
                </div>
                <div className="text-right border-l border-slate-800 pl-3">
                  <span className="text-[10px] text-slate-500 block">Frequency</span>
                  <p className="text-xs font-bold text-slate-300">{item.count} times</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 flex items-center justify-between">
            <span>Images rejected due to severe blur/lighting: <strong>{metrics.rejectedImagesCount} documents</strong></span>
            <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-bold">
              Low Contrast
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
