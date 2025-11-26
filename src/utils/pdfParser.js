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
import { ParseError } from './errors';
import logger from './logger';
import { validateFileType, validateFileSize } from './validation';
import { FILE_CONFIG } from '../constants';

// Configure PDF.js worker
// The worker file should be in public/ folder
pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.js`;

/**
 * Extract text from PDF text items using position data for accurate layout reconstruction
 * 
 * This function uses the position information (transform matrix) from PDF.js
 * to reconstruct text in the correct order, preserving line breaks and spacing.
 * 
 * @param {Array} textItems - Array of text items from getTextContent()
 * @param {Object} viewport - Page viewport for coordinate calculations
 * @returns {string} - Reconstructed text with proper layout
 */
const extractTextWithLayout = (textItems, viewport) => {
  if (!textItems || textItems.length === 0) {
    return '';
  }

  // Process each text item to extract position and text
  const processedItems = textItems.map((item, index) => {
    // Extract position from transform matrix
    // Transform matrix: [a, b, c, d, e, f] where (e, f) is the translation
    const transform = item.transform || [1, 0, 0, 1, 0, 0];
    let x = transform[4] || 0;
    let y = transform[5] || 0;
    
    // Handle different coordinate systems
    // PDF coordinates start from bottom-left, but viewport might be scaled
    // Calculate y position from top for easier sorting
    let yFromTop;
    if (viewport && viewport.height) {
      yFromTop = viewport.height - y;
    } else {
      // Fallback: use y as-is (assuming top-left origin)
      yFromTop = y;
    }
    
    // Get width and height, with fallbacks
    const width = item.width || (item.transform ? Math.abs(transform[0]) : 0);
    const height = item.height || (item.transform ? Math.abs(transform[3]) : 0);
    
    return {
      text: item.str || '',
      x,
      y: yFromTop,
      width: width > 0 ? width : 10, // Default width if missing
      height: height > 0 ? height : 10, // Default height if missing
      index,
      originalY: y // Keep original for debugging
    };
  });

  // Filter out empty text items
  const validItems = processedItems.filter(item => item.text.trim().length > 0);
  
  if (validItems.length === 0) {
    return '';
  }

  // Sort by y position (top to bottom), then by x position (left to right)
  validItems.sort((a, b) => {
    // Group items that are on roughly the same line (within 5 pixels)
    const yDiff = Math.abs(a.y - b.y);
    if (yDiff > 5) {
      return b.y - a.y; // Higher y (top) comes first
    }
    return a.x - b.x; // Left to right
  });

  // Reconstruct text with proper spacing and line breaks
  let result = '';
  let lastY = null;
  let lastX = null;
  const lineThreshold = 5; // Pixels - items within this are considered same line
  const columnThreshold = 20; // Pixels - spacing larger than this indicates new column

  for (let i = 0; i < validItems.length; i++) {
    const item = validItems[i];
    
    // Check if we need a new line
    if (lastY !== null && Math.abs(item.y - lastY) > lineThreshold) {
      result += '\n';
      lastX = null; // Reset x position for new line
    }
    // Check if we need spacing (new column or word break)
    else if (lastX !== null) {
      const xGap = item.x - (lastX + validItems[i - 1].width);
      if (xGap > columnThreshold) {
        // Large gap indicates new column
        result += '  '; // Double space for column separation
      } else if (xGap > 2) {
        // Small gap indicates word break
        result += ' ';
      }
      // If gap is very small (<= 2px), assume it's part of same word, no space
    }

    result += item.text;
    lastY = item.y;
    lastX = item.x;
  }

  return result;
};

/**
 * Extract text from all pages of a PDF file
 * 
 * @param {File} file - PDF file object from input
 * @returns {Promise<string>} - Extracted text from all pages
 * @throws {Error} - If PDF parsing fails
 */
export const extractTextFromPDF = async (file) => {
  // Input validation
  validateFileType(file, FILE_CONFIG.ALLOWED_TYPES);
  validateFileSize(file, FILE_CONFIG.MAX_SIZE_MB);
  
  try {
    logger.info('Starting PDF extraction...');
    logger.debug(`File: ${file.name} | ${(file.size / 1024).toFixed(2)} KB`);

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    logger.debug(`Pages: ${pdf.numPages}`);

    // Extract text from all pages
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      
      // Try to get text content with normalizeWhitespace option first
      // This helps with some PDFs that have inconsistent spacing
      let textContent;
      try {
        textContent = await page.getTextContent({ 
          normalizeWhitespace: false // Keep original spacing for better accuracy
        });
      } catch (error) {
        // Fallback to default if options not supported
        logger.debug(`Page ${pageNum}: Using default text extraction`);
        textContent = await page.getTextContent();
      }
      
      // Get viewport to understand page dimensions
      const viewport = page.getViewport({ scale: 1.0 });
      
      // Extract text using position-aware method
      let pageText = extractTextWithLayout(textContent.items, viewport);
      
      // Fallback: If position-based extraction yields very little text,
      // try simple join method (some PDFs might have missing position data)
      if (pageText.trim().length < 50 && textContent.items.length > 10) {
        logger.debug(`Page ${pageNum}: Position-based extraction yielded little text, trying fallback method`);
        const fallbackText = textContent.items
          .map(item => item.str)
          .filter(str => str && str.trim().length > 0)
          .join(' ');
        // Use fallback if it has more content
        if (fallbackText.length > pageText.length) {
          pageText = fallbackText;
        }
      }
      
      fullText += pageText + '\n';
      
      logger.debug(`Page ${pageNum}/${pdf.numPages} extracted (${pageText.length} chars, ${textContent.items.length} text items)`);
      
      // Log warning if very little text was extracted but many items exist
      if (pageText.trim().length < 100 && textContent.items.length > 50) {
        logger.warn(`Page ${pageNum}: Extracted only ${pageText.trim().length} chars from ${textContent.items.length} text items. Some text may be missing.`);
      }
    }

    logger.success('PDF extraction complete');
    logger.debug(`Total characters: ${fullText.length}`);

    return fullText;

  } catch (error) {
    logger.error('PDF extraction failed:', error);
    
    // Provide user-friendly error messages
    if (error.message.includes('Invalid PDF')) {
      throw new ParseError('This file is not a valid PDF. Please upload a DBS credit card statement PDF.');
    } else if (error.message.includes('Password')) {
      throw new ParseError('This PDF is password-protected. Please upload an unlocked PDF.');
    } else if (error.message.includes('corrupted')) {
      throw new ParseError('This PDF file appears to be corrupted. Please try downloading it again.');
    } else {
      throw new ParseError(`Failed to read PDF: ${error.message}`, { originalError: error.message });
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
  logger.info('Extracting transaction section...');
  logger.debug(`Full text length: ${fullText.length} characters`);
  logger.debug(`First 500 chars: ${fullText.substring(0, 500)}`);

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
  let endIndex = -1;

  // Find start marker
  for (const marker of startMarkers) {
    const index = fullText.indexOf(marker);
    if (index !== -1) {
      startIndex = index;
      logger.debug(`Found start marker: "${marker}" at position ${index}`);
      break;
    }
  }

  if (startIndex === -1) {
    logger.error('Could not find any start marker. Tried:', startMarkers);
    logger.debug('Sample text around potential locations:');
    // Show text around common locations
    const sampleStart = fullText.substring(0, Math.min(2000, fullText.length));
    logger.debug(`First 2000 chars: ${sampleStart}`);
    throw new ParseError(
      'Could not find transaction section. ' +
      'This might not be a DBS credit card statement, or the format has changed. ' +
      'Check the browser console (F12) for more details.',
      { startMarkers, sampleText: fullText.substring(0, 2000) }
    );
  }

  // Find end marker (search after start marker)
  const textAfterStart = fullText.substring(startIndex);
  for (const marker of endMarkers) {
    const index = textAfterStart.indexOf(marker);
    if (index !== -1) {
      endIndex = startIndex + index;
      logger.debug(`Found end marker: "${marker}" at position ${endIndex}`);
      break;
    }
  }

  if (endIndex === -1) {
    logger.warn('Could not find end marker. Will use end of document.');
    logger.debug('Tried markers:', endMarkers);
    // Use end of document as fallback
    endIndex = fullText.length;
  }

  if (endIndex <= startIndex) {
    throw new ParseError('Transaction section markers are in wrong order. Statement format may have changed.');
  }

  // Extract transaction section
  const transactionText = fullText.substring(startIndex, endIndex);

  logger.success('Transaction section extracted');
  logger.debug(`Length: ${transactionText.length} characters`);
  logger.debug(`Position: ${startIndex} - ${endIndex}`);

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

  logger.debug('Metadata:', metadata);

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
    logger.warn('Sensitive data detected in text (will be masked in next step):');
    warnings.forEach(w => logger.warn(`  ${w}`));
  } else {
    logger.success('No sensitive data patterns detected');
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
  logger.info('═══════════════════════════════════════════════');
  logger.info('Starting PDF parsing process');
  logger.info('═══════════════════════════════════════════════');

  // Step 1: Extract full text
  const fullText = await extractTextFromPDF(file);

  // Step 2: Extract transaction section
  const { transactionText, metadata } = extractTransactionSection(fullText);

  // Step 3: Preliminary validation
  const validation = validateNoSensitiveData(transactionText);

  logger.info('═══════════════════════════════════════════════');
  logger.success('PDF parsing complete');
  logger.info('═══════════════════════════════════════════════');

  return {
    transactionText,
    metadata: {
      ...metadata,
      validation
    }
  };
};

// Export all functions
const pdfParser = {
  extractTextFromPDF,
  extractTransactionSection,
  validateNoSensitiveData,
  parsePDF
};

export default pdfParser;