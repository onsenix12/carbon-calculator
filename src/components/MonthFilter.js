import React from 'react';

/**
 * Extract unique months from transactions
 * @param {Array} transactions - Array of transactions with date field
 * @returns {Array} - Array of month objects { month: 'SEP', label: 'September', count: 5 }
 */
export const extractMonths = (transactions) => {
  const monthMap = {
    'JAN': 'January', 'FEB': 'February', 'MAR': 'March', 'APR': 'April',
    'MAY': 'May', 'JUN': 'June', 'JUL': 'July', 'AUG': 'August',
    'SEP': 'September', 'OCT': 'October', 'NOV': 'November', 'DEC': 'December'
  };

  const monthCounts = {};
  
  transactions.forEach(transaction => {
    if (transaction.date) {
      const parts = transaction.date.trim().split(/\s+/);
      if (parts.length >= 2) {
        const month = parts[1].toUpperCase();
        if (monthMap[month]) {
          if (!monthCounts[month]) {
            monthCounts[month] = 0;
          }
          monthCounts[month]++;
        }
      }
    }
  });

  // Convert to array and sort by month order
  const monthOrder = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  
  return Object.keys(monthCounts)
    .map(month => ({
      month,
      label: monthMap[month],
      count: monthCounts[month]
    }))
    .sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));
};

const MonthFilter = ({ transactions, selectedMonth, onMonthChange }) => {
  const months = extractMonths(transactions);
  
  // Don't show filter if only one month or no months
  if (months.length <= 1) {
    return null;
  }

  return (
    <div className="month-filter">
      <div className="month-filter-header">
        <h4>📅 Filter by Month</h4>
        <span className="month-filter-subtitle">
          {months.length} months detected
        </span>
      </div>
      <div className="month-filter-buttons">
        <button
          className={`month-filter-btn ${selectedMonth === 'all' ? 'active' : ''}`}
          onClick={() => onMonthChange('all')}
        >
          All Months
        </button>
        {months.map(({ month, label, count }) => (
          <button
            key={month}
            className={`month-filter-btn ${selectedMonth === month ? 'active' : ''}`}
            onClick={() => onMonthChange(month)}
          >
            {label}
            <span className="month-count">({count})</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MonthFilter;

