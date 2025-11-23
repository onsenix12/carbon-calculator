/**
 * Shared Constants for Serverless Functions
 * 
 * This file is used by serverless functions (Vercel, etc.)
 * that cannot import from the src/ directory
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
function buildClaudePrompt(merchantName, categoryList) {
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
}

/**
 * Claude API Model Name
 */
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

/**
 * Claude API Configuration
 */
const CLAUDE_API_CONFIG = {
  model: CLAUDE_MODEL,
  max_tokens: 20,
  temperature: 0,
  anthropic_version: '2023-06-01'
};

// Export for CommonJS (for proxy-server.js and other Node.js scripts)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildClaudePrompt,
    CLAUDE_MODEL,
    CLAUDE_API_CONFIG
  };
}

// Export for ES modules (for Vercel serverless functions)
export {
  buildClaudePrompt,
  CLAUDE_MODEL,
  CLAUDE_API_CONFIG
};

