# 🔧 Fix CORS Issue - LLM Not Working

## Current Problem
You're seeing:
- ❌ CORS errors in console
- ❌ LLM successes: 0
- ❌ 36 out of 52 transactions uncategorized (69%)

## Root Cause
The proxy server is **not running**. The React app is trying to call Claude API directly, which fails due to CORS.

## Solution (3 Steps)

### ✅ Step 1: Start Proxy Server

**Open a NEW terminal window** (keep it open):

```bash
cd c:\Users\jta12\OneDrive\Apps\carbon-calculator
npm run proxy
```

**Expected output:**
```
🚀 Proxy server running on http://localhost:3001
📝 Make sure CLAUDE_API_KEY is set in .env
🔗 Update llmCategorizer.js to use: http://localhost:3001/api/categorize
```

**⚠️ DO NOT CLOSE THIS TERMINAL** - The proxy must keep running!

### ✅ Step 2: Restart React App

**In your current terminal** (where React is running):

1. **Stop React app:** Press `Ctrl+C`
2. **Start it again:**
   ```bash
   npm start
   ```

**Why restart?** React only reads `.env` when it starts. Since we added `REACT_APP_USE_PROXY=true`, you must restart.

### ✅ Step 3: Verify It Works

1. Open http://localhost:3000
2. Open browser console (F12)
3. **Look for this log:**
   ```
   🔧 LLM Configuration: {
     USE_PROXY: true,
     PROXY_URL: "http://localhost:3001/api/categorize",
     CLAUDE_API_URL: "http://localhost:3001/api/categorize"
   }
   ```
4. Upload a PDF
5. **Check console for:**
   - ✅ "LLM successes: 45" (not 0!)
   - ✅ No CORS errors
   - ✅ "Uncategorized: 5" (not 36!)

## Verification Checklist

- [ ] Proxy server terminal shows "Proxy server running on http://localhost:3001"
- [ ] React app shows "🔧 LLM Configuration" with `USE_PROXY: true`
- [ ] No CORS errors in browser console
- [ ] "LLM successes" is greater than 0
- [ ] Uncategorized count is much lower (5-10 instead of 36)

## If Still Not Working

### Check Proxy Server
```bash
# In a new terminal
curl http://localhost:3001/health
```
Should return: `{"status":"ok","message":"Proxy server is running"}`

### Check Port
```bash
netstat -ano | findstr :3001
```
Should show port 3001 is in use (proxy is running)

### Check .env File
```bash
Get-Content .env | Select-String "USE_PROXY|CLAUDE_API_KEY"
```
Should show:
- `REACT_APP_USE_PROXY=true`
- `CLAUDE_API_KEY=sk-ant-api03-...`

## Expected Results

**Before:**
- LLM successes: 0
- Keyword matches: 16
- Uncategorized: 36 (69%)
- Overall accuracy: 30.8%

**After:**
- LLM successes: ~45
- Keyword matches: ~5
- Uncategorized: ~5 (10%)
- Overall accuracy: ~90%

---

**Remember:** Both servers must run simultaneously:
- Terminal 1: `npm run proxy` (proxy server)
- Terminal 2: `npm start` (React app)

