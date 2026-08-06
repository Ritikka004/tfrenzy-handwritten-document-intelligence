import React, { useState, useEffect } from 'react';
import { Settings, Shield, User, HardDrive, Cpu, FileText } from 'lucide-react';
import { AuditLog, User as UserType } from '../types/index.ts';

export const SettingsView: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    fetch('/api/audit-logs')
      .then(res => res.json())
      .then(json => {
        if (json.success) setAuditLogs(json.data);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-md">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-400" />
          <span>System Settings & Immutable Audit Trails</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage user role-based access controls (RBAC), Jetson edge hardware device mappings, and inspect audit logs.
        </p>

        {/* Configurations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <span>Role-Based Access Control (RBAC)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Active User: <strong>Sarah Connor</strong> (Role: <span className="text-indigo-400 font-bold">Admin</span>)
            </p>
            <div className="text-[11px] text-slate-500 space-y-1">
              <p>• Admin: Full template schema & system configuration privileges</p>
              <p>• Verifier: Human-in-the-loop verification workspace access</p>
              <p>• Auditor: Read-only query & export privileges</p>
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Jetson Hardware Edge Mapping</span>
            </h3>
            <p className="text-xs text-slate-400">
              Target Device: <strong>NVIDIA Jetson Orin Nano 8GB</strong>
            </p>
            <div className="text-[11px] text-slate-500 space-y-1">
              <p>• JetPack Version: 5.1.2 (L4T 35.4.1)</p>
              <p>• TensorRT Execution Context: Int8 / FP16 Precision</p>
              <p>• OpenCV CUDA Backend: Compiled with GStreamer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Immutable Platform Audit Trail</span>
          <span className="text-xs text-slate-500">{auditLogs.length} Records Logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Log ID</th>
                <th className="p-3.5">User ID</th>
                <th className="p-3.5">Action Code</th>
                <th className="p-3.5">Resource Target</th>
                <th className="p-3.5">Event Details</th>
                <th className="p-3.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/50 transition">
                  <td className="p-3.5 font-mono text-slate-400 text-[11px]">{log.id}</td>
                  <td className="p-3.5 font-semibold text-slate-300">{log.userId}</td>
                  <td className="p-3.5">
                    <span className="bg-slate-800 text-amber-300 font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-200">{log.resource}</td>
                  <td className="p-3.5 text-slate-400 text-[11px] max-w-xs truncate">{log.details}</td>
                  <td className="p-3.5 text-slate-400 text-[11px]">{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
