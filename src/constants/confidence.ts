/**
 * Centralized OCR & Verification Confidence Thresholds
 * Single source of truth across Dashboard, Verification, Templates, Validation, and Architecture.
 */

export const HIGH_CONFIDENCE_THRESHOLD = 0.85;
export const MEDIUM_CONFIDENCE_THRESHOLD = 0.65;

export type ConfidenceLevel = 'high' | 'medium' | 'low';

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
