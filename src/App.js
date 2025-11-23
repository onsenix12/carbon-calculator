import React, { useState, useMemo, useEffect } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import ResultsSummary from './components/ResultsSummary';
import TransactionList from './components/TransactionList';
import CategoryPieChart from './components/CategoryPieChart';
import ComparisonView from './components/ComparisonView';
import MonthFilter from './components/MonthFilter';
import MethodologyInfo from './components/MethodologyInfo';
import { parsePDF } from './utils/pdfParser';
import { parseDBSTransactions } from './utils/transactionParser';
import { categorizeAllTransactions } from './utils/llmCategorizer';
import { calculateFootprint } from './utils/emissionCalculator';
import { isMonthMatch } from './utils/dateUtils';
import logger from './utils/logger';
import emissionFactors from './data/emissionFactors.json';

function App() {
  const [step, setStep] = useState('upload'); // 'upload', 'processing', 'results'
  const [transactions, setTransactions] = useState([]);
  const [results, setResults] = useState(null);
  const [dbsTotal, setDbsTotal] = useState(null); // DBS LiveBetter comparison value
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processingStep, setProcessingStep] = useState(0); // Current step: 0-3
  const [processingProgress, setProcessingProgress] = useState(0); // 0-100
  const [selectedMonth, setSelectedMonth] = useState('all'); // Month filter: 'all' or 'SEP', 'OCT', etc.
  const [allTransactions, setAllTransactions] = useState([]); // Store all transactions (unfiltered)
  const [allResults, setAllResults] = useState(null); // Store all results (unfiltered)

  const handleFileSelect = async (file) => {
    setError(null);
    setStep('processing');
    setLoading(true);
    setProcessingStep(0);
    setProcessingProgress(0);

    try {
      logger.info('Starting processing pipeline...');
      
      // Step 1: Parse PDF and extract transaction section
      setProcessingStep(0);
      setProcessingProgress(10);
      logger.step(1, 4, 'Parsing PDF...');
      const { transactionText } = await parsePDF(file);
      setProcessingProgress(25);
      
      // Step 2: Parse individual transactions
      setProcessingStep(1);
      setProcessingProgress(35);
      logger.step(2, 4, 'Parsing transactions...');
      logger.debug(`Transaction text sample (first 500 chars): ${transactionText.substring(0, 500)}`);
      const parsedTransactions = parseDBSTransactions(transactionText);
      setProcessingProgress(50);
      
      if (parsedTransactions.length === 0) {
        // Provide more helpful error message with debugging info
        logger.error('No transactions found. Debug info:');
        logger.debug(`Transaction text length: ${transactionText.length}`);
        logger.debug(`First 1000 characters: ${transactionText.substring(0, 1000)}`);
        logger.debug('Looking for patterns like: "DD MMM MERCHANT AMOUNT"');
        
        throw new Error(
          'No transactions found in the PDF. ' +
          'Please check that this is a valid DBS credit card statement. ' +
          'Check the browser console (F12) for more details about what was extracted.'
        );
      }
      
      // Step 3: Categorize transactions using LLM (with keyword fallback)
      setProcessingStep(2);
      setProcessingProgress(55);
      logger.step(3, 4, 'Categorizing transactions...');
      
      // Update progress during categorization (this is the longest step)
      const progressCallback = (current, total) => {
        const baseProgress = 55;
        const maxProgress = 90;
        const stepProgress = (current / total) * (maxProgress - baseProgress);
        setProcessingProgress(baseProgress + stepProgress);
      };
      
      const categorizedTransactions = await categorizeAllTransactions(
        parsedTransactions,
        emissionFactors,
        { 
          useLLM: true, // Will automatically fallback to keywords if API key missing
          onProgress: progressCallback
        }
      );
      setProcessingProgress(90);
      
      // Step 4: Calculate carbon footprint
      setProcessingStep(3);
      setProcessingProgress(95);
      logger.step(4, 4, 'Calculating emissions...');
      const calculatedResults = calculateFootprint(categorizedTransactions, emissionFactors);
      setProcessingProgress(100);
      
      // Step 5: Set results and show
      logger.success('Processing complete!');
      // Use transactions from results (they have emissions and factor calculated)
      // Store all data (unfiltered)
      setAllTransactions(calculatedResults.transactions);
      setAllResults(calculatedResults);
      setTransactions(calculatedResults.transactions);
      setResults(calculatedResults);
      setSelectedMonth('all'); // Reset filter
      setStep('results');
      
    } catch (err) {
      logger.error('Error processing PDF:', err);
      setError(err.message || 'Failed to process PDF. Please try again.');
      setStep('upload');
    } finally {
      setLoading(false);
      setProcessingStep(0);
      setProcessingProgress(0);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setTransactions([]);
    setResults(null);
    setAllTransactions([]);
    setAllResults(null);
    setDbsTotal(null);
    setError(null);
    setLoading(false);
    setSelectedMonth('all');
  };

  // Filter transactions and recalculate results by month
  const filteredData = useMemo(() => {
    if (!allTransactions || !allResults || selectedMonth === 'all') {
      return {
        transactions: allTransactions || [],
        results: allResults
      };
    }

    // Filter transactions by selected month
    const filtered = allTransactions.filter(tx => isMonthMatch(tx.date, selectedMonth));

    // Recalculate results for filtered transactions
    if (filtered.length === 0) {
      return {
        transactions: [],
        results: null
      };
    }

    const filteredResults = calculateFootprint(filtered, emissionFactors);
    
    return {
      transactions: filtered,
      results: filteredResults
    };
  }, [allTransactions, allResults, selectedMonth]);

  // Update displayed data when filter changes
  useEffect(() => {
    if (filteredData) {
      setTransactions(filteredData.transactions);
      setResults(filteredData.results);
    }
  }, [filteredData]);

  return (
    <div className="App">
      {/* Header */}
      <header className="app-header">
        <div className="container">
          <h1>🌍 Carbon Footprint Calculator</h1>
          <p className="subtitle">IS626 Digital Tech & Sustainability | SMU SCIS</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container">
        {/* Privacy Notice */}
        <div className="privacy-notice">
          <div className="privacy-notice-icon">🔒</div>
          <div className="privacy-notice-content">
            <h4>Your Privacy is Protected</h4>
            <p>All processing happens in your browser. No data is uploaded to any server.</p>
            <ul>
              <li>✅ Card numbers and account details are never extracted</li>
              <li>✅ Only merchant names are sent to AI for categorization</li>
              <li>✅ Your data never leaves your device</li>
            </ul>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-message">
            <h4>⚠️ Error</h4>
            <p>{error}</p>
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <>
            <MethodologyInfo />
            <FileUpload onFileSelect={handleFileSelect} loading={loading} />
          </>
        )}

        {/* Step 2: Processing */}
        {step === 'processing' && (
          <div className="processing-container">
            <div className="card">
              <h2>Processing Your Statement...</h2>
              
              {/* Progress Bar */}
              <div className="progress-bar-container">
                <div className="progress-bar">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
                <div className="progress-percentage">{Math.round(processingProgress)}%</div>
              </div>

              <div className="spinner"></div>
              <div className="processing-steps">
                <div className={`processing-step ${processingStep > 0 ? 'completed' : ''} ${processingStep === 0 ? 'active' : ''}`}>
                  <span className="step-icon">
                    {processingStep > 0 ? '✅' : processingStep === 0 ? '⏳' : '📄'}
                  </span>
                  <span className="step-text">Extracting PDF text</span>
                </div>
                <div className={`processing-step ${processingStep > 1 ? 'completed' : ''} ${processingStep === 1 ? 'active' : ''}`}>
                  <span className="step-icon">
                    {processingStep > 1 ? '✅' : processingStep === 1 ? '⏳' : '🔍'}
                  </span>
                  <span className="step-text">Parsing transactions</span>
                </div>
                <div className={`processing-step ${processingStep > 2 ? 'completed' : ''} ${processingStep === 2 ? 'active' : ''}`}>
                  <span className="step-icon">
                    {processingStep > 2 ? '✅' : processingStep === 2 ? '⏳' : '🤖'}
                  </span>
                  <span className="step-text">Categorizing with AI</span>
                  {processingStep === 2 && (
                    <span className="step-subtext">This may take a while...</span>
                  )}
                </div>
                <div className={`processing-step ${processingStep > 3 ? 'completed' : ''} ${processingStep === 3 ? 'active' : ''}`}>
                  <span className="step-icon">
                    {processingStep > 3 ? '✅' : processingStep === 3 ? '⏳' : '🧮'}
                  </span>
                  <span className="step-text">Calculating emissions</span>
                </div>
              </div>
              <p className="processing-message">
                {processingStep === 0 && 'Reading your PDF file...'}
                {processingStep === 1 && 'Extracting transaction details...'}
                {processingStep === 2 && 'Categorizing transactions with AI (this may take 1-3 minutes)...'}
                {processingStep === 3 && 'Finalizing calculations...'}
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 'results' && results && (
          <div className="results-container">
            {/* Month Filter */}
            <MonthFilter 
              transactions={allTransactions}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
            />
            
            {/* Summary Card */}
            <ResultsSummary results={results} />
            
            {/* DBS Comparison - only show if we have DBS data */}
            {dbsTotal && (
              <ComparisonView ourResults={results} dbsTotal={dbsTotal} />
            )}
            
            {/* Visual Breakdown */}
            <CategoryPieChart data={results} />
            
            {/* Detailed Transactions */}
            <TransactionList transactions={transactions} />
            
            {/* Actions */}
            <div className="results-actions">
              <button onClick={handleReset} className="btn btn-primary">
                📄 Upload Another Statement
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="container">
          <p>
            Built for IS626: Digital Technologies & Sustainability<br />
            Singapore Management University | Master of IT in Business
          </p>
          <p className="footer-data-sources">
            Data sources: SEFR Singapore, UK DEFRA 2024, EMA Singapore
          </p>
          <p className="footer-disclaimer">
            Emission factors are estimates. Actual carbon footprint may vary.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;