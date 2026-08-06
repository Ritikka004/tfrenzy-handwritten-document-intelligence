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

function AppContent() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [queueJobs, setQueueJobs] = useState<any[]>([]);
  const [models, setModels] = useState<ModelVersion[]>([]);
  const [datasets, setDatasets] = useState<DatasetVersion[]>([]);

  const loadData = async () => {
    try {
      const [mRes, dRes, tRes, qRes, modRes, dsRes] = await Promise.all([
        fetch('/api/dashboard/metrics').then(r => r.json()),
        fetch('/api/documents').then(r => r.json()),
        fetch('/api/templates').then(r => r.json()),
        fetch('/api/queue').then(r => r.json()),
        fetch('/api/models').then(r => r.json()),
        fetch('/api/datasets').then(r => r.json())
      ]);

      if (mRes.success) setMetrics(mRes.data);
      if (dRes.success) setDocuments(dRes.data);
      if (tRes.success) setTemplates(tRes.data);
      if (qRes.success) setQueueJobs(qRes.data);
      if (modRes.success) setModels(modRes.data);
      if (dsRes.success) setDatasets(dsRes.data);

      // Extract unique document types
      setDocumentTypes([
        { id: 'dt-visitor', code: 'VISITOR_REG', name: 'Visitor Entry Register', description: 'Gate entrance register', active: true, createdAt: '' },
        { id: 'dt-employee', code: 'EMPLOYEE_INFO', name: 'Employee Information Form', description: 'Onboarding form', active: true, createdAt: '' },
        { id: 'dt-safety', code: 'SAFETY_INSP', name: 'Safety Inspection Form', description: 'Plant safety audit form', active: true, createdAt: '' }
      ]);
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
    const res = await fetch('/api/verification/correct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, corrections, userId: 'usr-002' })
    });
    const json = await res.json();
    if (json.success) {
      await loadData();
    }
  };

  const handleSaveTemplate = async (template: Partial<DocumentTemplate>) => {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    });
    const json = await res.json();
    if (json.success) {
      await loadData();
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

          {activeTab === 'dashboard' && metrics && (
            <DashboardView
              metrics={metrics}
              onNavigateToVerification={() => setActiveTab('verification')}
              onNavigateToUpload={() => setActiveTab('upload')}
            />
          )}

          {activeTab === 'data-quality' && metrics && (
            <DataQualityDashboardView
              metrics={metrics}
              documents={documents}
              onNavigateToVerification={() => setActiveTab('verification')}
            />
          )}

          {activeTab === 'upload' && (
            <UploadView
              documentTypes={documentTypes}
              onUploadSuccess={() => { loadData(); setActiveTab('queue'); }}
              onNavigateToQueue={() => setActiveTab('queue')}
            />
          )}

          {activeTab === 'queue' && (
            <QueueView jobs={queueJobs} />
          )}

          {activeTab === 'verification' && (
            <VerificationView
              documents={documents}
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

          {activeTab === 'template' && templates.length > 0 && (
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
