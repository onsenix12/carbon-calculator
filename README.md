# 🌍 Carbon Footprint Calculator

Personal carbon footprint calculator built for **IS626: Digital Tech & Sustainability** at SMU SCIS.

## 📋 Project Overview

This tool parses DBS credit card statements (PDF), categorizes transactions using Claude AI, calculates carbon emissions using Singapore-specific emission factors (SEFR), and displays results with visualizations.

## 🚀 Quick Start in Cursor IDE

### Step 1: Install Dependencies

```bash
npm install
```

This installs:
- React 18.2.0
- PDF.js 3.11.174 (PDF parsing)
- Recharts 2.10.3 (charts)

### Step 2: Set Up Environment Variables

Create a `.env` file in the project root:

```bash
REACT_APP_CLAUDE_API_KEY=your_api_key_here
```

**Important**: 
- Never commit `.env` to Git
- Add `.env` to `.gitignore`

### Step 3: Copy Emission Factors Database

Copy the `emissionFactors.json` file to `src/data/`:

```bash
cp /path/to/emissionFactors.json src/data/
```

### Step 4: Run Development Server

```bash
npm start
```

Opens at: http://localhost:3000

## 📁 Project Structure

```
carbon-calculator/
├── public/
│   ├── index.html          # HTML entry point
│   └── pdf.worker.min.js   # PDF.js worker (will be added)
├── src/
│   ├── components/         # React components
│   │   ├── FileUpload.js
│   │   ├── ResultsSummary.js
│   │   ├── TransactionList.js
│   │   └── CategoryPieChart.js
│   ├── utils/              # Utility functions
│   │   ├── pdfParser.js
│   │   ├── transactionParser.js
│   │   ├── privacyMasking.js
│   │   ├── llmCategorizer.js
│   │   └── emissionCalculator.js
│   ├── data/
│   │   └── emissionFactors.json
│   ├── App.js              # Main app component
│   ├── App.css             # App styles
│   ├── index.js            # React entry point
│   └── index.css           # Global styles
├── package.json
├── .env                    # Environment variables (create this)
├── .gitignore
└── README.md
```

## 🔧 Development Progress

### ✅ Completed
- [x] Project structure
- [x] HTML entry point (index.html)
- [x] Main App component
- [x] Global styles
- [x] Emission factors database

### 🚧 In Progress
- [ ] Component implementations (next step)
- [ ] PDF parser
- [ ] LLM categorizer
- [ ] Emission calculator
- [ ] Charts

### 📅 Upcoming
- [ ] Testing with real statements
- [ ] Error handling
- [ ] Deployment

## 🔒 Privacy & Security

**Client-Side Only**:
- All PDF processing happens in browser
- No data uploaded to servers
- Only merchant names sent to Claude API

**Never Extracted**:
- ❌ Card numbers
- ❌ Account numbers
- ❌ Addresses
- ❌ Customer IDs

**Safe to Extract**:
- ✅ Transaction dates
- ✅ Merchant names
- ✅ Amounts

## 📊 Data Sources

- **SEFR**: Singapore Emission Factors Registry
- **EMA**: Energy Market Authority (electricity grid factor)
- **UK DEFRA**: UK Government GHG Conversion Factors 2025
- **Research**: Peer-reviewed spend-based factors

## 🧪 Testing

```bash
# Run tests
npm test

# Build for production
npm run build
```

## 📝 Assignment Details

**Course**: IS626 - Digital Technologies & Sustainability  
**Institution**: Singapore Management University (SMU)  
**School**: School of Computing and Information Systems (SCIS)  
**Program**: Master of IT in Business  
**Due Date**: December 9, 2024  

## 👨‍💻 Development

**Tech Stack**:
- React 18
- PDF.js (PDF parsing)
- Claude API (AI categorization)
- Recharts (visualization)

**Browser Support**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🐛 Known Issues

- PDF parser not yet implemented
- LLM integration pending API key
- Charts placeholder only

## 📞 Support

For issues or questions, contact via course portal.

---

**Last Updated**: 2024-11-23  
**Version**: 0.1.0 (Initial Setup)