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

  // Always log to console for debugging
  console.log('═══════════════════════════════════════════════');
  console.log('🔍 PARSING TRANSACTIONS - DEBUG INFO');
  console.log('═══════════════════════════════════════════════');
  console.log(`Text sample (first 500 chars): ${maskedText.substring(0, 500)}`);
  
  // Log lines for debugging
  const linesForDebug = maskedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  console.log(`Total non-empty lines: ${linesForDebug.length}`);
  console.log('First 30 lines:', linesForDebug.slice(0, 30));
  
  // Check for specific patterns that might indicate the problematic transactions
  const hasEuropeanMonetary = maskedText.includes('EUROPEAN MONETARY');
  const hasRomeIt = maskedText.includes('ROME IT');
  const hasSingaporeId = /SINGAPORE\d+/.test(maskedText);
  console.log(`🔍 Debug checks: hasEuropeanMonetary=${hasEuropeanMonetary}, hasRomeIt=${hasRomeIt}, hasSingaporeId=${hasSingaporeId}`);
  
  if (hasEuropeanMonetary) {
    const euroLines = linesForDebug.filter(l => l.includes('EUROPEAN MONETARY'));
    console.log(`📋 Lines containing EUROPEAN MONETARY (${euroLines.length}):`, euroLines);
    
    // Find lines around EUROPEAN MONETARY to see context
    euroLines.forEach(euroLine => {
      const idx = linesForDebug.indexOf(euroLine);
      console.log(`📋 Context around EUROPEAN MONETARY at line ${idx}:`);
      console.log(`   Line ${idx - 1}: "${linesForDebug[idx - 1]}"`);
      console.log(`   Line ${idx}: "${euroLine}"`);
      console.log(`   Line ${idx + 1}: "${linesForDebug[idx + 1] || 'N/A'}"`);
      console.log(`   Line ${idx + 2}: "${linesForDebug[idx + 2] || 'N/A'}"`);
    });
  }
  
  // Check for 26 OCT pattern
  const oct26Lines = linesForDebug.filter(l => l.includes('26 OCT'));
  if (oct26Lines.length > 0) {
    console.log(`📋 Lines containing "26 OCT" (${oct26Lines.length}):`, oct26Lines);
  }
  
  logger.debug('Attempting to parse transactions from text...');
  logger.debug(`Text sample (first 500 chars): ${maskedText.substring(0, 500)}`);
  logger.debug(`Total non-empty lines: ${linesForDebug.length}`);
  logger.debug('First 20 lines:', linesForDebug.slice(0, 20));
  logger.debug(`Debug checks: hasEuropeanMonetary=${hasEuropeanMonetary}, hasRomeIt=${hasRomeIt}, hasSingaporeId=${hasSingaporeId}`);
  
  if (hasEuropeanMonetary) {
    const euroLines = linesForDebug.filter(l => l.includes('EUROPEAN MONETARY'));
    logger.debug(`Lines containing EUROPEAN MONETARY:`, euroLines);
  }

  let transactions = [];
  let skippedCount = 0;
  let failedCount = 0;

  // Strategy 1: Try regex pattern matching
  logger.debug('Trying regex pattern strategy...');
  let result = regexPatternStrategy(maskedText);
  const regexTransactions = result.transactions;
  skippedCount += result.skippedCount;
  failedCount += result.failedCount;
  
  logger.debug(`Regex strategy: Found ${regexTransactions.length} transactions (skipped: ${skippedCount}, failed: ${failedCount})`);

  // Strategy 2: If no transactions found, try date-split approach
  let dateSplitTransactions = [];
  if (regexTransactions.length === 0) {
    logger.debug('No regex matches, trying date-split strategy...');
    result = dateSplitStrategy(maskedText);
    dateSplitTransactions = result.transactions;
    skippedCount += result.skippedCount;
    failedCount += result.failedCount;
    
    logger.debug(`Date-split strategy: Found ${dateSplitTransactions.length} transactions (skipped: ${result.skippedCount}, failed: ${result.failedCount})`);
  }

  // Strategy 3: Always run line-by-line parsing to catch foreign currency transactions
  // that were skipped by regex/date-split strategies
  logger.debug('Running line-by-line strategy to catch foreign currency transactions...');
  const lines = maskedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  logger.debug(`Total lines: ${lines.length}`);
  
  result = lineByLineStrategy(maskedText, parseSingleTransaction);
  const lineByLineTransactions = result.transactions;
  skippedCount += result.skippedCount;
  failedCount += result.failedCount;
  
  logger.debug(`Line-by-line strategy: Found ${lineByLineTransactions.length} transactions (skipped: ${result.skippedCount}, failed: ${result.failedCount})`);

  // Merge transactions from all strategies
  // Use a Set to deduplicate by date+merchant+amount (in case multiple strategies found the same transaction)
  const transactionMap = new Map();
  
  // Add regex transactions
  regexTransactions.forEach(t => {
    const key = `${t.date}|${t.merchant}|${t.amount}`;
    if (!transactionMap.has(key)) {
      transactionMap.set(key, t);
    }
  });
  
  // Add date-split transactions
  dateSplitTransactions.forEach(t => {
    const key = `${t.date}|${t.merchant}|${t.amount}`;
    if (!transactionMap.has(key)) {
      transactionMap.set(key, t);
    }
  });
  
  // Add line-by-line transactions (these take precedence for foreign currency transactions)
  lineByLineTransactions.forEach(t => {
    const key = `${t.date}|${t.merchant}|${t.amount}`;
    // Always use line-by-line result if it exists (it has better foreign currency handling)
    transactionMap.set(key, t);
  });
  
  transactions = Array.from(transactionMap.values());
  
  logger.debug(`Merged results: ${transactions.length} unique transactions from all strategies`);

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