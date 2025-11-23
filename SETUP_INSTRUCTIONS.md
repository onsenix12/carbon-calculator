# 🔧 Setup Instructions

## Quick Setup Checklist

### ✅ Step 1: Install Dependencies
```bash
npm install
```

### ✅ Step 2: Create Environment File

Create a `.env` file in the project root with your Claude API key:

```bash
REACT_APP_CLAUDE_API_KEY=sk-ant-api03-your-actual-key-here
```

**Get your API key from:** https://console.anthropic.com/

**Note:** 
- The app will work WITHOUT an API key (uses keyword matching instead of LLM)
- But LLM categorization is more accurate
- API costs: ~$0.0003 per transaction (100 transactions ≈ $0.03)

### ✅ Step 3: Start the App
```bash
npm start
```

The app will open at: http://localhost:3000

## 🔍 LLM API Connection Status

### ✅ API Code is Implemented
- Location: `src/utils/llmCategorizer.js`
- API Endpoint: `https://api.anthropic.com/v1/messages`
- Model: `claude-sonnet-4-20250514`
- Authentication: Uses `x-api-key` header (correct format)

### ✅ API is Now Connected
- The processing pipeline in `App.js` is now fully connected
- It will automatically:
  1. Try to use LLM if API key is available
  2. Fallback to keyword matching if API key is missing
  3. Show warnings in console if API key is not configured

### ⚠️ Current Status
**To check if your API is connected:**

1. **Without API Key:**
   - App works but uses keyword matching
   - Console shows: `⚠️ Claude API key not configured, using keyword matching`
   - Lower categorization accuracy

2. **With API Key:**
   - App uses LLM for categorization
   - Console shows: `LLM successes: X`
   - Higher categorization accuracy

## 🧪 Testing

See `TESTING_GUIDE.md` for detailed testing instructions.

### Quick Test:
1. Start the app: `npm start`
2. Upload a DBS credit card statement PDF
3. Check browser console (F12) for processing logs
4. Verify results display correctly

## 🐛 Troubleshooting

### "Claude API key not configured"
- Create `.env` file in project root
- Add: `REACT_APP_CLAUDE_API_KEY=your_key`
- **Restart the dev server** (env vars load at startup)

### API Errors
- Check API key is valid at https://console.anthropic.com/
- Verify API key has credits
- App will automatically fallback to keyword matching on errors

---

**Last Updated:** 2024-11-23

