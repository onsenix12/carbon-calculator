/**
 * Error Handling Utilities
 * 
 * Standardized error handling across the application.
 * Provides consistent error types, messages, and handling patterns.
 */

/**
 * Custom Error Classes
 */
export class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class PrivacyError extends AppError {
  constructor(message, violations = []) {
    super(message, 'PRIVACY_ERROR', { violations });
    this.name = 'PrivacyError';
  }
}

export class ParseError extends AppError {
  constructor(message, details = null) {
    super(message, 'PARSE_ERROR', details);
    this.name = 'ParseError';
  }
}

export class APIError extends AppError {
  constructor(message, statusCode = null, details = null) {
    super(message, 'API_ERROR', { statusCode, ...details });
    this.name = 'APIError';
    this.statusCode = statusCode;
  }
}

export class NetworkError extends AppError {
  constructor(message, details = null) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

/**
 * Error Codes
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PRIVACY_ERROR: 'PRIVACY_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  CORS_ERROR: 'CORS_ERROR',
  PDF_ERROR: 'PDF_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Create user-friendly error message
 * 
 * @param {Error|AppError} error - Error object
 * @returns {string} - User-friendly error message
 */
export const getUserFriendlyMessage = (error) => {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    // Map common error messages to user-friendly ones
    const messageMap = {
      'Failed to fetch': 'Network connection failed. Please check your internet connection.',
      'CORS': 'API access blocked. Please use a proxy server.',
      'Invalid PDF': 'This file is not a valid PDF. Please upload a DBS credit card statement PDF.',
      'Password': 'This PDF is password-protected. Please upload an unlocked PDF.',
      'corrupted': 'This PDF file appears to be corrupted. Please try downloading it again.'
    };
    
    for (const [key, friendlyMessage] of Object.entries(messageMap)) {
      if (error.message.includes(key)) {
        return friendlyMessage;
      }
    }
    
    return error.message || 'An unexpected error occurred. Please try again.';
  }
  
  return 'An unexpected error occurred. Please try again.';
};

/**
 * Check if error is a specific type
 * 
 * @param {Error} error - Error to check
 * @param {string} errorCode - Error code to check for
 * @returns {boolean} - True if error matches the code
 */
export const isErrorType = (error, errorCode) => {
  if (error instanceof AppError) {
    return error.code === errorCode;
  }
  return false;
};

/**
 * Wrap async function with error handling
 * 
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context for error messages
 * @returns {Function} - Wrapped function
 */
export const withErrorHandling = (fn, context = 'Operation') => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      // If already an AppError, re-throw
      if (error instanceof AppError) {
        throw error;
      }
      
      // Wrap in AppError with context
      throw new AppError(
        `${context} failed: ${getUserFriendlyMessage(error)}`,
        ERROR_CODES.UNKNOWN_ERROR,
        { originalError: error.message }
      );
    }
  };
};

/**
 * Handle API errors consistently
 * 
 * @param {Response} response - Fetch response object
 * @returns {Promise<Response>} - Response if OK, throws APIError otherwise
 */
export const handleAPIResponse = async (response) => {
  if (!response.ok) {
    let errorData = {};
    try {
      errorData = await response.json();
    } catch (e) {
      // Response is not JSON
    }
    
    throw new APIError(
      errorData.error?.message || errorData.error || response.statusText || 'API request failed',
      response.status,
      errorData
    );
  }
  
  return response;
};

/**
 * Check if error is a network/CORS error
 * 
 * @param {Error} error - Error to check
 * @returns {boolean} - True if network/CORS error
 */
export const isNetworkError = (error) => {
  if (error instanceof NetworkError || error instanceof APIError) {
    return error.code === ERROR_CODES.CORS_ERROR || error.code === ERROR_CODES.NETWORK_ERROR;
  }
  
  const networkIndicators = ['Failed to fetch', 'NetworkError', 'CORS', 'Network request failed'];
  return networkIndicators.some(indicator => 
    error.message?.includes(indicator) || error.name === 'TypeError'
  );
};

