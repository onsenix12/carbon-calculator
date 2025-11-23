import React, { useState } from 'react';

const TransactionList = ({ transactions }) => {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('emissions'); // 'emissions', 'date', 'amount'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'

  if (!transactions || transactions.length === 0) {
    return (
      <div className="transaction-list">
        <h3>Transaction Details</h3>
        <p className="no-transactions">No transactions to display</p>
      </div>
    );
  }

  // Get unique categories for filter
  const categories = [...new Set(transactions.map(t => t.category))];

  // Filter transactions
  let filteredTransactions = transactions;
  if (filter !== 'all') {
    filteredTransactions = transactions.filter(t => t.category === filter);
  }

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let compareValue = 0;
    
    if (sortBy === 'emissions') {
      compareValue = a.emissions - b.emissions;
    } else if (sortBy === 'date') {
      const dateA = new Date(a.date.split('/').reverse().join('-'));
      const dateB = new Date(b.date.split('/').reverse().join('-'));
      compareValue = dateA - dateB;
    } else if (sortBy === 'amount') {
      compareValue = a.amount - b.amount;
    }
    
    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  // Toggle sort order
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Get category info from first transaction (assumes consistent structure)
  const getCategoryInfo = (categoryKey, transactions) => {
    const transaction = transactions.find(t => t.category === categoryKey);
    return {
      name: transaction?.categoryDetail?.name || categoryKey,
      icon: transaction?.categoryDetail?.icon || '📊'
    };
  };

  return (
    <div className="transaction-list">
      <div className="transaction-list-header">
        <h3>💳 Transaction Details</h3>
        <p className="transaction-count">
          Showing {sortedTransactions.length} of {transactions.length} transactions
        </p>
      </div>

      {/* Filters and Sort Controls */}
      <div className="transaction-controls">
        <div className="filter-section">
          <label htmlFor="category-filter">Filter by Category:</label>
          <select 
            id="category-filter"
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="category-filter"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => {
              const info = getCategoryInfo(cat, transactions);
              return (
                <option key={cat} value={cat}>
                  {info.icon} {info.name}
                </option>
              );
            })}
          </select>
        </div>

        <div className="sort-section">
          <span className="sort-label">Sort by:</span>
          <button 
            className={`sort-button ${sortBy === 'emissions' ? 'active' : ''}`}
            onClick={() => handleSort('emissions')}
          >
            Emissions {sortBy === 'emissions' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button 
            className={`sort-button ${sortBy === 'amount' ? 'active' : ''}`}
            onClick={() => handleSort('amount')}
          >
            Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button 
            className={`sort-button ${sortBy === 'date' ? 'active' : ''}`}
            onClick={() => handleSort('date')}
          >
            Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="transaction-table-container">
        <table className="transaction-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Merchant</th>
              <th>Category</th>
              <th className="align-right">Amount</th>
              <th className="align-right">Emissions</th>
              <th className="align-right">Factor</th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.map((transaction, index) => (
              <tr key={index} className="transaction-row">
                <td className="date-cell">{transaction.date}</td>
                <td className="merchant-cell">
                  <div className="merchant-name">{transaction.merchant}</div>
                  {transaction.subcategory && (
                    <div className="subcategory">{transaction.subcategory}</div>
                  )}
                </td>
                <td className="category-cell">
                  <span className="category-badge">
                    {transaction.categoryDetail?.icon || '📊'} {transaction.categoryDetail?.name || transaction.category}
                  </span>
                </td>
                <td className="amount-cell align-right">
                  ${transaction.amount.toFixed(2)}
                </td>
                <td className="emissions-cell align-right">
                  <span className="emissions-value">
                    {transaction.emissions.toFixed(2)} kg
                  </span>
                </td>
                <td className="factor-cell align-right">
                  <span className="factor-value">
                    {transaction.factor.toFixed(2)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="transaction-summary">
        <div className="summary-item">
          <span className="summary-label">Total Amount:</span>
          <span className="summary-value">
            ${sortedTransactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
          </span>
        </div>
        <div className="summary-item highlight">
          <span className="summary-label">Total Emissions:</span>
          <span className="summary-value">
            {sortedTransactions.reduce((sum, t) => sum + t.emissions, 0).toFixed(2)} kg CO₂e
          </span>
        </div>
      </div>
    </div>
  );
};

export default TransactionList;