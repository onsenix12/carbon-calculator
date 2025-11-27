/**
 * Transaction Parsing Strategies
 * 
 * Different strategies for parsing transactions from DBS statement text.
 * Each strategy is tried in order until one succeeds.
 */

import { cleanMerchantName } from '../privacyMasking';
import { TRANSACTION_SKIP_KEYWORDS } from '../../constants';
import logger from '../logger';

/**
 * Check if a transaction should be skipped
 * 
 * @param {string} merchant - Merchant name
 * @param {string} segment - Full transaction segment (for credit detection)
 * @returns {boolean} - True if transaction should be skipped
 */
const shouldSkipTransaction = (merchant, segment = '') => {
  // Skip bill payments
  if (merchant.includes('BILL PAYMENT') || merchant.includes('PAYMENT - DBS')) {
    return true;
  }
  
  // Skip fees and charges
  if (TRANSACTION_SKIP_KEYWORDS.some(keyword => merchant.includes(keyword))) {
    return true;
  }
  
  // Skip credits (refunds) - check segment for " CR" pattern near amount
  if (segment) {
    const amountMatch = segment.match(/[\d,]+\.\d{2}/);
    if (amountMatch && segment.includes(' CR')) {
      const crIndex = segment.indexOf(' CR');
      const amountIndex = segment.indexOf(amountMatch[0]);
      // Credit marker should be near the amount
      if (crIndex < amountIndex + amountMatch[0].length + 10) {
        return true;
      }
    }
  }
  
  return false;
};

/**
 * Create a transaction object from parsed components
 * 
 * @param {string} date - Date string
 * @param {string} merchant - Merchant name
 * @param {number} amount - Transaction amount
 * @param {string} currency - Currency code (default: 'SGD')
 * @param {string} type - Transaction type (default: 'simple')
 * @param {number} linesConsumed - Number of lines consumed (default: 1)
 * @returns {Object} - Transaction object
 */
const createTransaction = (date, merchant, amount, currency = 'SGD', type = 'simple', linesConsumed = 1) => {
  return {
    date: date.trim(),
    merchant: merchant.trim(),
    merchantCleaned: cleanMerchantName(merchant.trim()),
    amount: parseFloat(amount),
    currency,
    type,
    linesConsumed
  };
};

/**
 * Parse amount string to number
 * 
 * @param {string} amountStr - Amount string (may contain commas)
 * @returns {number|null} - Parsed amount or null if invalid
 */
const parseAmount = (amountStr) => {
  const cleaned = amountStr.replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  return (isNaN(parsed) || parsed <= 0) ? null : parsed;
};

/**
 * Find all date patterns in text
 * 
 * @param {string} text - Text to search
 * @returns {Array} - Array of { date, index } objects
 */
const findDatePatterns = (text) => {
  const datePattern = /(\d{1,2}\s+[A-Z]{3})/g;
  const dates = [];
  let match;
  
  datePattern.lastIndex = 0;
  while ((match = datePattern.exec(text)) !== null) {
    dates.push({
      date: match[1],
      index: match.index
    });
  }
  
  return dates;
};

/**
 * Strategy 1: Regex Pattern Matching
 * 
 * Finds all date patterns, then extracts transactions using regex.
 * 
 * @param {string} text - Masked transaction text
 * @returns {Object} - { transactions, skippedCount, failedCount }
 */
export const regexPatternStrategy = (text) => {
  const transactions = [];
  let skippedCount = 0;
  let failedCount = 0;
  
  const allDates = findDatePatterns(text);
  const transactionPattern = /(\d{1,2}\s+[A-Z]{3})\s+(.+?)\s+([\d,]+\.\d{2})(?:\s+CR)?/;
  
  // Currency indicators that suggest multi-line foreign transactions
  const currencyIndicators = /(EUROPEAN MONETARY COOP FUND|YEN|U\.?\s*S\.?\s*DOLLAR|DOLLAR|EURO|POUND)/i;
  
  for (let i = 0; i < allDates.length; i++) {
    const dateInfo = allDates[i];
    const nextDateIndex = i + 1 < allDates.length ? allDates[i + 1].index : text.length;
    const segment = text.substring(dateInfo.index, nextDateIndex);
    
    // NEW: Check if this segment contains a currency indicator
    // If so, it's a multi-line foreign transaction - skip regex strategy for this one
    if (currencyIndicators.test(segment)) {
      console.log(`[regexPatternStrategy] Skipping segment with currency indicator: "${segment.substring(0, 100)}..."`);
      logger.debug(`[regexPatternStrategy] Skipping segment with currency indicator, letting lineByLineStrategy handle it`);
      failedCount++; // Let lineByLineStrategy handle it
      continue;
    }
    
    const match = segment.match(transactionPattern);
    
    if (match) {
      const [, date, merchant, amount] = match;
      
      if (shouldSkipTransaction(merchant, segment)) {
        skippedCount++;
        continue;
      }
      
      const parsedAmount = parseAmount(amount);
      if (!parsedAmount) {
        failedCount++;
        continue;
      }
      
      transactions.push(createTransaction(date, merchant, parsedAmount));
    } else {
      failedCount++;
    }
  }
  
  return { transactions, skippedCount, failedCount };
};

/**
 * Strategy 2: Date-Split Approach
 * 
 * Similar to regex but processes segments between dates differently.
 * 
 * @param {string} text - Masked transaction text
 * @returns {Object} - { transactions, skippedCount, failedCount }
 */
export const dateSplitStrategy = (text) => {
  const transactions = [];
  let skippedCount = 0;
  let failedCount = 0;
  
  const dateMatches = findDatePatterns(text);
  const transactionPattern = /(\d{1,2}\s+[A-Z]{3})\s+(.+?)\s+([\d,]+\.\d{2})(?:\s+CR)?/;
  
  // Currency indicators that suggest multi-line foreign transactions
  const currencyIndicators = /(EUROPEAN MONETARY COOP FUND|YEN|U\.?\s*S\.?\s*DOLLAR|DOLLAR|EURO|POUND)/i;
  
  for (let i = 0; i < dateMatches.length; i++) {
    const currentDate = dateMatches[i];
    const nextIndex = i + 1 < dateMatches.length ? dateMatches[i + 1].index : text.length;
    const segment = text.substring(currentDate.index, nextIndex).trim();
    
    // NEW: Check if this segment contains a currency indicator
    // If so, it's a multi-line foreign transaction - skip this strategy for this one
    if (currencyIndicators.test(segment)) {
      console.log(`[dateSplitStrategy] Skipping segment with currency indicator: "${segment.substring(0, 100)}..."`);
      logger.debug(`[dateSplitStrategy] Skipping segment with currency indicator, letting lineByLineStrategy handle it`);
      failedCount++; // Let lineByLineStrategy handle it
      continue;
    }
    
    const match = segment.match(transactionPattern);
    
    if (match) {
      const [, date, merchant, amount] = match;
      
      if (shouldSkipTransaction(merchant, segment)) {
        skippedCount++;
        continue;
      }
      
      const parsedAmount = parseAmount(amount);
      if (!parsedAmount) {
        failedCount++;
        continue;
      }
      
      transactions.push(createTransaction(date, merchant, parsedAmount));
    } else {
      failedCount++;
    }
  }
  
  return { transactions, skippedCount, failedCount };
};

/**
 * Strategy 3: Line-by-Line Parsing
 * 
 * Parses transactions line by line, handling multi-line formats.
 * 
 * @param {string} text - Masked transaction text
 * @param {Function} parseSingleTransaction - Function to parse a single transaction
 * @returns {Object} - { transactions, skippedCount, failedCount }
 */
export const lineByLineStrategy = (text, parseSingleTransaction) => {
  const transactions = [];
  let skippedCount = 0;
  let failedCount = 0;
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  console.log(`[lineByLineStrategy] Total lines to process: ${lines.length}`);
  console.log(`[lineByLineStrategy] First 20 lines:`, lines.slice(0, 20));
  
  // Check for the specific transactions we're looking for
  const hasTargetTransactions = lines.some(l => 
    l.includes('26 OCT') && (l.includes('SINGAPORE') || l.includes('ROME IT'))
  );
  if (hasTargetTransactions) {
    console.log(`[lineByLineStrategy] ✅ Found lines with "26 OCT" and SINGAPORE/ROME IT`);
    const targetLines = lines.filter(l => l.includes('26 OCT') && (l.includes('SINGAPORE') || l.includes('ROME IT')));
    console.log(`[lineByLineStrategy] Target lines:`, targetLines);
  }
  
  logger.debug(`[lineByLineStrategy] Total lines to process: ${lines.length}`);
  logger.debug(`[lineByLineStrategy] First 10 lines:`, lines.slice(0, 10));
  
  const headerKeywords = ['NEW TRANSACTIONS', 'AVISENNA GUSTA', 'DESCRIPTION', 'AMOUNT', 'DATE'];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    // Skip header lines
    if (headerKeywords.some(keyword => line.includes(keyword))) {
      logger.debug(`[lineByLineStrategy] Line ${i} skipped (header): "${line}"`);
      skippedCount++;
      i++;
      continue;
    }
    
    // Skip bill payments and credits
    if (line.includes('BILL PAYMENT') || 
        line.includes('PAYMENT - DBS') ||
        /\d+\.\d{2}\s+CR$/.test(line)) {
      logger.debug(`[lineByLineStrategy] Line ${i} skipped (bill payment/credit): "${line}"`);
      skippedCount++;
      i++;
      continue;
    }
    
    // Skip fees
    if (TRANSACTION_SKIP_KEYWORDS.some(keyword => line.includes(keyword))) {
      logger.debug(`[lineByLineStrategy] Line ${i} skipped (fee): "${line}"`);
      skippedCount++;
      i++;
      continue;
    }
    
    // Try to parse transaction
    console.log(`[lineByLineStrategy] Attempting to parse transaction starting at line ${i}: "${line}"`);
    logger.debug(`[lineByLineStrategy] Attempting to parse transaction starting at line ${i}`);
    const transaction = parseSingleTransaction(lines, i);
    if (transaction) {
      console.log(`[lineByLineStrategy] ✅ Transaction parsed successfully at line ${i}: ${transaction.merchant} - $${transaction.amount}`);
      logger.debug(`[lineByLineStrategy] ✅ Transaction parsed successfully at line ${i}: ${transaction.merchant} - $${transaction.amount}`);
      transactions.push(transaction);
      i += transaction.linesConsumed;
    } else {
      console.log(`[lineByLineStrategy] ❌ Failed to parse transaction at line ${i}: "${line}"`);
      logger.debug(`[lineByLineStrategy] ❌ Failed to parse transaction at line ${i}: "${line}"`);
      failedCount++;
      i++;
    }
  }
  
  console.log(`[lineByLineStrategy] 📊 Summary: ${transactions.length} transactions, ${skippedCount} skipped, ${failedCount} failed`);
  console.log(`[lineByLineStrategy] Transaction amounts:`, transactions.map(t => `$${t.amount}`));
  logger.debug(`[lineByLineStrategy] Summary: ${transactions.length} transactions, ${skippedCount} skipped, ${failedCount} failed`);
  return { transactions, skippedCount, failedCount };
};

