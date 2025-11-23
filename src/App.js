import React, { useState } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import ResultsSummary from './components/ResultsSummary';
import TransactionList from './components/TransactionList';
import CategoryPieChart from './components/CategoryPieChart';
import ComparisonView from './components/ComparisonView';

function App() {
  const [step, setStep] = useState('upload'); // 'upload', 'processing', 'results'
  const [pdfFile, setPdfFile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [results, setResults] = useState(null);
  const [dbsTotal, setDbsTotal] = useState(null); // DBS LiveBetter comparison value
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileSelect = async (file) => {
    setError(null);
    setPdfFile(file);
    setStep('processing');
    setLoading(true);

    try {
      // TODO: Phase 3 - PDF Parsing
      // const extractedText = await pdfParser.extractText(file);
      // const parsedTransactions = await transactionParser.parse(extractedText);
      
      // TODO: Phase 4 - LLM Categorization
      // const categorizedTransactions = await llmCategorizer.categorize(parsedTransactions);
      
      // TODO: Phase 5 - Emission Calculation
      // const calculatedResults = emissionCalculator.calculateFootprint(categorizedTransactions);
      
      // TODO: Get DBS comparison value (from user input or separate calculation)
      // setDbsTotal(userProvidedDbsValue);
      
      // Placeholder - will be replaced with actual implementation
      console.log('Processing file:', file.name);
      setError('PDF parsing not yet implemented. Coming in next step!');
      setStep('upload');
      
      // Example of what the final flow will look like:
      // setTransactions(categorizedTransactions);
      // setResults(calculatedResults);
      // setStep('results');
      
    } catch (err) {
      console.error('Error processing PDF:', err);
      setError(err.message || 'Failed to process PDF. Please try again.');
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setPdfFile(null);
    setTransactions([]);
    setResults(null);
    setDbsTotal(null);
    setError(null);
    setLoading(false);
  };

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
          <FileUpload onFileSelect={handleFileSelect} loading={loading} />
        )}

        {/* Step 2: Processing */}
        {step === 'processing' && (
          <div className="processing-container">
            <div className="card">
              <h2>Processing Your Statement...</h2>
              <div className="spinner"></div>
              <div className="processing-steps">
                <div className="processing-step">
                  <span className="step-icon">📄</span>
                  <span className="step-text">Extracting PDF text</span>
                </div>
                <div className="processing-step">
                  <span className="step-icon">🔍</span>
                  <span className="step-text">Parsing transactions</span>
                </div>
                <div className="processing-step">
                  <span className="step-icon">🤖</span>
                  <span className="step-text">Categorizing with AI</span>
                </div>
                <div className="processing-step">
                  <span className="step-icon">🧮</span>
                  <span className="step-text">Calculating emissions</span>
                </div>
              </div>
              <p style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
                This may take a moment...
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 'results' && results && (
          <div className="results-container">
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
              {/* Future: Add export buttons */}
              {/* <button className="btn btn-secondary">📊 Export to CSV</button> */}
              {/* <button className="btn btn-secondary">📑 Export to PDF</button> */}
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
          <p style={{ marginTop: '8px', fontSize: '14px', opacity: 0.8 }}>
            Data sources: SEFR Singapore, UK DEFRA 2024, EMA Singapore
          </p>
          <p style={{ marginTop: '4px', fontSize: '12px', opacity: 0.6 }}>
            Emission factors are estimates. Actual carbon footprint may vary.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;