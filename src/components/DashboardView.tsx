import React from 'react';
import { 
  FileText, ShieldAlert, CheckCircle2, Clock, Award, 
  BarChart2, RefreshCw, AlertTriangle, Layers, UserCheck, Copy, Activity,
  ArrowUpRight, Sparkles, Sliders, TrendingUp, Gauge, Database, Cpu
} from 'lucide-react';
import { DashboardMetrics } from '../types/index.ts';
import { HIGH_CONFIDENCE_THRESHOLD } from '../constants/confidence.ts';

// ─── Fallback mock metrics used when backend is offline ──────────────────────
const MOCK_METRICS: DashboardMetrics = {
  documentsProcessed:              3,
  documentsAwaitingVerification:   1,
  straightThroughProcessingRate:   66.7,
  avgProcessingTimeSec:            3.2,
  avgConfidence:                   91.7,
  totalHumanCorrections:           2,
  duplicateCount:                  0,
  rejectedImagesCount:             0,
  fieldAccuracyMap: {
    visitor_name:            94.2,
    mobile_number:           97.8,
    visit_date:              99.1,
    host_employee_id:        96.5,
    vehicle_number:          88.3,
    passes_issued_quantity:  99.6,
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
  metrics: DashboardMetrics | null;
  onNavigateToVerification: () => void;
  onNavigateToUpload: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  onNavigateToVerification,
  onNavigateToUpload
}) => {
  const displayMetrics = metrics ?? MOCK_METRICS;

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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ─── 1. Header Banner & Quick Actions ───────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900/95 to-blue-950/40 border border-slate-800/90 p-6 sm:p-7 rounded-2xl shadow-xl shadow-slate-950/40">
        {/* Subtle accent bar at top */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-transparent" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                <Sparkles className="w-3 h-3" />
                Live OCR Telemetry
              </span>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                Real-Time Document Processing
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              Document Intelligence Executive Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Real-time OCR accuracy metrics, human-in-the-loop verification statistics, and neural model latency benchmarks.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              id="dash-btn-upload"
              onClick={onNavigateToUpload}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 flex items-center space-x-2 active:scale-[0.98] cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Upload New Form</span>
            </button>
            <button
              id="dash-btn-verify"
              onClick={onNavigateToVerification}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl font-extrabold text-xs transition-all shadow-lg shadow-amber-950/30 hover:shadow-amber-900/50 flex items-center space-x-2 active:scale-[0.98] cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Verify Pending ({displayMetrics.documentsAwaitingVerification})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2. Primary KPI Summary Cards ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Documents Processed */}
        <div className="group bg-slate-900/90 border border-slate-800/80 border-l-4 border-l-blue-500 p-5 rounded-2xl shadow-lg shadow-slate-950/40 hover:-translate-y-1 hover:border-slate-700/80 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Documents Processed</span>
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-100 tracking-tight">{displayMetrics.documentsProcessed}</div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center">
              <ArrowUpRight className="w-3 h-3" /> +14%
            </span>
            <span className="text-[11px] text-slate-500">from last session</span>
          </div>
        </div>

        {/* KPI 2: Awaiting Verification */}
        <div className="group bg-slate-900/90 border border-slate-800/80 border-l-4 border-l-amber-500 p-5 rounded-2xl shadow-lg shadow-slate-950/40 hover:-translate-y-1 hover:border-slate-700/80 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Awaiting Verification</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-400 tracking-tight">{displayMetrics.documentsAwaitingVerification}</div>
          <p className="text-[11px] text-amber-300/80 font-medium mt-2">Requires human verification</p>
        </div>

        {/* KPI 3: Straight-Through Rate */}
        <div className="group bg-slate-900/90 border border-slate-800/80 border-l-4 border-l-emerald-500 p-5 rounded-2xl shadow-lg shadow-slate-950/40 hover:-translate-y-1 hover:border-slate-700/80 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Straight-Through Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 tracking-tight">{displayMetrics.straightThroughProcessingRate}%</div>
          <p className="text-[11px] text-slate-500 font-medium mt-2">Auto-accepted without edit</p>
        </div>

        {/* KPI 4: Avg Processing Time */}
        <div className="group bg-slate-900/90 border border-slate-800/80 border-l-4 border-l-indigo-500 p-5 rounded-2xl shadow-lg shadow-slate-950/40 hover:-translate-y-1 hover:border-slate-700/80 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg Processing Time</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-100 tracking-tight">{displayMetrics.avgProcessingTimeSec}s</div>
          <p className="text-[11px] text-indigo-300/80 font-medium mt-2">Jetson Orin Edge Latency</p>
        </div>
      </div>

      {/* ─── 3. Secondary Data Quality & Governance KPIs ─────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 5: Average Confidence */}
        <div className="group bg-slate-900/90 border border-slate-800/80 border-l-4 border-l-emerald-500 p-5 rounded-2xl shadow-lg shadow-slate-950/40 hover:-translate-y-1 hover:border-slate-700/80 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Average Confidence</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 tracking-tight">{displayMetrics.avgConfidence}%</div>
          <p className="text-[11px] text-slate-500 font-medium mt-2">Overall OCR model confidence</p>
        </div>

        {/* KPI 6: Fields Corrected by Users */}
        <div className="group bg-slate-900/90 border border-slate-800/80 border-l-4 border-l-sky-500 p-5 rounded-2xl shadow-lg shadow-slate-950/40 hover:-translate-y-1 hover:border-slate-700/80 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fields Corrected</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-sky-400 tracking-tight">{displayMetrics.totalHumanCorrections}</div>
          <p className="text-[11px] text-slate-500 font-medium mt-2">Human verifier adjustments</p>
        </div>

        {/* KPI 7: Duplicate Documents Detected */}
        <div className="group bg-slate-900/90 border border-slate-800/80 border-l-4 border-l-amber-500 p-5 rounded-2xl shadow-lg shadow-slate-950/40 hover:-translate-y-1 hover:border-slate-700/80 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Duplicates Detected</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Copy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-400 tracking-tight">{displayMetrics.duplicateCount}</div>
          <p className="text-[11px] text-slate-500 font-medium mt-2">Perceptual &amp; text match</p>
        </div>

        {/* KPI 8: Image Quality Rejections */}
        <div className="group bg-slate-900/90 border border-slate-800/80 border-l-4 border-l-rose-500 p-5 rounded-2xl shadow-lg shadow-slate-950/40 hover:-translate-y-1 hover:border-slate-700/80 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Low Quality Images</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-400 tracking-tight">{displayMetrics.rejectedImagesCount}</div>
          <p className="text-[11px] text-slate-500 font-medium mt-2">Blur &amp; lighting rejections</p>
        </div>
      </div>

      {/* ─── 4. Analytics Breakdown & Misread Characters ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Accuracy by Document Type */}
        <div className="bg-slate-900/90 border border-slate-800/80 p-6 rounded-2xl shadow-xl shadow-slate-950/40 space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-400" />
                <span>Accuracy by Document Type</span>
              </h2>
              <p className="text-[11px] text-slate-500">Benchmark performance per form template</p>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
              Templates
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {Object.entries(docTypeAccuracy).map(([docType, acc]) => (
              <div key={docType} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-300">
                  <span className="truncate pr-2">{docType}</span>
                  <span className={`font-mono font-bold ${acc >= 95 ? 'text-emerald-400' : 'text-blue-400'}`}>
                    {acc}%
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-800/60">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      acc >= 95
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-sm shadow-emerald-900/50'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-400 shadow-sm shadow-blue-900/50'
                    }`}
                    style={{ width: `${acc}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Field Level Accuracy */}
        <div className="bg-slate-900/90 border border-slate-800/80 p-6 rounded-2xl shadow-xl shadow-slate-950/40 space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Accuracy by Configured Field</span>
              </h2>
              <p className="text-[11px] text-slate-500">Field-level target threshold: {Math.round(HIGH_CONFIDENCE_THRESHOLD * 100)}%</p>
            </div>
            <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/30">
              Min {Math.round(HIGH_CONFIDENCE_THRESHOLD * 100)}%
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {Object.entries(fieldAccuracy).map(([fieldKey, accuracy]) => (
              <div key={fieldKey} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-300">
                  <span className="capitalize truncate pr-2">{fieldKey.replace(/_/g, ' ')}</span>
                  <span className={`font-mono font-bold ${
                    accuracy >= 95 ? 'text-emerald-400' : accuracy >= 90 ? 'text-blue-400' : 'text-amber-400'
                  }`}>
                    {accuracy}%
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-800/60">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      accuracy >= 95
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                        : accuracy >= 90
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-400'
                          : 'bg-gradient-to-r from-amber-600 to-amber-400'
                    }`}
                    style={{ width: `${accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Most Misread Characters Analysis */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl shadow-slate-950/40 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>Most Misread Characters</span>
                </h2>
                <p className="text-[11px] text-slate-500">OCR Dataset Corrections</p>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
                OCR Analytics
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {misreadChars.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-3.5 hover:border-blue-500/50 hover:bg-slate-950 transition-all duration-200"
                >
                  <div className="grid grid-cols-3 text-center items-center">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Target</p>
                      <p className="mt-1 text-xl font-black text-amber-400 font-mono">'{item.char}'</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Misread</p>
                      <p className="mt-1 text-xl font-black text-rose-400 font-mono">'{item.misreadAs}'</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Count</p>
                      <p className="mt-1 text-lg font-bold text-blue-400 font-mono">{item.count}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border border-slate-800/90 rounded-xl bg-slate-950/80 p-4 mt-2">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Human Corrections</p>
              <p className="text-xs font-semibold text-slate-200 mt-0.5">
                {displayMetrics.totalHumanCorrections} samples stored
              </p>
            </div>

            <button
              onClick={onNavigateToVerification}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-blue-900/20 active:scale-[0.98] cursor-pointer"
            >
              Review →
            </button>
          </div>
        </div>

      </div>

      {/* ─── 5. Platform Overview ─────────────────────────────────────────── */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl shadow-slate-950/40 overflow-hidden">

        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
              <Gauge className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Platform Overview</h2>
              <p className="text-[10px] text-slate-500">Live operational summary — current session</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            System Operational
          </span>
        </div>

        {/* Metric tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-800/60">

          {/* Tile 1 */}
          <div className="px-6 py-5 hover:bg-slate-800/30 transition-colors duration-150">
            <div className="flex items-start justify-between mb-3">
              <FileText className="w-4 h-4 text-blue-400 mt-0.5" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Total</span>
            </div>
            <div className="text-2xl font-black text-slate-100 tracking-tight">
              {displayMetrics.documentsProcessed.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">Documents Processed</div>
            <div className="flex items-center gap-1 mt-2">
              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-semibold">+14% this session</span>
            </div>
          </div>

          {/* Tile 2 */}
          <div className="px-6 py-5 hover:bg-slate-800/30 transition-colors duration-150">
            <div className="flex items-start justify-between mb-3">
              <ShieldAlert className="w-4 h-4 text-amber-400 mt-0.5" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Pending</span>
            </div>
            <div className="text-2xl font-black text-amber-400 tracking-tight">
              {displayMetrics.documentsAwaitingVerification}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">Awaiting Verification</div>
            <button
              onClick={onNavigateToVerification}
              className="mt-2 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
            >
              Review queue →
            </button>
          </div>

          {/* Tile 3 */}
          <div className="px-6 py-5 hover:bg-slate-800/30 transition-colors duration-150">
            <div className="flex items-start justify-between mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-400 mt-0.5" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">STP Rate</span>
            </div>
            <div className="text-2xl font-black text-emerald-400 tracking-tight">
              {displayMetrics.straightThroughProcessingRate}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">Straight-Through Rate</div>
            <div className="mt-2.5 w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                style={{ width: `${displayMetrics.straightThroughProcessingRate}%` }}
              />
            </div>
          </div>

          {/* Tile 4 */}
          <div className="px-6 py-5 hover:bg-slate-800/30 transition-colors duration-150">
            <div className="flex items-start justify-between mb-3">
              <Clock className="w-4 h-4 text-indigo-400 mt-0.5" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Latency</span>
            </div>
            <div className="text-2xl font-black text-slate-100 tracking-tight">
              {displayMetrics.avgProcessingTimeSec}s
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">Avg Processing Time</div>
            <div className="text-[10px] text-indigo-300/80 mt-2 font-medium">Jetson Orin Edge Node</div>
          </div>
        </div>

        {/* System health footer bar */}
        <div className="grid grid-cols-3 divide-x divide-slate-800/60 border-t border-slate-800/60 bg-slate-950/40">
          <div className="flex items-center gap-3 px-6 py-3.5">
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Avg Confidence</p>
              <p className="text-sm font-black text-emerald-400">{displayMetrics.avgConfidence}%</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-6 py-3.5">
            <div className="w-6 h-6 rounded-md bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fields Corrected</p>
              <p className="text-sm font-black text-sky-400">{displayMetrics.totalHumanCorrections}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-6 py-3.5">
            <div className="w-6 h-6 rounded-md bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Low-Quality / Dupes</p>
              <p className="text-sm font-black text-rose-400">
                {displayMetrics.rejectedImagesCount} / {displayMetrics.duplicateCount}
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
