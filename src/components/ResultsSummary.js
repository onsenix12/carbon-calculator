import React from 'react';

const ResultsSummary = ({ results }) => {
  if (!results) return null;

  return (
    <div className="results-summary">
      <h2>🌍 Your Carbon Footprint</h2>
      
      <div className="total-emissions-card">
        <div className="emissions-value">
          <h1>{Math.round(results.totalEmissions)} kg CO₂e</h1>
          <p className="emissions-label">Total Carbon Emissions</p>
        </div>
        
        {results.metadata.dateRange && (
          <div className="date-range">
            <span className="date-icon">📅</span>
            <span className="dates">
              {results.metadata.dateRange.start} - {results.metadata.dateRange.end}
            </span>
          </div>
        )}
        
        <div className="transaction-count">
          <span className="count-icon">💳</span>
          <span className="count-text">
            {results.metadata.totalTransactions} transactions analyzed
          </span>
        </div>
      </div>
    </div>
  );
};

export default ResultsSummary;