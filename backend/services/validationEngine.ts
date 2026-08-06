/**
 * Validation Engine Module
 * Applies strict data-type regex & semantic validation rules
 */

import { FieldType, FieldValidationResult, ConfidenceLevel } from '../../src/types/index.ts';

export class ValidationEngine {
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
        const dateRegex = /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/;
        isValid = dateRegex.test(trimmed);
        if (isValid) {
          const parsed = Date.parse(trimmed.replace(/\//g, '-'));
          if (isNaN(parsed)) {
            isValid = false;
            errorMessage = 'Invalid calendar date value.';
          }
        } else {
          errorMessage = 'Date must match YYYY-MM-DD or DD/MM/YYYY format.';
        }
        break;

      case 'employee_id':
        // Configured ID pattern e.g. EMP-1234 or similar
        const empRegex = customRegex ? new RegExp(customRegex) : /^EMP-?[0-9]{3,6}$/i;
        isValid = empRegex.test(trimmed);
        if (!isValid) errorMessage = 'Employee ID does not match expected format (e.g. EMP-4092).';
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        isValid = emailRegex.test(trimmed);
        if (!isValid) errorMessage = 'Invalid email address structure.';
        break;

      case 'vehicle_number':
        // Registration number pattern e.g. KA01AB1234
        const vehicleRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/i;
        isValid = vehicleRegex.test(trimmed.replace(/\s/g, ''));
        if (!isValid) errorMessage = 'Vehicle registration pattern invalid (e.g. KA01AB1234).';
        break;

      case 'quantity':
        // Numeric integer and within permitted positive range
        const num = Number(trimmed);
        isValid = !isNaN(num) && Number.isInteger(num) && num > 0 && num < 10000;
        if (!isValid) errorMessage = 'Quantity must be a positive integer.';
        break;

      case 'checklist':
        // Yes/No, Checked/Unchecked, true/false, 1/0
        const normalized = trimmed.toLowerCase();
        const validChecklistValues = ['yes', 'no', 'checked', 'unchecked', 'true', 'false', '1', '0', '[x]', '[ ]', 'v', 'x'];
        isValid = validChecklistValues.includes(normalized);
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

    // Determine confidence level:
    let confidenceLevel: ConfidenceLevel = 'high';
    if (!isValid || confidence < 0.65) {
      confidenceLevel = 'low';
    } else if (confidence < 0.85) {
      confidenceLevel = 'medium';
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
