import React from 'react';
import { 
  ListOrdered, CheckCircle2, Clock, AlertTriangle, RefreshCw, Cpu, Server 
} from 'lucide-react';

interface JobItem {
  id: string;
  documentId: string;
  documentName: string;
  jobType: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progressPercentage: number;
  completedAt?: string;
  errorMessage?: string;
}

interface QueueViewProps {
  jobs: JobItem[];
}

export const QueueView: React.FC<QueueViewProps> = ({ jobs }) => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Celery & Redis Processing Job Queue
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time pipeline task execution state across image quality gatekeeper, CLAHE deskewing, PaddleOCR PP-v6, and TrOCR models.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <Server className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300 font-semibold">Active Celery Workers: 4 Threads</span>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Job History & Live Pipeline Queue
          </span>
          <span className="text-xs text-slate-500">{jobs.length} Jobs Total</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Job ID</th>
                <th className="p-3.5">Document File</th>
                <th className="p-3.5">Task Stage</th>
                <th className="p-3.5">Queue Status</th>
                <th className="p-3.5">Progress</th>
                <th className="p-3.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-800/50 transition">
                  <td className="p-3.5 font-mono text-slate-400 text-[11px]">{job.id}</td>
                  <td className="p-3.5 font-semibold text-slate-200">{job.documentName}</td>
                  <td className="p-3.5">
                    <span className="bg-slate-800 text-indigo-300 px-2 py-0.5 rounded font-mono text-[10px]">
                      {job.jobType}
                    </span>
                  </td>
                  <td className="p-3.5">
                    {job.status === 'completed' && (
                      <span className="inline-flex items-center space-x-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Completed</span>
                      </span>
                    )}
                    {job.status === 'processing' && (
                      <span className="inline-flex items-center space-x-1 text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Processing</span>
                      </span>
                    )}
                    {job.status === 'queued' && (
                      <span className="inline-flex items-center space-x-1 text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded">
                        <Clock className="w-3 h-3" />
                        <span>Queued</span>
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 w-36">
                    <div className="flex items-center space-x-2">
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${job.progressPercentage}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{job.progressPercentage}%</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-400 text-[11px]">
                    {job.completedAt ? new Date(job.completedAt).toLocaleTimeString() : 'In Progress'}
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
