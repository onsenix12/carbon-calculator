# 🚀 Deploy Proxy Server for GitHub Pages

## Why This is Needed

GitHub Pages only serves **static files** (HTML, CSS, JS). It cannot run a Node.js server. Since the Anthropic API blocks direct browser requests (CORS), you need to deploy the proxy server separately.

## Solution: Deploy to Vercel (Recommended)

Vercel offers free serverless functions that work perfectly for this use case.

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy (from project root)
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name? carbon-calculator-proxy (or any name)
# - Directory? ./
```

### Step 3: Add Environment Variable

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add:
   - **Name:** `CLAUDE_API_KEY`
   - **Value:** Your Anthropic API key (same as `REACT_APP_CLAUDE_API_KEY`)
   - **Environment:** Production, Preview, Development (check all)

### Step 4: Redeploy

After adding the environment variable, redeploy:

```bash
vercel --prod
```

Or trigger a redeploy from the Vercel dashboard.

### Step 5: Get Your Proxy URL

After deployment, Vercel will give you a URL like:
```
https://carbon-calculator-proxy.vercel.app
```

Your proxy endpoint will be:
```
https://carbon-calculator-proxy.vercel.app/api/categorize
```

### Step 6: Update GitHub Secrets

1. Go to your GitHub repository
2. **Settings** → **Secrets and variables** → **Actions**
3. Add a new secret:
   - **Name:** `REACT_APP_PROXY_URL`
   - **Value:** `https://carbon-calculator-proxy.vercel.app/api/categorize`

### Step 7: Trigger GitHub Actions

Push a commit or manually trigger the workflow:

```bash
git commit --allow-empty -m "Trigger deployment with proxy URL"
git push
```

## Alternative: Deploy to Other Platforms

### Option 2: Netlify Functions

1. Create `netlify/functions/categorize.js` (similar to `api/categorize.js`)
2. Deploy to Netlify
3. Add `CLAUDE_API_KEY` environment variable
4. Use Netlify function URL as proxy

### Option 3: Railway

1. Create a new Railway project
2. Use `proxy-server.js` as the entry point
3. Add `CLAUDE_API_KEY` environment variable
4. Railway will give you a public URL

### Option 4: Render

1. Create a new Web Service on Render
2. Use `proxy-server.js` as the entry point
3. Add `CLAUDE_API_KEY` environment variable
4. Render will give you a public URL

## Verify It Works

1. Test the proxy directly:
   ```bash
   curl -X POST https://your-proxy-url.vercel.app/api/categorize \
     -H "Content-Type: application/json" \
     -d '{"merchantName":"GRAB","categories":{"transport":{}}}'
   ```

2. Check GitHub Pages deployment:
   - Open your GitHub Pages site
   - Open browser console (F12)
   - Upload a PDF
   - Look for: `🔧 LLM Configuration: { USE_PROXY: true, ... }`
   - Should see: `LLM successes: X` (not 0!)

## Troubleshooting

### "Proxy URL not set"
- Make sure `REACT_APP_PROXY_URL` is set in GitHub Secrets
- Check the workflow logs to see if the secret is being used

### "401 Unauthorized" from proxy
- Verify `CLAUDE_API_KEY` is set in Vercel environment variables
- Make sure you redeployed after adding the variable

### "CORS error" still appears
- Check that `REACT_APP_USE_PROXY=true` is set in the build step
- Verify the proxy URL is correct and accessible

### Proxy returns 500 error
- Check Vercel function logs
- Verify API key is correct
- Check Anthropic API status

## Cost

- **Vercel:** Free tier includes 100GB bandwidth/month (more than enough)
- **Anthropic API:** ~$0.0003 per transaction (100 transactions = $0.03)

## Security Notes

- ✅ API key is stored securely in Vercel (not exposed to browser)
- ✅ Proxy only accepts POST requests
- ✅ CORS is enabled for your GitHub Pages domain
- ✅ No sensitive transaction data is sent (only merchant names)

