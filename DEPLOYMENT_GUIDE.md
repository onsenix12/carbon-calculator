# 🚀 GitHub Pages Deployment Guide

This guide will help you deploy the Carbon Footprint Calculator to GitHub Pages using GitHub Actions.

## 📋 Prerequisites

1. ✅ Your code is pushed to GitHub
2. ✅ You have a GitHub repository (e.g., `carbon-calculator`)
3. ✅ You have a Claude API key

## 🔧 Step-by-Step Setup

### Step 1: Add GitHub Secret (API Key)

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Fill in:
   - **Name:** `REACT_APP_CLAUDE_API_KEY`
   - **Value:** Your Claude API key (starts with `sk-ant-api03-`)
5. Click **Add secret**

**Important:** The secret name must be exactly `REACT_APP_CLAUDE_API_KEY` (matches the workflow file)

### Step 2: Update Homepage URL

1. Open `package.json`
2. Find the `homepage` field (around line 5)
3. Replace `YOUR_USERNAME` with your GitHub username:
   ```json
   "homepage": "https://YOUR_USERNAME.github.io/carbon-calculator"
   ```
   
   **Example:** If your username is `johndoe`, it should be:
   ```json
   "homepage": "https://johndoe.github.io/carbon-calculator"
   ```

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select:
   - **Source:** `GitHub Actions`
4. Click **Save**

### Step 4: Push Your Code

Commit and push the workflow file:

```bash
git add .github/workflows/deploy.yml package.json DEPLOYMENT_GUIDE.md
git commit -m "Add GitHub Pages deployment workflow"
git push
```

### Step 5: Trigger Deployment

The workflow will automatically run when you push to the `master` branch.

**To manually trigger:**
1. Go to **Actions** tab in your repository
2. Select **Deploy to GitHub Pages** workflow
3. Click **Run workflow** → **Run workflow**

### Step 6: Wait for Deployment

1. Go to **Actions** tab
2. Watch the workflow run (takes ~2-3 minutes)
3. When it completes, you'll see a green checkmark ✅

### Step 7: Access Your App

Your app will be available at:
```
https://YOUR_USERNAME.github.io/carbon-calculator
```

**Note:** It may take a few minutes for the site to be accessible after the first deployment.

## 🔍 Verifying Deployment

### Check Workflow Status

1. Go to **Actions** tab
2. Click on the latest workflow run
3. Check all steps are green ✅

### Test Your Deployed App

1. Visit your GitHub Pages URL
2. Try uploading a test PDF
3. Check browser console (F12) for any errors
4. Verify API key is working (check for "LLM successes" in console)

## 🐛 Troubleshooting

### Issue: "Workflow not running"

**Solution:**
- Make sure you pushed the `.github/workflows/deploy.yml` file
- Check that your default branch is `master` (or update the workflow to use `main`)

### Issue: "Build failed - API key not found"

**Solution:**
- Verify the GitHub Secret is named exactly: `REACT_APP_CLAUDE_API_KEY`
- Check the secret value is correct (no extra spaces)
- Re-run the workflow after fixing

### Issue: "404 Not Found" on GitHub Pages

**Possible Causes:**
1. Homepage URL in `package.json` is incorrect
2. GitHub Pages not enabled
3. First deployment still processing (wait 5-10 minutes)

**Solution:**
- Double-check `package.json` homepage matches your GitHub username
- Verify Pages is enabled in Settings → Pages
- Wait a few minutes and refresh

### Issue: "API key not working in production"

**Solution:**
- The API key from GitHub Secrets is only available during build
- Check browser console for API errors
- Verify the secret is set correctly in GitHub

### Issue: "Build succeeds but app doesn't work"

**Check:**
- Browser console for errors
- Network tab for failed API calls
- That PDF.js worker file is accessible (`public/pdf.worker.min.js`)

## 📝 Important Notes

### Security

- ✅ Your API key is stored securely in GitHub Secrets
- ✅ It's only used during the build process
- ✅ It's never exposed in the built code
- ✅ The built app makes API calls from the browser (client-side)

### Updates

Every time you push to `master`, the app will automatically rebuild and redeploy.

**To update manually:**
- Go to Actions → Deploy to GitHub Pages → Run workflow

### Branch Configuration

If your default branch is `main` instead of `master`:
1. Open `.github/workflows/deploy.yml`
2. Change `branches: - master` to `branches: - main`
3. Commit and push

## 🎯 Deployment Checklist

Before deploying, verify:

- [ ] GitHub Secret `REACT_APP_CLAUDE_API_KEY` is set
- [ ] `package.json` homepage URL is correct
- [ ] GitHub Pages is enabled (Source: GitHub Actions)
- [ ] Workflow file is committed and pushed
- [ ] Code builds successfully locally (`npm run build`)

## 📊 Monitoring

### View Deployment History

1. Go to **Actions** tab
2. Click **Deploy to GitHub Pages**
3. See all deployment runs and their status

### View Deployment Logs

1. Click on a workflow run
2. Click on **build-and-deploy** job
3. Expand steps to see detailed logs

## 🔄 Updating the App

To update your deployed app:

1. Make changes to your code
2. Commit and push to `master`:
   ```bash
   git add .
   git commit -m "Update app"
   git push
   ```
3. GitHub Actions will automatically rebuild and redeploy
4. Wait 2-3 minutes for deployment to complete

---

**Last Updated:** 2024-11-23  
**Workflow Version:** 1.0.0

