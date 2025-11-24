/**
 * LLM Categorizer Utility
 * 
 * Uses Claude API to categorize merchants into emission categories
 * 
 * Privacy: Only sends merchant names (no amounts, dates, or personal data)
 * 
 * API Model: claude-sonnet-4-20250514
 * Cost: ~$0.0003 per transaction (100 transactions = ~$0.03)
 */

import { buildClaudePrompt, CLAUDE_API_CONFIG, API_CONFIG, LLM_CONFIG, VALIDATION } from '../constants';
import { ValidationError, APIError, NetworkError, isNetworkError } from './errors';
import logger from './logger';
import { validateNonEmpty, validateNonEmptyArray, validateEmissionFactors } from './validation';

// Use proxy server in development, direct API in production
// Set REACT_APP_USE_PROXY=true in .env to use local proxy server
const USE_PROXY = process.env[API_CONFIG.USE_PROXY_ENV_VAR] === 'true';
const PROXY_URL = process.env[API_CONFIG.PROXY_ENV_VAR] || API_CONFIG.PROXY_DEFAULT_URL;
const CLAUDE_API_URL = USE_PROXY ? PROXY_URL : API_CONFIG.CLAUDE_API_BASE_URL;

// Debug logging
logger.debug('LLM Configuration:', {
  USE_PROXY,
  PROXY_URL,
  CLAUDE_API_URL,
  envValue: process.env.REACT_APP_USE_PROXY
});

/**
 * Get API key from environment
 * 
 * @returns {string} - API key
 * @throws {Error} - If API key not set
 */
const getAPIKey = () => {
  const apiKey = process.env.REACT_APP_CLAUDE_API_KEY;
  
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new ValidationError(
      'Claude API key not configured. ' +
      'Please add REACT_APP_CLAUDE_API_KEY to your .env file. ' +
      'Get your API key from: https://console.anthropic.com/'
    );
  }

  return apiKey;
};

/**
 * Categorize a single merchant using Claude API
 * 
 * @param {string} merchantName - Cleaned merchant name
 * @param {Object} categories - Emission factors categories
 * @returns {Promise<Object>} - { category, subcategory, confidence }
 */
export const categorizeMerchantWithLLM = async (merchantName, categories) => {
  // Input validation
  validateNonEmpty(merchantName, 'Merchant name');
  if (!categories || typeof categories !== 'object') {
    throw new ValidationError('Categories must be an object');
  }

  // If using proxy, send simplified request
  if (USE_PROXY) {
    try {
      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          merchantName: merchantName.trim(),
          categories
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
          errorData.error || response.statusText || 'Proxy request failed',
          response.status,
          errorData
        );
      }

      const data = await response.json();
      return {
        category: data.category,
        confidence: data.confidence || 'high',
        method: data.method || 'llm',
        rawResponse: data.rawResponse
      };
    } catch (error) {
      logger.error(`LLM categorization failed for: ${merchantName}`, error);
      throw error;
    }
  }

  // Direct API call (for production with proper CORS setup)
  const apiKey = getAPIKey();
  
  // Build category list for prompt
  const categoryList = Object.keys(categories)
    .filter(c => c !== 'uncategorized')
    .join(', ');

  const prompt = buildClaudePrompt(merchantName, categoryList);

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': CLAUDE_API_CONFIG.anthropic_version,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: CLAUDE_API_CONFIG.model,
        max_tokens: CLAUDE_API_CONFIG.max_tokens,
        temperature: CLAUDE_API_CONFIG.temperature,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.error?.message || errorData.error || response.statusText || 'Claude API request failed',
        response.status,
        errorData
      );
    }

    const data = await response.json();
    const category = data.content[0].text.trim().toLowerCase();

    // Validate category exists
    if (categories[category]) {
      return {
        category,
        confidence: 'high',
        method: 'llm'
      };
    } else {
      return {
        category: 'uncategorized',
        confidence: 'low',
        method: 'llm_fallback',
        rawResponse: category
      };
    }

  } catch (error) {
    // Check if this is a network/CORS error
    if (isNetworkError(error)) {
      console.warn('⚠️ CORS/Network error detected - LLM API cannot be accessed from browser. Using keyword matching instead.');
      // Return a special flag to indicate CORS error
      throw new NetworkError('CORS_BLOCKED', { originalError: error.message });
    }
    
    // If it's an API error, re-throw it
    if (error instanceof APIError) {
      throw error;
    }
    
    console.error('LLM categorization failed for:', merchantName, error);
    
    // Fallback to keyword matching if LLM fails
    return {
      category: 'uncategorized',
      confidence: 'very_low',
      method: 'error',
      error: error.message
    };
  }
};

/**
 * Fallback: Keyword-based categorization
 * Used when LLM fails or API key missing
 * 
 * @param {string} merchantName - Merchant name
 * @param {Object} emissionFactors - Emission factors database
 * @returns {Object} - { category, subcategory, factor, confidence }
 */
export const categorizeMerchantWithKeywords = (merchantName, emissionFactors) => {
  const merchantLower = merchantName.toLowerCase();

  // Search all categories and subcategories for keyword matches
  for (const [categoryKey, category] of Object.entries(emissionFactors.categories)) {
    for (const [subKey, subcategory] of Object.entries(category.subcategories)) {
      // Check if merchant name contains any keywords
      const match = subcategory.keywords.some(keyword =>
        merchantLower.includes(keyword.toLowerCase())
      );

      if (match) {
        return {
          category: categoryKey,
          subcategory: subKey,
          factor: subcategory.factor,
          confidence: 'medium',
          method: 'keyword'
        };
      }
    }
  }

  // No match found - use uncategorized fallback
  return {
    category: 'uncategorized',
    subcategory: 'default',
    factor: LLM_CONFIG.DEFAULT_UNCATEGORIZED_FACTOR,
    confidence: 'very_low',
    method: 'fallback'
  };
};

/**
 * Find best matching subcategory within a category
 * 
 * @param {string} merchantName - Merchant name
 * @param {Object} category - Category object from emission factors
 * @returns {string} - Subcategory key
 */
const findBestSubcategory = (merchantName, category) => {
  const merchantLower = merchantName.toLowerCase();

  // Try to find subcategory by keywords
  for (const [subKey, subcategory] of Object.entries(category.subcategories)) {
    const match = subcategory.keywords.some(keyword =>
      merchantLower.includes(keyword.toLowerCase())
    );

    if (match) {
      return subKey;
    }
  }

  // Return first subcategory as fallback
  return Object.keys(category.subcategories)[0];
};

/**
 * Categorize all transactions
 * 
 * @param {Array} transactions - Parsed transactions
 * @param {Object} emissionFactors - Emission factors database
 * @param {Object} options - { useLLM: boolean, batchSize: number }
 * @returns {Promise<Array>} - Transactions with categories added
 */
export const categorizeAllTransactions = async (
  transactions,
  emissionFactors,
  options = { useLLM: true, batchSize: 5, onProgress: null }
) => {
  // Input validation
  validateNonEmptyArray(transactions, 'Transactions');
  validateEmissionFactors(emissionFactors);
  
  logger.info('Categorizing transactions...');
  logger.debug(`Total transactions: ${transactions.length}`);
  logger.debug(`Method: ${options.useLLM ? 'LLM (Claude API)' : 'Keyword matching'}`);

  const categorized = [];
  let llmSuccessCount = 0;
  let keywordCount = 0;
  let uncategorizedCount = 0;

  // Check if LLM is available
  let useLLM = options.useLLM;
  let corsDetected = false;
  
  if (useLLM) {
    if (USE_PROXY) {
      logger.info('Using proxy server for LLM categorization (no browser API key required)');
    } else {
      try {
        getAPIKey();
      } catch (error) {
        logger.warn('Claude API key not configured, using keyword matching');
        useLLM = false;
      }
    }
  }

  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];
    let result;

    // Use merchantCleaned if available, otherwise fall back to merchant
    const merchantName = (transaction.merchantCleaned && transaction.merchantCleaned.trim()) 
      ? transaction.merchantCleaned.trim() 
      : (transaction.merchant && transaction.merchant.trim()) 
        ? transaction.merchant.trim() 
        : '';

    // If no merchant name available, skip LLM and use keyword matching
    if (!merchantName) {
      const fallbackName = transaction.merchant || '';
      result = categorizeMerchantWithKeywords(fallbackName, emissionFactors);
      if (result.category !== 'uncategorized') {
        keywordCount++;
      } else {
        uncategorizedCount++;
      }
    }
    // If CORS was detected, skip LLM for all remaining transactions
    else if (useLLM && !corsDetected) {
      try {
        // Try LLM categorization
        const llmResult = await categorizeMerchantWithLLM(
          merchantName,
          emissionFactors.categories
        );

        if (llmResult.category !== 'uncategorized') {
          // LLM succeeded
          const category = emissionFactors.categories[llmResult.category];
          const subcategory = findBestSubcategory(merchantName, category);

          result = {
            category: llmResult.category,
            subcategory,
            factor: category.subcategories[subcategory].factor,
            confidence: llmResult.confidence,
            method: llmResult.method
          };

          llmSuccessCount++;
        } else {
          // LLM returned uncategorized, try keywords
          result = categorizeMerchantWithKeywords(merchantName, emissionFactors);
          if (result.category !== 'uncategorized') {
            keywordCount++;
          } else {
            uncategorizedCount++;
          }
        }

        // Rate limiting: Wait between LLM calls
        if (i < transactions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, LLM_CONFIG.RATE_LIMIT_DELAY_MS));
        }

      } catch (error) {
        // Check if this is a CORS error
        if (error instanceof NetworkError && error.message === 'CORS_BLOCKED') {
          corsDetected = true;
          logger.warn('CORS error detected - Anthropic API cannot be accessed directly from browser.');
          logger.warn('Switching to keyword matching for all remaining transactions.');
          logger.warn('Note: To use LLM categorization, you need a backend proxy server.');
        }
        
        // LLM failed, use keyword fallback
        result = categorizeMerchantWithKeywords(merchantName, emissionFactors);
        if (result.category !== 'uncategorized') {
          keywordCount++;
        } else {
          uncategorizedCount++;
        }
      }
    } else {
      // Use keyword matching only (when useLLM is false or CORS was detected)
      result = categorizeMerchantWithKeywords(merchantName, emissionFactors);
      if (result.category !== 'uncategorized') {
        keywordCount++;
      } else {
        uncategorizedCount++;
      }
    }

    // Add categorization to transaction
    categorized.push({
      ...transaction,
      category: result.category,
      subcategory: result.subcategory,
      emissionFactor: result.factor,
      confidence: result.confidence,
      method: result.method
    });

    // Progress logging and callback every 10 transactions
    if ((i + 1) % 10 === 0) {
      logger.progress(i + 1, transactions.length, 'Processed');
      if (options.onProgress) {
        options.onProgress(i + 1, transactions.length);
      }
    }
  }

  logger.success('Categorization complete');
  if (corsDetected) {
    logger.warn('Note: CORS blocked LLM API access - used keyword matching only');
    logger.warn('To use LLM categorization, set up a backend proxy server');
  }
  logger.debug(`LLM successes: ${llmSuccessCount}`);
  logger.debug(`Keyword matches: ${keywordCount}`);
  logger.debug(`Uncategorized: ${uncategorizedCount}`);
  
  const accuracy = ((llmSuccessCount + keywordCount) / transactions.length * VALIDATION.PERCENTAGE_MULTIPLIER).toFixed(1);
  logger.info(`Overall accuracy: ${accuracy}%`);

  // Call progress callback at the end
  if (options.onProgress) {
    options.onProgress(transactions.length, transactions.length);
  }

  return categorized;
};

/**
 * Estimate API cost for categorizing transactions
 * 
 * @param {number} transactionCount - Number of transactions
 * @returns {Object} - { estimatedCost, totalTokens }
 */
export const estimateAPICost = (transactionCount) => {
  // Rough estimates based on LLM_CONFIG constants
  const inputTokensPerRequest = LLM_CONFIG.TOKENS_PER_REQUEST.INPUT;
  const outputTokensPerRequest = LLM_CONFIG.TOKENS_PER_REQUEST.OUTPUT;

  const totalInputTokens = transactionCount * inputTokensPerRequest;
  const totalOutputTokens = transactionCount * outputTokensPerRequest;

  const inputCost = (totalInputTokens / 1000000) * 3;
  const outputCost = (totalOutputTokens / 1000000) * 15;
  
  const estimatedCost = inputCost + outputCost;

  return {
    transactionCount,
    totalInputTokens,
    totalOutputTokens,
    inputCost: parseFloat(inputCost.toFixed(4)),
    outputCost: parseFloat(outputCost.toFixed(4)),
    estimatedCost: parseFloat(estimatedCost.toFixed(4))
  };
};

// Export functions
const llmCategorizer = {
  categorizeMerchantWithLLM,
  categorizeMerchantWithKeywords,
  categorizeAllTransactions,
  estimateAPICost
};

export default llmCategorizer;