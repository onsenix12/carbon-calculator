/**
 * Privacy Masking Utility
 * 
 * CRITICAL SECURITY MODULE
 * Masks sensitive data before any processing or display
 * 
 * What gets masked:
 * - Credit card numbers
 * - Account numbers
 * - Customer IDs
 * - Postal codes / Addresses
 * - Phone numbers
 * - Payment reference numbers
 * 
 * Privacy Principle: Mask early, mask always
 */

/**
 * Mask credit card numbers
 * Pattern: 1234 5678 9012 3456 → **** **** **** 3456
 * 
 * @param {string} text - Text to mask
 * @returns {string} - Masked text
 */
export const maskCreditCardNumbers = (text) => {
    // Match 16-digit card numbers (with or without spaces)
    return text.replace(
      /\b(\d{4})\s?(\d{4})\s?(\d{4})\s?(\d{4})\b/g,
      '**** **** **** $4'
    );
  };
  
  /**
   * Mask account numbers
   * Pattern: 123-456789-0 → ***-****89-0
   * 
   * @param {string} text - Text to mask
   * @returns {string} - Masked text
   */
  export const maskAccountNumbers = (text) => {
    // DBS account pattern: XXX-XXXXXX-X
    return text.replace(
      /\b(\d{3,4})-(\d{4,8})-(\d)\b/g,
      (match, p1, p2, p3) => {
        const maskedMiddle = '*'.repeat(p2.length - 2) + p2.slice(-2);
        return `***-${maskedMiddle}-${p3}`;
      }
    );
  };
  
  /**
   * Mask customer IDs
   * Pattern: R702000000001167395 → R***************95
   * 
   * @param {string} text - Text to mask
   * @returns {string} - Masked text
   */
  export const maskCustomerIDs = (text) => {
    return text.replace(
      /\b(R)(\d{16})(\d{2})\b/g,
      (match, prefix, middle, last2) => {
        return `${prefix}${'*'.repeat(16)}${last2}`;
      }
    );
  };
  
  /**
   * Mask NRIC (Singapore ID)
   * Pattern: S1234567A → S****567A
   * 
   * @param {string} text - Text to mask
   * @returns {string} - Masked text
   */
  export const maskNRIC = (text) => {
    return text.replace(
      /\b([STFGM])(\d{5})(\d{2})([A-Z])\b/g,
      '$1****$3$4'
    );
  };
  
  /**
   * Mask postal codes and addresses
   * Pattern: SINGAPORE 425600 → SINGAPORE ******
   * 
   * @param {string} text - Text to mask
   * @returns {string} - Masked text
   */
  export const maskPostalCodes = (text) => {
    return text.replace(
      /SINGAPORE\s+(\d{6})\b/g,
      'SINGAPORE ******'
    );
  };
  
  /**
   * Mask phone numbers
   * Pattern: 6123 4567 → ****-****
   * 
   * @param {string} text - Text to mask
   * @returns {string} - Masked text
   */
  export const maskPhoneNumbers = (text) => {
    return text.replace(
      /\b([689]\d{3})\s?(\d{4})\b/g,
      '****-****'
    );
  };
  
  /**
   * Mask payment reference numbers (long digit sequences)
   * Pattern: REF NO: 17581538264222161866 → REF NO: *****************866
   * 
   * @param {string} text - Text to mask
   * @returns {string} - Masked text
   */
  export const maskReferenceNumbers = (text) => {
    return text.replace(
      /\b(\d{15,})\b/g,
      (match) => {
        const last3 = match.slice(-3);
        return '*'.repeat(match.length - 3) + last3;
      }
    );
  };
  
  /**
   * Extract merchant name only (for LLM categorization)
   * 
   * Removes:
   * - Transaction dates
   * - Amounts
   * - Currency codes
   * - Reference numbers
   * 
   * Keeps only the merchant business name
   * 
   * @param {string} transactionLine - Full transaction line
   * @returns {string|null} - Cleaned merchant name or null
   */
  export const extractMerchantNameOnly = (transactionLine) => {
    // Pattern: DD MMM MERCHANT_NAME AMOUNT
    const match = transactionLine.match(
      /\d{2}\s+[A-Z]{3}\s+([A-Z0-9\s\-\(\)@'&.]+?)\s+[\d,]+\.\d{2}/i
    );
    
    if (!match) {
      return null;
    }
  
    let merchantName = match[1].trim();
  
    // Remove location codes (JP, IT, SG, etc at the end)
    merchantName = merchantName.replace(/\s+[A-Z]{2}$/, '');
  
    // Remove transaction IDs (long digit sequences)
    merchantName = merchantName.replace(/\d{9,}/g, '');
  
    // Remove extra spaces
    merchantName = merchantName.replace(/\s+/g, ' ').trim();
  
    return merchantName;
  };
  
  /**
   * Clean merchant name for LLM categorization
   * 
   * Removes noise but keeps semantic meaning
   * 
   * @param {string} rawMerchant - Raw merchant name from statement
   * @returns {string} - Cleaned merchant name
   */
  export const cleanMerchantName = (rawMerchant) => {
    if (!rawMerchant) return '';
  
    let cleaned = rawMerchant;
  
    // Remove common suffixes
    const removals = [
      'PTE LTD',
      'PTE. LTD.',
      'PRIVATE LIMITED',
      'LTD',
      'PTE',
      'SINGAPORE',
      'SINGAP',
      'SG'
    ];
  
    removals.forEach(suffix => {
      cleaned = cleaned.replace(new RegExp(`\\s*${suffix}\\s*$`, 'i'), '');
    });
  
    // Remove special characters at the end
    cleaned = cleaned.replace(/[\-@#]+$/, '');
  
    // Normalize spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
    // Standardize common patterns
    cleaned = cleaned.replace(/BUS\/MRT/gi, 'PUBLIC TRANSPORT');
    cleaned = cleaned.replace(/BUS\s+MRT/gi, 'PUBLIC TRANSPORT');
    cleaned = cleaned.replace(/HELLORIDE_SG/g, 'HELLORIDE');
    
    return cleaned;
  };
  
  /**
   * MASTER FUNCTION: Mask all sensitive data
   * 
   * Applies all masking functions in sequence
   * 
   * @param {string} text - Raw text from PDF
   * @returns {Object} - { maskedText, maskingReport }
   */
  export const maskAllSensitiveData = (text) => {
    console.log('🔒 Starting privacy masking...');
  
    let maskedText = text;
    const maskingReport = {
      cardNumbers: 0,
      accountNumbers: 0,
      customerIDs: 0,
      nrics: 0,
      postalCodes: 0,
      phoneNumbers: 0,
      referenceNumbers: 0
    };
  
    // Count occurrences before masking
    maskingReport.cardNumbers = (text.match(/\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g) || []).length;
    maskingReport.accountNumbers = (text.match(/\b\d{3,4}-\d{4,8}-\d\b/g) || []).length;
    maskingReport.customerIDs = (text.match(/\bR\d{18}\b/g) || []).length;
    maskingReport.nrics = (text.match(/\b[STFGM]\d{7}[A-Z]\b/g) || []).length;
    maskingReport.postalCodes = (text.match(/SINGAPORE\s+\d{6}\b/g) || []).length;
    maskingReport.phoneNumbers = (text.match(/\b[689]\d{3}\s?\d{4}\b/g) || []).length;
    maskingReport.referenceNumbers = (text.match(/\b\d{15,}\b/g) || []).length;
  
    // Apply masking
    maskedText = maskCreditCardNumbers(maskedText);
    maskedText = maskAccountNumbers(maskedText);
    maskedText = maskCustomerIDs(maskedText);
    maskedText = maskNRIC(maskedText);
    maskedText = maskPostalCodes(maskedText);
    maskedText = maskPhoneNumbers(maskedText);
    maskedText = maskReferenceNumbers(maskedText);
  
    const totalMasked = Object.values(maskingReport).reduce((a, b) => a + b, 0);
  
    console.log('✅ Privacy masking complete');
    console.log(`   Masked ${totalMasked} sensitive data items:`);
    console.log(`   - Card numbers: ${maskingReport.cardNumbers}`);
    console.log(`   - Account numbers: ${maskingReport.accountNumbers}`);
    console.log(`   - Customer IDs: ${maskingReport.customerIDs}`);
    console.log(`   - NRICs: ${maskingReport.nrics}`);
    console.log(`   - Postal codes: ${maskingReport.postalCodes}`);
    console.log(`   - Phone numbers: ${maskingReport.phoneNumbers}`);
    console.log(`   - Reference numbers: ${maskingReport.referenceNumbers}`);
  
    return {
      maskedText,
      maskingReport
    };
  };
  
  /**
   * Validate that text is safe (no sensitive data remaining)
   * 
   * @param {string} text - Text to validate
   * @returns {Object} - { isSafe, violations }
   */
  export const validateTextIsSafe = (text) => {
    const violations = [];
  
    // Check for unmasked card numbers
    if (/\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/.test(text)) {
      violations.push('Unmasked card number detected');
    }
  
    // Check for unmasked account numbers
    if (/ACCOUNT NO:\s*\d{3,4}-\d{6,8}-\d/.test(text)) {
      violations.push('Unmasked account number detected');
    }
  
    // Check for customer IDs
    if (/CUSTOMER NO:\s*R\d{18}/.test(text)) {
      violations.push('Unmasked customer ID detected');
    }
  
    // Check for postal codes
    if (/SINGAPORE \d{6}/.test(text)) {
      violations.push('Unmasked postal code detected');
    }
  
    const isSafe = violations.length === 0;
  
    if (!isSafe) {
      console.error('⚠️  PRIVACY VIOLATION: Sensitive data detected in text!');
      violations.forEach(v => console.error(`   - ${v}`));
    } else {
      console.log('✅ Privacy validation passed: No sensitive data detected');
    }
  
    return { isSafe, violations };
  };
  
  // Export all functions
  export default {
    maskCreditCardNumbers,
    maskAccountNumbers,
    maskCustomerIDs,
    maskNRIC,
    maskPostalCodes,
    maskPhoneNumbers,
    maskReferenceNumbers,
    extractMerchantNameOnly,
    cleanMerchantName,
    maskAllSensitiveData,
    validateTextIsSafe
  };