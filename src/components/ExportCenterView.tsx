import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

type ExportFormat = 'csv' | 'excel' | 'json';

type ExportJob = {
  id: string;
  format: string;
  documentCount: number;
  status: string;
  fileUrl: string;
  createdAt: string;
};

export const ExportCenterView: React.FC = () => {
  const [exportHistory, setExportHistory] = useState<ExportJob[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ format })
      });

      if (!response.ok) {
        throw new Error(`Export request failed: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Export failed');
      }

      const job: ExportJob = result.data;

      setExportHistory(prev => [job, ...prev]);

      showToast(
        `Successfully generated ${format.toUpperCase()} export from database records.`
      );
    } catch (error) {
      console.error('Export error:', error);
      showToast('Export failed. Check the server console.');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadUrl = (format: string) => {
    return `/api/export/download/${format}`;
  };

  const formatName = (format: string) => {
    switch (format) {
      case 'csv':
        return 'CSV Data Table';
      case 'excel':
        return 'Excel Spreadsheet';
      case 'json':
        return 'JSON Payload';
      default:
        return format.toUpperCase();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-md">

        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Download className="w-6 h-6 text-blue-400" />
          <span>Verified Data Export &amp; Webhook Integration Centre</span>
        </h1>

        <p className="text-xs text-slate-400 mt-1">
          Export verified structured database records to CSV, Excel, JSON
          payloads, or stream directly via REST Webhooks.
        </p>

        {toastMessage && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-lg flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">

          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="p-4 bg-slate-950 border border-slate-800 hover:border-blue-500 rounded-xl text-left transition group disabled:opacity-50"
          >
            <FileSpreadsheet className="w-6 h-6 text-emerald-400 mb-2 group-hover:scale-110 transition" />

            <div className="font-bold text-slate-200 text-xs">
              Export CSV
            </div>

            <div className="text-[10px] text-slate-500">
              Export real verified database records
            </div>
          </button>

          <button
            onClick={() => handleExport('excel')}
            disabled={isExporting}
            className="p-4 bg-slate-950 border border-slate-800 hover:border-blue-500 rounded-xl text-left transition group disabled:opacity-50"
          >
            <FileSpreadsheet className="w-6 h-6 text-blue-400 mb-2 group-hover:scale-110 transition" />

            <div className="font-bold text-slate-200 text-xs">
              Export Excel (.xlsx)
            </div>

            <div className="text-[10px] text-slate-500">
              Export database records as spreadsheet
            </div>
          </button>

          <button
            onClick={() => handleExport('json')}
            disabled={isExporting}
            className="p-4 bg-slate-950 border border-slate-800 hover:border-blue-500 rounded-xl text-left transition group disabled:opacity-50"
          >
            <FileCode className="w-6 h-6 text-indigo-400 mb-2 group-hover:scale-110 transition" />

            <div className="font-bold text-slate-200 text-xs">
              Export JSON Payload
            </div>

            <div className="text-[10px] text-slate-500">
              Export structured database records
            </div>
          </button>

        </div>

        {isExporting && (
          <div className="mt-4 flex items-center space-x-2 text-xs text-blue-400 font-semibold">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Generating export from database...</span>
          </div>
        )}
      </div>

      {exportHistory.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">

          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Export Job Log
          </span>

          <div className="space-y-2">

            {exportHistory.map(job => (
              <div
                key={job.id}
                className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
              >

                <div>
                  <span className="font-bold text-slate-200 uppercase">
                    {formatName(job.format)}
                  </span>

                  <p className="text-[10px] text-slate-500">
                    {job.documentCount} Documents Exported |{' '}
                    {new Date(job.createdAt).toLocaleTimeString()}
                  </p>
                </div>

                <a
                  href={downloadUrl(job.format)}
                  download
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
