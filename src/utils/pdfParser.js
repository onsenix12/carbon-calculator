/**
 * PDF Parser Utility
 * 
 * Extracts text from DBS credit card statement PDFs
 * Uses PDF.js library for parsing
 * 
 * Privacy: This module only extracts raw text, no sensitive data filtering here
 * (Privacy filtering happens in transactionParser.js)
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
// The worker file should be in public/ folder
pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.js`;

/**
 * Extract text from all pages of a PDF file
 * 
 * @param {File} file - PDF file object from input
 * @returns {Promise<string>} - Extracted text from all pages
 * @throws {Error} - If PDF parsing fails
 */
export const extractTextFromPDF = async (file) => {
  try {
    console.log('📄 Starting PDF extraction...');
    console.log('   File:', file.name, '|', (file.size / 1024).toFixed(2), 'KB');

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    console.log('   Pages:', pdf.numPages);

    // Extract text from all pages
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine all text items from the page
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
      
      console.log(`   ✓ Page ${pageNum}/${pdf.numPages} extracted`);
    }

    console.log('✅ PDF extraction complete');
    console.log('   Total characters:', fullText.length);

    return fullText;

  } catch (error) {
    console.error('❌ PDF extraction failed:', error);
    
    // Provide user-friendly error messages
    if (error.message.includes('Invalid PDF')) {
      throw new Error('This file is not a valid PDF. Please upload a DBS credit card statement PDF.');
    } else if (error.message.includes('Password')) {
      throw new Error('This PDF is password-protected. Please upload an unlocked PDF.');
    } else if (error.message.includes('corrupted')) {
      throw new Error('This PDF file appears to be corrupted. Please try downloading it again.');
    } else {
      throw new Error(`Failed to read PDF: ${error.message}`);
    }
  }
};

/**
 * Extract transaction section from full PDF text
 * 
 * Finds text between "NEW TRANSACTIONS" and "SUB-TOTAL" markers
 * This is DBS-specific format
 * 
 * @param {string} fullText - Complete PDF text
 * @returns {Object} - { transactionText, metadata }
 * @throws {Error} - If markers not found
 */
export const extractTransactionSection = (fullText) => {
  console.log('🔍 Extracting transaction section...');
  console.log('   Full text length:', fullText.length, 'characters');
  console.log('   First 500 chars:', fullText.substring(0, 500));

  // Try multiple possible start markers (DBS statements may vary)
  const startMarkers = [
    'NEW TRANSACTIONS',
    'NEW TRANSACTION',
    'TRANSACTIONS',
    'TRANSACTION DETAILS',
    'PURCHASES'
  ];
  
  // Try multiple possible end markers
  const endMarkers = [
    'SUB-TOTAL',
    'SUBTOTAL',
    'SUB TOTAL',
    'TOTAL',
    'SUMMARY'
  ];

  let startIndex = -1;
  let startMarker = null;
  let endIndex = -1;
  let endMarker = null;

  // Find start marker
  for (const marker of startMarkers) {
    const index = fullText.indexOf(marker);
    if (index !== -1) {
      startIndex = index;
      startMarker = marker;
      console.log(`   ✓ Found start marker: "${marker}" at position ${index}`);
      break;
    }
  }

  if (startIndex === -1) {
    console.error('   ❌ Could not find any start marker. Tried:', startMarkers);
    console.error('   Sample text around potential locations:');
    // Show text around common locations
    const sampleStart = fullText.substring(0, Math.min(2000, fullText.length));
    console.error('   First 2000 chars:', sampleStart);
    throw new Error(
      'Could not find transaction section. ' +
      'This might not be a DBS credit card statement, or the format has changed. ' +
      'Check the browser console (F12) for more details.'
    );
  }

  // Find end marker (search after start marker)
  const textAfterStart = fullText.substring(startIndex);
  for (const marker of endMarkers) {
    const index = textAfterStart.indexOf(marker);
    if (index !== -1) {
      endIndex = startIndex + index;
      endMarker = marker;
      console.log(`   ✓ Found end marker: "${marker}" at position ${endIndex}`);
      break;
    }
  }

  if (endIndex === -1) {
    console.warn('   ⚠️ Could not find end marker. Will use end of document.');
    console.warn('   Tried markers:', endMarkers);
    // Use end of document as fallback
    endIndex = fullText.length;
    endMarker = 'END_OF_DOCUMENT';
  }

  if (endIndex <= startIndex) {
    throw new Error('Transaction section markers are in wrong order. Statement format may have changed.');
  }

  // Extract transaction section
  const transactionText = fullText.substring(startIndex, endIndex);

  console.log('✅ Transaction section extracted');
  console.log('   Length:', transactionText.length, 'characters');
  console.log('   Position:', startIndex, '-', endIndex);

  // Try to extract statement date for metadata
  const statementDateMatch = fullText.match(/STATEMENT DATE.*?(\d{2} [A-Z][a-z]{2} \d{4})/);
  const statementDate = statementDateMatch ? statementDateMatch[1] : null;

  // Try to extract SUB-TOTAL amount for validation
  const subTotalMatch = fullText.match(/SUB-TOTAL:\s*([\d,]+\.\d{2})/);
  const expectedTotal = subTotalMatch ? parseFloat(subTotalMatch[1].replace(',', '')) : null;

  const metadata = {
    statementDate,
    expectedTotal,
    totalCharacters: transactionText.length,
    extractedAt: new Date().toISOString()
  };

  console.log('   Metadata:', metadata);

  return {
    transactionText,
    metadata
  };
};

/**
 * Validate that no sensitive data is in extracted text
 * 
 * This is a safety check - transaction parser should handle this,
 * but we do a preliminary check here
 * 
 * @param {string} text - Text to validate
 * @returns {Object} - { valid: boolean, warnings: string[] }
 */
export const validateNoSensitiveData = (text) => {
  const warnings = [];

  // Check for full card numbers (16 digits with spaces)
  if (/\d{4}\s+\d{4}\s+\d{4}\s+\d{4}/.test(text)) {
    warnings.push('⚠️  Warning: Full card number detected in extracted text');
  }

  // Check for account numbers
  if (/ACCOUNT NO:\s*\d{3,4}-\d{6,8}-\d/.test(text)) {
    warnings.push('⚠️  Warning: Account number detected in extracted text');
  }

  // Check for customer ID
  if (/CUSTOMER NO:\s*R\d{18}/.test(text)) {
    warnings.push('⚠️  Warning: Customer ID detected in extracted text');
  }

  // Check for postal codes (Singapore 6-digit)
  if (/SINGAPORE \d{6}/.test(text)) {
    warnings.push('⚠️  Warning: Address/postal code detected in extracted text');
  }

  const valid = warnings.length === 0;

  if (!valid) {
    console.warn('🔒 Sensitive data detected in text (will be masked in next step):');
    warnings.forEach(w => console.warn('   ' + w));
  } else {
    console.log('✅ No sensitive data patterns detected');
  }

  return { valid, warnings };
};

/**
 * Main function: Parse PDF and extract transaction section
 * 
 * This combines all steps:
 * 1. Extract text from PDF
 * 2. Find transaction section
 * 3. Validate (preliminary)
 * 
 * @param {File} file - PDF file
 * @returns {Promise<Object>} - { transactionText, metadata }
 */
export const parsePDF = async (file) => {
  console.log('═══════════════════════════════════════════════');
  console.log('🚀 Starting PDF parsing process');
  console.log('═══════════════════════════════════════════════');

  // Step 1: Extract full text
  const fullText = await extractTextFromPDF(file);

  // Step 2: Extract transaction section
  const { transactionText, metadata } = extractTransactionSection(fullText);

  // Step 3: Preliminary validation
  const validation = validateNoSensitiveData(transactionText);

  console.log('═══════════════════════════════════════════════');
  console.log('✅ PDF parsing complete');
  console.log('═══════════════════════════════════════════════');

  return {
    transactionText,
    metadata: {
      ...metadata,
      validation
    }
  };
};

// Export all functions
export default {
  extractTextFromPDF,
  extractTransactionSection,
  validateNoSensitiveData,
  parsePDF
};