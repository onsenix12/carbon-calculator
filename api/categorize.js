/**
 * Vercel Serverless Function - Claude API Proxy
 * 
 * This function proxies requests to Claude API to avoid CORS issues.
 * Deploy this to Vercel (or similar platform) to enable LLM categorization on GitHub Pages.
 * 
 * Setup:
 * 1. Deploy to Vercel: vercel deploy
 * 2. Add CLAUDE_API_KEY to Vercel environment variables
 * 3. Update REACT_APP_PROXY_URL in GitHub Actions to your Vercel URL
 */

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

  const { merchantName, categories } = req.body;

  if (!merchantName) {
    return res.status(400).json({ error: 'merchantName is required' });
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'CLAUDE_API_KEY not configured' });
  }

  // Import shared constants
  const { buildClaudePrompt, CLAUDE_API_CONFIG } = require('../shared/constants');

  // Build category list for prompt
  const categoryList = Object.keys(categories || {})
    .filter(c => c !== 'uncategorized')
    .join(', ');

  const prompt = buildClaudePrompt(merchantName, categoryList);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
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
      throw new Error(
        `Claude API error (${response.status}): ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    const category = data.content[0].text.trim().toLowerCase();

    return res.status(200).json({
      category,
      confidence: 'high',
      method: 'llm',
      rawResponse: category
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to categorize merchant' 
    });
  }
}

