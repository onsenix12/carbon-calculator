# 🤖 LLM Setup Guide - Reduce Uncategorized Transactions

This guide will help you set up the Claude API to use LLM categorization, which will significantly reduce the number of uncategorized transactions.

## 🚨 The Problem: CORS

The Anthropic Claude API **does not allow direct browser calls** due to CORS (Cross-Origin Resource Sharing) restrictions. This means:
- ❌ You cannot call the API directly from `localhost:3000` (React app)
- ✅ You need a **backend proxy server** to make the API calls

## 🎯 Solution Options

### Option 1: Local Proxy Server (Recommended for Development)

Use a simple Node.js proxy server to forward requests to Claude API.

#### Step 1: Install Proxy Dependencies

```bash
npm install express cors dotenv
```

#### Step 2: Create `.env` File

Create a `.env` file in the project root:

```bash
CLAUDE_API_KEY=sk-ant-api03-your-actual-key-here
```

**Get your API key from:** https://console.anthropic.com/

#### Step 3: Start Proxy Server

```bash
node proxy-server.js
```

You should see:
```
🚀 Proxy server running on http://localhost:3001
📝 Make sure CLAUDE_API_KEY is set in .env
🔗 Update llmCategorizer.js to use: http://localhost:3001/api/categorize
```

#### Step 4: Update LLM Categorizer

Update `src/utils/llmCategorizer.js` to use the proxy:

Find this line (around line 12):
```javascript
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
```

Change it to:
```javascript
const CLAUDE_API_URL = 'http://localhost:3001/api/categorize';
```

**Important:** Also update the `categorizeMerchantWithLLM` function to send the request in the proxy format. See the updated code below.

#### Step 5: Update the Categorize Function

The proxy expects a different request format. Update the function in `llmCategorizer.js`:

```javascript
export const categorizeMerchantWithLLM = async (merchantName, categories) => {
  try {
    const response = await fetch('http://localhost:3001/api/categorize', {
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
    // Check if this is a CORS error
    const isCorsError = error.message.includes('CORS') || 
                       error.message.includes('Failed to fetch') ||
                       error.message.includes('NetworkError') ||
                       error.name === 'TypeError';
    
    if (isCorsError) {
      console.warn('⚠️ CORS error detected - LLM API cannot be accessed from browser. Using keyword matching instead.');
      throw new Error('CORS_BLOCKED');
    }
    
    console.error('LLM categorization failed for:', merchantName, error);
    throw error;
  }
};
```

#### Step 6: Run Both Servers

1. **Terminal 1** - Start proxy server:
   ```bash
   node proxy-server.js
   ```

2. **Terminal 2** - Start React app:
   ```bash
   npm start
   ```

#### Step 7: Test

1. Open http://localhost:3000
2. Upload a PDF statement
3. Check browser console (F12) - you should see "LLM successes" instead of "Keyword matches"
4. Check proxy server terminal - you should see API requests being processed

---

### Option 2: Production Deployment (GitHub Pages + Backend Service)

For production, you have two options:

#### A. Use a Serverless Function (Vercel/Netlify)

1. Deploy the proxy as a serverless function
2. Update the API URL to point to your serverless function
3. Deploy React app to GitHub Pages

#### B. Use a Separate Backend Service

1. Deploy the proxy server to a service like:
   - Railway (https://railway.app)
   - Render (https://render.com)
   - Heroku (https://heroku.com)
2. Update the API URL in production build
3. Deploy React app to GitHub Pages

---

## 🔍 Verifying LLM is Working

### Check Browser Console

When LLM is working, you'll see:
```
🤖 Categorizing transactions...
   Total transactions: 52
   Method: LLM (Claude API)
   LLM successes: 45
   Keyword matches: 5
   Uncategorized: 2
```

When LLM is NOT working (fallback to keywords):
```
🤖 Categorizing transactions...
   Total transactions: 52
   Method: Keyword matching
   Keyword matches: 30
   Uncategorized: 22
```

### Check Proxy Server Logs

When working, you'll see requests in the proxy server terminal:
```
POST /api/categorize - 200
POST /api/categorize - 200
...
```

---

## 💰 API Costs

- **Cost per transaction**: ~$0.0003
- **100 transactions**: ~$0.03
- **1000 transactions**: ~$0.30

The API is very affordable for personal use!

---

## 🐛 Troubleshooting

### Issue: "Proxy server not running"

**Solution:**
- Make sure you started `node proxy-server.js` in a separate terminal
- Check that port 3001 is not already in use
- Verify `.env` file exists with `CLAUDE_API_KEY`

### Issue: "CLAUDE_API_KEY not configured"

**Solution:**
- Create `.env` file in project root
- Add: `CLAUDE_API_KEY=sk-ant-api03-your-key`
- Restart proxy server

### Issue: "CORS error still happening"

**Solution:**
- Make sure proxy server is running on port 3001
- Verify the API URL in `llmCategorizer.js` points to `http://localhost:3001/api/categorize`
- Check browser console for exact error message

### Issue: "401 Unauthorized"

**Solution:**
- Verify your API key is correct
- Check API key has credits at https://console.anthropic.com/
- Make sure no extra spaces in `.env` file

---

## 📝 Quick Start Checklist

- [ ] Install proxy dependencies: `npm install express cors dotenv`
- [ ] Create `.env` with `CLAUDE_API_KEY`
- [ ] Start proxy server: `node proxy-server.js`
- [ ] Update `llmCategorizer.js` to use proxy URL
- [ ] Update `categorizeMerchantWithLLM` function
- [ ] Start React app: `npm start`
- [ ] Test with a PDF upload
- [ ] Check console for "LLM successes"

---

## 🎯 Expected Results

**Before LLM (Keyword Matching Only):**
- Uncategorized: ~40-50% of transactions
- Accuracy: ~60-70%

**After LLM (With Claude API):**
- Uncategorized: ~5-10% of transactions
- Accuracy: ~90-95%

---

**Last Updated:** 2024-11-23

