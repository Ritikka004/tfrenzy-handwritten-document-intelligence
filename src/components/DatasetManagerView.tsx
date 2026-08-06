import React, { useState } from 'react';
import { Database, Download, Plus, CheckCircle2, RefreshCw, FileCode } from 'lucide-react';
import { DatasetVersion } from '../types/index.ts';

interface DatasetManagerViewProps {
  datasets: DatasetVersion[];
}

export const DatasetManagerView: React.FC<DatasetManagerViewProps> = ({ datasets }) => {
  const [datasetList, setDatasetList] = useState<DatasetVersion[]>(datasets);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleGenerateNewDataset = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/datasets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'TFrenzy Model Refinement Dataset' })
      });
      const json = await res.json();
      if (json.success) {
        setDatasetList([json.data, ...datasetList]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Database className="w-6 h-6 text-emerald-400" />
            <span>AI/ML Golden Training Dataset Manager</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Compile human corrections into COCO / JSONL training datasets for PyTorch TrOCR & PaddleOCR fine-tuning.
          </p>
        </div>

        <button
          onClick={handleGenerateNewDataset}
          disabled={isGenerating}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center space-x-1.5 shadow"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Packaging Dataset...</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Compile Retraining Version</span>
            </>
          )}
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Compiled Dataset Versions</span>
          <span className="text-xs text-slate-500">{datasetList.length} Versions Ready</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Dataset Name</th>
                <th className="p-3.5">Version Tag</th>
                <th className="p-3.5">Total Image Crops</th>
                <th className="p-3.5">Human Verified Samples</th>
                <th className="p-3.5">Created Date</th>
                <th className="p-3.5 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {datasetList.map((ds) => (
                <tr key={ds.id} className="hover:bg-slate-800/50 transition">
                  <td className="p-3.5 font-semibold text-slate-200">{ds.name}</td>
                  <td className="p-3.5 font-mono text-emerald-400 font-bold text-[11px]">{ds.version}</td>
                  <td className="p-3.5 font-mono">{ds.sampleCount}</td>
                  <td className="p-3.5 font-mono text-amber-400 font-bold">{ds.correctedSamplesCount}</td>
                  <td className="p-3.5 text-slate-400 text-[11px]">{new Date(ds.createdAt).toLocaleDateString()}</td>
                  <td className="p-3.5 text-right">
                    <a
                      href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(ds))}`}
                      download={`${ds.version}_tfrenzy_dataset.json`}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold rounded border border-slate-700 transition inline-flex items-center space-x-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export JSONL</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
