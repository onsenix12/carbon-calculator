# 🚀 Quick Start: Enable LLM Categorization

Follow these steps to enable LLM categorization and reduce uncategorized transactions.

## Step 1: Install Dependencies ✅

Already done! The following packages are installed:
- `express` - Web server for proxy
- `cors` - CORS middleware
- `dotenv` - Environment variable management

## Step 2: Create `.env` File

1. Copy the example file:
   ```bash
   copy .env.example .env
   ```
   Or manually create a `.env` file in the project root.

2. Edit `.env` and add your Claude API key:
   ```
   CLAUDE_API_KEY=sk-ant-api03-your-actual-key-here
   REACT_APP_USE_PROXY=true
   ```

3. **Get your API key from:** https://console.anthropic.com/
   - Sign up or log in
   - Go to API Keys section
   - Create a new key
   - Copy the key (starts with `sk-ant-api03-`)

## Step 3: Start the Proxy Server

Open a **new terminal** and run:

```bash
npm run proxy
```

You should see:
```
🚀 Proxy server running on http://localhost:3001
📝 Make sure CLAUDE_API_KEY is set in .env
🔗 Update llmCategorizer.js to use: http://localhost:3001/api/categorize
```

**Keep this terminal open** - the proxy server needs to keep running.

## Step 4: Start the React App

In your **original terminal** (or a new one), run:

```bash
npm start
```

The React app will start on http://localhost:3000

## Step 5: Test It!

1. Open http://localhost:3000 in your browser
2. Upload a PDF statement
3. Open browser console (F12)
4. Look for messages like:
   - ✅ `LLM successes: 45` (good!)
   - ❌ `Keyword matches: 30, Uncategorized: 22` (LLM not working)

## Expected Results

**Before LLM:**
- Uncategorized: ~40-50% of transactions
- Uses keyword matching only

**After LLM:**
- Uncategorized: ~5-10% of transactions  
- Much better categorization accuracy

## Troubleshooting

### "Proxy server not running"
- Make sure you ran `npm run proxy` in a separate terminal
- Check that port 3001 is not already in use

### "CLAUDE_API_KEY not configured"
- Verify `.env` file exists in project root
- Check the key is correct (no extra spaces)
- Restart the proxy server after editing `.env`

### "CORS error" in browser console
- Make sure proxy server is running
- Verify `REACT_APP_USE_PROXY=true` in `.env`
- Restart React app after changing `.env`

### "401 Unauthorized"
- Check your API key is correct
- Verify API key has credits at https://console.anthropic.com/

## 💰 API Costs

- **Per transaction**: ~$0.0003
- **100 transactions**: ~$0.03
- **1000 transactions**: ~$0.30

Very affordable for personal use!

---

**Need more help?** See `LLM_SETUP_GUIDE.md` for detailed instructions.

