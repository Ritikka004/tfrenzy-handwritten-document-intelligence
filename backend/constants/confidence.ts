/**
 * Centralized OCR & Verification Confidence Thresholds
 * Single source of truth across Dashboard, Verification, Templates, Validation, and Architecture.
 */

export const HIGH_CONFIDENCE_THRESHOLD = 0.85;
export const MEDIUM_CONFIDENCE_THRESHOLD = 0.65;

export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type FieldVerificationStatus = 'accepted' | 'review' | 'manual_correction';

/**
 * Returns canonical confidence category:
 * - 'high': confidence >= 0.85
 * - 'medium': 0.65 <= confidence < 0.85
 * - 'low': confidence < 0.65
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    return 'high';
  }
  if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) {
    return 'medium';
  }
  return 'low';
}

export function isHighConfidence(confidence: number): boolean {
  return confidence >= HIGH_CONFIDENCE_THRESHOLD;
}

export function isMediumConfidence(confidence: number): boolean {
  return confidence >= MEDIUM_CONFIDENCE_THRESHOLD && confidence < HIGH_CONFIDENCE_THRESHOLD;
}

export function isLowConfidence(confidence: number): boolean {
  return confidence < MEDIUM_CONFIDENCE_THRESHOLD;
}

/**
 * Canonical field decision used by processing, queueing, API responses, and UI.
 * A template field controls auto-acceptance; the global medium threshold only
 * distinguishes a review warning from a required manual correction.
 */
export function getFieldVerificationStatus(
  confidence: number,
  isValid: boolean,
  requiredConfidence = HIGH_CONFIDENCE_THRESHOLD
): FieldVerificationStatus {
  if (!isValid || confidence < MEDIUM_CONFIDENCE_THRESHOLD) return 'manual_correction';
  if (confidence < requiredConfidence) return 'review';
  return 'accepted';
}
