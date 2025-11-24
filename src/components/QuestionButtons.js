import React from 'react';

/**
 * QuestionButtons Component
 *
 * Renders grouped pre-populated questions as pill buttons.
 */
const QuestionButtons = ({ groups, onSelect, disabled }) => {
  if (!groups || groups.length === 0) {
    return null;
  }

  return (
    <div className="question-groups">
      {groups.map(group => (
        <div key={group.id} className="question-group">
          <div className="question-group-title">{group.title}</div>
          <div className="question-buttons-row">
            {group.questions.map((question, idx) => (
              <button
                key={`${group.id}-${idx}`}
                type="button"
                className="question-button"
                onClick={() => onSelect(question)}
                disabled={disabled}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuestionButtons;

