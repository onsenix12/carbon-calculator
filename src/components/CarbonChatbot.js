import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  sendChatMessage,
  buildUserDataContext
} from '../utils/chatbotApi';
import { getPredefinedQuestionGroups } from '../utils/chatbotQuestions';
import QuestionButtons from './QuestionButtons';
import ActionItemsPanel from './ActionItemsPanel';

/**
 * CarbonChatbot Component
 *
 * Basic chat interface that connects to the chatbot API.
 * Future enhancements (action items, pre-populated questions, etc.)
 * will build on top of this component.
 */
const CarbonChatbot = ({ results }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I’m your carbon footprint advisor. Ask me anything about your results.'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [actionItems, setActionItems] = useState([]);
  const [usedWebSearch, setUsedWebSearch] = useState(false);
  const [showPromptSuggestions, setShowPromptSuggestions] = useState(false);
  const [forceWebSearch, setForceWebSearch] = useState(false);

  const messageEndRef = useRef(null);

  // Build user data context once per results change
  const userDataContext = useMemo(() => {
    try {
      if (!results) return null;
      return buildUserDataContext(results);
    } catch (err) {
      console.error('Failed to build user data context:', err);
      setError('Unable to load chatbot data. Please try again later.');
      return null;
    }
  }, [results]);

  const questionGroups = useMemo(() => {
    if (!results) return [];
    return getPredefinedQuestionGroups(results);
  }, [results]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!results) {
    return null;
  }

  const handleSendMessage = async (messageOverride = null) => {
    const rawMessage = messageOverride !== null ? messageOverride : inputValue;
    const trimmedMessage = rawMessage.trim();
    if (!trimmedMessage || !userDataContext || isLoading) {
      return;
    }

    // Preserve conversation history before adding the new user message
    const conversationHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const userMessage = { role: 'user', content: trimmedMessage };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    if (messageOverride === null) {
      setInputValue('');
    } else {
      setInputValue('');
    }
    setIsLoading(true);
    setError(null);
    setUsedWebSearch(false);

    try {
      const response = await sendChatMessage(
        trimmedMessage,
        conversationHistory,
        userDataContext,
        forceWebSearch ? true : null
      );

      setActionItems(response.actionItems || []);
      setUsedWebSearch(!!response.usedWebSearch);

      setMessages([
        ...updatedMessages,
        {
          role: 'assistant',
          content: response.response || 'I could not generate a response. Please try again.',
          meta: {
            actionItems: response.actionItems || [],
            usedWebSearch: response.usedWebSearch || false
          }
        }
      ]);
    } catch (err) {
      console.error('Chatbot error:', err);
      setError(err.message || 'Failed to send message. Please try again.');
      // Remove the user message we optimistically added
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionSelect = (question) => {
    if (!question) {
      return;
    }
    handleSendMessage(question);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessage = (message, index) => {
    const isUser = message.role === 'user';
    return (
      <div
        key={`${message.role}-${index}`}
        className={`chat-message ${isUser ? 'user' : 'assistant'}`}
      >
        <div className="message-bubble">
          <div className="message-content">{message.content}</div>
          {!isUser && message.meta?.usedWebSearch && (
            <div className="message-meta">
              🔍 Based on latest sources
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="carbon-chatbot card">
      <div className="chatbot-header">
        <div>
          <h3>🤖 Carbon Footprint Chatbot</h3>
          <p className="chatbot-subtitle">
            Ask questions about your emissions and ways to reduce them
          </p>
        </div>
        {usedWebSearch && (
          <span className="chatbot-indicator">
            🔍 Includes latest sources
          </span>
        )}
      </div>

      <div className="chatbot-toggle-row">
        <button
          type="button"
          className="chatbot-toggle-prompts"
          onClick={() => setShowPromptSuggestions(prev => !prev)}
        >
          {showPromptSuggestions ? 'Hide quick prompts' : 'Show quick prompts'}
        </button>
      </div>

      <div className="chatbot-toggle-row">
        <label className="chatbot-toggle-option">
          <input
            type="checkbox"
            checked={forceWebSearch}
            onChange={(event) => setForceWebSearch(event.target.checked)}
          />
          <span>Always include web search for my questions</span>
        </label>
      </div>

      {showPromptSuggestions && (
        <QuestionButtons
          groups={questionGroups}
          onSelect={handleQuestionSelect}
          disabled={isLoading || !userDataContext}
        />
      )}

      <div className="chatbot-messages">
        {messages.map((msg, idx) => renderMessage(msg, idx))}
        <div ref={messageEndRef} />
      </div>

      {error && (
        <div className="chatbot-error">
          ⚠️ {error}
        </div>
      )}

      <div className="chatbot-input">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Ask about your carbon footprint..."
          rows={2}
          disabled={isLoading || !userDataContext}
        />
        <button
          className="btn btn-primary"
          onClick={handleSendMessage}
          disabled={isLoading || !userDataContext || inputValue.trim().length === 0}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>

      <ActionItemsPanel
        items={actionItems}
        onClear={() => setActionItems([])}
        onRemoveItem={(index) => {
          setActionItems(prev => prev.filter((_, idx) => idx !== index));
        }}
      />
    </div>
  );
};

export default CarbonChatbot;

