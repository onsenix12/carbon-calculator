import React, { useState, useEffect } from 'react';
import CarbonChatbot from './CarbonChatbot';

/**
 * ChatbotLauncher
 *
 * Renders a floating chat launcher button and positions the chatbot
 * as an overlay/floating window with mobile-friendly behavior.
 */
const ChatbotLauncher = ({ results }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!results) {
    return null;
  }

  const toggleChat = () => setIsOpen(prev => !prev);

  return (
    <>
      {isOpen && isMobile && (
        <div
          className="chatbot-overlay"
          onClick={toggleChat}
          aria-label="Close chatbot overlay"
        />
      )}

      <div className={`chatbot-floating-container ${isOpen ? 'open' : ''}`}>
        {isOpen && (
          <div
            className={`chatbot-floating-window ${isMobile ? 'mobile' : ''}`}
            role="dialog"
            aria-modal={isMobile}
            aria-label="Carbon Footprint Chatbot"
          >
            <div className="chatbot-floating-header">
              <div>
                <span className="chatbot-floating-title">Carbon Advisor</span>
                <span className="chatbot-floating-subtitle">
                  Ask questions about your emissions anytime
                </span>
              </div>
              <button
                type="button"
                className="chatbot-close-button"
                onClick={toggleChat}
                aria-label="Close chatbot"
              >
                ×
              </button>
            </div>

            <div className="chatbot-floating-body">
              <CarbonChatbot results={results} />
            </div>
          </div>
        )}

        <button
          type="button"
          className="chatbot-launcher"
          onClick={toggleChat}
          aria-expanded={isOpen}
          aria-controls="carbon-chatbot"
        >
          {isOpen ? 'Close carbon chat' : '💬 Carbon chat'}
        </button>
      </div>
    </>
  );
};

export default ChatbotLauncher;

