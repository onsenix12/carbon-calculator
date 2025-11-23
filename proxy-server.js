/**
 * Simple Proxy Server for Claude API
 * 
 * This server proxies requests to Claude API to avoid CORS issues.
 * Run this server locally: node proxy-server.js
 * 
 * Usage:
 * 1. Install dependencies: npm install express cors dotenv
 * 2. Create .env with: CLAUDE_API_KEY=your_key_here
 * 3. Run: node proxy-server.js
 * 4. Update llmCategorizer.js to use: http://localhost:3001/api/categorize
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { buildClaudePrompt, CLAUDE_API_CONFIG } = require('./shared/constants');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Proxy endpoint for Claude API
app.post('/api/categorize', async (req, res) => {
  const { merchantName, categories } = req.body;

  if (!merchantName) {
    return res.status(400).json({ error: 'merchantName is required' });
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'CLAUDE_API_KEY not configured' });
  }

  // Build category list for prompt
  const categoryList = Object.keys(categories)
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

    res.json({
      category,
      confidence: 'high',
      method: 'llm',
      rawResponse: category
    });

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to categorize merchant' 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Proxy server is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
  console.log(`📝 Make sure CLAUDE_API_KEY is set in .env`);
  console.log(`🔗 Update llmCategorizer.js to use: http://localhost:${PORT}/api/categorize`);
});

