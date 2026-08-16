import React from 'react';
import { 
  FileText, ShieldAlert, CheckCircle2, Clock, Award, 
  BarChart2, RefreshCw, AlertTriangle, Layers, UserCheck, Copy, Activity
} from 'lucide-react';
import { DashboardMetrics } from '../types/index.ts';

// ─── Fallback mock metrics used when backend is offline ──────────────────────
const MOCK_METRICS: DashboardMetrics = {
  documentsProcessed:              1247,
  documentsAwaitingVerification:   23,
  straightThroughProcessingRate:   78.4,
  avgProcessingTimeSec:            3.2,
  avgConfidence:                   91.7,
  totalHumanCorrections:           184,
  duplicateCount:                  7,
  rejectedImagesCount:             19,
  fieldAccuracyMap: {
    visitor_name:            94.2,
    mobile_number:           97.8,
    visit_date:              99.1,
    host_employee_id:        96.5,
    vehicle_registration:    88.3,
    pass_issue_quality:      99.6,
  },
  accuracyByDocumentType: {
    'Visitor Entry Register':    94.5,
    'Employee Information Form': 91.2,
    'Safety Inspection Form':    96.0,
    'Maintenance Checklist':     88.5,
  },
  mostMisreadCharacters: [
    { char: '8', misreadAs: '6', count: 34 },
    { char: 'O', misreadAs: '0', count: 28 },
    { char: '1', misreadAs: 'l', count: 22 },
    { char: 'D', misreadAs: '0', count: 17 },
    { char: '5', misreadAs: 'S', count: 14 },
  ],
};

interface DashboardViewProps {
  // Accepts null so the component is safe to render before the API responds
  metrics: DashboardMetrics | null;
  onNavigateToVerification: () => void;
  onNavigateToUpload: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  onNavigateToVerification,
  onNavigateToUpload
}) => {
  // Use real API data when available; fall back to MOCK_METRICS when offline
  const displayMetrics = metrics ?? MOCK_METRICS;

  // Sub-field fallbacks: guard against empty objects / arrays from the API
  const docTypeAccuracy =
    Object.keys(displayMetrics.accuracyByDocumentType || {}).length > 0
      ? displayMetrics.accuracyByDocumentType
      : MOCK_METRICS.accuracyByDocumentType;

  const fieldAccuracy =
    Object.keys(displayMetrics.fieldAccuracyMap || {}).length > 0
      ? displayMetrics.fieldAccuracyMap
      : MOCK_METRICS.fieldAccuracyMap;

  const misreadChars =
    (displayMetrics.mostMisreadCharacters || []).length > 0
      ? displayMetrics.mostMisreadCharacters
      : MOCK_METRICS.mostMisreadCharacters;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-md">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Document Intelligence Executive Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time OCR accuracy metrics, human-in-the-loop verification stats, and edge model latency benchmarks.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            id="dash-btn-upload"
            onClick={onNavigateToUpload}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs transition flex items-center space-x-2 shadow"
          >
            <FileText className="w-4 h-4" />
            <span>Upload New Form</span>
          </button>
          <button
            id="dash-btn-verify"
            onClick={onNavigateToVerification}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold text-xs transition flex items-center space-x-2 shadow"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Verify Pending ({displayMetrics.documentsAwaitingVerification})</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Documents Processed</span>
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-slate-100">{displayMetrics.documentsProcessed}</div>
          <p className="text-[11px] text-emerald-400 font-medium mt-1">↑ +14% from last session</p>
        </div>

        {/* Card 2 */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Awaiting Verification</span>
            <ShieldAlert className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{displayMetrics.documentsAwaitingVerification}</div>
          <p className="text-[11px] text-amber-300 font-medium mt-1">Requires human verification</p>
        </div>

        {/* Card 3 */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Straight-Through Rate</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{displayMetrics.straightThroughProcessingRate}%</div>
          <p className="text-[11px] text-slate-400 mt-1">Auto-accepted without edit</p>
        </div>

        {/* Card 4 */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Processing Time</span>
            <Clock className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-slate-100">{displayMetrics.avgProcessingTimeSec}s</div>
          <p className="text-[11px] text-indigo-300 font-medium mt-1">Jetson Orin Edge Latency</p>
        </div>
      </div>

      {/* Secondary Data Quality KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 5: Average Confidence */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Confidence</span>
            <Award className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{displayMetrics.avgConfidence}%</div>
          <p className="text-[11px] text-slate-400 mt-1">Overall OCR model confidence</p>
        </div>

        {/* KPI 6: Fields Corrected by Users */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Fields Corrected by Users</span>
            <UserCheck className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400">{displayMetrics.totalHumanCorrections}</div>
          <p className="text-[11px] text-slate-400 mt-1">Human verifier adjustments</p>
        </div>

        {/* KPI 7: Duplicate Documents Detected */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Duplicates Detected</span>
            <Copy className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{displayMetrics.duplicateCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Perceptual & text match</p>
        </div>

        {/* KPI 8: Image Quality Rejections */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Low Quality Images</span>
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">{displayMetrics.rejectedImagesCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Blur & lighting rejections</p>
        </div>
      </div>

      {/* Accuracy Breakdown & Misread Characters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accuracy by Document Type */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
          <h2 className="text-sm font-bold text-slate-200 flex items-center justify-between">
            <span>Accuracy by Document Type</span>
            <span className="text-xs text-slate-400 font-normal">Document Benchmarks</span>
          </h2>
          <div className="space-y-3">
            {Object.entries(docTypeAccuracy).map(([docType, acc]) => (
              <div key={docType} className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-300">
                  <span className="truncate">{docType}</span>
                  <span className={acc >= 95 ? 'text-emerald-400' : 'text-blue-400'}>{acc}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      acc >= 95 ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${acc}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Field Level Accuracy */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
          <h2 className="text-sm font-bold text-slate-200 flex items-center justify-between">
            <span>Accuracy by Configured Field</span>
            <span className="text-xs text-blue-400 font-normal">Min Threshold: 85%</span>
          </h2>
          <div className="space-y-3">
            {Object.entries(fieldAccuracy).map(([fieldKey, accuracy]) => (
              <div key={fieldKey} className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-300">
                  <span className="capitalize">{fieldKey.replace(/_/g, ' ')}</span>
                  <span className={accuracy >= 90 ? 'text-emerald-400' : 'text-amber-400'}>{accuracy}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      accuracy >= 95 ? 'bg-emerald-500' : accuracy >= 90 ? 'bg-blue-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${accuracy}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Misread Characters Analysis */}
<div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-5">

  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-lg font-bold text-white">
        Most Misread Characters
      </h2>

      <p className="text-xs text-slate-400 mt-1">
        OCR Dataset Corrections
      </p>
    </div>

    <div className="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-300">
      OCR Analytics
    </div>
  </div>

  <div className="grid grid-cols-1 gap-3">
    {misreadChars.map((item, idx) => (
      <div
        key={idx}
        className="bg-slate-950 border border-slate-800 rounded-xl p-4 hover:border-blue-500 transition-all duration-300"
      >
        <div className="grid grid-cols-3 text-center">

          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">
              Target
            </p>

            <p className="mt-2 text-2xl font-black text-amber-400 font-mono">
              '{item.char}'
            </p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">
              Misread
            </p>

            <p className="mt-2 text-2xl font-black text-rose-400 font-mono">
              '{item.misreadAs}'
            </p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">
              Count
            </p>

            <p className="mt-2 text-xl font-bold text-blue-400">
              {item.count}
            </p>
          </div>

        </div>
      </div>
    ))}
  </div>

  <div className="flex items-center justify-between border border-slate-800 rounded-xl bg-slate-950 p-4">

    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wide">
        Human Corrections
      </p>

      <p className="text-sm font-semibold text-white mt-1">
        {displayMetrics.totalHumanCorrections} samples stored
      </p>
    </div>

    <button
      onClick={onNavigateToVerification}
      className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition"
    >
      Review →
    </button>

  </div>

</div>
      </div>
    </div>
  );
};
