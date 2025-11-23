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

// Use proxy server in development, direct API in production
// Set REACT_APP_USE_PROXY=true in .env to use local proxy server
const USE_PROXY = process.env.REACT_APP_USE_PROXY === 'true';
const PROXY_URL = process.env.REACT_APP_PROXY_URL || 'http://localhost:3001/api/categorize';
const CLAUDE_API_URL = USE_PROXY ? PROXY_URL : 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

// Debug logging
console.log('🔧 LLM Configuration:', {
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
    throw new Error(
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
  // If using proxy, send simplified request
  if (USE_PROXY) {
    try {
      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          merchantName,
          categories
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Proxy error (${response.status}): ${errorData.error || response.statusText}`
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
      console.error('LLM categorization failed for:', merchantName, error);
      throw error;
    }
  }

  // Direct API call (for production with proper CORS setup)
  const apiKey = getAPIKey();
  
  // Build category list for prompt
  const categoryList = Object.keys(categories)
    .filter(c => c !== 'uncategorized')
    .join(', ');

  const prompt = `You are a transaction categorizer for carbon footprint calculation in Singapore.

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

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 20,
        temperature: 0,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Claude API error (${response.status}): ${errorData.error?.message || response.statusText}`
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
    // Check if this is a CORS error
    const isCorsError = error.message.includes('CORS') || 
                       error.message.includes('Failed to fetch') ||
                       error.message.includes('NetworkError') ||
                       error.name === 'TypeError';
    
    if (isCorsError) {
      console.warn('⚠️ CORS error detected - LLM API cannot be accessed from browser. Using keyword matching instead.');
      // Return a special flag to indicate CORS error
      throw new Error('CORS_BLOCKED');
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
    factor: 0.50,
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
  options = { useLLM: true, batchSize: 5 }
) => {
  console.log('🤖 Categorizing transactions...');
  console.log(`   Total transactions: ${transactions.length}`);
  console.log(`   Method: ${options.useLLM ? 'LLM (Claude API)' : 'Keyword matching'}`);

  const categorized = [];
  let llmSuccessCount = 0;
  let keywordCount = 0;
  let uncategorizedCount = 0;

  // Check if LLM is available
  let useLLM = options.useLLM;
  let corsDetected = false;
  
  try {
    getAPIKey();
  } catch (error) {
    console.warn('⚠️  Claude API key not configured, using keyword matching');
    useLLM = false;
  }

  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];
    let result;

    // If CORS was detected, skip LLM for all remaining transactions
    if (useLLM && !corsDetected) {
      try {
        // Try LLM categorization
        const llmResult = await categorizeMerchantWithLLM(
          transaction.merchantCleaned,
          emissionFactors.categories
        );

        if (llmResult.category !== 'uncategorized') {
          // LLM succeeded
          const category = emissionFactors.categories[llmResult.category];
          const subcategory = findBestSubcategory(transaction.merchantCleaned, category);

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
          result = categorizeMerchantWithKeywords(transaction.merchantCleaned, emissionFactors);
          if (result.category !== 'uncategorized') {
            keywordCount++;
          } else {
            uncategorizedCount++;
          }
        }

        // Rate limiting: Wait 100ms between LLM calls
        if (i < transactions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        // Check if this is a CORS error
        if (error.message === 'CORS_BLOCKED') {
          corsDetected = true;
          console.warn('⚠️  CORS error detected - Anthropic API cannot be accessed directly from browser.');
          console.warn('   Switching to keyword matching for all remaining transactions.');
          console.warn('   Note: To use LLM categorization, you need a backend proxy server.');
        }
        
        // LLM failed, use keyword fallback
        result = categorizeMerchantWithKeywords(transaction.merchantCleaned, emissionFactors);
        if (result.category !== 'uncategorized') {
          keywordCount++;
        } else {
          uncategorizedCount++;
        }
      }
    } else {
      // Use keyword matching only
      result = categorizeMerchantWithKeywords(transaction.merchantCleaned, emissionFactors);
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

    // Progress logging every 10 transactions
    if ((i + 1) % 10 === 0) {
      console.log(`   Processed ${i + 1}/${transactions.length} transactions...`);
    }
  }

  console.log('✅ Categorization complete');
  if (corsDetected) {
    console.log('   ⚠️  Note: CORS blocked LLM API access - used keyword matching only');
    console.log('   To use LLM categorization, set up a backend proxy server');
  }
  console.log(`   LLM successes: ${llmSuccessCount}`);
  console.log(`   Keyword matches: ${keywordCount}`);
  console.log(`   Uncategorized: ${uncategorizedCount}`);
  
  const accuracy = ((llmSuccessCount + keywordCount) / transactions.length * 100).toFixed(1);
  console.log(`   Overall accuracy: ${accuracy}%`);

  return categorized;
};

/**
 * Estimate API cost for categorizing transactions
 * 
 * @param {number} transactionCount - Number of transactions
 * @returns {Object} - { estimatedCost, totalTokens }
 */
export const estimateAPICost = (transactionCount) => {
  // Rough estimates:
  // - Input: ~100 tokens per request
  // - Output: ~10 tokens per request
  // - Claude Sonnet 4: $3/million input, $15/million output

  const inputTokensPerRequest = 100;
  const outputTokensPerRequest = 10;

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