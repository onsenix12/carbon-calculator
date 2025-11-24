/**
 * Chatbot API Utility
 * 
 * Handles API calls to the carbon footprint chatbot
 * Uses Claude LLM via Vercel serverless function proxy
 * 
 * Features:
 * - Send chat messages
 * - Manage conversation history
 * - Web search integration (via Serper API)
 * - Action items extraction
 */

import { API_CONFIG } from '../constants';
import { ValidationError, APIError, NetworkError, isNetworkError } from './errors';
import logger from './logger';
import { validateNonEmpty } from './validation';

const rawChatbotProxyUrl =
  process.env[API_CONFIG.CHATBOT_PROXY_ENV_VAR] ||
  API_CONFIG.CHATBOT_PROXY_DEFAULT_URL;

const CHATBOT_PROXY_URL =
  rawChatbotProxyUrl &&
  !rawChatbotProxyUrl.includes('your-vercel-url')
    ? rawChatbotProxyUrl
    : null;

if (!CHATBOT_PROXY_URL) {
  logger.error(
    'Chatbot proxy URL not configured. ' +
      'Set REACT_APP_CHATBOT_PROXY_URL or update API_CONFIG.CHATBOT_PROXY_DEFAULT_URL.'
  );
} else {
  logger.debug('Chatbot API Configuration:', {
    CHATBOT_PROXY_URL
  });
}

/**
 * Build user data context object from results
 * Formats the results object for API consumption
 * 
 * @param {Object} results - Carbon footprint results object
 * @returns {Object} - Formatted user data for API
 */
export const buildUserDataContext = (results) => {
  if (!results) {
    throw new ValidationError('Results object is required');
  }

  // Extract and format user data
  const userData = {
    totalEmissions: results.totalEmissions || 0,
    byCategory: results.byCategory || {},
    byCategoryDetailed: results.byCategoryDetailed || {},
    metadata: {
      totalTransactions: results.metadata?.totalTransactions || 0,
      dateRange: results.metadata?.dateRange || null,
      methodologyNote: results.metadata?.methodologyNote || null
    }
  };

  return userData;
};

/**
 * Determine if web search should be used for a question
 * 
 * @param {string} message - User's question
 * @returns {boolean} - Whether web search should be enabled
 */
export const shouldUseWebSearch = (message) => {
  if (!message || typeof message !== 'string') {
    return false;
  }

  const lowerMessage = message.toLowerCase();

  const trendKeywords = ['latest', 'current', 'recent', 'update', 'news'];
  const programKeywords = [
    'program',
    'initiative',
    'scheme',
    'incentive',
    'subsidy',
    'grant',
    'rebate',
    'policy',
    'regulation'
  ];
  const locationKeywords = ['singapore', 'sg', 'nea', 'lta', 'ema', 'gov', 'government'];

  const hasTrendKeyword = trendKeywords.some(keyword => lowerMessage.includes(keyword));
  const hasProgramKeyword = programKeywords.some(keyword => lowerMessage.includes(keyword));
  const hasLocationReference = locationKeywords.some(keyword => lowerMessage.includes(keyword));

  return hasTrendKeyword || (hasProgramKeyword && hasLocationReference);
};

/**
 * Send a chat message to the chatbot API
 * 
 * @param {string} message - User's message/question
 * @param {Array} conversationHistory - Previous conversation messages
 * @param {Object} userData - User's carbon footprint data
 * @param {boolean} enableWebSearch - Whether to enable web search (optional, auto-detected if not provided)
 * @returns {Promise<Object>} - { response, actionItems, usedWebSearch, error }
 */
export const sendChatMessage = async (
  message,
  conversationHistory = [],
  userData,
  enableWebSearch = null
) => {
  // Input validation
  validateNonEmpty(message, 'Message');
  
  if (!userData) {
    throw new ValidationError('User data is required');
  }

  if (!Array.isArray(conversationHistory)) {
    throw new ValidationError('Conversation history must be an array');
  }

  // Validate conversation history format
  for (const msg of conversationHistory) {
    if (!msg.role || !msg.content) {
      throw new ValidationError('Each message in conversationHistory must have role and content');
    }
    if (!['user', 'assistant'].includes(msg.role)) {
      throw new ValidationError('Message role must be "user" or "assistant"');
    }
  }

  // Auto-detect web search if not explicitly provided
  const useWebSearch = enableWebSearch !== null 
    ? enableWebSearch 
    : shouldUseWebSearch(message);

  if (!CHATBOT_PROXY_URL) {
    throw new ValidationError(
      'Chatbot proxy URL is not configured. Please set REACT_APP_CHATBOT_PROXY_URL.'
    );
  }

  try {
    logger.info('Sending chat message to API...');
    logger.debug('Message:', message.substring(0, 100));
    logger.debug('Web search enabled:', useWebSearch);

    const response = await fetch(CHATBOT_PROXY_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        message: message.trim(),
        conversationHistory: conversationHistory,
        userData: userData,
        enableWebSearch: useWebSearch
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.error || response.statusText || 'Chatbot API request failed',
        response.status,
        errorData
      );
    }

    const data = await response.json();

    if (data.error) {
      throw new APIError(data.error, response.status, data);
    }

    logger.success('Chat message processed successfully');
    logger.debug('Response length:', data.response?.length || 0);
    logger.debug('Action items:', data.actionItems?.length || 0);

    return {
      response: data.response || '',
      actionItems: data.actionItems || [],
      usedWebSearch: data.usedWebSearch || false,
      error: null
    };

  } catch (error) {
    // Check if this is a network/CORS error
    if (isNetworkError(error)) {
      logger.error('Network/CORS error in chatbot API:', error);
      throw new NetworkError('CORS_BLOCKED', { originalError: error.message });
    }
    
    // If it's an API error, re-throw it
    if (error instanceof APIError || error instanceof ValidationError) {
      throw error;
    }
    
    logger.error('Chatbot API error:', error);
    throw new APIError(
      error.message || 'Failed to send chat message',
      500,
      { originalError: error.message }
    );
  }
};

/**
 * Extract action items from chatbot response text
 * 
 * @param {string} responseText - Chatbot response text
 * @returns {Array<string>} - Array of extracted action items
 */
export const extractActionItems = (responseText) => {
  if (!responseText || typeof responseText !== 'string') {
    return [];
  }

  const actionItems = [];
  
  // Pattern 1: Bullet points starting with "-", "•", or "*"
  const bulletPattern = /^[\s]*[-•*]\s+(.+)$/gm;
  let match;
  while ((match = bulletPattern.exec(responseText)) !== null) {
    const item = match[1].trim();
    if (item.length > 0 && item.length < 200) { // Reasonable length
      actionItems.push(item);
    }
  }

  // Pattern 2: Numbered lists (1., 2., etc.)
  const numberedPattern = /^\d+\.\s+(.+)$/gm;
  while ((match = numberedPattern.exec(responseText)) !== null) {
    const item = match[1].trim();
    if (item.length > 0 && item.length < 200) {
      actionItems.push(item);
    }
  }

  // Pattern 3: Action-oriented phrases
  const actionPhrases = [
    /(?:you should|try to|consider|recommend|suggest|action:)\s+(.+?)(?:\.|$)/gi,
    /(?:do|make|use|switch|reduce|increase|decrease)\s+(.+?)(?:\.|$)/gi
  ];

  actionPhrases.forEach(pattern => {
    while ((match = pattern.exec(responseText)) !== null) {
      const item = match[1].trim();
      // Only add if it's not already captured and is reasonable
      if (item.length > 0 && item.length < 200 && !actionItems.includes(item)) {
        actionItems.push(item);
      }
    }
  });

  // Remove duplicates and clean up
  const uniqueItems = [...new Set(actionItems.map(item => item.trim()))]
    .filter(item => item.length > 0);

  logger.debug(`Extracted ${uniqueItems.length} action items from response`);
  
  return uniqueItems;
};

// Export all functions
const chatbotApi = {
  sendChatMessage,
  buildUserDataContext,
  shouldUseWebSearch,
  extractActionItems
};

export default chatbotApi;

