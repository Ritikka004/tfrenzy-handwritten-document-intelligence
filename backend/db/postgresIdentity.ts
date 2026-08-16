import { v5 as uuidv5, validate as isUuid } from 'uuid';

export type PostgresEntity =
  | 'documents' | 'users' | 'document_types' | 'document_templates' | 'template_fields'
  | 'processing_jobs' | 'extracted_fields' | 'detected_regions' | 'ocr_predictions'
  | 'field_validations' | 'human_corrections' | 'structured_records' | 'duplicate_matches'
  | 'audit_logs' | 'dataset_versions' | 'export_jobs';

// Fixed namespaces keep database identity deterministic without exposing it to APIs.
const ROOT_NAMESPACE = '8e83a4d6-8e65-4e5c-a2b8-9035c8445a30';
const namespaces = Object.fromEntries(
  (['documents', 'users', 'document_types', 'document_templates', 'template_fields',
    'processing_jobs', 'extracted_fields', 'detected_regions', 'ocr_predictions',
    'field_validations', 'human_corrections', 'structured_records', 'duplicate_matches',
    'audit_logs', 'dataset_versions', 'export_jobs'] as PostgresEntity[])
    .map(entity => [entity, uuidv5(`tfrenzy:${entity}`, ROOT_NAMESPACE)])
) as Record<PostgresEntity, string>;

export function postgresId(entity: PostgresEntity, applicationId: string): string {
  return isUuid(applicationId) ? applicationId : uuidv5(applicationId, namespaces[entity]);
}
