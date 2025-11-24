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

/**
 * Build system prompt for carbon footprint chatbot
 * 
 * @param {Object} userData - User's carbon footprint data
 * @param {Array} conversationHistory - Previous conversation messages
 * @param {string} currentQuestion - Current user question
 * @param {Array} webSearchResults - Optional web search results
 * @returns {string} - The formatted system prompt
 */
function buildChatbotPrompt(userData, conversationHistory, currentQuestion, webSearchResults = []) {
  // Format user data context
  const userDataContext = formatUserDataContext(userData);
  
  // Format conversation history
  const historyText = conversationHistory.length > 0
    ? conversationHistory.map((msg, idx) => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        return `${role}: ${msg.content}`;
      }).join('\n\n')
    : '(No previous conversation)';
  
  // Format web search results if available
  const searchContext = webSearchResults.length > 0
    ? webSearchResults.map((result, idx) => {
        return `Result ${idx + 1}:\nTitle: ${result.title}\nSnippet: ${result.snippet}\nURL: ${result.url}`;
      }).join('\n\n')
    : '';

  return `You are a carbon footprint advisor chatbot. Your role is to help users understand their carbon emissions and provide advice on reducing them.

STRICT RULES:
1. You can ONLY discuss topics related to carbon emissions, carbon footprint, sustainability, and environmental impact
2. You MUST refuse to answer any question outside this scope
3. You can provide brainstorming suggestions, but ONLY related to carbon emission reduction
4. Base your answers on the user's actual data provided below
5. Be helpful, friendly, but firm about scope limitations
6. When providing advice, format action items clearly (one per line, starting with "-" or numbered)
7. If web search results are provided, use them to enhance your answer but prioritize user's data

USER'S CARBON FOOTPRINT DATA:
${userDataContext}

${searchContext ? `WEB SEARCH RESULTS (if available):\n${searchContext}\n\n` : ''}CONVERSATION HISTORY:
${historyText}

CURRENT USER QUESTION:
${currentQuestion}

RESPONSE GUIDELINES:
- If question is about carbon emissions → Answer based on user data
- If question is outside scope → Politely decline and redirect to carbon topics
- Provide specific, actionable advice when possible
- Reference specific categories/amounts from user data
- Suggest concrete reduction strategies
- Format action items clearly for extraction
- Use web search results to provide current, accurate information when relevant

ACTION ITEMS FORMAT:
When suggesting actions, format them clearly like this:
- Action item 1
- Action item 2
- Action item 3

Please provide a helpful response:`;
}

/**
 * Format user data into readable context string
 * 
 * @param {Object} userData - User's carbon footprint results
 * @returns {string} - Formatted context string
 */
function formatUserDataContext(userData) {
  if (!userData) return 'No user data available';
  
  const lines = [];
  
  // Total emissions
  if (userData.totalEmissions !== undefined) {
    lines.push(`Total Carbon Emissions: ${Math.round(userData.totalEmissions)} kg CO₂e`);
  }
  
  // Date range
  if (userData.metadata?.dateRange) {
    const { start, end } = userData.metadata.dateRange;
    if (start && end) {
      lines.push(`Period: ${start} to ${end}`);
    }
  }
  
  // Transaction count
  if (userData.metadata?.totalTransactions) {
    lines.push(`Total Transactions: ${userData.metadata.totalTransactions}`);
  }
  
  // Top categories
  if (userData.byCategoryDetailed) {
    const categories = Object.entries(userData.byCategoryDetailed)
      .filter(([_, data]) => data.emissions > 0)
      .sort(([_, a], [__, b]) => b.emissions - a.emissions)
      .slice(0, 5); // Top 5 categories
    
    if (categories.length > 0) {
      lines.push('\nTop Emission Categories:');
      categories.forEach(([key, data]) => {
        const percentage = userData.totalEmissions > 0
          ? ((data.emissions / userData.totalEmissions) * 100).toFixed(1)
          : '0';
        lines.push(`  ${data.icon || '•'} ${data.name}: ${Math.round(data.emissions)} kg CO₂e (${percentage}%)`);
        if (data.spending > 0) {
          lines.push(`    Spending: S$${data.spending.toFixed(2)}`);
        }
      });
    }
  }
  
  // Methodology note
  if (userData.metadata?.methodologyNote) {
    lines.push(`\nMethodology: ${userData.metadata.methodologyNote}`);
  }
  
  return lines.join('\n');
}

// Export for CommonJS (for proxy-server.js and other Node.js scripts)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildClaudePrompt,
    buildChatbotPrompt,
    formatUserDataContext,
    CLAUDE_MODEL,
    CLAUDE_API_CONFIG
  };
}

// Export for ES modules (for Vercel serverless functions)
export {
  buildClaudePrompt,
  buildChatbotPrompt,
  formatUserDataContext,
  CLAUDE_MODEL,
  CLAUDE_API_CONFIG
};

