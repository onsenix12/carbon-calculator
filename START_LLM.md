# 🚀 Start LLM - Step by Step

## The Problem
You're seeing CORS errors because the React app is trying to call Claude API directly. The proxy server needs to be running.

## Solution: Start Both Servers

### Step 1: Start Proxy Server (Terminal 1)

Open a **new terminal window** and run:

```bash
cd c:\Users\jta12\OneDrive\Apps\carbon-calculator
npm run proxy
```

**You should see:**
```
🚀 Proxy server running on http://localhost:3001
📝 Make sure CLAUDE_API_KEY is set in .env
```

**⚠️ IMPORTANT:** Keep this terminal open! The proxy server must keep running.

### Step 2: Restart React App (Terminal 2)

**Stop your current React app** (Ctrl+C if it's running), then:

```bash
cd c:\Users\jta12\OneDrive\Apps\carbon-calculator
npm start
```

**Why restart?** React apps only read `.env` files when they start. After adding `REACT_APP_USE_PROXY=true`, you must restart.

### Step 3: Verify It's Working

1. Open http://localhost:3000
2. Open browser console (F12)
3. Look for this message:
   ```
   🔧 LLM Configuration: {
     USE_PROXY: true,
     PROXY_URL: "http://localhost:3001/api/categorize",
     ...
   }
   ```
4. Upload a PDF
5. Check console for:
   - ✅ "LLM successes: X" (not 0!)
   - ✅ No CORS errors
   - ✅ Fewer uncategorized transactions

## Quick Check Commands

### Check if proxy is running:
```bash
netstat -ano | findstr :3001
```
If you see output, proxy is running. If empty, it's not.

### Test proxy server directly:
```bash
curl http://localhost:3001/health
```
Should return: `{"status":"ok","message":"Proxy server is running"}`

## Common Issues

### "Still seeing CORS errors"
1. ✅ Is proxy server running? (Check Terminal 1)
2. ✅ Did you restart React app? (Stop and start again)
3. ✅ Check browser console for the configuration log

### "Proxy server won't start"
- Check if port 3001 is already in use
- Make sure `.env` has `CLAUDE_API_KEY` set
- Check for errors in the proxy terminal

### "LLM successes: 0"
- Verify proxy server is running
- Check proxy server terminal for errors
- Verify API key is correct in `.env`

## Expected Results

**Before (Current):**
- LLM successes: 0
- Uncategorized: 36/52 (69%)

**After (With Proxy):**
- LLM successes: ~45/52
- Uncategorized: ~5/52 (10%)

---

**Remember:** Both servers must be running at the same time!

