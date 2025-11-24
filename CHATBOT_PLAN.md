# Carbon Calculator Chatbot - Implementation Plan

## Overview
Add a chatbot feature that appears after PDF processing is complete. The chatbot will use Claude LLM to answer questions and provide advice related to the user's carbon emission results, with strict scope restrictions to carbon emission topics only.

## Requirements
1. **Appearance**: Chatbot appears after PDF is processed and results are displayed
2. **Backend**: Uses Claude LLM (same as categorization)
3. **Scope**: 
   - Only answers questions related to carbon emissions and user's data
   - Can suggest brainstorming ideas, but only carbon emission related
   - Must refuse to answer questions outside carbon emission scope
4. **Context**: Uses user's actual carbon footprint data (results object)
5. **UI**: Modern, accessible chatbot interface
6. **Pre-populated Questions**: Quick access buttons for common questions
7. **Action Items**: Generate and display actionable checklist from conversations
8. **Web Search**: Search the web for carbon-related information when needed (only for carbon emission topics)

---

## Architecture

### 1. Frontend Components

#### 1.1 Chatbot Component (`src/components/CarbonChatbot.js`)
- **Purpose**: Main chatbot UI component
- **Features**:
  - Chat interface with message history
  - Input field for user questions
  - Send button
  - Loading indicator during API calls
  - Error handling and display
  - Scrollable message history
  - Auto-scroll to latest message
  - **Pre-populated question buttons** (quick access to common questions)
  - **Action items panel** (extracted actionable items from conversation)
  - **Web search indicator** (shows when web search is used)
- **Props**:
  - `results` (Object): User's carbon footprint results
  - `transactions` (Array): List of transactions (optional, for detailed context)
- **State**:
  - `messages` (Array): Chat message history
  - `inputValue` (String): Current input text
  - `isLoading` (Boolean): API call in progress
  - `error` (String): Error message if any
  - `actionItems` (Array): Extracted action items from conversation
  - `showActionItems` (Boolean): Toggle action items panel visibility
  - `isSearching` (Boolean): Web search in progress

#### 1.2 Integration in App.js
- Add chatbot to results view (after ResultsSummary, before or after ComparisonView)
- Only show when `step === 'results'` and `results !== null`
- Pass `results` and `transactions` as props

### 2. Backend API

#### 2.1 New Serverless Function (`api/chatbot.js`)
- **Purpose**: Proxy for Claude API chatbot requests with web search capability
- **Endpoint**: `/api/chatbot`
- **Method**: POST
- **Request Body**:
  ```json
  {
    "message": "user question",
    "conversationHistory": [...], // Array of previous messages
    "userData": {
      "totalEmissions": 123.45,
      "byCategory": {...},
      "byCategoryDetailed": {...},
      "metadata": {...}
    },
    "enableWebSearch": true // Optional: enable web search if needed
  }
  ```
- **Response**:
  ```json
  {
    "response": "Claude's response text",
    "actionItems": ["Action item 1", "Action item 2"], // Extracted action items
    "usedWebSearch": true, // Whether web search was used
    "searchResults": [...], // Web search results if used
    "error": null
  }
  ```
- **Features**:
  - CORS handling
  - Claude API integration
  - System prompt with strict scope restrictions
  - Context building from user data
  - **Web search integration** (when needed for carbon-related topics)
  - **Action items extraction** from Claude responses

#### 2.2 Web Search API Integration
- **Options**:
  1. **Serper API** (Recommended - simple, affordable)
     - Cost: ~$0.001 per search
     - Easy integration (single API call)
     - Good for carbon/sustainability topics
     - Free tier: 2,500 searches/month
     - Setup: Get API key from serper.dev
  2. **Google Custom Search API**
     - More complex setup
     - Requires API key and search engine ID
     - Cost: $5 per 1,000 queries (first 100 free/day)
     - Better for general web search
  3. **Tavily API** (AI-focused search)
     - Designed for LLM integration
     - Good for research queries
     - Cost: $0.001 per search
     - Returns structured, summarized results
- **Implementation**: 
  - Detect when web search is needed (based on question type)
  - Search only for carbon emission related topics
  - Construct search query: `"{user question} carbon emissions Singapore sustainability"`
  - Limit to 3-5 most relevant results
  - Format results for Claude context
  - Integrate search results into Claude's context
  - Show search indicator in UI
- **When to Search**:
  - Questions about current programs/initiatives
  - Questions about latest research/trends
  - Questions about Singapore-specific resources
  - Questions requiring up-to-date information
  - Questions about specific technologies/methods
- **Search Query Examples**:
  - "How to reduce transport emissions?" → "reduce transport emissions carbon footprint Singapore"
  - "What are carbon offset programs?" → "carbon offset programs Singapore sustainability"
  - "Latest electric vehicle incentives" → "electric vehicle incentives Singapore 2024"

### 3. Frontend API Utility

#### 3.1 Chatbot API Utility (`src/utils/chatbotApi.js`)
- **Purpose**: Handle chatbot API calls
- **Functions**:
  - `sendChatMessage(message, conversationHistory, userData, enableWebSearch)`: Send message to API
  - `buildUserDataContext(results)`: Format user data for API
  - `extractActionItems(responseText)`: Extract action items from Claude response
  - `shouldUseWebSearch(message)`: Determine if web search is needed
- **Error Handling**: Network errors, API errors, rate limiting

#### 3.2 Pre-populated Questions (`src/utils/chatbotQuestions.js`)
- **Purpose**: Define common questions for quick access
- **Structure**: Organized by category
- **Questions**:

  **Quick Analysis:**
  - "What's my biggest carbon emission category?"
  - "How does my footprint compare to Singapore average?"
  - "What percentage of my emissions comes from transport?"
  - "Which category should I focus on reducing first?"

  **Reduction Strategies:**
  - "How can I reduce my transport emissions?"
  - "What are some ways to lower my food-related carbon footprint?"
  - "What are the best strategies to reduce my overall emissions?"
  - "Can you suggest specific actions for my top categories?"

  **Sustainable Alternatives:**
  - "What are sustainable alternatives for my spending habits?"
  - "Are there eco-friendly options for my highest emission category?"
  - "What Singapore programs can help me reduce emissions?"

- **Dynamic Questions**: Generate questions based on user's top categories
  - If transport is top category: "How can I reduce my transport emissions?"
  - If food_dining is top: "What are sustainable food choices in Singapore?"
  - If shopping is top: "How can I shop more sustainably?"

### 4. Prompt Engineering

#### 4.1 System Prompt Structure
```
You are a carbon footprint advisor chatbot. Your role is to help users understand their carbon emissions and provide advice on reducing them.

STRICT RULES:
1. You can ONLY discuss topics related to carbon emissions, carbon footprint, sustainability, and environmental impact
2. You MUST refuse to answer any question outside this scope
3. You can provide brainstorming suggestions, but ONLY related to carbon emission reduction
4. Base your answers on the user's actual data provided below
5. Be helpful, friendly, but firm about scope limitations
6. When providing advice, format action items clearly (one per line, starting with "-" or numbered)
7. If web search results are provided, use them to enhance your answer but prioritize user's data

USER'S CARBON FOOTPRINT DATA:
[Formatted user data here]

WEB SEARCH RESULTS (if available):
[Search results here - only for carbon emission related topics]

CONVERSATION HISTORY:
[Previous messages]

CURRENT USER QUESTION:
[User's question]

RESPONSE GUIDELINES:
- If question is about carbon emissions → Answer based on user data
- If question is outside scope → Politely decline and redirect to carbon topics
- Provide specific, actionable advice when possible
- Reference specific categories/amounts from user data
- Suggest concrete reduction strategies
- Format action items clearly for extraction
- Use web search results to provide current, accurate information when relevant

ACTION ITEMS FORMAT:
When suggesting actions, format them clearly like this:
- Action item 1
- Action item 2
- Action item 3
```

#### 4.2 Web Search Integration Logic
- **When to search**:
  - Questions about current trends, latest research, or specific programs
  - Questions about Singapore-specific initiatives or programs
  - Questions about new technologies or methods
  - Questions requiring up-to-date information
  - Questions with keywords: "latest", "current", "programs", "initiatives", "incentives"
- **Search query construction**:
  - Combine user question with "carbon emissions Singapore" or "sustainability Singapore"
  - Focus on actionable, practical information
  - Limit to 3-5 most relevant results
- **Search result formatting**:
  - Extract title, snippet, URL
  - Summarize relevance to user's question
  - Include in Claude's context
  - Format: "Title: [title]\nSnippet: [snippet]\nURL: [url]"

#### 4.3 Action Items Extraction
- **Pattern Matching**:
  - Look for bullet points (starting with "-", "•", or numbered)
  - Look for phrases like "You should", "Try to", "Consider", "Action:", "Recommendation:"
  - Extract sentences that are imperative (action-oriented)
- **Format**:
  - Each action item should be a single, clear action
  - Remove redundant phrases
  - Make items specific and measurable when possible
- **Example Extraction**:
  ```
  Bot response: "Here are some actions: - Use public transport more often - Switch to plant-based meals - Reduce shopping for non-essentials"
  Extracted: ["Use public transport more often", "Switch to plant-based meals", "Reduce shopping for non-essentials"]
  ```

#### 4.2 Context Building
Format user data into readable context:
- Total emissions
- Top emitting categories (with percentages)
- Date range
- Transaction count
- Category breakdown with spending amounts
- Methodology note

---

## Implementation Steps

### Phase 1: Backend API Setup
1. ✅ Create `api/chatbot.js` serverless function
2. ✅ Add system prompt builder function
3. ✅ Implement context formatting from user data
4. ✅ Add Claude API integration
5. ✅ **Add web search API integration** (Serper/Google/Tavily)
6. ✅ **Implement action items extraction logic**
7. ✅ Handle CORS and errors
8. ✅ Test API endpoint independently

### Phase 2: Frontend API Utility
1. ✅ Create `src/utils/chatbotApi.js`
2. ✅ Implement `sendChatMessage` function
3. ✅ Implement `buildUserDataContext` function
4. ✅ **Create `actionItemsExtractor.js` utility**
5. ✅ **Add web search detection logic**
6. ✅ Add error handling
7. ✅ Test utility functions

### Phase 3: Pre-populated Questions
1. ✅ Create `src/utils/chatbotQuestions.js`
2. ✅ Define question categories and questions
3. ✅ Create `QuestionButtons.js` component
4. ✅ Style question buttons
5. ✅ Integrate with chatbot component

### Phase 4: Chatbot UI Component
1. ✅ Create `src/components/CarbonChatbot.js`
2. ✅ Design chat interface (messages, input, send button)
3. ✅ Implement message history state
4. ✅ **Add pre-populated questions section**
5. ✅ **Add action items panel**
6. ✅ **Add web search indicator**
7. ✅ Add loading states
8. ✅ Add error display
9. ✅ Style with CSS (match existing app design)
10. ✅ Add accessibility features

### Phase 5: Action Items Component
1. ✅ Create `src/components/ActionItemsPanel.js`
2. ✅ Display extracted action items
3. ✅ Add checkbox functionality (mark as done)
4. ✅ Add clear/export functionality
5. ✅ Style and integrate with chatbot

### Phase 6: Integration
1. ✅ Import chatbot in `App.js`
2. ✅ Add to results view
3. ✅ Pass results and transactions as props
4. ✅ Test full flow (PDF upload → results → chatbot)

### Phase 7: Testing & Refinement
1. ✅ Test scope restrictions (try off-topic questions)
2. ✅ Test with various result scenarios
3. ✅ Test error handling
4. ✅ **Test web search functionality**
5. ✅ **Test action items extraction**
6. ✅ **Test pre-populated questions**
7. ✅ Refine prompts based on responses
8. ✅ Optimize context size (may need truncation for large datasets)

---

## Technical Details

### Data Flow

#### Standard Chat Flow
```
User types question OR clicks pre-populated question
  ↓
CarbonChatbot component
  ↓
chatbotApi.sendChatMessage()
  ↓
Determine if web search needed
  ↓
POST /api/chatbot
  ↓
api/chatbot.js (serverless function)
  ↓
If web search needed → Call web search API
  ↓
Build system prompt with user data + conversation history + search results
  ↓
Claude API
  ↓
Extract action items from response
  ↓
Response back through chain (response + actionItems + usedWebSearch)
  ↓
Update chat UI + action items panel
```

#### Web Search Flow
```
Question requires current information
  ↓
api/chatbot.js detects need for search
  ↓
Construct search query (question + "carbon emissions Singapore")
  ↓
Call Serper/Google/Tavily API
  ↓
Format search results
  ↓
Include in Claude context
  ↓
Claude generates response with search context
  ↓
Return response with search indicator
```

### Context Size Management
- Limit conversation history to last 10 messages
- Summarize user data if too large (focus on top categories)
- Consider token limits (Claude has max input tokens)

### Error Handling
- Network errors: Show user-friendly message
- API errors: Log and show generic error
- Rate limiting: Queue requests or show wait message
- Invalid responses: Fallback message

### Security & Privacy
- No sensitive data in context (already handled by existing privacy masking)
- Only send aggregated results, not individual transaction details
- API key stored in environment variables (Vercel)

---

## File Structure

```
carbon-calculator/
├── api/
│   ├── categorize.js (existing)
│   └── chatbot.js (NEW - with web search integration)
├── src/
│   ├── components/
│   │   ├── CarbonChatbot.js (NEW - main chatbot component)
│   │   ├── ActionItemsPanel.js (NEW - action items display)
│   │   ├── QuestionButtons.js (NEW - pre-populated questions)
│   │   └── ... (existing)
│   ├── utils/
│   │   ├── chatbotApi.js (NEW - API calls)
│   │   ├── chatbotQuestions.js (NEW - pre-populated questions)
│   │   ├── actionItemsExtractor.js (NEW - extract action items from text)
│   │   └── ... (existing)
│   └── ... (existing)
├── shared/
│   └── constants.js (UPDATE - add chatbot prompt builder + web search config)
└── ... (existing)
```

---

## UI/UX Design Considerations

### Chatbot Appearance
- Embedded section in results view (below ResultsSummary)
- Collapsible/expandable interface (start expanded, can minimize)
- Modern chat bubble design
- Smooth animations for messages
- Typing indicator while waiting for response
- **Pre-populated question buttons** at top of chat (before message history)
- **Action items panel** (collapsible sidebar or bottom section)
- **Web search indicator** (badge/icon when search results are used)

### Message Design
- User messages: Right-aligned, distinct color
- Bot messages: Left-aligned, distinct color
- Timestamps (optional)
- Code/data formatting for numbers/percentages
- **Web search badge** on messages that used web search
- **Action items highlighted** in bot responses

### Pre-populated Questions UI
- Horizontal scrollable row of question buttons
- Categories: "Quick Questions", "Reduction Tips", "Analysis"
- Click button → auto-fill input or send directly
- Visual feedback on click

### Action Items Panel
- Collapsible panel (can be toggled)
- List of extracted action items
- Checkbox for each item (user can mark as done)
- "Clear all" button
- "Export" button (future: save as text/PDF)
- Visual distinction from chat messages

### Accessibility
- Keyboard navigation (Enter to send, Escape to close)
- ARIA labels for screen readers
- Focus management
- High contrast mode support

---

## Testing Checklist

### Basic Functionality
- [ ] Chatbot appears after PDF processing
- [ ] Can send messages and receive responses
- [ ] Refuses off-topic questions appropriately
- [ ] Answers carbon-related questions using user data
- [ ] Handles errors gracefully
- [ ] Works with different result scenarios (high/low emissions, various categories)
- [ ] Conversation history maintained correctly
- [ ] Loading states work properly
- [ ] Mobile responsive
- [ ] Accessible (keyboard, screen reader)

### Pre-populated Questions
- [ ] Question buttons display correctly
- [ ] Clicking question button fills input or sends message
- [ ] Questions are relevant to user's data
- [ ] Questions are categorized appropriately
- [ ] Works on mobile (horizontal scroll)

### Action Items
- [ ] Action items extracted from bot responses
- [ ] Action items panel displays correctly
- [ ] Can toggle action items panel visibility
- [ ] Can mark action items as done
- [ ] Can clear action items
- [ ] Action items persist during conversation
- [ ] Action items are specific and actionable

### Web Search
- [ ] Web search triggers for appropriate questions
- [ ] Search results integrated into responses
- [ ] Web search indicator shows when search is used
- [ ] Search only happens for carbon-related topics
- [ ] Search results are relevant and helpful
- [ ] Handles search API errors gracefully
- [ ] Search doesn't slow down responses significantly

---

## Future Enhancements (Out of Scope for Now)

1. **Export Chat**: Save conversation history as text/PDF
2. **Export Action Items**: Save action items as checklist
3. **Comparison Mode**: Compare with previous months
4. **Visualizations**: Show charts/graphs in chat responses
5. **Multi-language**: Support for other languages
6. **Voice Input**: Speech-to-text for questions
7. **Action Items Reminders**: Set reminders for action items
8. **Progress Tracking**: Track completion of action items over time

---

## Estimated Implementation Time

- Backend API: 3-4 hours (includes web search integration)
- Frontend API Utility: 1.5 hours (includes action items extraction)
- Pre-populated Questions: 1.5 hours
- Chatbot UI Component: 4-5 hours (includes all features)
- Action Items Component: 2 hours
- Integration: 1 hour
- Testing & Refinement: 3-4 hours
- **Total: ~16-19 hours**

---

## Notes

- Reuse existing Claude API infrastructure
- Follow existing code patterns and style
- Maintain privacy standards (no sensitive data)
- Consider API costs:
  - Chatbot: ~$0.01-0.05 per conversation (depending on length)
  - Web search: ~$0.001 per search (Serper API)
  - Total: ~$0.01-0.06 per user session
- May need to adjust Vercel function timeout if conversations get long
- Web search API key needed (Serper recommended - simple setup)
- Action items extraction uses regex/pattern matching on Claude responses
- Pre-populated questions should be dynamic based on user's top categories

## Environment Variables Needed

```env
# Existing
REACT_APP_CLAUDE_API_KEY=sk-ant-api03-...
CLAUDE_API_KEY=sk-ant-api03-... (for Vercel)

# New for Web Search
SERPER_API_KEY=... (recommended)
# OR
GOOGLE_SEARCH_API_KEY=...
GOOGLE_SEARCH_ENGINE_ID=...
# OR
TAVILY_API_KEY=...
```

