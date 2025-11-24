/**
 * Pre-populated chatbot questions
 *
 * Provides quick-access questions grouped by theme.
 * Some questions are generated dynamically from the user's results.
 */

/**
 * Get top emission category keys sorted by emissions.
 *
 * @param {Object} results - Carbon footprint results
 * @param {number} limit - Number of categories to return
 * @returns {Array} - Array of category info objects
 */
const getTopCategories = (results, limit = 2) => {
  if (!results || !results.byCategoryDetailed) {
    return [];
  }

  return Object.entries(results.byCategoryDetailed)
    .filter(([_, data]) => data.emissions > 0)
    .sort(([_, a], [__, b]) => b.emissions - a.emissions)
    .slice(0, limit)
    .map(([key, data]) => ({
      key,
      name: data.name,
      icon: data.icon || '•'
    }));
};

/**
 * Get pre-populated question groups.
 *
 * @param {Object} results - Carbon footprint results
 * @returns {Array} - Array of question groups { id, title, questions }
 */
export const getPredefinedQuestionGroups = (results) => {
  const topCategories = getTopCategories(results);
  const topCategoryName = topCategories[0]?.name || 'top category';
  const secondCategoryName = topCategories[1]?.name || null;

  const quickAnalysis = [
    "What's my biggest carbon emission category?",
    'How does my footprint compare to a typical Singaporean?',
    'Which months contributed the most to my emissions?',
    `Why is ${topCategoryName} so high in my results?`
  ];

  const reductionStrategies = [
    'Give me three actionable steps to lower my total emissions.',
    `How can I reduce my spending-related emissions in ${topCategoryName}?`,
    'What are the fastest wins to lower my carbon footprint this month?',
    'Create a weekly plan to reduce my emissions by 10%.'
  ];

  if (secondCategoryName) {
    reductionStrategies.push(`Compare strategies for ${topCategoryName} versus ${secondCategoryName}.`);
  }

  const sustainableAlternatives = [
    'Recommend sustainable alternatives for my regular purchases.',
    'What Singapore programs or incentives can help me reduce emissions?',
    'Suggest low-carbon transport ideas that fit my lifestyle.',
    'What are eco-friendly food choices available locally?'
  ];

  return [
    {
      id: 'analysis',
      title: 'Quick Analysis',
      questions: quickAnalysis
    },
    {
      id: 'reduction',
      title: 'Reduction Strategies',
      questions: reductionStrategies
    },
    {
      id: 'alternatives',
      title: 'Sustainable Alternatives',
      questions: sustainableAlternatives
    }
  ];
};

const chatbotQuestions = {
  getPredefinedQuestionGroups
};

export default chatbotQuestions;

