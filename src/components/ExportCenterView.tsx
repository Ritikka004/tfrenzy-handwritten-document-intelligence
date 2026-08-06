import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileCode, CheckCircle2, Server, RefreshCw } from 'lucide-react';
import { ExportJob } from '../types/index.ts';

export const ExportCenterView: React.FC = () => {
  const [exportHistory, setExportHistory] = useState<ExportJob[]>([]);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleExport = async (format: 'csv' | 'excel' | 'json' | 'api_webhook') => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format })
      });
      const json = await res.json();
      if (json.success) {
        setExportHistory([json.data, ...exportHistory]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-md">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Download className="w-6 h-6 text-blue-400" />
          <span>Verified Data Export & Webhook Integration Centre</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Export verified structured database records to CSV, Excel, JSON payloads, or stream directly via REST Webhooks.
        </p>

        {/* Action Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="p-4 bg-slate-950 border border-slate-800 hover:border-blue-500 rounded-xl text-left transition group"
          >
            <FileSpreadsheet className="w-6 h-6 text-emerald-400 mb-2 group-hover:scale-110 transition" />
            <div className="font-bold text-slate-200 text-xs">Export CSV</div>
            <div className="text-[10px] text-slate-500">Comma-separated values for database import</div>
          </button>

          <button
            onClick={() => handleExport('excel')}
            disabled={isExporting}
            className="p-4 bg-slate-950 border border-slate-800 hover:border-blue-500 rounded-xl text-left transition group"
          >
            <FileSpreadsheet className="w-6 h-6 text-blue-400 mb-2 group-hover:scale-110 transition" />
            <div className="font-bold text-slate-200 text-xs">Export Excel (.xlsx)</div>
            <div className="text-[10px] text-slate-500">Formatted spreadsheet with tabbed fields</div>
          </button>

          <button
            onClick={() => handleExport('json')}
            disabled={isExporting}
            className="p-4 bg-slate-950 border border-slate-800 hover:border-blue-500 rounded-xl text-left transition group"
          >
            <FileCode className="w-6 h-6 text-indigo-400 mb-2 group-hover:scale-110 transition" />
            <div className="font-bold text-slate-200 text-xs">Export JSON Payload</div>
            <div className="text-[10px] text-slate-500">Structured JSON objects with BBox coordinates</div>
          </button>

          <button
            onClick={() => handleExport('api_webhook')}
            disabled={isExporting}
            className="p-4 bg-slate-950 border border-slate-800 hover:border-blue-500 rounded-xl text-left transition group"
          >
            <Server className="w-6 h-6 text-amber-400 mb-2 group-hover:scale-110 transition" />
            <div className="font-bold text-slate-200 text-xs">Trigger REST Webhook</div>
            <div className="text-[10px] text-slate-500">Post verified records to downstream ERP</div>
          </button>
        </div>
      </div>

      {/* Export History */}
      {exportHistory.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Export Job Log</span>
          <div className="space-y-2">
            {exportHistory.map(job => (
              <div key={job.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-200 uppercase">{job.format} Export</span>
                  <p className="text-[10px] text-slate-500">{job.documentCount} Documents Exported | {new Date(job.createdAt).toLocaleTimeString()}</p>
                </div>
                <a
                  href={`data:text/plain;charset=utf-8,TFrenzy Export Sample Data`}
                  download={`export_${job.id}.${job.format}`}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded transition"
                >
                  Download File
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
