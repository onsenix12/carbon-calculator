/**
 * Logging Utility
 * 
 * Centralized logging with levels and environment-aware behavior.
 * In production, only ERROR and WARN logs are shown.
 * In development, all logs are shown.
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

// Determine current log level based on environment
const getLogLevel = () => {
  if (process.env.NODE_ENV === 'production') {
    return LOG_LEVELS.WARN; // Only show warnings and errors in production
  }
  return LOG_LEVELS.DEBUG; // Show all logs in development
};

const currentLogLevel = getLogLevel();

/**
 * Base logging function
 * 
 * @param {number} level - Log level
 * @param {string} emoji - Emoji prefix
 * @param {string} message - Log message
 * @param {*} data - Optional data to log
 */
const log = (level, emoji, message, data = null) => {
  if (level < currentLogLevel) {
    return; // Don't log if below current level
  }
  
  const prefix = emoji ? `${emoji} ` : '';
  const fullMessage = `${prefix}${message}`;
  
  switch (level) {
    case LOG_LEVELS.ERROR:
      console.error(fullMessage, data || '');
      break;
    case LOG_LEVELS.WARN:
      console.warn(fullMessage, data || '');
      break;
    case LOG_LEVELS.INFO:
      console.log(fullMessage, data || '');
      break;
    case LOG_LEVELS.DEBUG:
      console.log(fullMessage, data || '');
      break;
    default:
      console.log(fullMessage, data || '');
  }
};

/**
 * Logger API
 */
export const logger = {
  /**
   * Debug logs - detailed information for debugging
   */
  debug: (message, data = null) => {
    log(LOG_LEVELS.DEBUG, '🔍', message, data);
  },
  
  /**
   * Info logs - general information
   */
  info: (message, data = null) => {
    log(LOG_LEVELS.INFO, 'ℹ️', message, data);
  },
  
  /**
   * Warning logs - warnings that don't stop execution
   */
  warn: (message, data = null) => {
    log(LOG_LEVELS.WARN, '⚠️', message, data);
  },
  
  /**
   * Error logs - errors that need attention
   */
  error: (message, data = null) => {
    log(LOG_LEVELS.ERROR, '❌', message, data);
  },
  
  /**
   * Success logs - successful operations
   */
  success: (message, data = null) => {
    log(LOG_LEVELS.INFO, '✅', message, data);
  },
  
  /**
   * Step logs - processing steps
   */
  step: (stepNumber, totalSteps, message) => {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      console.log(`   Step ${stepNumber}/${totalSteps}: ${message}`);
    }
  },
  
  /**
   * Progress logs - progress updates
   */
  progress: (current, total, message = '') => {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      const percentage = Math.round((current / total) * 100);
      console.log(`   ${message} ${current}/${total} (${percentage}%)`);
    }
  },
  
  /**
   * Group logs - group related logs
   */
  group: (label, callback) => {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      console.group(label);
      callback();
      console.groupEnd();
    } else {
      callback();
    }
  }
};

export default logger;

