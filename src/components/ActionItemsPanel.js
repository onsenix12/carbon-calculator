import React from 'react';

/**
 * ActionItemsPanel Component
 *
 * Displays extracted action items with basic controls.
 * Future enhancements can include checkboxes and persistence.
 */
const ActionItemsPanel = ({
  items = [],
  onClear,
  onRemoveItem,
  title = 'Suggested Actions'
}) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="action-items-panel">
      <div className="action-items-header">
        <div>
          <h4>✅ {title}</h4>
          <p className="action-items-subtitle">
            Generated from the latest chatbot response
          </p>
        </div>
        <div className="action-items-controls">
          {onClear && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClear}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      <ul className="action-items-list">
        {items.map((item, index) => (
          <li key={`action-item-${index}`} className="action-item">
            <div className="action-item-content">
              <span className="action-item-bullet">•</span>
              <span>{item}</span>
            </div>
            {onRemoveItem && (
              <button
                type="button"
                className="action-item-remove"
                onClick={() => onRemoveItem(index)}
                aria-label="Remove action item"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ActionItemsPanel;

