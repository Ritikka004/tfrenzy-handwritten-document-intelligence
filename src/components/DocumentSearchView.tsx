import React, { useState } from 'react';
import { Search, Filter, FileText, CheckCircle2, ShieldAlert, Eye, Calendar, User } from 'lucide-react';
import { Document, DocumentType } from '../types/index.ts';

// ─── Realistic mock visitor register records (used when backend is offline) ──
const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'doc-mock-001',
    fileName: 'visitor_reg_20260805_001.jpg',
    fileSize: 1248302,
    mimeType: 'image/jpeg',
    documentTypeId: 'dt-visitor',
    templateId: 'tpl-001',
    status: 'verified',
    currentStage: 'completed',
    overallConfidence: 0.94,
    isDuplicate: false,
    imageQuality: {
      isBlurred: false, blurScore: 198.4, isDark: false, brightnessScore: 142,
      isOverexposed: false, isCutOff: false, rotationAngle: 0.8,
      resolutionDpi: 300, isAcceptable: true, qualityIssues: []
    },
    uploadedBy: 'usr-001',
    uploadedAt: '2026-08-05T08:32:11Z',
    verifiedBy: 'usr-002',
    verifiedAt: '2026-08-05T09:10:44Z',
    visitorName: 'Rajesh Kumar Sharma',
    mobileNumber: '9876543210',
    visitDate: '2026-08-05',
    hostEmployeeId: 'EMP-1042',
    vehicleNumber: 'MH12AB1234',
    passesIssuedQuantity: '1',
  },
  {
    id: 'doc-mock-002',
    fileName: 'visitor_reg_20260805_002.jpg',
    fileSize: 987654,
    mimeType: 'image/jpeg',
    documentTypeId: 'dt-visitor',
    templateId: 'tpl-001',
    status: 'verification_required',
    currentStage: 'verification',
    overallConfidence: 0.71,
    isDuplicate: false,
    imageQuality: {
      isBlurred: false, blurScore: 156.2, isDark: false, brightnessScore: 128,
      isOverexposed: false, isCutOff: false, rotationAngle: 1.2,
      resolutionDpi: 300, isAcceptable: true, qualityIssues: []
    },
    uploadedBy: 'usr-001',
    uploadedAt: '2026-08-05T09:15:33Z',
    visitorName: 'Priya Nair',
    mobileNumber: '9845012345',
    visitDate: '2026-08-05',
    hostEmployeeId: 'EMP-0871',
    vehicleNumber: 'KA05MN7890',
    passesIssuedQuantity: '2',
  },
  {
    id: 'doc-mock-003',
    fileName: 'visitor_reg_20260806_001.jpg',
    fileSize: 1102400,
    mimeType: 'image/jpeg',
    documentTypeId: 'dt-visitor',
    templateId: 'tpl-001',
    status: 'verified',
    currentStage: 'completed',
    overallConfidence: 0.97,
    isDuplicate: false,
    imageQuality: {
      isBlurred: false, blurScore: 221.8, isDark: false, brightnessScore: 155,
      isOverexposed: false, isCutOff: false, rotationAngle: 0.3,
      resolutionDpi: 300, isAcceptable: true, qualityIssues: []
    },
    uploadedBy: 'usr-001',
    uploadedAt: '2026-08-06T07:45:02Z',
    verifiedBy: 'usr-002',
    verifiedAt: '2026-08-06T08:22:17Z',
    visitorName: 'Mohammed Aslam Khan',
    mobileNumber: '9712345678',
    visitDate: '2026-08-06',
    hostEmployeeId: 'EMP-2301',
    vehicleNumber: 'GJ01BX4422',
    passesIssuedQuantity: '1',
  },
  {
    id: 'doc-mock-004',
    fileName: 'visitor_reg_20260806_002.jpg',
    fileSize: 754321,
    mimeType: 'image/jpeg',
    documentTypeId: 'dt-visitor',
    templateId: 'tpl-001',
    status: 'rejected',
    currentStage: 'quality_check',
    overallConfidence: 0.31,
    isDuplicate: false,
    imageQuality: {
      isBlurred: true, blurScore: 42.1, isDark: true, brightnessScore: 68,
      isOverexposed: false, isCutOff: false, rotationAngle: 4.7,
      resolutionDpi: 150, isAcceptable: false, qualityIssues: ['Image too blurry', 'Low brightness']
    },
    uploadedBy: 'usr-003',
    uploadedAt: '2026-08-06T10:03:55Z',
    visitorName: 'Sunita Devi',
    mobileNumber: '8899001122',
    visitDate: '2026-08-06',
    hostEmployeeId: 'EMP-0540',
    vehicleNumber: '',
    passesIssuedQuantity: '1',
  },
  {
    id: 'doc-mock-005',
    fileName: 'visitor_reg_20260806_003.jpg',
    fileSize: 1387000,
    mimeType: 'image/jpeg',
    documentTypeId: 'dt-visitor',
    templateId: 'tpl-001',
    status: 'verified',
    currentStage: 'completed',
    overallConfidence: 0.89,
    isDuplicate: false,
    imageQuality: {
      isBlurred: false, blurScore: 179.5, isDark: false, brightnessScore: 138,
      isOverexposed: false, isCutOff: false, rotationAngle: 1.1,
      resolutionDpi: 300, isAcceptable: true, qualityIssues: []
    },
    uploadedBy: 'usr-002',
    uploadedAt: '2026-08-06T11:28:44Z',
    verifiedBy: 'usr-002',
    verifiedAt: '2026-08-06T12:05:30Z',
    visitorName: 'Arvind Menon',
    mobileNumber: '9500112233',
    visitDate: '2026-08-06',
    hostEmployeeId: 'EMP-1197',
    vehicleNumber: 'TN09CD5566',
    passesIssuedQuantity: '3',
  },
  {
    id: 'doc-mock-006',
    fileName: 'visitor_reg_20260807_001.jpg',
    fileSize: 1056789,
    mimeType: 'image/jpeg',
    documentTypeId: 'dt-visitor',
    templateId: 'tpl-001',
    status: 'verification_required',
    currentStage: 'verification',
    overallConfidence: 0.68,
    isDuplicate: false,
    imageQuality: {
      isBlurred: false, blurScore: 145.0, isDark: false, brightnessScore: 122,
      isOverexposed: false, isCutOff: false, rotationAngle: 2.1,
      resolutionDpi: 300, isAcceptable: true, qualityIssues: ['Slight rotation detected']
    },
    uploadedBy: 'usr-001',
    uploadedAt: '2026-08-07T08:05:19Z',
    visitorName: 'Deepa Krishnamurthy',
    mobileNumber: '9611223344',
    visitDate: '2026-08-07',
    hostEmployeeId: 'EMP-0334',
    vehicleNumber: 'AP10EF3311',
    passesIssuedQuantity: '1',
  },
  {
    id: 'doc-mock-007',
    fileName: 'visitor_reg_20260807_002.jpg',
    fileSize: 920480,
    mimeType: 'image/jpeg',
    documentTypeId: 'dt-visitor',
    templateId: 'tpl-001',
    status: 'ocr_in_progress',
    currentStage: 'ocr',
    overallConfidence: 0.0,
    isDuplicate: false,
    imageQuality: {
      isBlurred: false, blurScore: 203.7, isDark: false, brightnessScore: 149,
      isOverexposed: false, isCutOff: false, rotationAngle: 0.5,
      resolutionDpi: 300, isAcceptable: true, qualityIssues: []
    },
    uploadedBy: 'usr-001',
    uploadedAt: '2026-08-07T09:44:55Z',
    visitorName: 'Vikram Singh Rathore',
    mobileNumber: '9302233445',
    visitDate: '2026-08-07',
    hostEmployeeId: 'EMP-1785',
    vehicleNumber: 'RJ14GH9922',
    passesIssuedQuantity: '2',
  },
  {
    id: 'doc-mock-008',
    fileName: 'visitor_reg_20260807_003.jpg',
    fileSize: 1174200,
    mimeType: 'image/jpeg',
    documentTypeId: 'dt-visitor',
    templateId: 'tpl-001',
    status: 'verified',
    currentStage: 'completed',
    overallConfidence: 0.96,
    isDuplicate: false,
    imageQuality: {
      isBlurred: false, blurScore: 215.2, isDark: false, brightnessScore: 158,
      isOverexposed: false, isCutOff: false, rotationAngle: 0.2,
      resolutionDpi: 300, isAcceptable: true, qualityIssues: []
    },
    uploadedBy: 'usr-003',
    uploadedAt: '2026-08-07T10:12:08Z',
    verifiedBy: 'usr-002',
    verifiedAt: '2026-08-07T10:48:22Z',
    visitorName: 'Anita Bhosle',
    mobileNumber: '9421001234',
    visitDate: '2026-08-07',
    hostEmployeeId: 'EMP-2014',
    vehicleNumber: 'MH43PQ6677',
    passesIssuedQuantity: '1',
  },
  {
    id: 'doc-mock-009',
    fileName: 'visitor_reg_20260807_004.jpg',
    fileSize: 843100,
    mimeType: 'image/jpeg',
    documentTypeId: 'dt-visitor',
    templateId: 'tpl-001',
    status: 'verification_required',
    currentStage: 'verification',
    overallConfidence: 0.73,
    isDuplicate: true,
    duplicateOfId: 'doc-mock-008',
    imageQuality: {
      isBlurred: false, blurScore: 161.8, isDark: false, brightnessScore: 130,
      isOverexposed: false, isCutOff: false, rotationAngle: 1.6,
      resolutionDpi: 300, isAcceptable: true, qualityIssues: []
    },
    uploadedBy: 'usr-001',
    uploadedAt: '2026-08-07T11:33:40Z',
    visitorName: 'Karthik Subramaniam',
    mobileNumber: '9788334455',
    visitDate: '2026-08-07',
    hostEmployeeId: 'EMP-0992',
    vehicleNumber: 'DL04RT2233',
    passesIssuedQuantity: '2',
  },
  {
    id: 'doc-mock-010',
    fileName: 'visitor_reg_20260807_005.jpg',
    fileSize: 1290000,
    mimeType: 'image/jpeg',
    documentTypeId: 'dt-visitor',
    templateId: 'tpl-001',
    status: 'verified',
    currentStage: 'completed',
    overallConfidence: 0.91,
    isDuplicate: false,
    imageQuality: {
      isBlurred: false, blurScore: 188.9, isDark: false, brightnessScore: 144,
      isOverexposed: false, isCutOff: false, rotationAngle: 0.9,
      resolutionDpi: 300, isAcceptable: true, qualityIssues: []
    },
    uploadedBy: 'usr-002',
    uploadedAt: '2026-08-07T12:50:17Z',
    verifiedBy: 'usr-001',
    verifiedAt: '2026-08-07T13:22:04Z',
    visitorName: 'Fatima Begum Sheikh',
    mobileNumber: '9654778899',
    visitDate: '2026-08-07',
    hostEmployeeId: 'EMP-1567',
    vehicleNumber: 'UP32YZ1100',
    passesIssuedQuantity: '1',
  },
];

// ─── Status badge helper (reused in table rows and modal) ────────────────────
const STATUS_STYLES: Record<string, string> = {
  verified:               'bg-emerald-500/20 text-emerald-400',
  verification_required:  'bg-amber-500/20  text-amber-400',
  rejected:               'bg-rose-500/20   text-rose-400',
  ocr_in_progress:        'bg-blue-500/20   text-blue-400',
  uploaded:               'bg-slate-500/20  text-slate-300',
  preprocessing:          'bg-indigo-500/20 text-indigo-400',
  failed:                 'bg-rose-700/20   text-rose-500',
};

interface DocumentSearchViewProps {
  documents: Document[];
  documentTypes: DocumentType[];
}

export const DocumentSearchView: React.FC<DocumentSearchViewProps> = ({ documents, documentTypes }) => {
  // ── search / filter state ──────────────────────────────────────────────────
  const [searchTerm,     setSearchTerm]     = useState('');
  const [mobileFilter,   setMobileFilter]   = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [vehicleFilter,  setVehicleFilter]  = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('all');
  const [activeDoc,      setActiveDoc]      = useState<Document | null>(null);

  // ── use real documents when available; fall back to mock data offline ──────
  const displayDocuments = documents.length > 0 ? documents : MOCK_DOCUMENTS;

  // ── unified filter logic across all 6 searchable fields ───────────────────
  const filtered = displayDocuments.filter(doc => {
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      doc.fileName.toLowerCase().includes(s) ||
      doc.id.toLowerCase().includes(s) ||
      (doc.visitor_name             || doc.visitorName              || '').toLowerCase().includes(s) ||
      (doc.mobile_number            || doc.mobileNumber             || '').includes(searchTerm) ||
      (doc.visit_date               || doc.visitDate                || '').toLowerCase().includes(s) ||
      (doc.host_employee_id         || doc.hostEmployeeId           || '').toLowerCase().includes(s) ||
      (doc.vehicle_number           || doc.vehicleNumber            || '').toLowerCase().includes(s) ||
      (doc.passes_issued_quantity   || doc.passesIssuedQuantity     || '').toLowerCase().includes(s);

    const matchesMobile =
      !mobileFilter ||
      (doc.mobile_number || doc.mobileNumber || '').includes(mobileFilter);

    const matchesEmployee =
      !employeeFilter ||
      (doc.host_employee_id || doc.hostEmployeeId || '').toLowerCase().includes(employeeFilter.toLowerCase());

    const matchesVehicle =
      !vehicleFilter ||
      (doc.vehicle_number || doc.vehicleNumber || '').toLowerCase().includes(vehicleFilter.toLowerCase());

    const matchesStatus =
      selectedStatus === 'all' || doc.status === selectedStatus;

    const matchesType =
      selectedTypeId === 'all' || doc.documentTypeId === selectedTypeId;

    return matchesSearch && matchesMobile && matchesEmployee && matchesVehicle && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-md">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Search className="w-6 h-6 text-blue-400" />
          <span>Structured Document Search &amp; Audit Repository</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Query digitized documents, inspect original OCR predictions alongside human corrections, and audit image quality parameters.
        </p>
        {/* Statistics Cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">

  <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
    <p className="text-xs text-slate-500">Total Documents</p>
    <h2 className="text-2xl font-bold text-white mt-2">
      {displayDocuments.length}
    </h2>
  </div>

  <div className="bg-slate-950 border border-emerald-700 rounded-lg p-4">
    <p className="text-xs text-slate-500">Verified</p>
    <h2 className="text-2xl font-bold text-emerald-400 mt-2">
      {displayDocuments.filter(d => d.status === "verified").length}
    </h2>
  </div>

  <div className="bg-slate-950 border border-amber-700 rounded-lg p-4">
    <p className="text-xs text-slate-500">Pending Review</p>
    <h2 className="text-2xl font-bold text-amber-400 mt-2">
      {displayDocuments.filter(d => d.status === "verification_required").length}
    </h2>
  </div>

  <div className="bg-slate-950 border border-rose-700 rounded-lg p-4">
    <p className="text-xs text-slate-500">Rejected</p>
    <h2 className="text-2xl font-bold text-rose-400 mt-2">
      {displayDocuments.filter(d => d.status === "rejected").length}
    </h2>
  </div>

</div>
        {/* Filters */}

<div className="space-y-4 mt-6">

  {/* Visitor Name (global search bar) */}
  <div className="relative">
    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
    <input
      type="text"
      placeholder="Search by Visitor Full Name, File Name, Mobile Number, Host Employee ID, Vehicle Registration Number, Passes Issued Quantity, Doc ID…"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
    />
  </div>

  {/* Second Row — individual field filters */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

    <input
      type="text"
      placeholder="Mobile Number"
      value={mobileFilter}
      onChange={(e) => setMobileFilter(e.target.value)}
      className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
    />

    <input
      type="text"
      placeholder="Host Employee ID"
      value={employeeFilter}
      onChange={(e) => setEmployeeFilter(e.target.value)}
      className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
    />

    <input
      type="text"
      placeholder="Vehicle Registration Number"
      value={vehicleFilter}
      onChange={(e) => setVehicleFilter(e.target.value)}
      className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
    />

  </div>

  {/* Third Row — dropdowns */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

    <select
      value={selectedStatus}
      onChange={(e) => setSelectedStatus(e.target.value)}
      className="bg-slate-950 border border-slate-800 text-slate-200 text-xs p-2 rounded-lg focus:outline-none focus:border-blue-500"
    >
      <option value="all">All Processing Statuses</option>
      <option value="verified">Verified</option>
      <option value="verification_required">Verification Required</option>
      <option value="ocr_in_progress">OCR In Progress</option>
      <option value="uploaded">Uploaded</option>
      <option value="rejected">Rejected</option>
    </select>

    <select
      value={selectedTypeId}
      onChange={(e) => setSelectedTypeId(e.target.value)}
      className="bg-slate-950 border border-slate-800 text-slate-200 text-xs p-2 rounded-lg focus:outline-none focus:border-blue-500"
    >
      <option value="all">All Document Categories</option>
      {documentTypes.map((dt) => (
        <option key={dt.id} value={dt.id}>
          {dt.name}
        </option>
      ))}
    </select>

  </div>

</div>
      </div>

      {/* Document Results Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
        <div className="px-5 py-3.5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Indexed Document Records</span>
          <span className="text-xs text-slate-400 font-medium">{filtered.length} Records Found</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 whitespace-nowrap">Visitor Full Name</th>
                <th className="py-3 px-4 whitespace-nowrap">Mobile Number</th>
                <th className="py-3 px-4 whitespace-nowrap">Date of Visit</th>
                <th className="py-3 px-4 whitespace-nowrap">Host Employee ID</th>
                <th className="py-3 px-4 whitespace-nowrap">Vehicle Number</th>
                <th className="py-3 px-4 whitespace-nowrap text-center">Passes</th>
                <th className="py-3 px-4 whitespace-nowrap">Status</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 text-xs">
                    No records match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-200 whitespace-nowrap">
                      {doc.visitor_name || doc.visitorName || '—'}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {doc.mobile_number || doc.mobileNumber || '—'}
                    </td>

                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      {doc.visit_date || doc.visitDate || '—'}
                    </td>

                    <td className="py-3 px-4 font-mono text-indigo-300 whitespace-nowrap">
                      {doc.host_employee_id || doc.hostEmployeeId || '—'}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {doc.vehicle_number || doc.vehicleNumber || '—'}
                    </td>

                    <td className="py-3 px-4 text-center font-semibold text-slate-200 whitespace-nowrap">
                      {doc.passes_issued_quantity || doc.passesIssuedQuantity || '—'}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold tracking-wide uppercase ${
                        STATUS_STYLES[doc.status] ?? 'bg-slate-500/20 text-slate-400'
                      }`}>
                        {doc.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setActiveDoc(doc)}
                        className="px-3.5 py-1.5 bg-blue-600/90 hover:bg-blue-500 rounded-lg text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspection Modal */}
      {activeDoc && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-slate-100">Document Detail Inspection — {activeDoc.id}</h2>
              <button onClick={() => setActiveDoc(null)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              {/* Core metadata */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-lg">
                <div>
                  <span className="text-slate-500">File Name:</span>
                  <p className="font-semibold text-slate-200">{activeDoc.fileName}</p>
                </div>
                <div>
                  <span className="text-slate-500">Document Status:</span>
                  <p className={`font-semibold capitalize mt-0.5 inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    STATUS_STYLES[activeDoc.status] ?? 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {activeDoc.status.replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Overall Confidence:</span>
                  <p className="font-semibold text-amber-400">{(activeDoc.overallConfidence * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-slate-500">Uploaded At:</span>
                  <p className="font-semibold text-slate-200">{new Date(activeDoc.uploadedAt).toLocaleString()}</p>
                </div>
                {activeDoc.verifiedAt && (
                  <div>
                    <span className="text-slate-500">Verified At:</span>
                    <p className="font-semibold text-emerald-400">{new Date(activeDoc.verifiedAt).toLocaleString()}</p>
                  </div>
                )}
                {activeDoc.isDuplicate && (
                  <div>
                    <span className="text-slate-500">Duplicate Flag:</span>
                    <p className="font-semibold text-rose-400">⚠ Duplicate Detected</p>
                  </div>
                )}
              </div>

              {/* Visitor fields */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-lg">
                <div>
                  <span className="text-slate-500">Visitor Full Name:</span>
                  <p className="font-semibold text-slate-200">{activeDoc.visitor_name || activeDoc.visitorName || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Mobile Number:</span>
                  <p className="font-semibold font-mono text-slate-200">{activeDoc.mobile_number || activeDoc.mobileNumber || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Date of Visit:</span>
                  <p className="font-semibold text-slate-200">{activeDoc.visit_date || activeDoc.visitDate || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Host Employee ID:</span>
                  <p className="font-semibold font-mono text-indigo-300">{activeDoc.host_employee_id || activeDoc.hostEmployeeId || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Vehicle Registration Number:</span>
                  <p className="font-semibold font-mono text-slate-200">{activeDoc.vehicle_number || activeDoc.vehicleNumber || '—'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Passes Issued Quantity:</span>
                  <p className="font-semibold text-slate-200">{activeDoc.passes_issued_quantity || activeDoc.passesIssuedQuantity || '—'}</p>
                </div>
              </div>

              {/* Image quality diagnostics */}
              <div className="border border-slate-800 p-3 rounded-lg space-y-1 bg-slate-950/40">
                <span className="font-bold text-slate-300">OpenCV Image Quality Diagnostics:</span>
                <p className="text-slate-400">Laplacian Variance Blur Score: <strong className="text-slate-200">{activeDoc.imageQuality.blurScore}</strong></p>
                <p className="text-slate-400">Brightness Mean: <strong className="text-slate-200">{activeDoc.imageQuality.brightnessScore}</strong></p>
                <p className="text-slate-400">Deskew Rotation Angle: <strong className="text-slate-200">{activeDoc.imageQuality.rotationAngle}°</strong></p>
                <p className="text-slate-400">Resolution DPI: <strong className="text-slate-200">{activeDoc.imageQuality.resolutionDpi}</strong></p>
                {activeDoc.imageQuality.qualityIssues.length > 0 && (
                  <p className="text-rose-400">Issues: {activeDoc.imageQuality.qualityIssues.join(', ')}</p>
                )}
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
