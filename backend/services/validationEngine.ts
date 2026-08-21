/**
 * Validation Engine Module
 * Applies strict data-type regex & semantic validation rules
 */

import { FieldType, FieldValidationResult, ConfidenceLevel } from '../../src/types/index.ts';
import { getConfidenceLevel } from '../constants/confidence.ts';

export class ValidationEngine {
  /** Normalize only unambiguous OCR dates. Ambiguous/malformed text stays untouched. */
  public static normalizeDate(value: string): { value: string; error?: string } {
    const trimmed = (value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || /^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return { value: trimmed };
    if (!/^\d{8}$/.test(trimmed)) return { value: trimmed, error: 'Date must be YYYY-MM-DD or DD/MM/YYYY; OCR text was not safely normalized.' };
    const day = Number(trimmed.slice(0, 2));
    const month = Number(trimmed.slice(2, 4));
    const year = Number(trimmed.slice(4));
    if (day <= 12 && month <= 12) return { value: trimmed, error: 'Ambiguous eight-digit OCR date requires manual review.' };
    if (month < 1 || month > 12 || day < 1 || day > new Date(year, month, 0).getDate()) return { value: trimmed, error: 'Invalid calendar date value.' };
    return { value: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}` };
  }

  public static validateField(
    fieldKey: string,
    fieldType: FieldType,
    value: string,
    customRegex?: string,
    confidence: number = 0.90
  ): FieldValidationResult {
    const trimmed = value ? value.trim() : '';
    let isValid = true;
    let errorMessage: string | undefined;
    let ruleApplied = fieldType;

    if (!trimmed) {
      return {
        id: `val-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fieldKey,
        rawValue: value,
        isValid: false,
        validationRuleApplied: `${fieldType}_required`,
        errorMessage: 'Field is empty or missing.',
        confidenceLevel: 'low'
      };
    }

    switch (fieldType) {
      case 'name':
        // Alphabetic characters and supported punctuation (spaces, hyphens, dots)
        const nameRegex = /^[A-Za-z\s\.\'-]{2,60}$/;
        isValid = nameRegex.test(trimmed);
        if (!isValid) errorMessage = 'Name must contain only alphabetic characters, spaces, or hyphens.';
        break;

      case 'phone':
        // Mobile number: Expected digits (10 digits for standard mobile or 10-12 with country code)
        const cleanDigits = trimmed.replace(/\D/g, '');
        isValid = cleanDigits.length >= 10 && cleanDigits.length <= 12;
        if (!isValid) errorMessage = 'Phone number must contain 10 valid numerical digits.';
        break;

      case 'date':
        // Valid date format ISO YYYY-MM-DD or DD/MM/YYYY
        const normalized = this.normalizeDate(trimmed);
        if (normalized.error) {
          isValid = false;
          errorMessage = normalized.error;
          break;
        }
        const dateRegex = /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/;
        isValid = dateRegex.test(normalized.value);
        if (isValid) {
          const [year, month, day] = normalized.value.includes('/')
            ? [Number(normalized.value.slice(6)), Number(normalized.value.slice(3, 5)), Number(normalized.value.slice(0, 2))]
            : [Number(normalized.value.slice(0, 4)), Number(normalized.value.slice(5, 7)), Number(normalized.value.slice(8, 10))];
          if (month < 1 || month > 12 || day < 1 || day > new Date(year, month, 0).getDate()) {
            isValid = false;
            errorMessage = 'Invalid calendar date value.';
          }
        } else {
          errorMessage = 'Date must match YYYY-MM-DD or DD/MM/YYYY format.';
        }
        break;

      case 'employee_id':
        // Configured ID pattern e.g. EMP-4092 or EMP-2026-0457
        const empRegex = customRegex ? new RegExp(customRegex) : /^EMP[ -]?[0-9\-]{3,10}$/i;
        isValid = empRegex.test(trimmed);
        if (!isValid) errorMessage = 'Needs manual confirmation: Employee ID format invalid (e.g. EMP-2026-0457).';
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        isValid = emailRegex.test(trimmed);
        if (!isValid) errorMessage = 'Needs manual confirmation: Invalid email structure.';
        break;

      case 'vehicle_number':
        // Registration number pattern e.g. KL07CD1234 or TN09BX1234
        const vehicleRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/i;
        isValid = vehicleRegex.test(trimmed.replace(/\s/g, ''));
        if (!isValid) errorMessage = 'Needs manual confirmation: Vehicle registration pattern invalid.';
        break;

      case 'quantity':
        // Numeric integer and within permitted positive range
        const num = Number(trimmed);
        isValid = !isNaN(num) && Number.isInteger(num) && num > 0 && num < 10000;
        if (!isValid) errorMessage = 'Quantity must be a positive integer.';
        break;

      case 'checklist':
        // Yes/No, Checked/Unchecked, true/false, 1/0
        const normalizedChecklistValue = trimmed.toLowerCase();
        const validChecklistValues = ['yes', 'no', 'checked', 'unchecked', 'true', 'false', '1', '0', '[x]', '[ ]', 'v', 'x'];
        isValid = validChecklistValues.includes(normalizedChecklistValue);
        if (!isValid) errorMessage = 'Checklist value must be Yes/No or Checked/Unchecked.';
        break;

      case 'regex':
        if (customRegex) {
          const re = new RegExp(customRegex);
          isValid = re.test(trimmed);
          if (!isValid) errorMessage = `Value does not match custom validation rule: ${customRegex}`;
        }
        break;

      default:
        isValid = true;
    }

    // Determine confidence level using centralized classification
    let confidenceLevel: ConfidenceLevel = getConfidenceLevel(confidence);
    if (!isValid) {
      confidenceLevel = 'low';
    }

    return {
      id: `val-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fieldKey,
      rawValue: value,
      isValid,
      validationRuleApplied: ruleApplied,
      errorMessage: isValid ? undefined : errorMessage,
      confidenceLevel
    };
  }
}
