/**
 * Input Validation Utilities
 * 
 * Centralized input validation functions to ensure data integrity
 * and provide consistent error messages.
 */

import { ValidationError } from './errors';

/**
 * Validate that a value is not null or undefined
 * 
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error message
 * @throws {ValidationError} - If value is null or undefined
 */
export const validateRequired = (value, fieldName = 'Field') => {
  if (value === null || value === undefined) {
    throw new ValidationError(`${fieldName} is required`);
  }
};

/**
 * Validate that a string is not empty
 * 
 * @param {string} value - String to validate
 * @param {string} fieldName - Name of the field for error message
 * @throws {ValidationError} - If string is empty
 */
export const validateNonEmpty = (value, fieldName = 'Field') => {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }
};

/**
 * Validate that a value is an array
 * 
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error message
 * @throws {ValidationError} - If value is not an array
 */
export const validateArray = (value, fieldName = 'Field') => {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`);
  }
};

/**
 * Validate that an array is not empty
 * 
 * @param {Array} value - Array to validate
 * @param {string} fieldName - Name of the field for error message
 * @throws {ValidationError} - If array is empty
 */
export const validateNonEmptyArray = (value, fieldName = 'Field') => {
  validateArray(value, fieldName);
  if (value.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }
};

/**
 * Validate that a value is a positive number
 * 
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error message
 * @throws {ValidationError} - If value is not a positive number
 */
export const validatePositiveNumber = (value, fieldName = 'Field') => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num) || num <= 0) {
    throw new ValidationError(`${fieldName} must be a positive number`);
  }
  return num;
};

/**
 * Validate that a value is within a range
 * 
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {string} fieldName - Name of the field for error message
 * @throws {ValidationError} - If value is out of range
 */
export const validateRange = (value, min, max, fieldName = 'Field') => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num) || num < min || num > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max}`);
  }
  return num;
};

/**
 * Validate file type
 * 
 * @param {File} file - File to validate
 * @param {string|Array<string>} allowedTypes - Allowed MIME types
 * @throws {ValidationError} - If file type is not allowed
 */
export const validateFileType = (file, allowedTypes = ['application/pdf']) => {
  if (!file || !(file instanceof File)) {
    throw new ValidationError('Invalid file object');
  }
  
  const types = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes];
  if (!types.includes(file.type)) {
    throw new ValidationError(`File must be one of: ${types.join(', ')}`);
  }
};

/**
 * Validate file size
 * 
 * @param {File} file - File to validate
 * @param {number} maxSizeMB - Maximum size in MB
 * @throws {ValidationError} - If file is too large
 */
export const validateFileSize = (file, maxSizeMB = 10) => {
  if (!file || !(file instanceof File)) {
    throw new ValidationError('Invalid file object');
  }
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new ValidationError(`File size must be less than ${maxSizeMB}MB`);
  }
};

/**
 * Validate transaction object structure
 * 
 * @param {Object} transaction - Transaction to validate
 * @throws {ValidationError} - If transaction is invalid
 */
export const validateTransaction = (transaction) => {
  if (!transaction || typeof transaction !== 'object') {
    throw new ValidationError('Transaction must be an object');
  }
  
  validateNonEmpty(transaction.date, 'Transaction date');
  validateNonEmpty(transaction.merchant, 'Transaction merchant');
  validatePositiveNumber(transaction.amount, 'Transaction amount');
};

/**
 * Validate emission factors object structure
 * 
 * @param {Object} emissionFactors - Emission factors to validate
 * @throws {ValidationError} - If emission factors are invalid
 */
export const validateEmissionFactors = (emissionFactors) => {
  if (!emissionFactors || typeof emissionFactors !== 'object') {
    throw new ValidationError('Emission factors must be an object');
  }
  
  if (!emissionFactors.categories || typeof emissionFactors.categories !== 'object') {
    throw new ValidationError('Emission factors must have a categories object');
  }
};

