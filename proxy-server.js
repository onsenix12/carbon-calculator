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
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
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

