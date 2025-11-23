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

import { maskAllSensitiveData, cleanMerchantName, validateTextIsSafe } from './privacyMasking';

/**
 * Parse DBS statement transactions
 * 
 * @param {string} transactionText - Text between "NEW TRANSACTIONS" and "SUB-TOTAL"
 * @returns {Array} - Array of parsed transaction objects
 */
export const parseDBSTransactions = (transactionText) => {
  console.log('📝 Parsing transactions...');
  console.log('   Input length:', transactionText.length, 'characters');

  // Step 1: Mask sensitive data FIRST
  const { maskedText, maskingReport } = maskAllSensitiveData(transactionText);

  // Step 2: Validate masking worked
  const validation = validateTextIsSafe(maskedText);
  if (!validation.isSafe) {
    throw new Error(
      'Privacy violation: Sensitive data still present after masking. ' +
      'Violations: ' + validation.violations.join(', ')
    );
  }

  // Step 3: Split into lines
  const lines = maskedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  console.log('   Total lines:', lines.length);

  const transactions = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip header lines
    if (line.includes('NEW TRANSACTIONS') || 
        line.includes('AVISENNA GUSTA') ||
        line.includes('DESCRIPTION') ||
        line.includes('AMOUNT')) {
      i++;
      continue;
    }

    // Skip bill payments and credits (not purchases)
    if (line.includes('BILL PAYMENT') || 
        line.includes('PAYMENT - DBS') ||
        /\d+\.\d{2}\s+CR$/.test(line)) {
      i++;
      continue;
    }

    // Skip fees and admin charges (not carbon-emitting purchases)
    const skipKeywords = [
      'FREQUENT FLYER',
      'ADMIN FEE',
      'GST @',
      'FINANCE CHARGE',
      'LATE PAYMENT',
      'INSURANCE'
    ];
    
    if (skipKeywords.some(keyword => line.includes(keyword))) {
      i++;
      continue;
    }

    // Try to parse transaction
    const transaction = parseSingleTransaction(lines, i);
    
    if (transaction) {
      transactions.push(transaction);
      i += transaction.linesConsumed;
    } else {
      // Couldn't parse, skip line
      i++;
    }
  }

  console.log('✅ Parsing complete');
  console.log(`   Transactions found: ${transactions.length}`);
  console.log(`   Total amount: SGD ${transactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}`);

  return transactions;
};

/**
 * Parse a single transaction
 * Handles both simple and complex (multi-line) formats
 * 
 * @param {Array} lines - All lines
 * @param {number} startIdx - Starting line index
 * @returns {Object|null} - Transaction object or null
 */
const parseSingleTransaction = (lines, startIdx) => {
  const line = lines[startIdx];

  // Pattern 1: Simple SGD transaction
  // Format: DD MMM MERCHANT_NAME AMOUNT
  const simpleMatch = line.match(
    /^(\d{2}\s+[A-Z]{3})\s+(.+?)\s+([\d,]+\.\d{2})$/
  );

  if (simpleMatch) {
    const [, date, merchant, amount] = simpleMatch;
    
    return {
      date: date.trim(),
      merchant: merchant.trim(),
      merchantCleaned: cleanMerchantName(merchant.trim()),
      amount: parseFloat(amount.replace(',', '')),
      currency: 'SGD',
      type: 'simple',
      linesConsumed: 1
    };
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
    /^(\d{2}\s+[A-Z]{3})\s+([A-Z0-9\s\-\(\)@'&.!]+?)$/
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
  const percentDiff = (difference / expectedTotal) * 100;

  const isValid = difference < 0.50; // Allow 50 cent difference (rounding)

  const result = {
    parsedTotal: parseFloat(parsedTotal.toFixed(2)),
    expectedTotal: parseFloat(expectedTotal.toFixed(2)),
    difference: parseFloat(difference.toFixed(2)),
    percentDiff: parseFloat(percentDiff.toFixed(2)),
    isValid,
    transactionCount: transactions.length
  };

  if (isValid) {
    console.log('✅ Validation passed');
    console.log(`   Parsed total: SGD ${result.parsedTotal.toFixed(2)}`);
    console.log(`   Expected total: SGD ${result.expectedTotal.toFixed(2)}`);
    console.log(`   Difference: SGD ${result.difference.toFixed(2)}`);
  } else {
    console.warn('⚠️  Validation warning');
    console.warn(`   Parsed total: SGD ${result.parsedTotal.toFixed(2)}`);
    console.warn(`   Expected total: SGD ${result.expectedTotal.toFixed(2)}`);
    console.warn(`   Difference: SGD ${result.difference.toFixed(2)} (${result.percentDiff.toFixed(1)}%)`);
    console.warn('   Possible missing transactions or parsing errors');
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
export default {
  parseDBSTransactions,
  validateParsedTransactions,
  groupTransactionsByMonth,
  getTransactionStatistics
};