/**
 * TFrenzy Handwritten Document Intelligence and Data Validation Platform
 * Complete Type Definitions
 */

export type Role = 'admin' | 'supervisor' | 'verifier' | 'auditor';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export type DocumentStatus = 'uploaded' | 'preprocessing' | 'ocr_in_progress' | 'verification_required' | 'verified' | 'rejected' | 'failed';
export type ProcessingStage = 'queued' | 'quality_check' | 'preprocessing' | 'field_detection' | 'ocr' | 'extraction' | 'validation' | 'verification' | 'completed';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type FieldVerificationStatus = 'accepted' | 'review' | 'manual_correction';

export interface DocumentType {
  id: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
  createdAt: string;
}

export type FieldType = 'text' | 'name' | 'phone' | 'date' | 'employee_id' | 'email' | 'vehicle_number' | 'quantity' | 'checklist' | 'regex';

export interface TemplateField {
  id: string;
  templateId: string;
  fieldKey: string;
  label: string;
  fieldType: FieldType;
  validationRegex?: string;
  isRequired: boolean;
  minConfidence: number; // e.g. 0.85
  boundingBox: {
    x: number; // percentage 0-100
    y: number;
    width: number;
    height: number;
  };
}

export interface DocumentTemplate {
  id: string;
  documentTypeId: string;
  name: string;
  version: string;
  description: string;
  sampleImageUrl?: string;
  fields: TemplateField[];
  createdAt: string;
}

export interface ImageQualityMetrics {
  isBlurred: boolean;
  blurScore: number; // Laplacian variance
  isDark: boolean;
  brightnessScore: number; // 0-255
  isOverexposed: boolean;
  isCutOff: boolean;
  rotationAngle: number;
  resolutionDpi: number;
  isAcceptable: boolean;
  qualityIssues: string[];
}

export interface DocumentPage {
  id: string;
  documentId: string;
  pageNumber: number;
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
  isBlurred: boolean;
  blurScore: number;
  isDark: boolean;
  brightnessScore: number;
  isOverexposed: boolean;
  isCutOff: boolean;
  rotationAngle: number;
  resolutionDpi: number;
  isAcceptable: boolean;
  createdAt: string;
}

export interface StructuredRecord {
  id: string;
  documentId: string;
  documentTypeCode: string;
  payload: Record<string, any>;
  isVerified: boolean;
  createdAt: string;
}

export interface DuplicateMatch {
  id: string;
  documentId: string;
  matchedDocumentId: string;
  similarityScore: number;
  matchReason: string;
  detectedAt: string;
}

export interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  documentTypeId: string;
  templateId?: string;
  status: DocumentStatus;
  currentStage: ProcessingStage;
  overallConfidence: number;
  isDuplicate: boolean;
  duplicateOfId?: string;
  imageQuality: ImageQualityMetrics;
  uploadedBy: string;
  uploadedAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
  imageUrl?: string;
  // -------- Visitor Details (Canonical Schema) --------
  visitor_name?: string;
  visitorName?: string;
  mobile_number?: string;
  mobileNumber?: string;
  visit_date?: string;
  visitDate?: string;
  host_employee_id?: string;
  hostEmployeeId?: string;
  vehicle_number?: string;
  vehicleNumber?: string;
  vehicleRegistrationNumber?: string; // backward-compat alias
  passes_issued_quantity?: string;
  passesIssuedQuantity?: string;
  passIssueQuality?: string; // backward-compat alias
}

export interface DetectedRegion {
  id: string;
  documentId: string;
  fieldKey: string;
  label: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  croppedImageUrl?: string;
}

export interface OCRPrediction {
  id: string;
  regionId: string;
  fieldKey: string;
  modelName: string; // 'PaddleOCR' | 'TrOCR' | 'TFrenzy-Handwriting-v1.3'
  modelVersion: string;
  rawText: string;
  cleanedText: string;
  confidence: number; // 0.0 - 1.0
  processingTimeMs: number;
  characterConfidences?: Array<{ char: string; confidence: number }>;
}

export interface FieldValidationResult {
  id: string;
  fieldKey: string;
  rawValue: string;
  isValid: boolean;
  validationRuleApplied: string;
  errorMessage?: string;
  confidenceLevel: ConfidenceLevel; // high -> auto accept, medium -> highlight, low -> manual
}

export interface ExtractedField {
  id: string;
  documentId: string;
  templateFieldId: string;
  fieldKey: string;
  label: string;
  ocrValue: string;
  finalValue: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  isValid: boolean;
  validationMessage?: string;
  isCorrected: boolean;
  /** Backend-calculated state; the UI must render this rather than re-evaluating confidence. */
  verificationStatus?: FieldVerificationStatus;
  requiredConfidence?: number;
  regionBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface HumanCorrection {
  id: string;
  documentId: string;
  fieldKey: string;
  originalOcrText: string;
  correctedText: string;
  confidence: number;
  modelVersion: string;
  correctedBy: string;
  correctedAt: string;
  notes?: string;
}

export interface ProcessingJob {
  id: string;
  documentId: string;
  jobType: 'ocr_ingestion' | 'reprocess' | 'export' | 'model_evaluation';
  stage: ProcessingStage;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progressPercentage: number;
  startedAt?: string;
  completedAt?: string;
  lastAttemptAt?: string;
  failedAt?: string;
  retryCount: number;
  retryable: boolean;
  errorMessage?: string;
}

export interface ModelVersion {
  id: string;
  name: string;
  architecture: 'PaddleOCR-PPv6' | 'TrOCR-Transformer' | 'TFrenzy-Edge-v1.3' | 'Custom-PyTorch-CRNN';
  version: string;
  cer: number; // Character Error Rate %
  wer: number; // Word Error Rate %
  exactFieldAccuracy: number; // %
  avgLatencyMs: number;
  isEdgeCompatible: boolean; // Jetson Nano / Orin deployable
  onnxExported: boolean;
  tensorRtEngineReady: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface DatasetVersion {
  id: string;
  name: string;
  version: string;
  sampleCount: number;
  correctedSamplesCount: number;
  documentTypeId: string;
  downloadUrl?: string;
  createdAt: string;
}

export interface ExportJob {
  id: string;
  format: 'csv' | 'excel' | 'json' | 'api_webhook';
  documentCount: number;
  status: 'pending' | 'completed' | 'failed';
  fileUrl?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  details: string;
  timestamp: string;
  documentId?: string;
  fieldKey?: string;
  originalOcrValue?: string;
  correctedValue?: string;
  notes?: string;
}

export interface DashboardMetrics {
  documentsProcessed: number;
  documentsAwaitingVerification: number;
  straightThroughProcessingRate: number; // % automatically accepted
  avgProcessingTimeSec: number;
  avgConfidence: number; // %
  totalHumanCorrections: number;
  fieldAccuracyMap: Record<string, number>;
  accuracyByDocumentType: Record<string, number>;
  mostMisreadCharacters: Array<{ char: string; misreadAs: string; count: number }>;
  duplicateCount: number;
  rejectedImagesCount: number;
}
