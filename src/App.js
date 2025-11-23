import React, { useState } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import ResultsSummary from './components/ResultsSummary';
import TransactionList from './components/TransactionList';
import CategoryPieChart from './components/CategoryPieChart';

function App() {
  const [step, setStep] = useState('upload'); // 'upload', 'processing', 'results'
  const [pdfFile, setPdfFile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = async (file) => {
    setError(null);
    setPdfFile(file);
    setStep('processing');

    try {
      // This will be implemented in next steps
      console.log('Processing file:', file.name);
      
      // Placeholder - will be replaced with actual parsing
      setError('PDF parsing not yet implemented. Coming in next step!');
      setStep('upload');
      
    } catch (err) {
      console.error('Error processing PDF:', err);
      setError(err.message || 'Failed to process PDF. Please try again.');
      setStep('upload');
    }
  };

  const handleReset = () => {
    setStep('upload');
    setPdfFile(null);
    setTransactions([]);
    setResults(null);
    setError(null);
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
          <FileUpload onFileSelect={handleFileSelect} />
        )}

        {/* Step 2: Processing */}
        {step === 'processing' && (
          <div className="card">
            <h2>Processing Your Statement...</h2>
            <div className="spinner"></div>
            <p style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
              Extracting transactions and categorizing with AI...
            </p>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 'results' && results && (
          <>
            <ResultsSummary results={results} />
            <CategoryPieChart data={results} />
            <TransactionList transactions={transactions} />
            
            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <button onClick={handleReset} className="btn btn-primary">
                📄 Upload Another Statement
              </button>
            </div>
          </>
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
            Data sources: SEFR Singapore, UK DEFRA 2025, EMA Singapore
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;