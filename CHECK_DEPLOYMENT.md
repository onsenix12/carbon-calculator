# 🔍 How to Check GitHub Actions Logs

## Step 1: Check the "Verify secrets" Step

1. Go to: https://github.com/onsenix12/carbon-calculator/actions
2. Click on the latest workflow run (the one that just completed)
3. Click on the **"build"** job (the green checkmark)
4. Look for the **"Verify secrets"** step in the left sidebar
5. Click on it to expand and see the output

**What to look for:**
- ✅ Should see: `✅ REACT_APP_PROXY_URL secret is set`
- ✅ Should see: `Proxy URL: https://carbon-calculator-proxy.vercel.app/api/categorize`
- ❌ If you see: `❌ ERROR: REACT_APP_PROXY_URL secret is not set!` → The secret wasn't added

## Step 2: Check the Browser Console

1. Go to: https://onsenix12.github.io/carbon-calculator
2. Open browser console (F12)
3. **Clear the console** (click the 🚫 icon or press Ctrl+L)
4. **Hard refresh** the page (Ctrl+Shift+R or Cmd+Shift+R)
5. Look for this log message: `🔧 LLM Configuration:`

**What you should see:**
```javascript
🔧 LLM Configuration: {
  USE_PROXY: true,  // ← Should be TRUE
  PROXY_URL: "https://carbon-calculator-proxy.vercel.app/api/categorize",  // ← Should be your Vercel URL
  CLAUDE_API_URL: "https://carbon-calculator-proxy.vercel.app/api/categorize",  // ← Should match PROXY_URL
  envValue: "true"  // ← Should be "true"
}
```

**If you see this instead (WRONG):**
```javascript
🔧 LLM Configuration: {
  USE_PROXY: false,  // ← WRONG! Should be true
  PROXY_URL: "http://localhost:3001/api/categorize",  // ← WRONG! Should be Vercel URL
  CLAUDE_API_URL: "https://api.anthropic.com/v1/messages",  // ← WRONG! Should be proxy URL
  envValue: undefined  // ← WRONG! Should be "true"
}
```

## Step 3: Verify GitHub Secret is Set

1. Go to: https://github.com/onsenix12/carbon-calculator/settings/secrets/actions
2. Look for `REACT_APP_PROXY_URL` in the list
3. Click on it to verify the value is: `https://carbon-calculator-proxy.vercel.app/api/categorize`

## Common Issues

### Issue 1: Secret Not Set
**Symptom:** GitHub Actions shows "❌ ERROR: REACT_APP_PROXY_URL secret is not set!"
**Fix:** Add the secret at https://github.com/onsenix12/carbon-calculator/settings/secrets/actions

### Issue 2: Browser Shows Old Code
**Symptom:** Console shows `USE_PROXY: false` or `PROXY_URL: "http://localhost:3001/api/categorize"`
**Fix:** 
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Or wait a few minutes for GitHub Pages cache to clear

### Issue 3: Build Happened Before Secret Was Added
**Symptom:** Secret is set, but console still shows wrong values
**Fix:** Trigger a new build by pushing a commit or manually running the workflow

## Quick Test

After checking, share:
1. What the "Verify secrets" step shows
2. What the `🔧 LLM Configuration:` log shows in browser console
3. Whether the secret exists in GitHub Settings

