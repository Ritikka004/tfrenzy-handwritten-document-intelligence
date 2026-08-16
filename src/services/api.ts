/**
 * Unified Frontend API Service Client
 * Provides type-safe wrappers for backend REST endpoints with clean error handling.
 */

import { Document, DocumentType, ExtractedField, ProcessingJob, AuditLog, DashboardMetrics } from '../types/index.ts';

export async function uploadDocument(formData: FormData): Promise<{ document: Document; extractedFields?: ExtractedField[] }> {
  const res = await fetch('/api/documents/upload', {
    method: 'POST',
    body: formData,
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Upload failed');
  }
  return json.data;
}

export async function processDocument(documentId: string): Promise<{ document: Document; extractedFields: ExtractedField[] }> {
  const res = await fetch(`/api/documents/${documentId}/process`, {
    method: 'POST',
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Document processing failed');
  }
  return json.data;
}

export async function fetchDocuments(): Promise<Document[]> {
  const res = await fetch('/api/documents');
  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) {
    throw new Error(json.error || 'Failed to fetch documents');
  }
  return json.data;
}

export async function fetchDocumentById(documentId: string): Promise<{
  document: Document;
  template?: any;
  extractedFields: ExtractedField[];
  humanCorrections: any[];
}> {
  const res = await fetch(`/api/documents/${documentId}`);
  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Failed to fetch document details');
  }
  return json.data;
}

export async function submitVerificationCorrection(
  documentId: string,
  corrections: Array<{ fieldKey: string; correctedText: string; notes?: string }>,
  userId: string = 'usr-002'
): Promise<boolean> {
  const res = await fetch('/api/verification/correct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId, corrections, userId }),
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Verification save failed');
  }
  return true;
}

export async function fetchQueue(): Promise<ProcessingJob[]> {
  const res = await fetch('/api/queue');
  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) {
    throw new Error(json.error || 'Failed to fetch job queue');
  }
  return json.data;
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const res = await fetch('/api/audit-logs');
  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) {
    throw new Error(json.error || 'Failed to fetch audit logs');
  }
  return json.data;
}
