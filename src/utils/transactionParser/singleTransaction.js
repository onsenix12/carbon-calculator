/**
 * Single Transaction Parser
 * 
 * Parses a single transaction from lines, handling various formats:
 * - Simple SGD transactions
 * - Foreign currency transactions (multi-line)
 */

import { cleanMerchantName } from '../privacyMasking';

/**
 * Parse a single transaction
 * Handles both simple and complex (multi-line) formats
 * 
 * @param {Array} lines - All lines
 * @param {number} startIdx - Starting line index
 * @returns {Object|null} - Transaction object or null
 */
export const parseSingleTransaction = (lines, startIdx) => {
  const line = lines[startIdx];

  // Pattern 1: Simple SGD transaction
  // Format: DD MMM MERCHANT_NAME AMOUNT
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

