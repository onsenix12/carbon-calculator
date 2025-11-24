import React from 'react';

const ResultsSummary = ({ results }) => {
  if (!results) return null;

  const metadata = results.metadata || {};
  const dateRange = metadata.dateRange || {};
  const hasValidDateRange =
    typeof dateRange.start === 'string' &&
    typeof dateRange.end === 'string' &&
    dateRange.start.trim() !== '' &&
    dateRange.end.trim() !== '' &&
    !dateRange.start.includes('Invalid') &&
    !dateRange.end.includes('Invalid');

  return (
    <div className="results-summary">
      <h2>🌍 Your Carbon Footprint</h2>
      
      <div className="total-emissions-card">
        <div className="emissions-value">
          <h1>{Math.round(results.totalEmissions)} kg CO₂e</h1>
          <p className="emissions-label">Total Carbon Emissions</p>
        </div>
        
        {hasValidDateRange && (
          <div className="date-range">
            <span className="date-icon">📅</span>
            <span className="dates">
              {dateRange.start} - {dateRange.end}
            </span>
          </div>
        )}
        
        <div className="transaction-count">
          <span className="count-icon">💳</span>
          <span className="count-text">
            {metadata.totalTransactions ?? 0} transactions analyzed
          </span>
        </div>
      </div>
    </div>
  );
};

export default ResultsSummary;