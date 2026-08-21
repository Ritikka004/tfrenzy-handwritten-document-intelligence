/**
 * Backend In-Memory / File Persistent Database Engine
 * Implements full CRUD & state operations for all 18 core tables
 */

import {
  User, DocumentType, DocumentTemplate, TemplateField, Document,
  DocumentPage, ProcessingJob, DetectedRegion, OCRPrediction,
  ExtractedField, FieldValidationResult, HumanCorrection, StructuredRecord,
  DuplicateMatch, ModelVersion, DatasetVersion, ExportJob, AuditLog, DashboardMetrics
} from '../../src/types/index.ts';

class SystemDatabase {
  public users: User[] = [];
  public documentTypes: DocumentType[] = [];
  public documentTemplates: DocumentTemplate[] = [];
  public templateFields: TemplateField[] = [];
  public documents: Document[] = [];
  public documentPages: DocumentPage[] = [];
  public processingJobs: ProcessingJob[] = [];
  public detectedRegions: DetectedRegion[] = [];
  public ocrPredictions: OCRPrediction[] = [];
  public extractedFields: ExtractedField[] = [];
  public fieldValidations: FieldValidationResult[] = [];
  public humanCorrections: HumanCorrection[] = [];
  public structuredRecords: StructuredRecord[] = [];
  public duplicateMatches: DuplicateMatch[] = [];
  public modelVersions: ModelVersion[] = [];
  public datasetVersions: DatasetVersion[] = [];
  public exportJobs: ExportJob[] = [];
  public auditLogs: AuditLog[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // 1. Users
    const adminUser: User = {
      id: 'usr-001',
      email: 'rithika@tfrenzy.ai',
      name: 'Rithika (Lead Architect)',
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    const verifierUser: User = {
      id: 'usr-002',
      email: 'verifier@tfrenzy.ai',
      name: 'John Doe (Data Quality Specialist)',
      role: 'verifier',
      createdAt: new Date().toISOString()
    };
    this.users.push(adminUser, verifierUser);

    // 2. Document Types
    const dtVisitor: DocumentType = {
      id: 'dt-visitor',
      code: 'VISITOR_REG',
      name: 'Visitor Entry Register',
      description: 'Handwritten gate entrance register logging visitor credentials, host employee ID, time, and vehicle number.',
      active: true,
      createdAt: new Date().toISOString()
    };
    const dtEmployee: DocumentType = {
      id: 'dt-employee',
      code: 'EMPLOYEE_INFO',
      name: 'Employee Information Form',
      description: 'Onboarding application containing candidate personal info, emergency phone number, and employee code.',
      active: true,
      createdAt: new Date().toISOString()
    };
    const dtSafety: DocumentType = {
      id: 'dt-safety',
      code: 'SAFETY_INSP',
      name: 'Safety Inspection Form',
      description: 'Plant equipment compliance check form with checklist options and inspector verification.',
      active: true,
      createdAt: new Date().toISOString()
    };
    this.documentTypes.push(dtVisitor, dtEmployee, dtSafety);

    // 3. Document Templates & Template Fields
    const tplVisitorId = 'tpl-visitor-v1';
    // NOTE: The following Visitor Register template bounding boxes were recalibrated
    // against a representative uploaded Visitor Register (doc-1786597181050). The
    // recalibration moves the vertical origins to align the template cell interiors
    // with the handwritten rows (excludes printed labels) while preserving column
    // widths. Values are percentages relative to the full uploaded image dimensions.
    const visitorFields: TemplateField[] = [
      {
        id: 'fld-vis-1',
        templateId: tplVisitorId,
        fieldKey: 'visitor_name',
        label: 'Visitor Full Name',
        fieldType: 'name',
        validationRegex: '^[A-Za-z\\s\\.\'-]{2,50}$',
        isRequired: true,
        minConfidence: 0.85,
        // Source reference: 1448x1086. In-cell handwriting region: x=110 y=210 w=570 h=85.
        boundingBox: { x: 7.60, y: 19.34, width: 39.36, height: 7.83 }
      },
      {
        id: 'fld-vis-2',
        templateId: tplVisitorId,
        fieldKey: 'mobile_number',
        label: 'Mobile Number',
        fieldType: 'phone',
        validationRegex: '^[6-9]\\d{9}$',
        isRequired: true,
        minConfidence: 0.85,
        // Source reference: 1448x1086. In-cell handwriting region: x=780 y=210 w=570 h=85.
        boundingBox: { x: 53.87, y: 19.34, width: 39.36, height: 7.83 }
      },
      {
        id: 'fld-vis-3',
        templateId: tplVisitorId,
        fieldKey: 'visit_date',
        label: 'Date of Visit',
        fieldType: 'date',
        validationRegex: '^(\\d{4}-\\d{2}-\\d{2}|\\d{2}\\/\\d{2}\\/\\d{4})$',
        isRequired: true,
        minConfidence: 0.85,
        // Source reference: 1448x1086. In-cell handwriting region: x=110 y=355 w=570 h=80.
        boundingBox: { x: 7.60, y: 32.69, width: 39.36, height: 7.37 }
      },
      {
        id: 'fld-vis-4',
        templateId: tplVisitorId,
        fieldKey: 'host_employee_id',
        label: 'Host Employee ID',
        fieldType: 'employee_id',
        validationRegex: '^EMP[ -]?[0-9\\-]{3,10}$',
        isRequired: true,
        minConfidence: 0.80,
        // Source reference: 1448x1086. In-cell handwriting region: x=780 y=355 w=570 h=80.
        boundingBox: { x: 53.87, y: 32.69, width: 39.36, height: 7.37 }
      },
      {
        id: 'fld-vis-5',
        templateId: tplVisitorId,
        fieldKey: 'vehicle_number',
        label: 'Vehicle Registration Number',
        fieldType: 'vehicle_number',
        validationRegex: '^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$',
        isRequired: false,
        minConfidence: 0.80,
        // Source reference: 1448x1086. In-cell handwriting region: x=110 y=500 w=570 h=80.
        boundingBox: { x: 7.60, y: 46.04, width: 39.36, height: 7.37 }
      },
      {
        id: 'fld-vis-6',
        templateId: tplVisitorId,
        fieldKey: 'passes_issued_quantity',
        label: 'Passes Issued Quantity',
        fieldType: 'quantity',
        validationRegex: '^(?!0+$)\\d{1,4}$',
        isRequired: true,
        minConfidence: 0.85,
        // Source reference: 1448x1086. In-cell handwriting region: x=780 y=500 w=570 h=80.
        boundingBox: { x: 53.87, y: 46.04, width: 39.36, height: 7.37 }
      }
    ];

    const visitorTemplate: DocumentTemplate = {
      id: tplVisitorId,
      documentTypeId: dtVisitor.id,
      name: 'Standard Visitor Log Template',
      version: '1.0.0',
      description: 'Default 6-field layout for gate registers',
      sampleImageUrl: '/assets/visitor_register_sample.jpg',
      fields: visitorFields,
      createdAt: new Date().toISOString()
    };

    this.documentTemplates.push(visitorTemplate);
    this.templateFields.push(...visitorFields);

    // 4. Model Versions
    const m1: ModelVersion = {
      id: 'mod-001',
      name: 'PaddleOCR PP-v6 Edge',
      architecture: 'PaddleOCR-PPv6',
      version: 'v1.0-edge',
      cer: 4.8,
      wer: 8.2,
      exactFieldAccuracy: 91.5,
      avgLatencyMs: 120,
      isEdgeCompatible: true,
      onnxExported: true,
      tensorRtEngineReady: true,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    const m2: ModelVersion = {
      id: 'mod-002',
      name: 'TrOCR Vision Transformer',
      architecture: 'TrOCR-Transformer',
      version: 'v1.3-deep',
      cer: 2.1,
      wer: 4.5,
      exactFieldAccuracy: 96.8,
      avgLatencyMs: 450,
      isEdgeCompatible: true,
      onnxExported: true,
      tensorRtEngineReady: true,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    this.modelVersions.push(m1, m2);

    // 5. Sample Documents
    const doc1Id = 'doc-1001';
    const doc1: Document = {
      id: doc1Id,
      fileName: 'visitor_entry_gate3_aug04.png',
      fileSize: 1420500,
      mimeType: 'image/png',
      documentTypeId: dtVisitor.id,
      templateId: visitorTemplate.id,
      status: 'verification_required',
      currentStage: 'verification',
      overallConfidence: 0.72,
      isDuplicate: false,
      imageQuality: {
        isBlurred: false,
        blurScore: 245.8,
        isDark: false,
        brightnessScore: 180.2,
        isOverexposed: false,
        isCutOff: false,
        rotationAngle: 0.5,
        resolutionDpi: 300,
        isAcceptable: true,
        qualityIssues: []
      },
      uploadedBy: adminUser.id,
      uploadedAt: new Date(Date.now() - 3600000).toISOString()
    };

    const doc2Id = 'doc-1002';
    const doc2: Document = {
      id: doc2Id,
      fileName: 'employee_form_rajesh.jpg',
      fileSize: 2100400,
      mimeType: 'image/jpeg',
      documentTypeId: dtEmployee.id,
      status: 'verified',
      currentStage: 'completed',
      overallConfidence: 0.94,
      isDuplicate: false,
      imageQuality: {
        isBlurred: false,
        blurScore: 310.4,
        isDark: false,
        brightnessScore: 195.0,
        isOverexposed: false,
        isCutOff: false,
        rotationAngle: 0.0,
        resolutionDpi: 300,
        isAcceptable: true,
        qualityIssues: []
      },
      uploadedBy: verifierUser.id,
      uploadedAt: new Date(Date.now() - 7200000).toISOString(),
      verifiedBy: verifierUser.id,
      verifiedAt: new Date(Date.now() - 1800000).toISOString()
    };

    this.documents.push(doc1, doc2);

    // Extracted Fields for Doc 1
    const extFieldsDoc1: ExtractedField[] = [
      {
        id: 'ef-101',
        documentId: doc1Id,
        templateFieldId: 'fld-vis-1',
        fieldKey: 'visitor_name',
        label: 'Visitor Full Name',
        ocrValue: 'Anil Kumr',
        finalValue: 'Anil Kumr',
        confidence: 0.62,
        confidenceLevel: 'low',
        isValid: true,
        validationMessage: 'Confidence below 0.85 threshold. Manual review recommended.',
        isCorrected: false,
        regionBox: { x: 10, y: 18, width: 35, height: 8 }
      },
      {
        id: 'ef-102',
        documentId: doc1Id,
        templateFieldId: 'fld-vis-2',
        fieldKey: 'mobile_number',
        label: 'Mobile Number',
        ocrValue: '9876543210',
        finalValue: '9876543210',
        confidence: 0.96,
        confidenceLevel: 'high',
        isValid: true,
        isCorrected: false,
        regionBox: { x: 50, y: 18, width: 40, height: 8 }
      },
      {
        id: 'ef-103',
        documentId: doc1Id,
        templateFieldId: 'fld-vis-3',
        fieldKey: 'visit_date',
        label: 'Date of Visit',
        ocrValue: '2026-08-04',
        finalValue: '2026-08-04',
        confidence: 0.91,
        confidenceLevel: 'high',
        isValid: true,
        isCorrected: false,
        regionBox: { x: 10, y: 32, width: 35, height: 8 }
      },
      {
        id: 'ef-104',
        documentId: doc1Id,
        templateFieldId: 'fld-vis-4',
        fieldKey: 'host_employee_id',
        label: 'Host Employee ID',
        ocrValue: 'EMP-4092',
        finalValue: 'EMP-4092',
        confidence: 0.88,
        confidenceLevel: 'high',
        isValid: true,
        isCorrected: false,
        regionBox: { x: 50, y: 32, width: 40, height: 8 }
      },
      {
        id: 'ef-105',
        documentId: doc1Id,
        templateFieldId: 'fld-vis-5',
        fieldKey: 'vehicle_number',
        label: 'Vehicle Registration Number',
        ocrValue: 'KA01AB1234',
        finalValue: 'KA01AB1234',
        confidence: 0.78,
        confidenceLevel: 'medium',
        isValid: true,
        isCorrected: false,
        regionBox: { x: 10, y: 48, width: 35, height: 8 }
      },
      {
        id: 'ef-106',
        documentId: doc1Id,
        templateFieldId: 'fld-vis-6',
        fieldKey: 'passes_issued_quantity',
        label: 'Passes Issued Quantity',
        ocrValue: '2',
        finalValue: '2',
        confidence: 0.98,
        confidenceLevel: 'high',
        isValid: true,
        isCorrected: false,
        regionBox: { x: 50, y: 48, width: 40, height: 8 }
      }
    ];

    this.extractedFields.push(...extFieldsDoc1);

    // Human Correction example
    this.humanCorrections.push({
      id: 'hc-001',
      documentId: doc2Id,
      fieldKey: 'employee_name',
      originalOcrText: 'Rajesh Kmr',
      correctedText: 'Rajesh Kumar',
      confidence: 0.64,
      modelVersion: 'v1.0-edge',
      correctedBy: verifierUser.id,
      correctedAt: new Date(Date.now() - 1800000).toISOString(),
      notes: 'Added missing letter u in Kumar based on visual crop inspect.'
    });

    // Dataset Version
    this.datasetVersions.push({
      id: 'ds-v1',
      name: 'TFrenzy Golden Correction Dataset',
      version: 'v1.4-20260804',
      sampleCount: 1420,
      correctedSamplesCount: 285,
      documentTypeId: dtVisitor.id,
      downloadUrl: '/api/datasets/ds-v1/export',
      createdAt: new Date().toISOString()
    });

    // Audit logs
    this.auditLogs.push({
      id: 'audit-001',
      userId: adminUser.id,
      action: 'SYSTEM_INIT',
      resource: 'Database',
      details: 'Initialized TFrenzy Intelligent Handwritten Platform with pre-seeded models and schemas.',
      timestamp: new Date().toISOString()
    });
  }

  public getDashboardMetrics(includeSeedData = true): DashboardMetrics {
    const seedDocumentIds = new Set(['doc-1001', 'doc-1002']);
    const activeDocuments = includeSeedData
      ? this.documents
      : this.documents.filter(d => !seedDocumentIds.has(d.id));
    const activeDocumentIds = new Set(activeDocuments.map(d => d.id));
    const activeJobs = this.processingJobs.filter(j => activeDocumentIds.has(j.documentId));
    const activeFields = this.extractedFields.filter(f => activeDocumentIds.has(f.documentId));
    const activeCanonicalFieldKeys = new Set([
      'visitor_name', 'mobile_number', 'visit_date',
      'host_employee_id', 'vehicle_number', 'passes_issued_quantity'
    ]);
    const activeCorrections = this.humanCorrections.filter(c =>
      activeDocumentIds.has(c.documentId) && activeCanonicalFieldKeys.has(c.fieldKey)
    );
    const totalDocs = activeDocuments.length;
    const awaitingDocs = activeDocuments.filter(d => d.status === 'verification_required' || d.status === 'uploaded');
    const awaitingCount = awaitingDocs.length;
    const processedDocs = activeDocuments.filter(d => d.status !== 'ocr_in_progress');
    const processedCount = processedDocs.length;
    const straightThroughCount = Math.max(0, processedCount - awaitingCount);
    const stpRate = processedCount > 0 ? Number(((straightThroughCount / processedCount) * 100).toFixed(1)) : 0;

    const validConfDocs = activeDocuments.filter(d => typeof d.overallConfidence === 'number' && d.overallConfidence > 0);
    const avgConfidence = validConfDocs.length > 0
      ? Number(((validConfDocs.reduce((acc, d) => acc + d.overallConfidence, 0) / validConfDocs.length) * 100).toFixed(1))
      : 0;

    const rejectedDocs = activeDocuments.filter(d => d.status === 'rejected' || (d.imageQuality && !d.imageQuality.isAcceptable)).length;

    // Calculate dynamic processing time from completed processing jobs where timestamps exist
    const completedJobs = activeJobs.filter(j => j.startedAt && j.completedAt);
    let avgProcessingTimeSec = 0;
    if (completedJobs.length > 0) {
      const totalDurationMs = completedJobs.reduce((sum, j) => {
        const start = new Date(j.startedAt!).getTime();
        const end = new Date(j.completedAt!).getTime();
        return sum + Math.max(0, end - start);
      }, 0);
      const avgMs = totalDurationMs / completedJobs.length;
      if (avgMs > 0) {
        avgProcessingTimeSec = Number((avgMs / 1000).toFixed(1));
      }
    }

    // Calculate field accuracy dynamically from stored extracted fields
    const canonicalFieldKeys = [
      'visitor_name',
      'mobile_number',
      'visit_date',
      'host_employee_id',
      'vehicle_number',
      'passes_issued_quantity'
    ];
    const fieldAccuracyMap: Record<string, number> = {};
    for (const key of canonicalFieldKeys) {
      const matchingFields = activeFields.filter(f => f.fieldKey === key && typeof f.confidence === 'number' && f.confidence > 0);
      if (matchingFields.length > 0) {
        const avg = matchingFields.reduce((sum, f) => sum + f.confidence, 0) / matchingFields.length;
        fieldAccuracyMap[key] = Number((avg * 100).toFixed(1));
      } else {
        fieldAccuracyMap[key] = 0;
      }
    }

    // Calculate accuracy by document type dynamically from stored documents
    const accuracyByDocumentType: Record<string, number> = {};
    for (const dt of this.documentTypes) {
      const typeDocs = activeDocuments.filter(d => d.documentTypeId === dt.id && typeof d.overallConfidence === 'number' && d.overallConfidence > 0);
      if (typeDocs.length > 0) {
        const avg = typeDocs.reduce((sum, d) => sum + d.overallConfidence, 0) / typeDocs.length;
        accuracyByDocumentType[dt.name] = Number((avg * 100).toFixed(1));
      } else {
        accuracyByDocumentType[dt.name] = 0;
      }
    }

    // Derive most misread characters dynamically from stored human corrections
    let mostMisreadCharacters: Array<{ char: string; misreadAs: string; count: number }> = [];
    if (activeCorrections.length > 0) {
      const misreadCounts: Record<string, { misreadAs: string; count: number }> = {};
      for (const hc of activeCorrections) {
        if (hc.originalOcrText && hc.correctedText && hc.originalOcrText !== hc.correctedText) {
          const orig = hc.originalOcrText;
          const corr = hc.correctedText;
          const minLen = Math.min(orig.length, corr.length);
          for (let i = 0; i < minLen; i++) {
            if (orig[i] !== corr[i]) {
              const pairKey = `${corr[i]}->${orig[i]}`;
              if (!misreadCounts[pairKey]) {
                misreadCounts[pairKey] = { misreadAs: orig[i], count: 0 };
              }
              misreadCounts[pairKey].count++;
            }
          }
        }
      }
      const derived = Object.entries(misreadCounts).map(([key, info]) => ({
        char: key.split('->')[0],
        misreadAs: info.misreadAs,
        count: info.count
      })).sort((a, b) => b.count - a.count);

      if (derived.length > 0) {
        mostMisreadCharacters = derived.slice(0, 5);
      }
    }

    return {
      documentsProcessed: processedCount,
      documentsAwaitingVerification: awaitingCount,
      straightThroughProcessingRate: Math.min(100, Math.max(0, stpRate)),
      avgProcessingTimeSec,
      avgConfidence,
      totalHumanCorrections: activeCorrections.length,
      fieldAccuracyMap,
      accuracyByDocumentType,
      mostMisreadCharacters,
      duplicateCount: activeDocuments.filter(d => d.isDuplicate).length,
      rejectedImagesCount: rejectedDocs
    };
  }
}

export const db = new SystemDatabase();
