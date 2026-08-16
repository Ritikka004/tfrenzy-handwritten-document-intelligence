import pg from 'pg';
import dotenv from 'dotenv';
import { db } from './database.ts';
import { postgresId } from './postgresIdentity.ts';
import {
  User, DocumentType, DocumentTemplate, TemplateField, Document,
  ProcessingJob, ExtractedField, HumanCorrection, AuditLog
} from '../../src/types/index.ts';

dotenv.config();

const { Pool } = pg;

export class PostgresDatabaseService {
  private pool: pg.Pool | null = null;
  public isConnected: boolean = false;

  private throwWriteError(operation: string, err: unknown): never {
    console.error(`[PostgreSQL] ${operation} failed:`, err);
    throw err instanceof Error ? err : new Error(String(err));
  }

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const host = process.env.POSTGRES_HOST || 'localhost';
    const port = parseInt(process.env.POSTGRES_PORT || '5432', 10);
    const database = process.env.POSTGRES_DB || 'tfrenzy_doc_db';
    const user = process.env.POSTGRES_USER || 'tfrenzy_user';
    const password = process.env.POSTGRES_PASSWORD || 'securepassword';

    this.pool = connectionString
      ? new Pool({ connectionString, connectionTimeoutMillis: 2000 })
      : new Pool({ host, port, database, user, password, connectionTimeoutMillis: 2000 });
  }

  public async initialize(): Promise<boolean> {
    if (!this.pool) return false;
    let client: pg.PoolClient | undefined;
    try {
      client = await this.pool.connect();
      console.log('[PostgreSQL] Successfully connected to database server.');

      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS document_types (
          id VARCHAR(255) PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS document_templates (
          id VARCHAR(255) PRIMARY KEY,
          document_type_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          version VARCHAR(20) NOT NULL,
          description TEXT,
          sample_image_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS template_fields (
          id VARCHAR(255) PRIMARY KEY,
          template_id VARCHAR(255) NOT NULL,
          field_key VARCHAR(100) NOT NULL,
          label VARCHAR(255) NOT NULL,
          field_type VARCHAR(50) NOT NULL,
          validation_regex TEXT,
          is_required BOOLEAN DEFAULT TRUE,
          min_confidence NUMERIC(3,2) DEFAULT 0.85,
          bbox_x NUMERIC(5,2) NOT NULL,
          bbox_y NUMERIC(5,2) NOT NULL,
          bbox_width NUMERIC(5,2) NOT NULL,
          bbox_height NUMERIC(5,2) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS documents (
          id VARCHAR(255) PRIMARY KEY,
          file_name VARCHAR(255) NOT NULL,
          stored_file_name VARCHAR(255),
          stored_file_path TEXT,
          file_size BIGINT NOT NULL,
          mime_type VARCHAR(100) NOT NULL,
          document_type_id VARCHAR(255) NOT NULL,
          template_id VARCHAR(255),
          status VARCHAR(50) NOT NULL DEFAULT 'uploaded',
          current_stage VARCHAR(50) NOT NULL DEFAULT 'quality_check',
          overall_confidence NUMERIC(3,2) DEFAULT 0.00,
          is_duplicate BOOLEAN DEFAULT FALSE,
          image_quality JSONB,
          uploaded_by VARCHAR(255),
          uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          visitor_name VARCHAR(255),
          mobile_number VARCHAR(100),
          visit_date VARCHAR(100),
          host_employee_id VARCHAR(100),
          vehicle_registration_number VARCHAR(100),
          pass_issue_quality VARCHAR(100)
        );

        CREATE TABLE IF NOT EXISTS document_pages (
          id VARCHAR(255) PRIMARY KEY,
          document_id VARCHAR(255) NOT NULL,
          page_number INT NOT NULL,
          image_path TEXT NOT NULL,
          image_width INT NOT NULL,
          image_height INT NOT NULL,
          is_blurred BOOLEAN DEFAULT FALSE,
          blur_score NUMERIC(8,2),
          is_dark BOOLEAN DEFAULT FALSE,
          brightness_score NUMERIC(8,2),
          is_overexposed BOOLEAN DEFAULT FALSE,
          is_cut_off BOOLEAN DEFAULT FALSE,
          rotation_angle NUMERIC(5,2) DEFAULT 0.00,
          resolution_dpi INT DEFAULT 300,
          is_acceptable BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS processing_jobs (
          id VARCHAR(255) PRIMARY KEY,
          document_id VARCHAR(255) NOT NULL,
          job_type VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'queued',
          progress_percentage INT DEFAULT 0,
          started_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE,
          error_message TEXT
        );

        CREATE TABLE IF NOT EXISTS detected_regions (
          id VARCHAR(255) PRIMARY KEY,
          document_id VARCHAR(255) NOT NULL,
          field_key VARCHAR(100) NOT NULL,
          label VARCHAR(255) NOT NULL,
          bbox_x NUMERIC(5,2) NOT NULL,
          bbox_y NUMERIC(5,2) NOT NULL,
          bbox_width NUMERIC(5,2) NOT NULL,
          bbox_height NUMERIC(5,2) NOT NULL,
          cropped_image_path TEXT
        );

        CREATE TABLE IF NOT EXISTS ocr_predictions (
          id VARCHAR(255) PRIMARY KEY,
          document_id VARCHAR(255) NOT NULL,
          region_id VARCHAR(255) NOT NULL,
          field_key VARCHAR(100) NOT NULL,
          model_name VARCHAR(100) NOT NULL,
          model_version VARCHAR(50) NOT NULL,
          raw_text TEXT NOT NULL,
          cleaned_text TEXT NOT NULL,
          confidence NUMERIC(3,2) NOT NULL,
          processing_time_ms INT NOT NULL,
          cropped_image_path TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS extracted_fields (
          id VARCHAR(255) PRIMARY KEY,
          document_id VARCHAR(255) NOT NULL,
          template_field_id VARCHAR(255),
          field_key VARCHAR(100) NOT NULL,
          label VARCHAR(255) NOT NULL,
          ocr_value TEXT NOT NULL,
          final_value TEXT NOT NULL,
          confidence NUMERIC(3,2) NOT NULL,
          confidence_level VARCHAR(20) NOT NULL,
          is_valid BOOLEAN NOT NULL DEFAULT TRUE,
          validation_message TEXT,
          is_corrected BOOLEAN NOT NULL DEFAULT FALSE,
          region_box JSONB
        );

        CREATE TABLE IF NOT EXISTS field_validations (
          id VARCHAR(255) PRIMARY KEY,
          extracted_field_id VARCHAR(255) NOT NULL,
          field_key VARCHAR(100) NOT NULL,
          raw_value TEXT,
          is_valid BOOLEAN NOT NULL,
          rule_applied VARCHAR(100) NOT NULL,
          error_message TEXT,
          validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS human_corrections (
          id VARCHAR(255) PRIMARY KEY,
          document_id VARCHAR(255) NOT NULL,
          field_key VARCHAR(100) NOT NULL,
          original_ocr_text TEXT NOT NULL,
          corrected_text TEXT NOT NULL,
          confidence NUMERIC(3,2) DEFAULT 0.95,
          model_version VARCHAR(50) DEFAULT 'v1.0',
          corrected_by VARCHAR(255),
          corrected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          notes TEXT
        );

        CREATE TABLE IF NOT EXISTS structured_records (
          id VARCHAR(255) PRIMARY KEY,
          document_id VARCHAR(255) UNIQUE NOT NULL,
          document_type_code VARCHAR(50) NOT NULL,
          payload JSONB NOT NULL,
          is_verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS duplicate_matches (
          id VARCHAR(255) PRIMARY KEY,
          document_id VARCHAR(255) NOT NULL,
          matched_document_id VARCHAR(255) NOT NULL,
          similarity_score NUMERIC(5,4) NOT NULL,
          match_reason VARCHAR(255) NOT NULL,
          detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS model_versions (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          architecture VARCHAR(100) NOT NULL,
          version VARCHAR(20) UNIQUE NOT NULL,
          cer NUMERIC(5,2) NOT NULL,
          wer NUMERIC(5,2) NOT NULL,
          exact_field_accuracy NUMERIC(5,2) NOT NULL,
          avg_latency_ms INT NOT NULL,
          is_edge_compatible BOOLEAN DEFAULT TRUE,
          onnx_exported BOOLEAN DEFAULT TRUE,
          tensorrt_engine_ready BOOLEAN DEFAULT TRUE,
          is_active BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS dataset_versions (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          version VARCHAR(20) UNIQUE NOT NULL,
          sample_count INT NOT NULL DEFAULT 0,
          corrected_samples_count INT NOT NULL DEFAULT 0,
          document_type_id VARCHAR(255),
          download_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS export_jobs (
          id VARCHAR(255) PRIMARY KEY,
          format VARCHAR(20) NOT NULL,
          document_count INT NOT NULL DEFAULT 0,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          file_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255),
          action VARCHAR(100) NOT NULL,
          resource VARCHAR(100) NOT NULL,
          details TEXT,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
        CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(document_type_id);
        CREATE INDEX IF NOT EXISTS idx_extracted_fields_doc_id ON extracted_fields(document_id);
        CREATE INDEX IF NOT EXISTS idx_human_corrections_doc_id ON human_corrections(document_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

        -- Additive provenance columns. Match document_id to the actual parent
        -- key type: an existing deployment created from DATABASE_SCHEMA.sql uses
        -- UUID, while an adapter-created database uses VARCHAR.
        DO $$
        DECLARE
          document_key_type TEXT;
          prediction_document_key_type TEXT;
          prediction_document_type_oid OID;
        BEGIN
          SELECT format_type(a.atttypid, a.atttypmod)
            INTO document_key_type
          FROM pg_attribute a
          WHERE a.attrelid = 'documents'::regclass
            AND a.attname = 'id'
            AND NOT a.attisdropped;

          IF document_key_type IS NULL THEN
            RAISE EXCEPTION 'Cannot migrate ocr_predictions.document_id: documents.id was not found';
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM pg_attribute
            WHERE attrelid = 'ocr_predictions'::regclass
              AND attname = 'document_id'
              AND NOT attisdropped
          ) THEN
            EXECUTE format('ALTER TABLE ocr_predictions ADD COLUMN document_id %s', document_key_type);
          END IF;

          SELECT format_type(a.atttypid, a.atttypmod), a.atttypid
            INTO prediction_document_key_type, prediction_document_type_oid
          FROM pg_attribute a
          WHERE a.attrelid = 'ocr_predictions'::regclass
            AND a.attname = 'document_id'
            AND NOT a.attisdropped;

          -- A previous adapter version could have added this column as VARCHAR
          -- before connecting it to a UUID parent. Convert only values that can
          -- represent UUIDs; otherwise stop without discarding any data.
          IF document_key_type = 'uuid'
             AND prediction_document_type_oid IN ('varchar'::regtype, 'text'::regtype) THEN
            IF EXISTS (
              SELECT 1 FROM ocr_predictions
              WHERE document_id IS NOT NULL
                AND document_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            ) THEN
              RAISE EXCEPTION
                'Cannot migrate ocr_predictions.document_id to UUID: non-UUID values are present';
            END IF;
            ALTER TABLE ocr_predictions
              ALTER COLUMN document_id TYPE UUID USING document_id::uuid;
            prediction_document_key_type := 'uuid';
          END IF;

          IF prediction_document_key_type IS DISTINCT FROM document_key_type THEN
            RAISE EXCEPTION
              'Cannot create fk_ocr_predictions_document: ocr_predictions.document_id is %, documents.id is %',
              prediction_document_key_type, document_key_type;
          END IF;

          -- Existing OCR rows were linked only through region_id. Preserve that
          -- relationship when adding the direct document provenance column.
          EXECUTE 'UPDATE ocr_predictions p SET document_id = r.document_id
                   FROM detected_regions r
                   WHERE p.region_id = r.id AND p.document_id IS NULL';
        END $$;
        ALTER TABLE ocr_predictions ADD COLUMN IF NOT EXISTS cropped_image_path TEXT;
        ALTER TABLE documents ADD COLUMN IF NOT EXISTS verified_by VARCHAR(255);
        ALTER TABLE documents ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE documents ADD COLUMN IF NOT EXISTS application_id TEXT;
        ALTER TABLE documents ADD COLUMN IF NOT EXISTS stored_file_name VARCHAR(255);
        ALTER TABLE documents ADD COLUMN IF NOT EXISTS stored_file_path TEXT;
        ALTER TABLE documents ADD COLUMN IF NOT EXISTS image_quality JSONB;
        ALTER TABLE documents ADD COLUMN IF NOT EXISTS visitor_name VARCHAR(255);
        ALTER TABLE documents ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(100);
        ALTER TABLE documents ADD COLUMN IF NOT EXISTS visit_date VARCHAR(100);
        ALTER TABLE documents ADD COLUMN IF NOT EXISTS host_employee_id VARCHAR(100);
        ALTER TABLE documents ADD COLUMN IF NOT EXISTS vehicle_registration_number VARCHAR(100);
        ALTER TABLE documents ADD COLUMN IF NOT EXISTS pass_issue_quality VARCHAR(100);
        ALTER TABLE extracted_fields ADD COLUMN IF NOT EXISTS region_box JSONB;
        CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_application_id ON documents(application_id) WHERE application_id IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_ocr_predictions_document_id ON ocr_predictions(document_id);

        -- Provenance links are deliberately constrained so an OCR artifact cannot
        -- outlive the document/region/field observation it describes.
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'detected_regions'::regclass AND confrelid = 'documents'::regclass AND contype = 'f') THEN
            ALTER TABLE detected_regions ADD CONSTRAINT fk_detected_regions_document
              FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'ocr_predictions'::regclass AND confrelid = 'detected_regions'::regclass AND contype = 'f') THEN
            ALTER TABLE ocr_predictions ADD CONSTRAINT fk_ocr_predictions_region
              FOREIGN KEY (region_id) REFERENCES detected_regions(id) ON DELETE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'ocr_predictions'::regclass AND conname = 'fk_ocr_predictions_document') THEN
            ALTER TABLE ocr_predictions ADD CONSTRAINT fk_ocr_predictions_document
              FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'extracted_fields'::regclass AND confrelid = 'documents'::regclass AND contype = 'f') THEN
            ALTER TABLE extracted_fields ADD CONSTRAINT fk_extracted_fields_document
              FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'field_validations'::regclass AND confrelid = 'extracted_fields'::regclass AND contype = 'f') THEN
            ALTER TABLE field_validations ADD CONSTRAINT fk_field_validations_extracted_field
              FOREIGN KEY (extracted_field_id) REFERENCES extracted_fields(id) ON DELETE CASCADE;
          END IF;
        END $$;
      `);

      this.isConnected = true;
      return true;
    } catch (err: any) {
      this.isConnected = false;
      console.warn('[PostgreSQL] Connection failed:', err.message || err);
      console.warn('[PostgreSQL] Persistent in-memory database store active for development fallback.');
      return false;
    } finally {
      client?.release();
    }
  }

  public async insertDocument(doc: Document): Promise<void> {
    if (!this.isConnected || !this.pool) return;
    try {
      await this.syncReferenceData();
      const docId = postgresId('documents', doc.id);
      await this.pool.query(
        `INSERT INTO documents (
          id, application_id, file_name, stored_file_name, stored_file_path, file_size, mime_type,
          document_type_id, template_id, status, current_stage, overall_confidence,
          is_duplicate, image_quality, uploaded_by, uploaded_at, visitor_name,
          mobile_number, visit_date, host_employee_id, vehicle_registration_number, pass_issue_quality
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          current_stage = EXCLUDED.current_stage,
          overall_confidence = EXCLUDED.overall_confidence,
          image_quality = EXCLUDED.image_quality`,
        [
          docId, doc.id, doc.fileName, (doc as any).storedFileName || null, (doc as any).storedFilePath || null,
          doc.fileSize, doc.mimeType, postgresId('document_types', doc.documentTypeId), doc.templateId ? postgresId('document_templates', doc.templateId) : null, doc.status,
          doc.currentStage, doc.overallConfidence, doc.isDuplicate, JSON.stringify(doc.imageQuality || {}),
          postgresId('users', doc.uploadedBy), doc.uploadedAt, doc.visitorName || null, doc.mobileNumber || null,
          doc.visitDate || null, doc.hostEmployeeId || null, doc.vehicleRegistrationNumber || null,
          doc.passIssueQuality || null
        ]
      );
    } catch (err) {
      this.throwWriteError('Inserting document', err);
    }
  }

  /** Mirrors only the in-memory reference configuration needed by UUID FKs. */
  public async syncReferenceData(): Promise<void> {
    if (!this.isConnected || !this.pool) return;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const user of db.users) await client.query(
        `INSERT INTO users (id,email,name,role,created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email,name=EXCLUDED.name,role=EXCLUDED.role`,
        [postgresId('users', user.id), user.email, user.name, user.role, user.createdAt]);
      for (const type of db.documentTypes) await client.query(
        `INSERT INTO document_types (id,code,name,description,active,created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code,name=EXCLUDED.name,description=EXCLUDED.description,active=EXCLUDED.active`,
        [postgresId('document_types', type.id), type.code, type.name, type.description, type.active, type.createdAt]);
      for (const template of db.documentTemplates) await client.query(
        `INSERT INTO document_templates (id,document_type_id,name,version,description,sample_image_url,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,version=EXCLUDED.version,description=EXCLUDED.description`,
        [postgresId('document_templates', template.id), postgresId('document_types', template.documentTypeId), template.name, template.version, template.description, template.sampleImageUrl || null, template.createdAt]);
      for (const field of db.templateFields) await client.query(
        `INSERT INTO template_fields (id,template_id,field_key,label,field_type,validation_regex,is_required,min_confidence,bbox_x,bbox_y,bbox_width,bbox_height) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO UPDATE SET label=EXCLUDED.label,validation_regex=EXCLUDED.validation_regex`,
        [postgresId('template_fields', field.id), postgresId('document_templates', field.templateId), field.fieldKey, field.label, field.fieldType, field.validationRegex || null, field.isRequired, field.minConfidence, field.boundingBox.x, field.boundingBox.y, field.boundingBox.width, field.boundingBox.height]);
      await client.query('COMMIT');
    } catch (err) { await client.query('ROLLBACK'); this.throwWriteError('Synchronizing reference data', err); } finally { client.release(); }
  }

  public async getDocuments(): Promise<Document[]> {
    if (!this.isConnected || !this.pool) return [];
    try {
      const res = await this.pool.query('SELECT * FROM documents ORDER BY uploaded_at DESC');
      return res.rows.map(r => ({
        id: r.application_id || r.id,
        fileName: r.file_name,
        storedFileName: r.stored_file_name,
        storedFilePath: r.stored_file_path,
        fileSize: Number(r.file_size),
        mimeType: r.mime_type,
        documentTypeId: r.document_type_id,
        templateId: r.template_id,
        status: r.status,
        currentStage: r.current_stage,
        overallConfidence: Number(r.overall_confidence),
        isDuplicate: r.is_duplicate,
        imageQuality: r.image_quality || {},
        uploadedBy: r.uploaded_by,
        uploadedAt: r.uploaded_at,
        visitorName: r.visitor_name,
        mobileNumber: r.mobile_number,
        visitDate: r.visit_date,
        hostEmployeeId: r.host_employee_id,
        vehicleRegistrationNumber: r.vehicle_registration_number,
        passIssueQuality: r.pass_issue_quality
      }));
    } catch (err) {
      console.error('[PostgreSQL] Error fetching documents:', err);
      return [];
    }
  }

  public async insertProcessingJob(job: ProcessingJob): Promise<void> {
    if (!this.isConnected || !this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO processing_jobs (id, document_id, job_type, status, progress_percentage, started_at, completed_at, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           progress_percentage = EXCLUDED.progress_percentage,
           completed_at = EXCLUDED.completed_at,
           error_message = EXCLUDED.error_message`,
        [postgresId('processing_jobs', job.id), postgresId('documents', job.documentId), job.jobType, job.status, job.progressPercentage, job.startedAt || null, job.completedAt || null, job.errorMessage || null]
      );
    } catch (err) {
      this.throwWriteError('Inserting processing job', err);
    }
  }

  public async getProcessingJobs(): Promise<ProcessingJob[]> {
    if (!this.isConnected || !this.pool) return [];
    try {
      const res = await this.pool.query('SELECT * FROM processing_jobs ORDER BY started_at DESC');
      return res.rows.map(r => ({
        id: r.id,
        documentId: r.document_id,
        jobType: r.job_type,
        status: r.status,
        progressPercentage: Number(r.progress_percentage),
        startedAt: r.started_at,
        completedAt: r.completed_at,
        errorMessage: r.error_message
      }));
    } catch (err) {
      console.error('[PostgreSQL] Error fetching processing jobs:', err);
      return [];
    }
  }

  public async insertExtractedFields(fields: ExtractedField[]): Promise<void> {
    if (!this.isConnected || !this.pool || fields.length === 0) return;
    try {
      for (const f of fields) {
        await this.pool.query(
          `INSERT INTO extracted_fields (
            id, document_id, template_field_id, field_key, label, ocr_value, final_value,
            confidence, confidence_level, is_valid, validation_message, is_corrected, region_box
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO UPDATE SET
            final_value = EXCLUDED.final_value,
            is_corrected = EXCLUDED.is_corrected`,
          [
            postgresId('extracted_fields', f.id), postgresId('documents', f.documentId), f.templateFieldId ? postgresId('template_fields', f.templateFieldId) : null, f.fieldKey, f.label, f.ocrValue,
            f.finalValue, f.confidence, f.confidenceLevel, f.isValid, f.validationMessage || null,
            f.isCorrected, JSON.stringify(f.regionBox || {})
          ]
        );
      }
    } catch (err) {
      this.throwWriteError('Inserting extracted fields', err);
    }
  }

  /** Persists observations made by the existing pipeline; it never invokes OCR. */
  public async persistOcrArtifacts(artifacts: {
    regions: any[]; predictions: any[]; validations: Array<any & { extractedFieldId: string }>;
  }): Promise<void> {
    if (!this.isConnected || !this.pool) return;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const region of artifacts.regions) {
        await client.query(`INSERT INTO detected_regions (id, document_id, field_key, label, bbox_x, bbox_y, bbox_width, bbox_height, cropped_image_path)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
          [postgresId('detected_regions', region.id), postgresId('documents', region.documentId), region.fieldKey, region.label, region.boundingBox.x, region.boundingBox.y, region.boundingBox.width, region.boundingBox.height, region.croppedImageUrl || null]);
      }
      for (const prediction of artifacts.predictions) {
        await client.query(`INSERT INTO ocr_predictions (id, document_id, region_id, field_key, model_name, model_version, raw_text, cleaned_text, confidence, processing_time_ms, cropped_image_path)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
          [postgresId('ocr_predictions', prediction.id), postgresId('documents', prediction.documentId), postgresId('detected_regions', prediction.regionId), prediction.fieldKey, prediction.modelName, prediction.modelVersion, prediction.rawText, prediction.cleanedText, prediction.confidence, prediction.processingTimeMs, prediction.croppedImagePath || null]);
      }
      for (const validation of artifacts.validations) {
        await client.query(`INSERT INTO field_validations (id, extracted_field_id, field_key, raw_value, is_valid, rule_applied, error_message, validated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
          [postgresId('field_validations', validation.id), postgresId('extracted_fields', validation.extractedFieldId), validation.fieldKey, validation.rawValue, validation.isValid, validation.validationRuleApplied, validation.errorMessage || null, validation.validatedAt]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      this.throwWriteError('Persisting OCR provenance', err);
    } finally { client.release(); }
  }

  public async persistVerification(doc: Document, fields: ExtractedField[], corrections: HumanCorrection[], structured: any, audit: AuditLog): Promise<void> {
    if (!this.isConnected || !this.pool) return;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`UPDATE documents SET status=$2, current_stage=$3, verified_by=$4, verified_at=$5 WHERE id=$1`, [postgresId('documents', doc.id), doc.status, doc.currentStage, doc.verifiedBy ? postgresId('users', doc.verifiedBy) : null, doc.verifiedAt || null]);
      for (const f of fields) await client.query(`UPDATE extracted_fields SET final_value=$2,is_corrected=$3,is_valid=$4,validation_message=$5 WHERE id=$1`, [postgresId('extracted_fields', f.id), f.finalValue, f.isCorrected, f.isValid, f.validationMessage || null]);
      for (const c of corrections) await client.query(`INSERT INTO human_corrections (id,document_id,field_key,original_ocr_text,corrected_text,confidence,model_version,corrected_by,corrected_at,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`, [postgresId('human_corrections',c.id),postgresId('documents',c.documentId),c.fieldKey,c.originalOcrText,c.correctedText,c.confidence,c.modelVersion,c.correctedBy ? postgresId('users',c.correctedBy) : null,c.correctedAt,c.notes || null]);
      await client.query(`INSERT INTO structured_records (id,document_id,document_type_code,payload,is_verified,created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (document_id) DO UPDATE SET payload=EXCLUDED.payload,is_verified=EXCLUDED.is_verified`, [postgresId('structured_records',structured.id),postgresId('documents',structured.documentId),structured.documentTypeCode,JSON.stringify(structured.payload),structured.isVerified,structured.createdAt]);
      await client.query(`INSERT INTO audit_logs (id,user_id,action,resource,details,timestamp) VALUES ($1,$2,$3,$4,$5,$6)`, [postgresId('audit_logs',audit.id),audit.userId ? postgresId('users',audit.userId) : null,audit.action,audit.resource,audit.details,audit.timestamp]);
      await client.query('COMMIT');
    } catch (err) { await client.query('ROLLBACK'); this.throwWriteError('Persisting verification transaction', err); } finally { client.release(); }
  }

  public async insertExportJob(job: any): Promise<void> { if (this.isConnected && this.pool) await this.pool.query(`INSERT INTO export_jobs (id,format,document_count,status,file_url,created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`, [postgresId('export_jobs',job.id),job.format,job.documentCount,job.status,job.fileUrl || null,job.createdAt]); }
  public async insertDuplicateMatch(match: any): Promise<void> { if (this.isConnected && this.pool) await this.pool.query(`INSERT INTO duplicate_matches (id,document_id,matched_document_id,similarity_score,match_reason,detected_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`, [postgresId('duplicate_matches',match.id),postgresId('documents',match.documentId),postgresId('documents',match.matchedDocumentId),match.similarityScore,match.matchReason,match.detectedAt]); }
  public async insertDatasetVersion(dataset: any): Promise<void> { if (this.isConnected && this.pool) await this.pool.query(`INSERT INTO dataset_versions (id,name,version,sample_count,corrected_samples_count,document_type_id,download_url,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`, [postgresId('dataset_versions',dataset.id),dataset.name,dataset.version,dataset.sampleCount,dataset.correctedSamplesCount,dataset.documentTypeId ? postgresId('document_types',dataset.documentTypeId) : null,dataset.downloadUrl || null,dataset.createdAt]); }

  /** Read-only provenance snapshot for operational integrity checks. */
  public async getDocumentDiagnostic(documentId: string): Promise<Record<string, unknown> | null> {
    if (!this.isConnected || !this.pool) return null;
    try {
      const [document, detectedRegions, ocrPredictions, fieldValidations, humanCorrections, structuredRecord, duplicateMatches, auditLogs] = await Promise.all([
        this.pool.query('SELECT * FROM documents WHERE application_id = $1 OR id = $2', [documentId, postgresId('documents', documentId)]),
        this.pool.query('SELECT * FROM detected_regions WHERE document_id = $1 ORDER BY field_key, id', [postgresId('documents', documentId)]),
        this.pool.query(`SELECT p.* FROM ocr_predictions p JOIN detected_regions r ON r.id = p.region_id
          WHERE r.document_id = $1 ORDER BY p.field_key, p.id`, [postgresId('documents', documentId)]),
        this.pool.query(`SELECT v.* FROM field_validations v JOIN extracted_fields f ON f.id = v.extracted_field_id
          WHERE f.document_id = $1 ORDER BY v.field_key, v.id`, [postgresId('documents', documentId)]),
        this.pool.query('SELECT * FROM human_corrections WHERE document_id = $1 ORDER BY corrected_at, id', [postgresId('documents', documentId)]),
        this.pool.query('SELECT * FROM structured_records WHERE document_id = $1', [postgresId('documents', documentId)]),
        this.pool.query('SELECT * FROM duplicate_matches WHERE document_id = $1 OR matched_document_id = $1 ORDER BY detected_at, id', [postgresId('documents', documentId)]),
        this.pool.query(`SELECT * FROM audit_logs WHERE resource = $1 OR details LIKE $2 ORDER BY timestamp, id`, [`Document ${documentId}`, `%${documentId}%`])
      ]);

      return {
        document: document.rows[0] || null,
        detectedRegions: detectedRegions.rows,
        ocrPredictions: ocrPredictions.rows,
        fieldValidations: fieldValidations.rows,
        humanCorrections: humanCorrections.rows,
        structuredRecord: structuredRecord.rows[0] || null,
        duplicateMatches: duplicateMatches.rows,
        auditLogs: auditLogs.rows,
        exportJobs: {
          documentLinkAvailable: false,
          records: [],
          note: 'export_jobs has no document_id relationship, so no document-specific rows can be reported.'
        }
      };
    } catch (err) {
      console.error('[PostgreSQL] Reading document diagnostic failed:', err);
      throw err;
    }
  }

  public async getExtractedFieldsByDocumentId(documentId: string): Promise<ExtractedField[]> {
    if (!this.isConnected || !this.pool) return [];
    try {
      const res = await this.pool.query('SELECT f.*, d.application_id FROM extracted_fields f JOIN documents d ON d.id=f.document_id WHERE f.document_id = $1', [postgresId('documents', documentId)]);
      return res.rows.map(r => ({
        id: r.id,
        documentId: r.application_id || r.document_id,
        templateFieldId: r.template_field_id,
        fieldKey: r.field_key,
        label: r.label,
        ocrValue: r.ocr_value,
        finalValue: r.final_value,
        confidence: Number(r.confidence),
        confidenceLevel: r.confidence_level,
        isValid: r.is_valid,
        validationMessage: r.validation_message,
        isCorrected: r.is_corrected,
        regionBox: r.region_box || {}
      }));
    } catch (err) {
      console.error('[PostgreSQL] Error fetching extracted fields:', err);
      return [];
    }
  }

  public async getExtractedFields(): Promise<ExtractedField[]> {
    if (!this.isConnected || !this.pool) return [];
    try {
      const res = await this.pool.query('SELECT f.*, d.application_id FROM extracted_fields f JOIN documents d ON d.id=f.document_id ORDER BY f.document_id');
      return res.rows.map(r => ({
        id: r.id,
        documentId: r.application_id || r.document_id,
        templateFieldId: r.template_field_id,
        fieldKey: r.field_key,
        label: r.label,
        ocrValue: r.ocr_value,
        finalValue: r.final_value,
        confidence: Number(r.confidence),
        confidenceLevel: r.confidence_level,
        isValid: r.is_valid,
        validationMessage: r.validation_message,
        isCorrected: r.is_corrected,
        regionBox: r.region_box || {}
      }));
    } catch (err) {
      console.error('[PostgreSQL] Error fetching all extracted fields:', err);
      return [];
    }
  }

  public async getHumanCorrections(): Promise<HumanCorrection[]> {
    if (!this.isConnected || !this.pool) return [];
    try {
      const res = await this.pool.query('SELECT h.*, d.application_id FROM human_corrections h JOIN documents d ON d.id=h.document_id ORDER BY h.corrected_at DESC');
      return res.rows.map(r => ({
        id: r.id,
        documentId: r.application_id || r.document_id,
        fieldKey: r.field_key,
        originalOcrText: r.original_ocr_text,
        correctedText: r.corrected_text,
        confidence: Number(r.confidence),
        modelVersion: r.model_version,
        correctedBy: r.corrected_by,
        correctedAt: r.corrected_at,
        notes: r.notes
      }));
    } catch (err) {
      console.error('[PostgreSQL] Error fetching human corrections:', err);
      return [];
    }
  }

  public async insertHumanCorrection(correction: HumanCorrection): Promise<void> {
    if (!this.isConnected || !this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO human_corrections (id, document_id, field_key, original_ocr_text, corrected_text, confidence, model_version, corrected_by, corrected_at, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          correction.id, correction.documentId, correction.fieldKey, correction.originalOcrText,
          correction.correctedText, correction.confidence, correction.modelVersion,
          correction.correctedBy || null, correction.correctedAt, correction.notes || null
        ]
      );
    } catch (err) {
      this.throwWriteError('Inserting human correction', err);
    }
  }

  public async insertAuditLog(log: AuditLog): Promise<void> {
    if (!this.isConnected || !this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO audit_logs (id, user_id, action, resource, details, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [postgresId('audit_logs', log.id), log.userId ? postgresId('users', log.userId) : null, log.action, log.resource, log.details, log.timestamp]
      );
    } catch (err) {
      this.throwWriteError('Inserting audit log', err);
    }
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    if (!this.isConnected || !this.pool) return [];
    try {
      const res = await this.pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100');
      return res.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        action: r.action,
        resource: r.resource,
        details: r.details,
        timestamp: r.timestamp
      }));
    } catch (err) {
      console.error('[PostgreSQL] Error fetching audit logs:', err);
      return [];
    }
  }
}

export const postgresDb = new PostgresDatabaseService();
