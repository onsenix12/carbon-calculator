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
  const line = lines[startIdx];

  // Pattern 1: Simple SGD transaction
  // Format: DD MMM MERCHANT_NAME AMOUNT
  // Try more flexible patterns
  const simpleMatch = line.match(
    /^(\d{1,2}\s+[A-Z]{3})\s+(.+?)\s+([\d,]+\.\d{2})$/
  );

  if (simpleMatch) {
    const [, date, merchant, amount] = simpleMatch;
    
    // Validate date format (should be like "12 SEP" or "01 OCT")
    if (date.match(/\d{1,2}\s+[A-Z]{3}/)) {
      return {
        date: date.trim(),
        merchant: merchant.trim(),
        merchantCleaned: cleanMerchantName(merchant.trim()),
        amount: parseFloat(amount.replace(/,/g, '')),
        currency: 'SGD',
        type: 'simple',
        linesConsumed: 1
      };
    }
  }

  // Pattern 1b: More flexible - date might be separated differently
  // Format: DD MMM MERCHANT_NAME ... AMOUNT (amount might have spaces)
  const flexibleMatch = line.match(
    /^(\d{1,2}\s+[A-Z]{3})\s+(.+?)\s+([\d,\s]+\.\d{2})$/
  );

  if (flexibleMatch) {
    const [, date, merchant, amount] = flexibleMatch;
    
    if (date.match(/\d{1,2}\s+[A-Z]{3}/)) {
      const cleanAmount = amount.replace(/[\s,]/g, '');
      const parsedAmount = parseFloat(cleanAmount);
      
      if (!isNaN(parsedAmount) && parsedAmount > 0) {
        return {
          date: date.trim(),
          merchant: merchant.trim(),
          merchantCleaned: cleanMerchantName(merchant.trim()),
          amount: parsedAmount,
          currency: 'SGD',
          type: 'simple',
          linesConsumed: 1
        };
      }
    }
  }

  // Pattern 2: Foreign currency transaction (multi-line)
  // Line 1: DD MMM MERCHANT_NAME LOCATION_CODE
  // Line 2: CURRENCY AMOUNT
  // Line 3 (or same as 2): SGD_AMOUNT
  const foreignHeaderMatch = line.match(
    /^(\d{2}\s+[A-Z]{3})\s+(.+?)\s+([A-Z]{2})$/
  );

  if (foreignHeaderMatch && startIdx + 1 < lines.length) {
    const [, date, merchant, locationCode] = foreignHeaderMatch;
    const nextLine = lines[startIdx + 1];

    // Look for currency on next line
    const currencyMatch = nextLine.match(
      /(YEN|DOLLAR|EURO|POUND|EUROPEAN MONETARY COOP FUND)\s+([\d,]+\.?\d*)/
    );

    if (currencyMatch) {
      const [, currency, originalAmount] = currencyMatch;

      // Look for SGD amount (could be on same line or next line)
      let sgdAmount = null;
      let linesUsed = 2;

      const sgdOnSameLine = nextLine.match(/([\d,]+\.\d{2})$/);
      if (sgdOnSameLine) {
        sgdAmount = parseFloat(sgdOnSameLine[1].replace(',', ''));
      } else if (startIdx + 2 < lines.length) {
        const thirdLine = lines[startIdx + 2];
        const sgdOnNextLine = thirdLine.match(/^([\d,]+\.\d{2})/);
        if (sgdOnNextLine) {
          sgdAmount = parseFloat(sgdOnNextLine[1].replace(',', ''));
          linesUsed = 3;
        }
      }

      if (sgdAmount) {
        return {
          date: date.trim(),
          merchant: `${merchant.trim()} ${locationCode}`,
          merchantCleaned: cleanMerchantName(merchant.trim()),
          amount: sgdAmount,
          currency: 'SGD',
          originalCurrency: currency.includes('DOLLAR') ? 'USD' : currency,
          originalAmount: parseFloat(originalAmount.replace(',', '')),
          type: 'foreign',
          linesConsumed: linesUsed
        };
      }
    }
  }

  // Pattern 3: Transaction without location code but with currency
  // Example: "12 SEP AIRALO"
  //          "U. S. DOLLAR 7.50"
  //          "9.87"
  const simpleHeaderMatch = line.match(
    /^(\d{2}\s+[A-Z]{3})\s+([A-Z0-9\s\-()@'&.!]+?)$/
  );

  if (simpleHeaderMatch && startIdx + 1 < lines.length) {
    const [, date, merchant] = simpleHeaderMatch;
    const nextLine = lines[startIdx + 1];

    // Check if next line has currency
    const currencyMatch = nextLine.match(
      /(YEN|DOLLAR|EURO|POUND)\s+([\d,]+\.?\d*)/
    );

    if (currencyMatch) {
      const [, currency, originalAmount] = currencyMatch;

      // Look for SGD amount
      let sgdAmount = null;
      let linesUsed = 2;

      const sgdOnSameLine = nextLine.match(/([\d,]+\.\d{2})$/);
      if (sgdOnSameLine) {
        sgdAmount = parseFloat(sgdOnSameLine[1].replace(',', ''));
      } else if (startIdx + 2 < lines.length) {
        const thirdLine = lines[startIdx + 2];
        const sgdOnNextLine = thirdLine.match(/^([\d,]+\.\d{2})/);
        if (sgdOnNextLine) {
          sgdAmount = parseFloat(sgdOnNextLine[1].replace(',', ''));
          linesUsed = 3;
        }
      }

      if (sgdAmount) {
        return {
          date: date.trim(),
          merchant: merchant.trim(),
          merchantCleaned: cleanMerchantName(merchant.trim()),
          amount: sgdAmount,
          currency: 'SGD',
          originalCurrency: currency.includes('DOLLAR') ? 'USD' : currency,
          originalAmount: parseFloat(originalAmount.replace(',', '')),
          type: 'foreign',
          linesConsumed: linesUsed
        };
      }
    }
  }

  // Couldn't parse
  return null;
};

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