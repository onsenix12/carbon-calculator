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
  // Line 1: DD MMM MERCHANT_NAME/IDENTIFIER LOCATION (e.g., "26 OCT SINGAPORE6182469896298 ROME IT")
  // Line 2: CURRENCY AMOUNT
  // Line 3 (or same as 2): SGD_AMOUNT
  // More flexible pattern: date + identifier/merchant + optional location (2 letters at end, possibly after space)
  // Also handle cases where location code might be part of a phrase like "ROME IT"
  // Match date and everything after it, then extract location code from the end
  const foreignHeaderMatch = line.match(
    /^(\d{2}\s+[A-Z]{3})\s+(.+)$/
  );

  if (foreignHeaderMatch && startIdx + 1 < lines.length) {
    const [, date, restOfLine] = foreignHeaderMatch;
    
    // Extract location code from the end if it exists (2 uppercase letters, possibly after a space and word)
    // Pattern: ends with "WORD IT" or " IT" or just "IT"
    let merchantOrIdentifier = restOfLine;
    let locationCode = null;
    
    // Check if line ends with a 2-letter uppercase code (location code)
    // Pattern 1: " WORD IT" (word followed by space and 2-letter code)
    const locationMatch1 = restOfLine.match(/^(.+?)\s+[A-Z]+\s+([A-Z]{2})$/);
    if (locationMatch1) {
      merchantOrIdentifier = locationMatch1[1];
      locationCode = locationMatch1[2];
    } else {
      // Pattern 2: " IT" (space and 2-letter code at end)
      const locationMatch2 = restOfLine.match(/^(.+?)\s+([A-Z]{2})$/);
      if (locationMatch2) {
        merchantOrIdentifier = locationMatch2[1];
        locationCode = locationMatch2[2];
      }
      // If no match, no location code - use entire restOfLine as merchant
    }
    const nextLine = lines[startIdx + 1];

    // Look for currency on next line - check for EUROPEAN MONETARY COOP FUND first (longest match)
    const currencyMatch = nextLine.match(
      /(EUROPEAN MONETARY COOP FUND|YEN|U\.?\s*S\.?\s*DOLLAR|DOLLAR|EURO|POUND)\s+([\d,]+\.?\d*)/
    );

    if (currencyMatch) {
      const [, currency, originalAmount] = currencyMatch;

      // Look for SGD amount (could be on same line or next line)
      let sgdAmount = null;
      let linesUsed = 2;

      // Check if SGD amount is on the same line as currency (after the original amount)
      // Pattern: CURRENCY AMOUNT SGD_AMOUNT
      const sgdOnSameLine = nextLine.match(/(?:EUROPEAN MONETARY COOP FUND|YEN|U\.?\s*S\.?\s*DOLLAR|DOLLAR|EURO|POUND)\s+[\d,]+\.?\d*\s+([\d,]+\.\d{2})/);
      if (sgdOnSameLine) {
        sgdAmount = parseFloat(sgdOnSameLine[1].replace(',', ''));
      } else if (startIdx + 2 < lines.length) {
        // Check next line for SGD amount
        const thirdLine = lines[startIdx + 2];
        const sgdOnNextLine = thirdLine.match(/^([\d,]+\.\d{2})/);
        if (sgdOnNextLine) {
          sgdAmount = parseFloat(sgdOnNextLine[1].replace(',', ''));
          linesUsed = 3;
        }
      }

      if (sgdAmount) {
        // Clean up merchant name - remove location code if it was captured separately
        let merchant = merchantOrIdentifier.trim();
        // If location code exists and merchant ends with it, remove it to avoid duplication
        if (locationCode && merchant.endsWith(locationCode)) {
          merchant = merchant.substring(0, merchant.length - locationCode.length).trim();
        }
        
        // Determine currency code
        let originalCurrency = 'EUR';
        if (currency.includes('DOLLAR') || currency.includes('U.S')) {
          originalCurrency = 'USD';
        } else if (currency.includes('YEN')) {
          originalCurrency = 'JPY';
        } else if (currency.includes('POUND')) {
          originalCurrency = 'GBP';
        } else if (currency.includes('EUROPEAN MONETARY') || currency.includes('EURO')) {
          originalCurrency = 'EUR';
        }
        
        return {
          date: date.trim(),
          merchant: locationCode ? `${merchant} ${locationCode}` : merchant,
          merchantCleaned: cleanMerchantName(merchant),
          amount: sgdAmount,
          currency: 'SGD',
          originalCurrency: originalCurrency,
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

    // Check if next line has currency - include EUROPEAN MONETARY COOP FUND
    const currencyMatch = nextLine.match(
      /(EUROPEAN MONETARY COOP FUND|YEN|U\.?\s*S\.?\s*DOLLAR|DOLLAR|EURO|POUND)\s+([\d,]+\.?\d*)/
    );

    if (currencyMatch) {
      const [, currency, originalAmount] = currencyMatch;

      // Look for SGD amount
      let sgdAmount = null;
      let linesUsed = 2;

      // Check if SGD amount is on the same line as currency
      const sgdOnSameLine = nextLine.match(/(?:EUROPEAN MONETARY COOP FUND|YEN|U\.?\s*S\.?\s*DOLLAR|DOLLAR|EURO|POUND)\s+[\d,]+\.?\d*\s+([\d,]+\.\d{2})/);
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
        // Determine currency code
        let originalCurrency = 'EUR';
        if (currency.includes('DOLLAR') || currency.includes('U.S')) {
          originalCurrency = 'USD';
        } else if (currency.includes('YEN')) {
          originalCurrency = 'JPY';
        } else if (currency.includes('POUND')) {
          originalCurrency = 'GBP';
        } else if (currency.includes('EUROPEAN MONETARY') || currency.includes('EURO')) {
          originalCurrency = 'EUR';
        }
        
        return {
          date: date.trim(),
          merchant: merchant.trim(),
          merchantCleaned: cleanMerchantName(merchant.trim()),
          amount: sgdAmount,
          currency: 'SGD',
          originalCurrency: originalCurrency,
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

