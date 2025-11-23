# 🧪 Testing Guide for Carbon Footprint Calculator

## 📋 Overview

This guide explains how to test the Carbon Footprint Calculator app, including setup, testing scenarios, and troubleshooting.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

**Create a `.env` file** in the project root:

```bash
# Copy the example file
cp .env.example .env
```

Then edit `.env` and add your Claude API key:

```bash
REACT_APP_CLAUDE_API_KEY=sk-ant-api03-...
```

**Get your API key from:** https://console.anthropic.com/

**Note:** If you don't have an API key yet, the app will still work but will use keyword-based categorization instead of LLM.

### 3. Start the Development Server

```bash
npm start
```

The app will open at: http://localhost:3000

## 🧪 Testing Scenarios

### Test 1: Basic Functionality (Without API Key)

**Purpose:** Verify the app works with keyword-based categorization (no LLM)

**Steps:**
1. Start the app without setting `REACT_APP_CLAUDE_API_KEY` in `.env`
2. Upload a DBS credit card statement PDF
3. Verify:
   - PDF is parsed successfully
   - Transactions are extracted
   - Categorization uses keyword matching
   - Results are displayed

**Expected Result:** App works but may have lower categorization accuracy for unknown merchants.

### Test 2: Full Functionality (With API Key)

**Purpose:** Test complete pipeline with LLM categorization

**Steps:**
1. Set `REACT_APP_CLAUDE_API_KEY` in `.env`
2. Restart the dev server (`npm start`)
3. Upload a DBS credit card statement PDF
4. Verify:
   - PDF parsing works
   - Transactions are extracted
   - LLM categorizes merchants (check browser console for "LLM successes")
   - Emissions are calculated
   - Results display correctly

**Expected Result:** Higher categorization accuracy, especially for unique merchants.

### Test 3: Error Handling

**Test Invalid PDF:**
1. Try uploading a non-PDF file (e.g., .txt, .jpg)
2. **Expected:** Error message displayed

**Test Non-DBS Statement:**
1. Upload a PDF that's not a DBS statement
2. **Expected:** Error about missing transaction section

**Test Corrupted PDF:**
1. Upload a corrupted/invalid PDF
2. **Expected:** Appropriate error message

### Test 4: Privacy & Security

**Verify Sensitive Data Masking:**
1. Upload a statement
2. Check browser console logs
3. Verify no card numbers, account numbers, or addresses appear in logs
4. **Expected:** All sensitive data is masked before processing

### Test 5: Performance

**Test with Large Statement:**
1. Upload a statement with 50+ transactions
2. Monitor processing time
3. Check browser console for progress logs
4. **Expected:** Processing completes within reasonable time (< 2 minutes for 100 transactions)

## 🔍 What to Check

### Browser Console

Open Developer Tools (F12) and check the console for:

1. **PDF Parsing Logs:**
   ```
   📄 Starting PDF extraction...
   ✅ PDF extraction complete
   ```

2. **Transaction Parsing:**
   ```
   📝 Parsing transactions...
   ✅ Parsing complete
   ```

3. **Categorization:**
   ```
   🤖 Categorizing transactions...
   LLM successes: X
   Keyword matches: Y
   ✅ Categorization complete
   ```

4. **Emission Calculation:**
   ```
   🧮 Calculating carbon footprint...
   ✅ Calculation complete
   ```

### UI Elements to Verify

1. **Upload Screen:**
   - File upload button works
   - Privacy notice displays correctly

2. **Processing Screen:**
   - Spinner animates
   - Processing steps display

3. **Results Screen:**
   - Summary card shows total emissions
   - Pie chart displays category breakdown
   - Transaction list shows all transactions
   - Categories are color-coded correctly

## 🐛 Troubleshooting

### Issue: "Claude API key not configured"

**Solution:**
- Create `.env` file in project root
- Add `REACT_APP_CLAUDE_API_KEY=your_key_here`
- Restart the dev server (environment variables load at startup)

### Issue: "No transactions found"

**Possible Causes:**
- PDF is not a DBS credit card statement
- PDF format has changed
- Statement is empty

**Solution:**
- Verify PDF is a DBS credit card statement
- Check browser console for parsing errors
- Try a different statement

### Issue: "Failed to read PDF"

**Possible Causes:**
- PDF is password-protected
- PDF is corrupted
- PDF.js worker not loaded

**Solution:**
- Ensure PDF is unlocked
- Re-download the statement
- Check that `public/pdf.worker.min.js` exists

### Issue: LLM API Errors

**Common Errors:**
- `401 Unauthorized`: Invalid API key
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Anthropic API issue

**Solution:**
- Verify API key is correct
- Check API key has sufficient credits
- Wait and retry (rate limiting)
- App will automatically fallback to keyword matching

### Issue: Categorization Accuracy Low

**If using keyword matching only:**
- This is expected - keyword matching has limited coverage
- Add API key to use LLM for better accuracy

**If using LLM:**
- Check console for "LLM successes" count
- Some merchants may legitimately be "uncategorized"
- Review transaction list to see categorization method

## 📊 Testing Checklist

- [ ] App starts without errors
- [ ] File upload accepts PDF files
- [ ] PDF parsing extracts transactions
- [ ] Transactions are correctly parsed (dates, amounts, merchants)
- [ ] Categorization works (LLM or keyword)
- [ ] Emissions are calculated correctly
- [ ] Results display in UI
- [ ] Pie chart renders
- [ ] Transaction list shows all transactions
- [ ] Privacy masking works (no sensitive data in console)
- [ ] Error messages are user-friendly
- [ ] Reset button works

## 🎯 Test Data

### Recommended Test Statements

1. **Small Statement (5-10 transactions):**
   - Quick test of basic functionality
   - Easy to verify results manually

2. **Medium Statement (20-30 transactions):**
   - Test performance
   - Mix of common and unique merchants

3. **Large Statement (50+ transactions):**
   - Stress test
   - Verify handling of many API calls

### Sample Merchants to Test

- **Transport:** GRAB, GOJEK, SHELL, EXXONMOBIL
- **Food:** KOUFU, FOOD REPUBLIC, MCDONALDS, STARBUCKS
- **Shopping:** NTUC FAIRPRICE, DON DON DONKI, UNIQLO
- **Utilities:** SP SERVICES, SINGTEL, STARHUB
- **Entertainment:** NETFLIX, SPOTIFY, CATHAY CINEPLEXES

## 💡 Tips

1. **Check Browser Console:** Most issues will show detailed logs
2. **Test Incrementally:** Start with a small statement, then scale up
3. **Verify Privacy:** Always check console to ensure no sensitive data leaks
4. **API Costs:** LLM calls cost ~$0.0003 per transaction. 100 transactions ≈ $0.03
5. **Rate Limiting:** App waits 100ms between LLM calls to avoid rate limits

## 📝 Notes

- The app works **without** an API key (uses keyword matching)
- API key is only needed for LLM categorization
- All processing happens in the browser (client-side only)
- No data is sent to any server except Anthropic API (merchant names only)

---

**Last Updated:** 2024-11-23  
**Version:** 1.0.0

