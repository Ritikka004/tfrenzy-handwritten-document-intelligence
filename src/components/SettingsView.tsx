import React, { useState, useEffect } from 'react';
import { Settings, Shield, User, HardDrive, Cpu, FileText } from 'lucide-react';
import { AuditLog, User as UserType } from '../types/index.ts';

// ─── 20 Realistic mock audit log entries (shown when backend is offline) ─────
const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id:        'log-mock-001',
    userId:    'usr-001',
    action:    'DOCUMENT_UPLOAD',
    resource:  'visitor_reg_20260807_005.jpg',
    details:   'Document uploaded via UploadView — 1.29 MB, MIME: image/jpeg',
    timestamp: '2026-08-07T12:50:17Z',
  },
  {
    id:        'log-mock-002',
    userId:    'usr-001',
    action:    'OCR_COMPLETED',
    resource:  'doc-mock-010',
    details:   'PaddleOCR PP-v6 completed in 2.9 s — overall confidence: 91.0%',
    timestamp: '2026-08-07T12:51:10Z',
  },
  {
    id:        'log-mock-003',
    userId:    'usr-002',
    action:    'FIELD_VERIFIED',
    resource:  'doc-mock-010',
    details:   'All 6 extracted fields accepted without correction by verifier',
    timestamp: '2026-08-07T13:22:04Z',
  },
  {
    id:        'log-mock-004',
    userId:    'usr-002',
    action:    'DOCUMENT_APPROVED',
    resource:  'doc-mock-010',
    details:   'Document status set to VERIFIED — pass quality: Good',
    timestamp: '2026-08-07T13:22:05Z',
  },
  {
    id:        'log-mock-005',
    userId:    'usr-003',
    action:    'DOCUMENT_UPLOAD',
    resource:  'visitor_reg_20260807_003.jpg',
    details:   'Document uploaded via UploadView — 1.17 MB, MIME: image/jpeg',
    timestamp: '2026-08-07T10:12:08Z',
  },
  {
    id:        'log-mock-006',
    userId:    'usr-002',
    action:    'FIELD_CORRECTED',
    resource:  'doc-mock-009',
    details:   'mobile_number corrected: "9788334455" → "9788334456"; vehicle_registration corrected: "DL04RT2233" → "DL04RJ2233"',
    timestamp: '2026-08-07T11:58:30Z',
  },
  {
    id:        'log-mock-007',
    userId:    'usr-001',
    action:    'EXPORT_GENERATED',
    resource:  'exp-mock-001',
    details:   'CSV export of 247 verified documents generated and downloaded',
    timestamp: '2026-08-07T07:00:00Z',
  },
  {
    id:        'log-mock-008',
    userId:    'usr-001',
    action:    'DATASET_COMPILED',
    resource:  'ds-mock-001',
    details:   'Golden training dataset v1.4-2026 compiled — 1840 crops, 184 human-corrected samples packaged',
    timestamp: '2026-08-07T08:00:00Z',
  },
  {
    id:        'log-mock-009',
    userId:    'usr-002',
    action:    'DOCUMENT_REJECTED',
    resource:  'doc-mock-004',
    details:   'Image quality check failed — blur score 42.1 (threshold: 100), brightness score 68 (threshold: 80)',
    timestamp: '2026-08-06T10:05:12Z',
  },
  {
    id:        'log-mock-010',
    userId:    'usr-001',
    action:    'USER_LOGIN',
    resource:  'auth-session',
    details:   'Successful login from 192.168.1.42 — JWT issued, role: Admin',
    timestamp: '2026-08-06T07:30:00Z',
  },
  {
    id:        'log-mock-011',
    userId:    'usr-001',
    action:    'TEMPLATE_UPDATED',
    resource:  'tpl-mock-001',
    details:   'Visitor Entry Register template updated — updated field minConfidence for mobile_number to 0.90',
    timestamp: '2026-08-05T16:45:00Z',
  },
  {
    id:        'log-mock-012',
    userId:    'usr-003',
    action:    'BATCH_UPLOAD',
    resource:  'batch_20260805_01.zip',
    details:   'Batch of 12 visitor register document scans ingested into processing queue',
    timestamp: '2026-08-05T08:15:22Z',
  },
  {
    id:        'log-mock-013',
    userId:    'usr-002',
    action:    'FIELD_VERIFIED',
    resource:  'doc-mock-001',
    details:   'Rajesh Kumar Sharma record verified without corrections',
    timestamp: '2026-08-05T09:10:44Z',
  },
  {
    id:        'log-mock-014',
    userId:    'usr-001',
    action:    'TENSORRT_ENGINE_BUILD',
    resource:  'paddle_ocr_fp16.engine',
    details:   'Compiled ONNX model to TensorRT FP16 engine on NVIDIA Jetson Orin Nano (throughput: 28.5 FPS)',
    timestamp: '2026-08-04T14:20:00Z',
  },
  {
    id:        'log-mock-015',
    userId:    'usr-001',
    action:    'QUALITY_GATE_CHANGE',
    resource:  'opencv_pipeline_config',
    details:   'Laplacian blur threshold updated from 80.0 to 100.0',
    timestamp: '2026-08-04T11:05:00Z',
  },
  {
    id:        'log-mock-016',
    userId:    'usr-002',
    action:    'DUPLICATE_FLAGGED',
    resource:  'doc-mock-009',
    details:   'Perceptual hash match (88% similarity) flagged against doc-mock-008',
    timestamp: '2026-08-03T15:10:18Z',
  },
  {
    id:        'log-mock-017',
    userId:    'usr-001',
    action:    'JSON_EXPORT',
    resource:  'exp-mock-002',
    details:   'Exported 198 verified records with bounding box coordinates to JSON payload',
    timestamp: '2026-08-03T10:00:00Z',
  },
  {
    id:        'log-mock-018',
    userId:    'usr-003',
    action:    'USER_LOGIN',
    resource:  'auth-session',
    details:   'Successful login from 192.168.1.55 — JWT issued, role: Verifier',
    timestamp: '2026-08-02T08:00:00Z',
  },
  {
    id:        'log-mock-019',
    userId:    'usr-001',
    action:    'MODEL_BENCHMARK',
    resource:  'mod-trocr-large',
    details:   'Evaluated TrOCR Large model benchmark — CER: 1.8%, WER: 3.9%, exact match field accuracy: 93.4%',
    timestamp: '2026-08-01T17:30:00Z',
  },
  {
    id:        'log-mock-020',
    userId:    'usr-001',
    action:    'SYSTEM_INITIALIZED',
    resource:  'tfrenzy_platform',
    details:   'TFrenzy Handwritten Document Intelligence Platform initialized on JetPack 5.1.2',
    timestamp: '2026-08-01T00:00:00Z',
  },
];

export const SettingsView: React.FC = () => {
  // Pre-populate with mock data so the audit table is never empty offline
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS);

  useEffect(() => {
    fetch('/api/audit-logs')
      .then(res => res.json())
      .then(json => {
        // Only replace mock logs when the API returns non-empty real records
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setAuditLogs(json.data);
        }
      })
      .catch(() => {
        // Silently retain mock data when API is unreachable
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-md">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-400" />
          <span>System Settings &amp; Immutable Audit Trails</span>
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
              Active User: <strong>Rithika</strong> (Role: <span className="text-indigo-400 font-bold">Admin</span>)
            </p>
            <div className="text-[11px] text-slate-500 space-y-1">
              <p>• Admin: Full template schema &amp; system configuration privileges</p>
              <p>• Verifier: Human-in-the-loop verification workspace access</p>
              <p>• Auditor: Read-only query &amp; export privileges</p>
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
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                    No audit log records found.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
