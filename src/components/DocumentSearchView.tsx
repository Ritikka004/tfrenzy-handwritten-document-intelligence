import React, { useState } from 'react';
import { Search, Filter, FileText, CheckCircle2, ShieldAlert, Eye, Calendar, User } from 'lucide-react';
import { Document, DocumentType } from '../types/index.ts';

interface DocumentSearchViewProps {
  documents: Document[];
  documentTypes: DocumentType[];
}

export const DocumentSearchView: React.FC<DocumentSearchViewProps> = ({ documents, documentTypes }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('all');
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);

  const filtered = documents.filter(doc => {
    const matchesSearch = doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) || doc.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || doc.status === selectedStatus;
    const matchesType = selectedTypeId === 'all' || doc.documentTypeId === selectedTypeId;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-md">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Search className="w-6 h-6 text-blue-400" />
          <span>Structured Document Search & Audit Repository</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Query digitized documents, inspect original OCR predictions alongside human corrections, and audit image quality parameters.
        </p>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by filename or document ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs p-2 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Processing Statuses</option>
            <option value="verified">Verified</option>
            <option value="verification_required">Verification Required</option>
            <option value="uploaded">Uploaded</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs p-2 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Document Categories</option>
            {documentTypes.map(dt => (
              <option key={dt.id} value={dt.id}>{dt.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Document Results Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Indexed Document Records</span>
          <span className="text-xs text-slate-500">{filtered.length} Records Found</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Document ID</th>
                <th className="p-3.5">File Name</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Confidence</th>
                <th className="p-3.5">Quality Gate</th>
                <th className="p-3.5">Uploaded Date</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-800/50 transition">
                  <td className="p-3.5 font-mono text-slate-400 text-[11px]">{doc.id}</td>
                  <td className="p-3.5 font-semibold text-slate-200">{doc.fileName}</td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      doc.status === 'verified'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : doc.status === 'verification_required'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {doc.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono font-bold text-slate-200">
                    {(doc.overallConfidence * 100).toFixed(1)}%
                  </td>
                  <td className="p-3.5 text-slate-400">
                    {doc.imageQuality.isAcceptable ? (
                      <span className="text-emerald-400 font-semibold">Passed (Blur: {doc.imageQuality.blurScore})</span>
                    ) : (
                      <span className="text-rose-400 font-semibold">Quality Issue</span>
                    )}
                  </td>
                  <td className="p-3.5 text-slate-400 text-[11px]">
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => setActiveDoc(doc)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 font-semibold rounded border border-slate-700 transition flex items-center space-x-1 ml-auto"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspection Modal */}
      {activeDoc && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-slate-100">Document Detail Inspection - {activeDoc.id}</h2>
              <button onClick={() => setActiveDoc(null)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-lg">
                <div>
                  <span className="text-slate-500">File Name:</span>
                  <p className="font-semibold text-slate-200">{activeDoc.fileName}</p>
                </div>
                <div>
                  <span className="text-slate-500">Document Status:</span>
                  <p className="font-semibold text-emerald-400 capitalize">{activeDoc.status.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <span className="text-slate-500">Overall Confidence:</span>
                  <p className="font-semibold text-amber-400">{(activeDoc.overallConfidence * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-slate-500">Uploaded At:</span>
                  <p className="font-semibold text-slate-200">{new Date(activeDoc.uploadedAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="border border-slate-800 p-3 rounded-lg space-y-1 bg-slate-950/40">
                <span className="font-bold text-slate-300">OpenCV Image Quality Diagnostics:</span>
                <p className="text-slate-400">Laplacian Variance Blur Score: <strong className="text-slate-200">{activeDoc.imageQuality.blurScore}</strong></p>
                <p className="text-slate-400">Brightness Mean: <strong className="text-slate-200">{activeDoc.imageQuality.brightnessScore}</strong></p>
                <p className="text-slate-400">Deskew Rotation Angle: <strong className="text-slate-200">{activeDoc.imageQuality.rotationAngle}°</strong></p>
              </div>
            </div>

            <div className="text-right pt-2 border-t border-slate-800">
              <button
                onClick={() => setActiveDoc(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
