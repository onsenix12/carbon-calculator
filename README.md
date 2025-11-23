# 🌍 Carbon Footprint Calculator

Personal carbon footprint calculator built for **IS626: Digital Tech & Sustainability** at SMU SCIS.

## 📋 Project Overview

This tool parses DBS credit card statements (PDF), categorizes transactions using Claude AI, calculates carbon emissions using Singapore-specific emission factors (SEFR), and displays results with visualizations.

**Key Features:**
- 📄 PDF statement parsing (DBS/POSB credit cards)
- 🤖 AI-powered transaction categorization (Claude API)
- 🧮 Carbon footprint calculation using Singapore emission factors
- 📊 Interactive charts and visualizations
- 🔒 Privacy-first: All processing happens in your browser
- 🌐 Production-ready deployment (GitHub Pages + Vercel proxy)

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Claude API key from [Anthropic Console](https://console.anthropic.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/onsenix12/carbon-calculator.git
   cd carbon-calculator
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   
   Create a `.env` file in the project root:
   ```env
   REACT_APP_CLAUDE_API_KEY=your_api_key_here
   REACT_APP_USE_PROXY=true
   ```
   
   **Get your API key:** https://console.anthropic.com/

4. **Start the development servers:**
   
   **Terminal 1 - Proxy Server:**
   ```bash
   npm run proxy
   ```
   
   **Terminal 2 - React App:**
   ```bash
   npm start
   ```
   
   The app will open at http://localhost:3000

5. **Test it:**
   - Upload a DBS credit card statement PDF
   - Check browser console (F12) for processing logs
   - View your carbon footprint results!

## 📁 Project Structure

```
carbon-calculator/
├── public/
│   ├── index.html
│   └── pdf.worker.min.js
├── src/
│   ├── components/          # React components
│   │   ├── FileUpload.js
│   │   ├── ResultsSummary.js
│   │   ├── TransactionList.js
│   │   ├── CategoryPieChart.js
│   │   ├── ComparisonView.js
│   │   ├── MonthFilter.js
│   │   └── MethodologyInfo.js
│   ├── utils/               # Utility functions
│   │   ├── pdfParser.js
│   │   ├── transactionParser.js
│   │   │   ├── strategies.js
│   │   │   └── singleTransaction.js
│   │   ├── privacyMasking.js
│   │   ├── llmCategorizer.js
│   │   ├── emissionCalculator.js
│   │   ├── dateUtils.js
│   │   ├── validation.js
│   │   ├── errors.js
│   │   └── logger.js
│   ├── constants/           # Shared constants
│   │   └── index.js
│   ├── data/
│   │   └── emissionFactors.json
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
├── api/                     # Vercel serverless function
│   └── categorize.js
├── shared/                  # Shared between client and server
│   └── constants.js
├── proxy-server.js          # Local development proxy
├── package.json
├── vercel.json
├── .env                     # Environment variables (create this)
└── README.md
```

## 🔧 Development

### Local Development Setup

#### 1. Install Dependencies

```bash
npm install
```

This installs:
- React 18.2.0
- PDF.js 3.11.174 (PDF parsing)
- Recharts 2.10.3 (charts)
- Express, CORS, dotenv (proxy server)

#### 2. Configure Environment Variables

Create `.env` file:
```env
REACT_APP_CLAUDE_API_KEY=sk-ant-api03-your-key-here
REACT_APP_USE_PROXY=true
REACT_APP_PROXY_URL=http://localhost:3001/api/categorize
```

#### 3. Run Development Servers

**Terminal 1 - Proxy Server (Required for LLM):**
```bash
npm run proxy
```

**Terminal 2 - React App:**
```bash
npm start
```

**Why two servers?** The Claude API blocks direct browser requests (CORS). The proxy server forwards requests from the browser to the API.

#### 4. Verify LLM is Working

1. Open browser console (F12)
2. Look for: `🔧 LLM Configuration: { USE_PROXY: true, ... }`
3. Upload a PDF
4. Check console for: `LLM successes: X` (should be > 0)

**Expected Results:**
- ✅ With LLM: ~90% categorization accuracy, ~5-10% uncategorized
- ❌ Without LLM: ~30% accuracy, ~40-50% uncategorized

### Available Scripts

```bash
npm start          # Start React development server
npm run proxy      # Start local proxy server
npm run build      # Build for production
npm test           # Run tests
```

## 🌐 Deployment

### Architecture

The app uses a **two-part deployment**:
1. **Frontend** → GitHub Pages (static files)
2. **Backend Proxy** → Vercel (serverless function)

This is necessary because:
- GitHub Pages only serves static files (no Node.js)
- Anthropic API blocks direct browser requests (CORS)
- Proxy server handles API calls server-side

### Deploy Frontend to GitHub Pages

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin main
   ```

2. **Configure GitHub Actions:**
   - Go to repository Settings → Secrets and variables → Actions
   - Add secrets:
     - `REACT_APP_CLAUDE_API_KEY` (your API key)
     - `REACT_APP_PROXY_URL` (your Vercel proxy URL)
     - `REACT_APP_USE_PROXY` = `true`

3. **GitHub Actions will:**
   - Build the React app
   - Deploy to GitHub Pages automatically
   - Use the proxy URL from secrets

### Deploy Proxy Server to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login and Deploy:**
   ```bash
   vercel login
   vercel
   ```

3. **Add Environment Variable:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `CLAUDE_API_KEY` = your API key
   - Apply to: Production, Preview, Development

4. **Get Your Proxy URL:**
   After deployment, Vercel gives you a URL like:
   ```
   https://carbon-calculator-proxy.vercel.app
   ```
   
   Your proxy endpoint:
   ```
   https://carbon-calculator-proxy.vercel.app/api/categorize
   ```

5. **Update GitHub Secrets:**
   - Add `REACT_APP_PROXY_URL` = your Vercel URL

### Verify Deployment

1. **Check GitHub Actions:**
   - Go to repository → Actions
   - Verify build succeeded
   - Check "Verify secrets" step shows proxy URL

2. **Test Live Site:**
   - Visit: https://onsenix12.github.io/carbon-calculator
   - Open browser console (F12)
   - Look for: `🔧 LLM Configuration: { USE_PROXY: true, ... }`
   - Upload a PDF and verify LLM categorization works

## 🔒 Privacy & Security

**Client-Side Processing:**
- All PDF processing happens in your browser
- No transaction data uploaded to servers
- Only merchant names sent to Claude API (for categorization)

**Never Extracted:**
- ❌ Card numbers
- ❌ Account numbers
- ❌ Addresses
- ❌ Customer IDs
- ❌ NRIC numbers

**Safe to Extract:**
- ✅ Transaction dates
- ✅ Merchant names (cleaned)
- ✅ Amounts

**API Security:**
- API key stored securely in Vercel (not exposed to browser)
- Proxy only accepts POST requests
- CORS enabled for GitHub Pages domain only

## 📊 Data Sources

- **SEFR**: Singapore Emission Factors Registry
- **EMA**: Energy Market Authority (electricity grid factor: 0.4120 kg CO₂e/kWh)
- **UK DEFRA**: UK Government GHG Conversion Factors 2025
- **Research**: Peer-reviewed spend-based factors

## 🐛 Troubleshooting

### LLM Not Working (CORS Errors)

**Symptoms:**
- Console shows: `CORS error detected`
- `LLM successes: 0`
- High uncategorized percentage

**Solutions:**
1. **Local Development:**
   - Make sure proxy server is running: `npm run proxy`
   - Verify `.env` has `REACT_APP_USE_PROXY=true`
   - Restart React app after changing `.env`

2. **Production:**
   - Verify `REACT_APP_PROXY_URL` is set in GitHub Secrets
   - Check Vercel proxy is deployed and accessible
   - Verify `CLAUDE_API_KEY` is set in Vercel

### Proxy Server Not Starting

**Check:**
- Port 3001 is not in use: `netstat -ano | findstr :3001`
- `.env` file exists with `CLAUDE_API_KEY`
- Dependencies installed: `npm install`

### PDF Parsing Issues

**If no transactions found:**
- Verify PDF is a valid DBS credit card statement
- Check browser console for parsing errors
- Ensure PDF is not password-protected

### Build Errors

**Common issues:**
- Missing environment variables → Add to GitHub Secrets
- Import errors → Run `npm install` again
- Build timeout → Check GitHub Actions logs

## 💰 API Costs

- **Per transaction**: ~$0.0003
- **100 transactions**: ~$0.03
- **1000 transactions**: ~$0.30

Very affordable for personal use!

## 🧪 Testing

```bash
# Run tests
npm test

# Build for production
npm run build

# Test proxy server
curl http://localhost:3001/health
```

## 📝 Assignment Details

**Course**: IS626 - Digital Technologies & Sustainability  
**Institution**: Singapore Management University (SMU)  
**School**: School of Computing and Information Systems (SCIS)  
**Program**: Master of IT in Business  
**Due Date**: December 9, 2024

## 🛠️ Tech Stack

- **Frontend**: React 18, Recharts, PDF.js
- **Backend**: Vercel Serverless Functions
- **AI**: Claude API (Anthropic)
- **Deployment**: GitHub Pages + Vercel
- **Language**: JavaScript (ES6+)

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📞 Support

For issues or questions:
- Check the Troubleshooting section above
- Review browser console for error messages
- Check GitHub Actions logs for deployment issues

## 📄 License

This project is for educational purposes (IS626 course assignment).

---

**Last Updated**: 2025-01-23  
**Version**: 1.0.0
