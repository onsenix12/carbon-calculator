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
  const topCategories = getTopCategories(results, 1);
  const topCategoryName = topCategories[0]?.name || 'top category';

  const quickAnalysis = [
    `Why is ${topCategoryName} contributing so much to my footprint?`,
    'How does my total footprint compare to a typical Singapore resident?'
  ];

  const reductionStrategies = [
    'Give me two quick wins to cut my emissions this month.',
    `Suggest one habit change to lower my ${topCategoryName} emissions.`
  ];

  return [
    {
      id: 'analysis',
      title: 'Quick Analysis',
      questions: quickAnalysis
    },
    {
      id: 'reduction',
      title: 'Fast Reductions',
      questions: reductionStrategies
    }
  ];
};

const chatbotQuestions = {
  getPredefinedQuestionGroups
};

export default chatbotQuestions;

