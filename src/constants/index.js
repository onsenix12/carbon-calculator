/**
 * Shared Constants
 * 
 * Centralized constants used across the application
 * to avoid duplication and ensure consistency
 */

/**
 * Claude API Prompt Template
 * 
 * Used for categorizing merchants into emission categories.
 * This prompt is shared across:
 * - src/utils/llmCategorizer.js (direct API calls)
 * - api/categorize.js (Vercel serverless function)
 * - proxy-server.js (local development proxy)
 * 
 * @param {string} merchantName - The merchant name to categorize
 * @param {string} categoryList - Comma-separated list of available categories
 * @returns {string} - The formatted prompt
 */
export const buildClaudePrompt = (merchantName, categoryList) => {
  return `You are a transaction categorizer for carbon footprint calculation in Singapore.

Merchant: "${merchantName}"

Available categories: ${categoryList}

Task: Return ONLY the category name that best matches this merchant.
If uncertain, return "uncategorized".

Rules:
- food_dining: Restaurants, cafes, food courts, hawkers, food delivery
- transport: Grab, taxis, MRT, buses, petrol stations, ride-hailing, public transport
- utilities: Electricity, water, gas bills
- shopping: Retail stores, supermarkets, clothing, electronics
- entertainment: Netflix, Spotify, gyms, cinemas, games
- travel: Hotels, flights, accommodation

Examples:
- "GRAB" → transport
- "PUBLIC TRANSPORT" → transport
- "BUS/MRT" → transport
- "KOUFU" → food_dining
- "NTUC FAIRPRICE" → shopping
- "SP SERVICES" → utilities
- "NETFLIX" → entertainment
- "DON DON DONKI" → shopping

Response (one word only):`;
};

/**
 * Claude API Model Name
 */
export const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

/**
 * Claude API Configuration
 */
export const CLAUDE_API_CONFIG = {
  model: CLAUDE_MODEL,
  max_tokens: 20,
  temperature: 0,
  anthropic_version: '2023-06-01'
};

/**
 * Transaction Skip Keywords
 * 
 * Keywords that indicate a transaction should be skipped during parsing.
 * These are typically fees, charges, or non-purchase transactions.
 * 
 * Used in: src/utils/transactionParser.js
 */
export const TRANSACTION_SKIP_KEYWORDS = [
  'FREQUENT FLYER',
  'ADMIN FEE',
  'GST @',
  'FINANCE CHARGE',
  'LATE PAYMENT',
  'INSURANCE'
];

/**
 * Magic Numbers and Constants
 * 
 * Centralized constants to avoid magic numbers throughout the codebase
 */

// Progress/Percentage Constants
export const PROGRESS = {
  MIN: 0,
  MAX: 100,
  STEP_1_START: 10,
  STEP_1_END: 25,
  STEP_2_START: 35,
  STEP_2_END: 50,
  STEP_3_START: 55,
  STEP_3_END: 90,
  STEP_4_START: 95,
  STEP_4_END: 100
};

// Carbon Equivalent Constants (for calculateEquivalents)
export const CARBON_EQUIVALENTS = {
  TREE_ABSORPTION_KG_PER_YEAR: 21.77,      // kg CO2 per tree per year
  LAPTOP_CHARGE_KG: 0.257,                 // kg CO2 per laptop charge
  PLASTIC_BOTTLE_KG: 0.0828,               // kg CO2 per plastic bottle
  CAR_KM_KG: 0.17                          // kg CO2 per km by car
};

// Validation Constants
export const VALIDATION = {
  TRANSACTION_TOTAL_TOLERANCE: 0.50,       // Allow 50 cent difference for rounding
  PERCENTAGE_MULTIPLIER: 100               // For converting to percentage
};

// Reduction Recommendation Percentages
export const REDUCTION_PERCENTAGES = {
  FOOD_DINING: 0.20,    // 20% reduction potential
  TRANSPORT: 0.60,      // 60% reduction potential
  SHOPPING: 0.30,       // 30% reduction potential
  TRAVEL: 0.40,         // 40% reduction potential
  DEFAULT: 0.15         // 15% default reduction potential
};

// Singapore Average Emissions (kg CO2e/month)
export const SINGAPORE_AVERAGES = {
  PER_CAPITA_MONTHLY: 832,    // Average monthly emissions per person
  TARGET_MONTHLY: 273         // Target monthly emissions
};

// LLM/API Constants
export const LLM_CONFIG = {
  RATE_LIMIT_DELAY_MS: 100,                // Delay between LLM API calls (ms)
  TOKENS_PER_REQUEST: {
    INPUT: 100,                             // Estimated input tokens per request
    OUTPUT: 10                              // Estimated output tokens per request
  },
  COST_PER_TRANSACTION: 0.0003,            // Estimated cost per transaction in USD
  DEFAULT_UNCATEGORIZED_FACTOR: 0.50       // Default emission factor for uncategorized
};

// Chart/Display Constants
export const CHART_CONFIG = {
  PIE_CHART_HEIGHT: 400,
  BAR_CHART_HEIGHT: 400,
  MIN_PERCENTAGE_FOR_LABEL: 5              // Only show labels if > 5%
};

// Comparison Thresholds
export const COMPARISON_THRESHOLDS = {
  EXCELLENT_MATCH_PERCENT: 10,             // Within 10% = excellent
  GOOD_MATCH_PERCENT: 20,                  // Within 20% = good
  MODERATE_DIFF_PERCENT: 30                // Within 30% = moderate
};

/**
 * API Configuration
 * 
 * URLs and endpoints for API calls
 */
export const API_CONFIG = {
  CLAUDE_API_BASE_URL: 'https://api.anthropic.com/v1/messages',
  PROXY_DEFAULT_URL: 'http://localhost:3001/api/categorize',
  PROXY_ENV_VAR: 'REACT_APP_PROXY_URL',
  USE_PROXY_ENV_VAR: 'REACT_APP_USE_PROXY'
};

/**
 * File Upload Configuration
 */
export const FILE_CONFIG = {
  MAX_SIZE_MB: 10,
  ALLOWED_TYPES: ['application/pdf'],
  ALLOWED_EXTENSIONS: ['.pdf']
};

