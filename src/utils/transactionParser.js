/**
 * Transaction Parser Utility
 * 
 * Parses individual transactions from DBS credit card statement text
 * Handles complex cases:
 * - Simple SGD transactions
 * - Foreign currency (multi-line)
 * - Credits/refunds
 * - Fees and charges
 * 
 * Privacy: All sensitive data should be masked before this step
 */

import { maskAllSensitiveData, validateTextIsSafe } from './privacyMasking';
import { regexPatternStrategy, dateSplitStrategy, lineByLineStrategy } from './transactionParser/strategies';
import { parseSingleTransaction } from './transactionParser/singleTransaction';
import { PrivacyError } from './errors';
import logger from './logger';
import { validateNonEmpty } from './validation';
import { VALIDATION } from '../constants';

/**
 * Parse DBS statement transactions
 * 
 * @param {string} transactionText - Text between "NEW TRANSACTIONS" and "SUB-TOTAL"
 * @returns {Array} - Array of parsed transaction objects
 */
export const parseDBSTransactions = (transactionText) => {
  // Input validation
  validateNonEmpty(transactionText, 'Transaction text');
  
  logger.info('Parsing transactions...');
  logger.debug(`Input length: ${transactionText.length} characters`);

  // Step 1: Mask sensitive data FIRST
  const { maskedText } = maskAllSensitiveData(transactionText);

  // Step 2: Validate masking worked
  const validation = validateTextIsSafe(maskedText);
  if (!validation.isSafe) {
    throw new PrivacyError(
      'Privacy violation: Sensitive data still present after masking.',
      validation.violations
    );
  }

  logger.debug('Attempting to parse transactions from text...');
  logger.debug(`Text sample (first 500 chars): ${maskedText.substring(0, 500)}`);

  let transactions = [];
  let skippedCount = 0;
  let failedCount = 0;

  // Strategy 1: Try regex pattern matching
  logger.debug('Trying regex pattern strategy...');
  let result = regexPatternStrategy(maskedText);
  transactions = result.transactions;
  skippedCount = result.skippedCount;
  failedCount = result.failedCount;
  
  logger.debug(`Regex strategy: Found ${transactions.length} transactions (skipped: ${skippedCount}, failed: ${failedCount})`);

  // Strategy 2: If no transactions found, try date-split approach
  if (transactions.length === 0) {
    logger.debug('No regex matches, trying date-split strategy...');
    result = dateSplitStrategy(maskedText);
    transactions = result.transactions;
    skippedCount = result.skippedCount;
    failedCount = result.failedCount;
    
    logger.debug(`Date-split strategy: Found ${transactions.length} transactions (skipped: ${skippedCount}, failed: ${failedCount})`);
  }

  // Strategy 3: If still no transactions, fall back to line-by-line parsing
  if (transactions.length === 0) {
    logger.debug('No matches found, trying line-by-line strategy...');
    const lines = maskedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    logger.debug(`Total lines: ${lines.length}`);
    logger.debug(`First 10 lines: ${lines.slice(0, 10).join(', ')}`);
    
    result = lineByLineStrategy(maskedText, parseSingleTransaction);
    transactions = result.transactions;
    skippedCount = result.skippedCount;
    failedCount = result.failedCount;
    
    logger.debug(`Line-by-line strategy: Found ${transactions.length} transactions (skipped: ${skippedCount}, failed: ${failedCount})`);
  }

  logger.success('Parsing complete');
  logger.info(`Transactions found: ${transactions.length}`);
  logger.debug(`Total amount: SGD ${transactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}`);

  return transactions;
};

// Re-export parseSingleTransaction for use in strategies
export { parseSingleTransaction };

/**
 * Validate parsed transactions against expected total
 * 
 * @param {Array} transactions - Parsed transactions
 * @param {number} expectedTotal - SUB-TOTAL from statement
 * @returns {Object} - Validation result
 */
export const validateParsedTransactions = (transactions, expectedTotal) => {
  console.log('🔍 Validating parsed transactions...');

  const parsedTotal = transactions.reduce((sum, t) => sum + t.amount, 0);
  const difference = Math.abs(parsedTotal - expectedTotal);
  const percentDiff = (difference / expectedTotal) * VALIDATION.PERCENTAGE_MULTIPLIER;

  const isValid = difference < VALIDATION.TRANSACTION_TOTAL_TOLERANCE;

  const result = {
    parsedTotal: parseFloat(parsedTotal.toFixed(2)),
    expectedTotal: parseFloat(expectedTotal.toFixed(2)),
    difference: parseFloat(difference.toFixed(2)),
    percentDiff: parseFloat(percentDiff.toFixed(2)),
    isValid,
    transactionCount: transactions.length
  };

  if (isValid) {
    logger.success('Validation passed');
    logger.info(`Parsed total: SGD ${result.parsedTotal.toFixed(2)}`);
    logger.debug(`Expected total: SGD ${result.expectedTotal.toFixed(2)}`);
    logger.debug(`Difference: SGD ${result.difference.toFixed(2)}`);
  } else {
    logger.warn('Validation warning');
    logger.warn(`Parsed total: SGD ${result.parsedTotal.toFixed(2)}`);
    logger.warn(`Expected total: SGD ${result.expectedTotal.toFixed(2)}`);
    logger.warn(`Difference: SGD ${result.difference.toFixed(2)} (${result.percentDiff.toFixed(1)}%)`);
    logger.warn('Possible missing transactions or parsing errors');
  }

  return result;
};

/**
 * Group transactions by month
 * 
 * @param {Array} transactions - Parsed transactions
 * @returns {Object} - Transactions grouped by month
 */
export const groupTransactionsByMonth = (transactions) => {
  const grouped = {};

  transactions.forEach(transaction => {
    const month = transaction.date.split(' ')[1]; // Get month (e.g., "SEP", "OCT")
    
    if (!grouped[month]) {
      grouped[month] = {
        transactions: [],
        total: 0,
        count: 0
      };
    }

    grouped[month].transactions.push(transaction);
    grouped[month].total += transaction.amount;
    grouped[month].count++;
  });

  // Round totals
  Object.keys(grouped).forEach(month => {
    grouped[month].total = parseFloat(grouped[month].total.toFixed(2));
  });

  return grouped;
};

/**
 * Get statistics from parsed transactions
 * 
 * @param {Array} transactions - Parsed transactions
 * @returns {Object} - Statistics
 */
export const getTransactionStatistics = (transactions) => {
  const stats = {
    total: transactions.length,
    simple: transactions.filter(t => t.type === 'simple').length,
    foreign: transactions.filter(t => t.type === 'foreign').length,
    totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
    averageAmount: 0,
    minAmount: Math.min(...transactions.map(t => t.amount)),
    maxAmount: Math.max(...transactions.map(t => t.amount)),
    currencies: new Set(transactions.map(t => t.originalCurrency).filter(Boolean)).size
  };

  stats.averageAmount = stats.total > 0 ? stats.totalAmount / stats.total : 0;

  // Round values
  stats.totalAmount = parseFloat(stats.totalAmount.toFixed(2));
  stats.averageAmount = parseFloat(stats.averageAmount.toFixed(2));
  stats.minAmount = parseFloat(stats.minAmount.toFixed(2));
  stats.maxAmount = parseFloat(stats.maxAmount.toFixed(2));

  return stats;
};

// Export all functions
const transactionParser = {
  parseDBSTransactions,
  validateParsedTransactions,
  groupTransactionsByMonth,
  getTransactionStatistics
};

export default transactionParser;