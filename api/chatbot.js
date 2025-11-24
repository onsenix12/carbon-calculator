/**
 * Vercel Serverless Function - Carbon Footprint Chatbot
 * 
 * This function provides a chatbot interface for carbon footprint advice.
 * Uses Claude API to answer questions based on user's carbon emission data.
 * 
 * Setup:
 * 1. Deploy to Vercel: vercel deploy
 * 2. Add CLAUDE_API_KEY to Vercel environment variables
 */

import { buildChatbotPrompt, CLAUDE_API_CONFIG } from '../shared/constants.js';

const MAX_HISTORY_ENTRIES = 10;
const MAX_MESSAGE_LENGTH = 1200;

const sanitizeText = (text = '') => {
  if (!text) return '';
  const trimmed = String(text).trim();
  if (trimmed.length <= MAX_MESSAGE_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_MESSAGE_LENGTH)}…`;
};

const sanitizeHistory = (history = []) => {
  return history
    .slice(-MAX_HISTORY_ENTRIES)
    .map(msg => ({
      role: msg.role,
      content: sanitizeText(msg.content)
    }));
};

/**
 * Perform web search using Serper API
 * 
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of search results
 */
async function performWebSearch(query) {
  const serperApiKey = process.env.SERPER_API_KEY;
  
  if (!serperApiKey) {
    console.warn('SERPER_API_KEY not configured, skipping web search');
    return [];
  }

  try {
    // Construct search query with carbon emissions context
    const searchQuery = `${query} carbon emissions Singapore sustainability`;
    
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: searchQuery,
        num: 5 // Limit to 5 results
      })
    });

    if (!response.ok) {
      console.error('Serper API error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    
    // Format results for Claude context
    const results = [];
    
    // Organic results
    if (data.organic && Array.isArray(data.organic)) {
      data.organic.slice(0, 5).forEach(result => {
        results.push({
          title: result.title || '',
          snippet: result.snippet || '',
          url: result.link || ''
        });
      });
    }

    return results;
  } catch (error) {
    console.error('Web search error:', error);
    return [];
  }
}

/**
 * Extract action items from chatbot response text
 * Simple pattern matching - can be enhanced with LLM extraction later
 * 
 * @param {string} responseText - Chatbot response text
 * @returns {Array<string>} - Array of extracted action items
 */
function extractActionItems(responseText) {
  if (!responseText || typeof responseText !== 'string') {
    return [];
  }

  const actionItems = [];
  
  // Pattern 1: Bullet points starting with "-", "•", or "*"
  const bulletPattern = /^[\s]*[-•*]\s+(.+)$/gm;
  let match;
  while ((match = bulletPattern.exec(responseText)) !== null) {
    const item = match[1].trim();
    if (item.length > 0 && item.length < 200) {
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

  // Remove duplicates
  return [...new Set(actionItems.map(item => item.trim()))]
    .filter(item => item.length > 0);
}

// Chatbot-specific Claude API config (more tokens for conversations)
const CHATBOT_API_CONFIG = {
  ...CLAUDE_API_CONFIG,
  max_tokens: 1000, // More tokens for detailed responses
  temperature: 0.7 // Slightly higher for more natural conversation
};

export default async function handler(req, res) {
  // Enable CORS for all origins (since we're a proxy)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests FIRST (before POST check)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, conversationHistory = [], userData, enableWebSearch = false } = req.body;

  // Validate required fields
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'message is required and must be a non-empty string' });
  }

  if (!userData) {
    return res.status(400).json({ error: 'userData is required' });
  }

  // Validate conversation history format
  if (!Array.isArray(conversationHistory)) {
    return res.status(400).json({ error: 'conversationHistory must be an array' });
  }

  // Validate conversation history items
  for (const msg of conversationHistory) {
    if (!msg.role || !msg.content) {
      return res.status(400).json({ error: 'Each message in conversationHistory must have role and content' });
    }
    if (!['user', 'assistant'].includes(msg.role)) {
      return res.status(400).json({ error: 'Message role must be "user" or "assistant"' });
    }
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'CLAUDE_API_KEY not configured' });
  }

  try {
    const sanitizedQuestion = sanitizeText(message);
    const sanitizedHistory = sanitizeHistory(conversationHistory);

    // Web search integration (Serper API) - will be implemented next
    let webSearchResults = [];
    let usedWebSearch = false;

    if (enableWebSearch) {
      webSearchResults = await performWebSearch(sanitizedQuestion);
      usedWebSearch = webSearchResults.length > 0;
    }

    // Build the system prompt with user data and conversation history
    const systemPrompt = buildChatbotPrompt(
      userData,
      sanitizedHistory,
      sanitizedQuestion,
      webSearchResults
    );

    // Prepare messages for Claude API
    // Claude uses a system message + conversation history
    const messages = [
      {
        role: 'user',
        content: systemPrompt
      }
    ];

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': CHATBOT_API_CONFIG.anthropic_version,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: CHATBOT_API_CONFIG.model,
        max_tokens: CHATBOT_API_CONFIG.max_tokens,
        temperature: CHATBOT_API_CONFIG.temperature,
        messages: messages
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Claude API error (${response.status}): ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    const responseText = data.content[0].text.trim();

    // Extract action items from response
    // Simple extraction - can be enhanced later
    const actionItems = extractActionItems(responseText);

    // Return response
    return res.status(200).json({
      response: responseText,
      actionItems: actionItems,
      usedWebSearch: usedWebSearch,
      error: null
    });

  } catch (error) {
    console.error('Chatbot API error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to process chatbot request',
      response: null
    });
  }
}

