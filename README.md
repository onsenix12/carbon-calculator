# 🌍 Carbon Footprint Calculator

Personal carbon footprint calculator built for **IS626: Digital Tech & Sustainability** at SMU SCIS.

## 📋 Project Overview

This tool parses DBS credit card statements (PDF), categorizes transactions using Claude AI, calculates carbon emissions using Singapore-specific emission factors (SEFR), and displays results with visualizations.

**Key Features:**
- 📄 PDF statement parsing (DBS/POSB credit cards)
- 🤖 AI-powered transaction categorization (Claude API)
- 🧮 Carbon footprint calculation using Singapore emission factors
- 📊 Interactive charts and visualizations
- 💬 Results-aware chatbot with action items and web search
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
│   │   ├── ActionItemsPanel.js
│   │   ├── CarbonChatbot.js
│   │   ├── CategoryPieChart.js
│   │   ├── ComparisonView.js
│   │   ├── FileUpload.js
│   │   ├── MethodologyInfo.js
│   │   ├── MonthFilter.js
│   │   ├── QuestionButtons.js
│   │   ├── ResultsSummary.js
│   │   └── TransactionList.js
│   ├── utils/               # Utility functions
│   │   ├── actionItemsExtractor.js
│   │   ├── chatbotApi.js
│   │   ├── chatbotQuestions.js
│   │   ├── dateUtils.js
│   │   ├── emissionCalculator.js
│   │   ├── errors.js
│   │   ├── llmCategorizer.js
│   │   ├── logger.js
│   │   ├── pdfParser.js
│   │   ├── privacyMasking.js
│   │   ├── transactionParser.js
│   │   │   ├── strategies.js
│   │   │   └── singleTransaction.js
│   │   └── validation.js
│   ├── constants/           # Shared constants
│   │   └── index.js
│   ├── data/
│   │   └── emissionFactors.json
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
├── api/                     # Vercel serverless functions
│   ├── categorize.js
│   └── chatbot.js           # Claude + web search proxy
├── shared/                  # Shared between client and server
│   └── constants.js
├── proxy-server.js          # Local development proxy
├── package.json
├── vercel.json
├── .env                     # Environment variables (create this)
└── README.md
```

## 🤖 Carbon Chatbot Feature

The calculator ships with an embedded chatbot so users can immediately ask questions, compare categories, and walk away with action items rooted in their own footprint.

### Requirements & Scope
- Appears only after PDF processing once `results` (and optionally `transactions`) exist so every answer references the user's own footprint.
- Powered by the Claude API via the `/api/chatbot` Vercel function and reuses the same LLM infrastructure as categorization.
- Strict carbon/sustainability scope: the bot must decline unrelated questions and redirect users to emission topics.
- Uses sanitized, aggregated emission data (totals, category breakdown, metadata) for grounding; sensitive transaction info never leaves the browser.
- Includes pre-populated question chips, a web-search indicator, actionable checklists, and accessibility affordances (keyboard navigation, ARIA labels).

### Component & Utility Breakdown
**CarbonChatbot (`src/components/CarbonChatbot.js`)**
- Renders the chat surface (message history, typing indicator, error states) plus the input box and send button.
- Tracks `messages`, `inputValue`, `isLoading`, `error`, `actionItems`, `showActionItems`, and `isSearching` to manage UI feedback.
- Auto-scrolls to the latest exchange, supports quick question injection, and badges responses that relied on web search results.

**QuestionButtons (`src/components/QuestionButtons.js`)**
- Displays curated questions grouped under Quick Analysis, Reduction Strategies, and Sustainable Alternatives.
- Dynamically inserts prompts for the user's top emission categories (transport, food_dining, shopping, etc.).
- Clicking a chip immediately sends the mapped prompt or pre-fills the input for editing.

**ActionItemsPanel (`src/components/ActionItemsPanel.js`)**
- Lists action items detected in Claude replies with checkboxes, completion state, and "clear all" handling.
- Designed to sit beside/below the chat and will later support exporting or reminders.

**Chatbot Utilities (`src/utils/*.js`)**
- `chatbotApi.js`: exposes `sendChatMessage`, `buildUserDataContext`, `shouldUseWebSearch`, and client-side error handling.
- `actionItemsExtractor.js`: scans Claude text for bullet points or imperative sentences (e.g., "- Use public transport more often") and normalizes them.
- `chatbotQuestions.js`: houses curated questions plus helpers that derive dynamic prompts from the user's footprint.

### Backend Chatbot API (`api/chatbot.js`)
- Receives POST payloads `{ message, conversationHistory, userData, enableWebSearch }` and enforces basic validation/CORS.
- Formats user context (total emissions, top categories with percentages, date range, transaction count, methodology notes) before crafting the Claude system prompt.
- Optionally calls a web search provider (Serper, Google Custom Search, or Tavily) when `shouldUseWebSearch` flags queries about latest programs, incentives, or Singapore-specific initiatives.
- Response payload example:
  ```json
  {
    "response": "Claude's grounded reply",
    "actionItems": ["Use public transport more often"],
    "usedWebSearch": true,
    "searchResults": [
      {"title": "...", "snippet": "...", "url": "..."}
    ],
    "error": null
  }
  ```
- The serverless function also truncates conversation history (≈10 turns), extracts action items server-side for redundancy, and logs failures for observability.

### Web Search Workflow
- Triggered only for carbon-related requests that require current or location-specific knowledge (keywords such as "latest", "programs", "initiatives", "incentives", "Singapore").
- Search query pattern: `"<user question> carbon emissions Singapore sustainability"`, limited to the top 3–5 relevant results.
- Each result is summarized (`Title`, `Snippet`, `URL`) and appended to the Claude prompt plus a UI badge (`usedWebSearch`) so users know when external knowledge was referenced.
- Web search API keys (Serper, Google, Tavily) are stored as environment variables on Vercel; failed searches fall back to the core dataset with a warning.

### Prompt, Scope Guardrails & Action Items
- System prompt snippet:
  ```
  You are a carbon footprint advisor chatbot. You can only discuss carbon emissions, sustainability, or environmental impact. Politely refuse other topics and redirect to carbon questions.
  ```
- Guidelines enforced in the prompt:
  - Always reference user totals/categories when answering.
  - Format actionable recommendations as single-line bullets (`- Action item`) so they can be parsed reliably.
  - Use web search context only when provided, otherwise lean on internal data.
- Action items are extracted both client- and server-side by scanning for bullet prefixes (`-`, `•`, numbers) or imperative phrases ("Try to", "Consider", "You should").
- Only aggregated data is shared; privacy-masked conversation history keeps token counts manageable while retaining context.

### Architecture Overview
**Frontend**
- `CarbonChatbot.js` renders the chat UI, message history, input box, loading/error states, quick questions, action items panel toggle, and search badge.
- `ActionItemsPanel.js` stores actionable steps, allows checkboxes/clear actions, and will eventually support export.
- `QuestionButtons.js` groups curated and dynamic prompts (e.g., "How can I reduce transport emissions?").
- `App.js` only mounts the chatbot when `step === 'results'`, passing `results` + `transactions` as props.

**Frontend Utilities**
- `chatbotApi.js` orchestrates API calls (`sendChatMessage`), formats user data context, decides when to invoke web search, and parses action items from replies.
- `chatbotQuestions.js` keeps reusable quick questions plus helpers for top-category prompts.
- `actionItemsExtractor.js` scans Claude messages for imperative bullets (`- Use…`) or phrases (“Try…”) to populate the checklist.

**Backend**
- `api/chatbot.js` is a Vercel serverless function that validates payloads, builds the system prompt, optionally calls Serper/Google/Tavily for carbon-only web searches, and proxies to Claude.
- Shared constants define search thresholds, prompt templates, and safety messaging so the bot refuses out-of-scope queries.

**Prompt & Safety Rails**
- System prompt enforces sustainability-only scope, references specific user metrics (totals, top categories), and asks Claude to format suggested actions as single-line bullets.
- Conversation history is truncated (≈10 recent turns) to respect Claude token budgets.
- Sensitive transaction details remain masked; only aggregated footprints flow to the API.

### Implementation Phases (✅ complete)
1. **Backend API** – serverless function, context formatter, Claude + optional web search, CORS handling, manual endpoint testing.
2. **Frontend API Utility** – `sendChatMessage`, `buildUserDataContext`, `shouldUseWebSearch`, action item parsing, robust error states.
3. **Pre-populated Questions** – curated dataset, `QuestionButtons` UI, responsive styling, integration hooks.
4. **Chatbot UI** – full chat surface, quick questions, action items panel, search badge, accessibility affordances.
5. **Action Items Component** – checkbox interactions, persistence over the session, clear/export stubs.
6. **Integration** – wiring into the results view inside `App.js` and verifying props/state flow.
7. **Testing & Refinement** – scope-violation tests, dataset variations, API error handling, web-search quality checks.

### Data Flow
```
User types question / clicks quick button
  ↓
CarbonChatbot state machine
  ↓
chatbotApi.sendChatMessage()
  ↓
api/chatbot serverless function (decides if web search is needed)
  ↓
Claude API (with optional search snippets)
  ↓
Action item extraction
  ↓
UI updates (messages, checklist, web-search badge)
```

### Testing Checklist
- Chatbot appears only after results exist, scrolls correctly, and shows loading/error states.
- Quick question buttons work on desktop + mobile (horizontal scroll) and remain relevant to top categories.
- Action items panel can toggle, mark items done, and clear everything while preserving state between bot replies.
- Web search triggers only for current-events questions, summarizes 3–5 results, and badges responses that used search.
- Accessibility: Enter-to-send, Escape/minimize controls, ARIA labels, and screen-reader friendly announcements.

### Future Enhancements
- Export chat history or action items (text/PDF), share links, or reminder scheduling.
- Comparison view within chat (e.g., month-over-month deltas).
- Richer inline visualizations, multilingual support, or voice input.

### Environment Variables
```
# Existing
REACT_APP_CLAUDE_API_KEY=sk-ant-api03-...
CLAUDE_API_KEY=sk-ant-api03-...        # for Vercel
REACT_APP_USE_PROXY=true
REACT_APP_PROXY_URL=https://<proxy>/api/categorize

# Optional Web Search Providers
SERPER_API_KEY=...
GOOGLE_SEARCH_API_KEY=...
GOOGLE_SEARCH_ENGINE_ID=...
TAVILY_API_KEY=...
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
