import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { DataQualityDashboardView } from './components/DataQualityDashboardView.tsx';
import { UploadView } from './components/UploadView.tsx';
import { QueueView } from './components/QueueView.tsx';
import { VerificationView } from './components/VerificationView.tsx';
import { DocumentSearchView } from './components/DocumentSearchView.tsx';
import { TemplateConfigView } from './components/TemplateConfigView.tsx';
import { DatasetManagerView } from './components/DatasetManagerView.tsx';
import { ExportCenterView } from './components/ExportCenterView.tsx';
import { ModelPerformanceView } from './components/ModelPerformanceView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { SystemArchitectureView } from './components/SystemArchitectureView.tsx';
import { ImagePreprocessingView } from './components/ImagePreprocessingView.tsx';
import { LoginView } from './components/LoginView.tsx';

import {
  Document, DocumentType, DocumentTemplate, DashboardMetrics,
  ModelVersion, DatasetVersion
} from './types/index.ts';

// ─── Global Mock Data Fallbacks for Offline Operations ────────────────────────
const INITIAL_MOCK_METRICS: DashboardMetrics = {
  documentsProcessed:            1247,
  documentsAwaitingVerification: 23,
  straightThroughProcessingRate: 78.4,
  avgProcessingTimeSec:          3.2,
  avgConfidence:                 91.7,
  totalHumanCorrections:         184,
  duplicateCount:                7,
  rejectedImagesCount:           19,
  fieldAccuracyMap: {
    visitor_name:         94.2,
    mobile_number:        97.8,
    visit_date:           99.1,
    host_employee_id:     96.5,
    vehicle_registration: 88.3,
    pass_issue_quality:   99.6,
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

const INITIAL_MOCK_DOCUMENTS: Document[] = [
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
    vehicleRegistrationNumber: 'MH12AB1234',
    passIssueQuality: 'Good',
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
    vehicleRegistrationNumber: 'KA05MN7890',
    passIssueQuality: 'Average',
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
    vehicleRegistrationNumber: 'GJ01BX4422',
    passIssueQuality: 'Good',
  },
];

const INITIAL_MOCK_DOCUMENT_TYPES: DocumentType[] = [
  { id: 'dt-visitor', code: 'VISITOR_REG', name: 'Visitor Entry Register', description: 'Gate entrance register', active: true, createdAt: '2026-06-01T00:00:00Z' },
  { id: 'dt-employee', code: 'EMPLOYEE_INFO', name: 'Employee Information Form', description: 'Onboarding form', active: true, createdAt: '2026-06-01T00:00:00Z' },
  { id: 'dt-safety', code: 'SAFETY_INSP', name: 'Safety Inspection Form', description: 'Plant safety audit form', active: true, createdAt: '2026-06-01T00:00:00Z' }
];

const INITIAL_MOCK_TEMPLATES: DocumentTemplate[] = [
  {
    id:             'tpl-mock-001',
    documentTypeId: 'dt-visitor',
    name:           'Visitor Entry Register',
    version:        'v2.1',
    description:    'Standard visitor entry register for campus access log scanning',
    createdAt:      '2026-06-01T08:00:00Z',
    fields: [
      {
        id:             'fld-001',
        templateId:     'tpl-mock-001',
        fieldKey:       'visitor_name',
        label:          'Visitor Name',
        fieldType:      'name',
        isRequired:     true,
        validationRegex: '^[A-Za-z .]{2,80}$',
        minConfidence:  0.85,
        boundingBox:    { x: 10, y: 12, width: 40, height: 8 },
      },
      {
        id:             'fld-002',
        templateId:     'tpl-mock-001',
        fieldKey:       'mobile_number',
        label:          'Mobile Number',
        fieldType:      'phone',
        isRequired:     true,
        validationRegex: '^[6-9]\\d{9}$',
        minConfidence:  0.90,
        boundingBox:    { x: 10, y: 22, width: 30, height: 8 },
      },
      {
        id:             'fld-003',
        templateId:     'tpl-mock-001',
        fieldKey:       'visit_date',
        label:          'Visit Date',
        fieldType:      'date',
        isRequired:     true,
        validationRegex: '^\\d{4}-\\d{2}-\\d{2}$',
        minConfidence:  0.95,
        boundingBox:    { x: 55, y: 12, width: 35, height: 8 },
      },
      {
        id:             'fld-004',
        templateId:     'tpl-mock-001',
        fieldKey:       'host_employee_id',
        label:          'Host Employee ID',
        fieldType:      'employee_id',
        isRequired:     true,
        validationRegex: '^EMP-\\d{4}$',
        minConfidence:  0.90,
        boundingBox:    { x: 10, y: 32, width: 30, height: 8 },
      },
      {
        id:             'fld-005',
        templateId:     'tpl-mock-001',
        fieldKey:       'vehicle_registration',
        label:          'Vehicle Registration Number',
        fieldType:      'vehicle_number',
        isRequired:     false,
        validationRegex: '^[A-Z]{2}\\d{2}[A-Z]{1,2}\\d{4}$',
        minConfidence:  0.80,
        boundingBox:    { x: 10, y: 42, width: 35, height: 8 },
      },
      {
        id:             'fld-006',
        templateId:     'tpl-mock-001',
        fieldKey:       'pass_issue_quality',
        label:          'Pass Issue Quality',
        fieldType:      'checklist',
        isRequired:     true,
        minConfidence:  0.85,
        boundingBox:    { x: 55, y: 22, width: 35, height: 8 },
      },
    ],
  },
];

const INITIAL_MOCK_QUEUE_JOBS = [
  {
    id: 'job-mock-001',
    documentId: 'doc-mock-002',
    fileName: 'visitor_reg_20260805_002.jpg',
    jobType: 'ocr_ingestion',
    status: 'processing',
    progressPercentage: 65,
    startedAt: '2026-08-05T09:15:33Z',
  },
  {
    id: 'job-mock-002',
    documentId: 'doc-mock-006',
    fileName: 'visitor_reg_20260807_001.jpg',
    jobType: 'ocr_ingestion',
    status: 'queued',
    progressPercentage: 0,
    startedAt: '2026-08-07T08:05:19Z',
  },
];

function AppContent() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(INITIAL_MOCK_METRICS);
  const [documents, setDocuments] = useState<Document[]>(INITIAL_MOCK_DOCUMENTS);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>(INITIAL_MOCK_DOCUMENT_TYPES);
  const [templates, setTemplates] = useState<DocumentTemplate[]>(INITIAL_MOCK_TEMPLATES);
  const [queueJobs, setQueueJobs] = useState<any[]>(INITIAL_MOCK_QUEUE_JOBS);
  const [models, setModels] = useState<ModelVersion[]>([]);
  const [datasets, setDatasets] = useState<DatasetVersion[]>([]);
  // Track the ID of the most recently uploaded document so VerificationView auto-selects it
  const [lastUploadedDocId, setLastUploadedDocId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [mRes, dRes, tRes, qRes, modRes, dsRes] = await Promise.allSettled([
        fetch('/api/dashboard/metrics').then(r => r.json()),
        fetch('/api/documents').then(r => r.json()),
        fetch('/api/templates').then(r => r.json()),
        fetch('/api/queue').then(r => r.json()),
        fetch('/api/models').then(r => r.json()),
        fetch('/api/datasets').then(r => r.json())
      ]);

      if (mRes.status === 'fulfilled' && mRes.value?.success && mRes.value?.data) {
        setMetrics(mRes.value.data);
      }
      if (dRes.status === 'fulfilled' && dRes.value?.success && Array.isArray(dRes.value?.data) && dRes.value.data.length > 0) {
        setDocuments(dRes.value.data);
      }
      if (tRes.status === 'fulfilled' && tRes.value?.success && Array.isArray(tRes.value?.data) && tRes.value.data.length > 0) {
        setTemplates(tRes.value.data);
      }
      if (qRes.status === 'fulfilled' && qRes.value?.success && Array.isArray(qRes.value?.data) && qRes.value.data.length > 0) {
        setQueueJobs(qRes.value.data);
      }
      if (modRes.status === 'fulfilled' && modRes.value?.success && Array.isArray(modRes.value?.data) && modRes.value.data.length > 0) {
        setModels(modRes.value.data);
      }
      if (dsRes.status === 'fulfilled' && dsRes.value?.success && Array.isArray(dsRes.value?.data) && dsRes.value.data.length > 0) {
        setDatasets(dsRes.value.data);
      }
    } catch (err) {
      console.error('Error fetching platform state:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingCount = documents.filter(d => d.status === 'verification_required' || d.status === 'uploaded').length;

  const handleSaveCorrection = async (
    documentId: string,
    corrections: Array<{ fieldKey: string; correctedText: string; notes?: string }>
  ) => {
    try {
      const res = await fetch('/api/verification/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, corrections, userId: 'usr-002' })
      });
      const json = await res.json();
      if (json.success) {
        await loadData();
      }
    } catch {
      // Offline fallback: update document status locally
      setDocuments(prev => prev.map(doc =>
        doc.id === documentId
          ? { ...doc, status: 'verified', currentStage: 'completed' }
          : doc
      ));
    }
  };

  const handleSaveTemplate = async (template: Partial<DocumentTemplate>) => {
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });
      const json = await res.json();
      if (json.success) {
        await loadData();
      }
    } catch {
      // Offline fallback: update template state locally
      if (template.id) {
        setTemplates(prev => prev.map(t => t.id === template.id ? { ...t, ...template } as DocumentTemplate : t));
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
      />

      <div className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCount={pendingCount}
        />

        {/* Main Content Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'login' && (
            <LoginView onSuccess={() => { loadData(); setActiveTab('dashboard'); }} />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              metrics={metrics}
              onNavigateToVerification={() => setActiveTab('verification')}
              onNavigateToUpload={() => setActiveTab('upload')}
            />
          )}

          {activeTab === 'data-quality' && (
            <DataQualityDashboardView
              metrics={metrics}
              documents={documents}
              onNavigateToVerification={() => setActiveTab('verification')}
            />
          )}

          {activeTab === 'upload' && (
            <UploadView
              documentTypes={documentTypes}
              onUploadSuccess={(doc: Document) => {
                // Immediately add the newly uploaded document to state so other views see it
                setDocuments(prev => {
                  const withoutDup = prev.filter(d => d.id !== doc.id);
                  return [doc, ...withoutDup];
                });
                // Track which document was just uploaded so Verification auto-selects it
                setLastUploadedDocId(doc.id);
                // Refresh all data from backend to pick up OCR results
                loadData();
                setActiveTab('queue');
              }}
              onNavigateToQueue={() => setActiveTab('queue')}
            />
          )}

          {activeTab === 'queue' && (
            <QueueView jobs={queueJobs} />
          )}

          {activeTab === 'verification' && (
            <VerificationView
              documents={documents}
              initialDocId={lastUploadedDocId}
              onSaveCorrection={handleSaveCorrection}
            />
          )}

          {activeTab === 'search' && (
            <DocumentSearchView
              documents={documents}
              documentTypes={documentTypes}
            />
          )}

          {activeTab === 'preprocessing' && (
            <ImagePreprocessingView />
          )}

          {activeTab === 'template' && (
            <TemplateConfigView
              templates={templates}
              onSaveTemplate={handleSaveTemplate}
            />
          )}

          {activeTab === 'dataset' && (
            <DatasetManagerView datasets={datasets} />
          )}

          {activeTab === 'export' && (
            <ExportCenterView />
          )}

          {activeTab === 'performance' && (
            <ModelPerformanceView models={models} />
          )}

          {activeTab === 'settings' && (
            <SettingsView />
          )}

          {activeTab === 'architecture' && (
            <SystemArchitectureView />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
