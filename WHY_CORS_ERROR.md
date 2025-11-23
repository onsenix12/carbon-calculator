# ❓ Why GitHub Pages Cannot Access the API

## The Problem

When you deploy to GitHub Pages, you see this error:
```
Access to fetch at 'https://api.anthropic.com/v1/messages' from origin 
'https://onsenix12.github.io' has been blocked by CORS policy
```

## Root Cause

### 1. **GitHub Pages is Static Only**
- GitHub Pages can only serve **static files** (HTML, CSS, JavaScript)
- It **cannot run** Node.js servers, Python scripts, or any backend code
- Your `proxy-server.js` file exists but **cannot run** on GitHub Pages

### 2. **CORS Policy Blocks Direct API Calls**
- The Anthropic API (like most APIs) **blocks direct browser requests**
- This is a security feature called **CORS** (Cross-Origin Resource Sharing)
- APIs require a backend server to make requests on behalf of the browser

### 3. **Current Code Behavior**
Looking at `src/utils/llmCategorizer.js`:
```javascript
const USE_PROXY = process.env.REACT_APP_USE_PROXY === 'true';
const CLAUDE_API_URL = USE_PROXY ? PROXY_URL : 'https://api.anthropic.com/v1/messages';
```

When `REACT_APP_USE_PROXY` is not set to `'true'`:
- ❌ Code tries to call `https://api.anthropic.com/v1/messages` directly
- ❌ Browser blocks it due to CORS
- ❌ Falls back to keyword matching (0 LLM successes)

## The Solution

You need to **deploy the proxy server separately** on a platform that can run Node.js:

### Option 1: Vercel (Recommended) ✅
- **Free** serverless functions
- **Easy** deployment
- **Fast** and reliable

**Steps:**
1. Deploy `api/categorize.js` to Vercel
2. Add `CLAUDE_API_KEY` to Vercel environment variables
3. Get your Vercel URL: `https://your-app.vercel.app`
4. Add `REACT_APP_PROXY_URL` to GitHub Secrets
5. GitHub Actions will use the proxy automatically

See `DEPLOY_PROXY_GUIDE.md` for detailed instructions.

### Option 2: Other Platforms
- **Netlify Functions** - Similar to Vercel
- **Railway** - Can run the full `proxy-server.js`
- **Render** - Can run the full `proxy-server.js`
- **Heroku** - Can run the full `proxy-server.js`

## What Changed

### ✅ Created Serverless Function
- `api/categorize.js` - Vercel-compatible serverless function

### ✅ Updated GitHub Actions
- Now sets `REACT_APP_USE_PROXY=true` during build
- Uses `REACT_APP_PROXY_URL` from GitHub Secrets

### ✅ Created Deployment Guide
- `DEPLOY_PROXY_GUIDE.md` - Step-by-step instructions

## Next Steps

1. **Deploy proxy to Vercel** (see `DEPLOY_PROXY_GUIDE.md`)
2. **Add proxy URL to GitHub Secrets**
3. **Trigger a new deployment**

After this, your GitHub Pages site will:
- ✅ Use the proxy server
- ✅ Successfully call the Anthropic API
- ✅ Show "LLM successes: X" instead of 0
- ✅ Categorize ~90% of transactions instead of ~30%

## Architecture Diagram

```
┌─────────────────┐
│  GitHub Pages   │  (Static files only)
│  (Browser)      │
└────────┬────────┘
         │
         │ HTTP Request
         │ (CORS blocked ❌)
         │
         ▼
┌─────────────────┐
│ Anthropic API   │
│ (api.anthropic) │
└─────────────────┘

         VS

┌─────────────────┐
│  GitHub Pages   │  (Static files only)
│  (Browser)      │
└────────┬────────┘
         │
         │ HTTP Request
         │ (Same origin ✅)
         │
         ▼
┌─────────────────┐
│  Vercel Proxy   │  (Serverless function)
│  (your-app.     │
│   vercel.app)   │
└────────┬────────┘
         │
         │ HTTP Request
         │ (Server-to-server ✅)
         │
         ▼
┌─────────────────┐
│ Anthropic API   │
│ (api.anthropic) │
└─────────────────┘
```

## Summary

**Why it doesn't work:**
- GitHub Pages = Static files only
- Anthropic API = Blocks browser requests (CORS)
- No proxy = Direct call fails

**How to fix:**
- Deploy proxy to Vercel (or similar)
- Configure GitHub Actions to use proxy URL
- Browser → Proxy → API ✅

