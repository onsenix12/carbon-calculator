/**
 * Single Transaction Parser
 * 
 * Parses a single transaction from lines, handling various formats:
 * - Simple SGD transactions
 * - Foreign currency transactions (multi-line)
 * 
 * Fixed syntax error in Pattern 3 (commit 121dcd3)
 */

import { cleanMerchantName } from '../privacyMasking';
import logger from '../logger';

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
  
  // Always log to console for debugging (not filtered by log level)
  console.log(`[parseSingleTransaction] Processing line ${startIdx}: "${line}"`);
  console.log(`[parseSingleTransaction] Next lines available: ${lines.length - startIdx - 1}`);
  if (startIdx + 1 < lines.length) {
    console.log(`[parseSingleTransaction] Next line: "${lines[startIdx + 1]}"`);
  }
  if (startIdx + 2 < lines.length) {
    console.log(`[parseSingleTransaction] Line after next: "${lines[startIdx + 2]}"`);
  }
  
  logger.debug(`[parseSingleTransaction] Processing line ${startIdx}: "${line}"`);
  logger.debug(`[parseSingleTransaction] Next lines available: ${lines.length - startIdx - 1}`);
  if (startIdx + 1 < lines.length) {
    logger.debug(`[parseSingleTransaction] Next line: "${lines[startIdx + 1]}"`);
  }
  if (startIdx + 2 < lines.length) {
    logger.debug(`[parseSingleTransaction] Line after next: "${lines[startIdx + 2]}"`);
  }

  // Pattern 1: Simple SGD transaction
  // Format: DD MMM MERCHANT_NAME AMOUNT
  const simpleMatch = line.match(
    /^(\d{1,2}\s+[A-Z]{3})\s+(.+?)\s+([\d,]+\.\d{2})$/
  );
  
  if (simpleMatch) {
    logger.debug(`[parseSingleTransaction] Pattern 1 (Simple SGD) matched`);
  }

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
    logger.debug(`[parseSingleTransaction] Pattern 1b (Flexible SGD) matched`);
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
  // Use \d{1,2} to match both single and double digit dates
  // Also check if line contains long identifiers (like SINGAPORE followed by numbers) which indicates foreign transaction
  const foreignHeaderMatch = line.match(
    /^(\d{1,2}\s+[A-Z]{3})\s+(.+)$/
  );

  if (foreignHeaderMatch) {
    const [, date, restOfLine] = foreignHeaderMatch;
    console.log(`[parseSingleTransaction] Pattern 2 (Foreign currency) header matched - date: "${date}", rest: "${restOfLine}"`);
    logger.debug(`[parseSingleTransaction] Pattern 2 (Foreign currency) header matched - date: "${date}", rest: "${restOfLine}"`);
    
    // Check if line ends with amount - this could be a foreign transaction with SGD amount on first line
    // Format: "26 OCT SINGAPORE... ROME IT 637.84" followed by "EUROPEAN MONETARY COOP FUND 407.64"
    const amountAtEndMatch = restOfLine.match(/^(.+?)\s+([\d,]+\.\d{2})$/);
    let sgdAmountOnFirstLine = null;
    let merchantOrIdentifier = restOfLine;
    
    if (amountAtEndMatch && startIdx + 1 < lines.length) {
      // Check if next line has a currency indicator - if so, this is a foreign transaction
      const nextLine = lines[startIdx + 1];
      const hasCurrency = /(EUROPEAN MONETARY COOP FUND|YEN|U\.?\s*S\.?\s*DOLLAR|DOLLAR|EURO|POUND)/.test(nextLine);
      
      if (hasCurrency) {
        // This is a foreign transaction with SGD amount on first line!
        merchantOrIdentifier = amountAtEndMatch[1];
        sgdAmountOnFirstLine = parseFloat(amountAtEndMatch[2].replace(',', ''));
        console.log(`[parseSingleTransaction] Pattern 2 - Found SGD amount on first line: ${sgdAmountOnFirstLine}, merchant: "${merchantOrIdentifier}"`);
      }
    }
    
    // Skip if this looks like a simple transaction (has amount at end) AND no currency on next line
    if (/\d+\.\d{2}$/.test(restOfLine.trim()) && !sgdAmountOnFirstLine) {
      console.log(`[parseSingleTransaction] Pattern 2 skipped - line ends with amount, likely simple transaction`);
      logger.debug(`[parseSingleTransaction] Pattern 2 skipped - line ends with amount, likely simple transaction`);
    } else if (startIdx + 1 < lines.length) {
      // Extract location code from merchant/identifier (if not already extracted)
      let locationCode = null;
      
      // If we already extracted the merchant (because amount was on first line), extract location from it
      // Otherwise, extract from restOfLine
      const lineToCheck = sgdAmountOnFirstLine ? merchantOrIdentifier : restOfLine;
      
      // Check if line ends with a 2-letter uppercase code (location code)
      // Pattern 1: " WORD IT" (word followed by space and 2-letter code) - use greedy match to get the last occurrence
      const locationMatch1 = lineToCheck.match(/^(.+)\s+[A-Z]+\s+([A-Z]{2})$/);
      if (locationMatch1) {
        merchantOrIdentifier = locationMatch1[1];
        locationCode = locationMatch1[2];
        console.log(`[parseSingleTransaction] Pattern 2 - Location code extracted (pattern 1): "${locationCode}", merchant: "${merchantOrIdentifier}"`);
        logger.debug(`[parseSingleTransaction] Pattern 2 - Location code extracted (pattern 1): "${locationCode}", merchant: "${merchantOrIdentifier}"`);
      } else {
        // Pattern 2: " IT" (space and 2-letter code at end) - but only if not followed by amount
        const locationMatch2 = lineToCheck.match(/^(.+)\s+([A-Z]{2})$/);
        if (locationMatch2) {
          merchantOrIdentifier = locationMatch2[1];
          locationCode = locationMatch2[2];
          console.log(`[parseSingleTransaction] Pattern 2 - Location code extracted (pattern 2): "${locationCode}", merchant: "${merchantOrIdentifier}"`);
          logger.debug(`[parseSingleTransaction] Pattern 2 - Location code extracted (pattern 2): "${locationCode}", merchant: "${merchantOrIdentifier}"`);
        } else if (!sgdAmountOnFirstLine) {
          console.log(`[parseSingleTransaction] Pattern 2 - No location code found, using entire restOfLine as merchant`);
          logger.debug(`[parseSingleTransaction] Pattern 2 - No location code found, using entire restOfLine as merchant`);
        }
      }
      const nextLine = lines[startIdx + 1];
      console.log(`[parseSingleTransaction] Pattern 2 - Checking next line for currency: "${nextLine}"`);
      logger.debug(`[parseSingleTransaction] Pattern 2 - Checking next line for currency: "${nextLine}"`);

      // Look for currency on next line - check for EUROPEAN MONETARY COOP FUND first (longest match)
      const currencyMatch = nextLine.match(
        /(EUROPEAN MONETARY COOP FUND|YEN|U\.?\s*S\.?\s*DOLLAR|DOLLAR|EURO|POUND)\s+([\d,]+\.?\d*)/
      );

      if (currencyMatch) {
        console.log(`[parseSingleTransaction] Pattern 2 - Currency matched: "${currencyMatch[1]}", amount: "${currencyMatch[2]}"`);
        logger.debug(`[parseSingleTransaction] Pattern 2 - Currency matched: "${currencyMatch[1]}", amount: "${currencyMatch[2]}"`);
        const [, currency, originalAmount] = currencyMatch;

        // Look for SGD amount (could be on first line, same line as currency, or next line)
        let sgdAmount = sgdAmountOnFirstLine; // Use amount from first line if we found it
        let linesUsed = sgdAmountOnFirstLine ? 2 : 2; // If amount on first line, we use 2 lines total

        // If we didn't find SGD amount on first line, check other locations
        if (!sgdAmount) {
          // Check if SGD amount is on the same line as currency (after the original amount)
          // Pattern: CURRENCY AMOUNT SGD_AMOUNT
          const sgdOnSameLine = nextLine.match(/(?:EUROPEAN MONETARY COOP FUND|YEN|U\.?\s*S\.?\s*DOLLAR|DOLLAR|EURO|POUND)\s+[\d,]+\.?\d*\s+([\d,]+\.\d{2})/);
          if (sgdOnSameLine) {
            sgdAmount = parseFloat(sgdOnSameLine[1].replace(',', ''));
            console.log(`[parseSingleTransaction] Pattern 2 - SGD amount found on same line as currency: ${sgdAmount}`);
            logger.debug(`[parseSingleTransaction] Pattern 2 - SGD amount found on same line: ${sgdAmount}`);
          } else if (startIdx + 2 < lines.length) {
            // Check next line for SGD amount
            const thirdLine = lines[startIdx + 2];
            logger.debug(`[parseSingleTransaction] Pattern 2 - Checking third line for SGD amount: "${thirdLine}"`);
            const sgdOnNextLine = thirdLine.match(/^([\d,]+\.\d{2})/);
            if (sgdOnNextLine) {
              sgdAmount = parseFloat(sgdOnNextLine[1].replace(',', ''));
              linesUsed = 3;
              logger.debug(`[parseSingleTransaction] Pattern 2 - SGD amount found on third line: ${sgdAmount}`);
            } else {
              logger.debug(`[parseSingleTransaction] Pattern 2 - No SGD amount found on third line`);
            }
          }
        } else {
          logger.debug(`[parseSingleTransaction] Pattern 2 - No third line available for SGD amount`);
        }

        if (sgdAmount) {
          console.log(`[parseSingleTransaction] Pattern 2 - SUCCESS! Creating transaction with amount: ${sgdAmount}`);
          logger.debug(`[parseSingleTransaction] Pattern 2 - SUCCESS! Creating transaction with amount: ${sgdAmount}`);
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
        } else {
          logger.debug(`[parseSingleTransaction] Pattern 2 - FAILED: Currency found but no SGD amount could be extracted`);
        }
      } else {
        logger.debug(`[parseSingleTransaction] Pattern 2 - FAILED: No currency match on next line`);
      }
    } else {
      logger.debug(`[parseSingleTransaction] Pattern 2 - FAILED: No next line available`);
    }
  } else {
    logger.debug(`[parseSingleTransaction] Pattern 2 - FAILED: Header pattern did not match`);
  }

  // Pattern 3: Transaction without location code but with currency
  // Example: "12 SEP AIRALO"
  //          "U. S. DOLLAR 7.50"
  //          "9.87"
  const simpleHeaderMatch = line.match(
    /^(\d{1,2}\s+[A-Z]{3})\s+([A-Z0-9\s\-()@'&.!]+?)$/
  );

  if (simpleHeaderMatch) {
    const [, date, merchant] = simpleHeaderMatch;
    logger.debug(`[parseSingleTransaction] Pattern 3 (Simple foreign) header matched - date: "${date}", merchant: "${merchant}"`);
    
    if (startIdx + 1 < lines.length) {
      const nextLine = lines[startIdx + 1];
      logger.debug(`[parseSingleTransaction] Pattern 3 - Checking next line for currency: "${nextLine}"`);

      // Check if next line has currency - include EUROPEAN MONETARY COOP FUND
      const currencyMatch = nextLine.match(
        /(EUROPEAN MONETARY COOP FUND|YEN|U\.?\s*S\.?\s*DOLLAR|DOLLAR|EURO|POUND)\s+([\d,]+\.?\d*)/
      );

      if (currencyMatch) {
        logger.debug(`[parseSingleTransaction] Pattern 3 - Currency matched: "${currencyMatch[1]}", amount: "${currencyMatch[2]}"`);
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
        } else {
          logger.debug(`[parseSingleTransaction] Pattern 3 - FAILED: Currency found but no SGD amount could be extracted`);
        }
      } else {
        logger.debug(`[parseSingleTransaction] Pattern 3 - FAILED: No currency match on next line`);
      }
    } else {
      logger.debug(`[parseSingleTransaction] Pattern 3 - FAILED: No next line available`);
    }
  } else {
    logger.debug(`[parseSingleTransaction] Pattern 3 - FAILED: Header pattern did not match`);
  }

  // Couldn't parse
  logger.debug(`[parseSingleTransaction] All patterns failed for line ${startIdx}, returning null`);
  return null;
};

