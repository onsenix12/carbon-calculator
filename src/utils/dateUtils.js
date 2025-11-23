/**
 * Date Utilities
 * 
 * Shared date parsing and manipulation utilities for transaction dates.
 * Handles DBS statement date format: "DD MMM" (e.g., "12 SEP", "01 OCT")
 */

/**
 * Month abbreviation to full name mapping
 */
export const MONTH_MAP = {
  'JAN': 'January',
  'FEB': 'February',
  'MAR': 'March',
  'APR': 'April',
  'MAY': 'May',
  'JUN': 'June',
  'JUL': 'July',
  'AUG': 'August',
  'SEP': 'September',
  'OCT': 'October',
  'NOV': 'November',
  'DEC': 'December'
};

/**
 * Month abbreviation to numeric index (0-11) for Date constructor
 */
export const MONTH_INDEX_MAP = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
};

/**
 * Month order array for sorting
 */
export const MONTH_ORDER = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                            'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * Extract month abbreviation from transaction date string
 * 
 * @param {string} dateString - Date string in format "DD MMM" (e.g., "12 SEP")
 * @returns {string|null} - Month abbreviation (e.g., "SEP") or null if invalid
 */
export const extractMonth = (dateString) => {
  if (!dateString) return null;
  
  const parts = dateString.trim().split(/\s+/);
  if (parts.length >= 2) {
    const month = parts[1].toUpperCase();
    return MONTH_MAP[month] ? month : null;
  }
  
  return null;
};

/**
 * Parse transaction date string to JavaScript Date object
 * 
 * @param {string} dateString - Date string in format "DD MMM" (e.g., "12 SEP")
 * @param {number} year - Year to use (defaults to current year)
 * @returns {Date|null} - Parsed Date object or null if invalid
 */
export const parseTransactionDate = (dateString, year = null) => {
  if (!dateString) return null;
  
  try {
    const parts = dateString.trim().split(/\s+/);
    if (parts.length < 2) return null;
    
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1].toUpperCase();
    const month = MONTH_INDEX_MAP[monthStr];
    
    if (isNaN(day) || day < 1 || day > 31 || month === undefined) {
      return null;
    }
    
    const currentYear = year || new Date().getFullYear();
    const date = new Date(currentYear, month, day);
    
    // Validate the date is actually valid (handles cases like Feb 30)
    if (date.getDate() !== day || date.getMonth() !== month) {
      return null;
    }
    
    return date;
  } catch (e) {
    return null;
  }
};

/**
 * Format date to locale string
 * 
 * @param {Date} date - Date object to format
 * @returns {string} - Formatted date string (e.g., "12 Sep 2024")
 */
export const formatDate = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return null;
  }
  
  try {
    const formatted = date.toLocaleDateString('en-SG', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
    
    // Check if formatting returned "Invalid Date"
    if (formatted === 'Invalid Date' || formatted.includes('Invalid')) {
      // Fallback to manual formatting
      const day = date.getDate().toString().padStart(2, '0');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    }
    
    return formatted;
  } catch (e) {
    // Fallback formatting
    const day = date.getDate().toString().padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }
};

/**
 * Check if transaction date matches a specific month
 * 
 * @param {string} dateString - Date string in format "DD MMM"
 * @param {string} monthAbbr - Month abbreviation to match (e.g., "SEP")
 * @returns {boolean} - True if date matches the month
 */
export const isMonthMatch = (dateString, monthAbbr) => {
  if (!dateString || !monthAbbr) return false;
  
  const extractedMonth = extractMonth(dateString);
  return extractedMonth === monthAbbr.toUpperCase();
};

/**
 * Get month label from abbreviation
 * 
 * @param {string} monthAbbr - Month abbreviation (e.g., "SEP")
 * @returns {string|null} - Full month name or null if invalid
 */
export const getMonthLabel = (monthAbbr) => {
  if (!monthAbbr) return null;
  return MONTH_MAP[monthAbbr.toUpperCase()] || null;
};

