# ✅ How to Verify LLM is Working Locally

## Quick Test Steps

### Step 1: Start Proxy Server
Open a terminal and run:
```bash
npm run proxy
```

You should see:
```
🚀 Proxy server running on http://localhost:3001
📝 Make sure CLAUDE_API_KEY is set in .env
```

**Keep this terminal open!**

### Step 2: Start React App
Open another terminal and run:
```bash
npm start
```

### Step 3: Test with a PDF
1. Open http://localhost:3000
2. Upload a PDF statement
3. Open browser console (F12)

### Step 4: Check Console Output

**✅ LLM is Working:**
Look for messages like:
```
🤖 Categorizing transactions...
   Total transactions: 52
   Method: LLM (Claude API)
   LLM successes: 45
   Keyword matches: 5
   Uncategorized: 2
```

**❌ LLM is NOT Working:**
You'll see:
```
🤖 Categorizing transactions...
   Method: Keyword matching
   Keyword matches: 30
   Uncategorized: 22
```

Or you might see:
```
⚠️ CORS error detected - LLM API cannot be accessed from browser
```

## Automated Test

Run the test script:
```bash
node test-llm-setup.js
```

This will check:
- ✅ API key configured
- ✅ Proxy mode enabled
- ✅ Dependencies installed
- ✅ Proxy server running

## What to Look For

### In Browser Console (F12):
- ✅ "LLM successes: X" = Working!
- ❌ "Keyword matches: X" = Not using LLM
- ❌ "CORS error" = Proxy server not running

### In Proxy Server Terminal:
- ✅ "POST /api/categorize - 200" = Requests are working
- ❌ No requests = React app not connecting

### Results:
- **Before LLM:** ~40-50% uncategorized
- **With LLM:** ~5-10% uncategorized

## Troubleshooting

### "Proxy server not running"
```bash
npm run proxy
```

### "CORS error" in browser
1. Check proxy server is running
2. Verify `REACT_APP_USE_PROXY=true` in .env
3. Restart React app

### "401 Unauthorized"
- Check API key is correct in .env
- Verify key has credits at https://console.anthropic.com/

### Still not working?
Run the test script again:
```bash
node test-llm-setup.js
```

