/**
 * Emission Calculator Utility
 * 
 * Calculates carbon footprint from categorized transactions
 * Uses Singapore-specific emission factors (SEFR)
 */

import { parseTransactionDate, formatDate } from './dateUtils';
import logger from './logger';
import { CARBON_EQUIVALENTS, REDUCTION_PERCENTAGES, SINGAPORE_AVERAGES, VALIDATION } from '../constants';
import { validateNonEmptyArray, validateEmissionFactors } from './validation';

/**
 * Calculate emissions for all transactions
 * 
 * @param {Array} categorizedTransactions - Transactions with categories
 * @param {Object} emissionFactors - Emission factors database
 * @returns {Object} - Complete results object
 */
export const calculateFootprint = (categorizedTransactions, emissionFactors) => {
    // Input validation
    validateNonEmptyArray(categorizedTransactions, 'Categorized transactions');
    validateEmissionFactors(emissionFactors);
    
    logger.info('Calculating carbon footprint...');
    logger.debug(`Transactions: ${categorizedTransactions.length}`);
  
    const results = {
      totalEmissions: 0,
      byCategory: {},
      byCategoryDetailed: {},
      transactions: [],
      metadata: {
        totalTransactions: categorizedTransactions.length,
        dateRange: null,
        calculatedAt: new Date().toISOString(),
        methodologyNote: 'Spend-based calculation using SEFR Singapore emission factors'
      }
    };
  
    // Initialize categories
    Object.keys(emissionFactors.categories).forEach(categoryKey => {
      const category = emissionFactors.categories[categoryKey];
      
      results.byCategory[categoryKey] = 0;
      results.byCategoryDetailed[categoryKey] = {
        name: category.name,
        icon: category.icon,
        emissions: 0,
        spending: 0,
        transactions: [],
        subcategories: {}
      };
    });
  
    // Process each transaction
    categorizedTransactions.forEach(transaction => {
      const category = transaction.category;
      const subcategory = transaction.subcategory || 'default';
      const factor = transaction.emissionFactor || 0.5;
      
      // Calculate emissions
      const emissions = transaction.amount * factor;
  
      // Aggregate totals
      results.totalEmissions += emissions;
      results.byCategory[category] += emissions;
      results.byCategoryDetailed[category].emissions += emissions;
      results.byCategoryDetailed[category].spending += transaction.amount;
  
      // Store transaction with emissions
      const transactionWithEmissions = {
        ...transaction,
        emissions: parseFloat(emissions.toFixed(2)),
        factor
      };
  
      results.byCategoryDetailed[category].transactions.push(transactionWithEmissions);
      
      // Track subcategory
      if (!results.byCategoryDetailed[category].subcategories[subcategory]) {
        results.byCategoryDetailed[category].subcategories[subcategory] = {
          emissions: 0,
          spending: 0,
          count: 0,
          factor
        };
      }
  
      results.byCategoryDetailed[category].subcategories[subcategory].emissions += emissions;
      results.byCategoryDetailed[category].subcategories[subcategory].spending += transaction.amount;
      results.byCategoryDetailed[category].subcategories[subcategory].count++;
  
      results.transactions.push(transactionWithEmissions);
    });
  
    // Round all values
    results.totalEmissions = parseFloat(results.totalEmissions.toFixed(2));
    
    Object.keys(results.byCategory).forEach(category => {
      results.byCategory[category] = parseFloat(results.byCategory[category].toFixed(2));
      results.byCategoryDetailed[category].emissions = parseFloat(
        results.byCategoryDetailed[category].emissions.toFixed(2)
      );
      results.byCategoryDetailed[category].spending = parseFloat(
        results.byCategoryDetailed[category].spending.toFixed(2)
      );
  
      // Round subcategories
      Object.keys(results.byCategoryDetailed[category].subcategories).forEach(subcat => {
        const sub = results.byCategoryDetailed[category].subcategories[subcat];
        sub.emissions = parseFloat(sub.emissions.toFixed(2));
        sub.spending = parseFloat(sub.spending.toFixed(2));
      });
    });
  
    // Calculate date range
    if (results.transactions.length > 0) {
      const currentYear = new Date().getFullYear();
      
      const validDates = results.transactions
        .map(t => {
          const date = parseTransactionDate(t.date, currentYear);
          if (!date) {
            console.warn(`Failed to parse date: ${t.date}`);
          }
          return date;
        })
        .filter(date => date !== null && !isNaN(date.getTime()));

      if (validDates.length > 0) {
        const minDate = new Date(Math.min(...validDates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...validDates.map(d => d.getTime())));

        results.metadata.dateRange = {
          start: formatDate(minDate),
          end: formatDate(maxDate)
        };
      } else {
        logger.warn('No valid dates found in transactions, dateRange will be null');
      }
    }
  
    logger.success('Calculation complete');
    logger.info(`Total emissions: ${results.totalEmissions.toFixed(2)} kg CO2e`);
    logger.debug(`Categories with emissions: ${Object.values(results.byCategory).filter(v => v > 0).length}`);
  
    return results;
  };
  
  /**
   * Compare with DBS LiveBetter results
   * 
   * @param {Object} ourResults - Our calculated results
   * @param {number} dbsTotal - DBS LiveBetter total emissions
   * @returns {Object} - Comparison data
   */
  export const compareWithDBS = (ourResults, dbsTotal) => {
    const comparison = {
      ourTotal: Math.round(ourResults.totalEmissions),
      dbsTotal: dbsTotal,
      difference: Math.round(ourResults.totalEmissions - dbsTotal),
      percentageDiff: Math.round(((ourResults.totalEmissions - dbsTotal) / dbsTotal) * VALIDATION.PERCENTAGE_MULTIPLIER),
      analysis: ''
    };
  
    // Generate analysis
    if (Math.abs(comparison.percentageDiff) < 10) {
      comparison.analysis = 'Very close match! Our calculation is within 10% of DBS LiveBetter.';
    } else if (comparison.percentageDiff > 0) {
      comparison.analysis = `Our calculation is ${comparison.percentageDiff}% higher than DBS. ` +
        'This could be due to more granular categorization or different emission factors.';
    } else {
      comparison.analysis = `Our calculation is ${Math.abs(comparison.percentageDiff)}% lower than DBS. ` +
        'This might indicate some transactions were not captured or different factor methodologies.';
    }
  
    return comparison;
  };
  
  /**
   * Get top emission sources
   * 
   * @param {Object} results - Calculation results
   * @param {number} limit - Number of top sources to return
   * @returns {Array} - Top emission sources
   */
  export const getTopEmissionSources = (results, limit = 5) => {
    return results.transactions
      .sort((a, b) => b.emissions - a.emissions)
      .slice(0, limit)
      .map(t => ({
        merchant: t.merchant,
        category: t.category,
        amount: t.amount,
        emissions: t.emissions,
        date: t.date
      }));
  };
  
  /**
   * Get category breakdown with percentages
   * 
   * @param {Object} results - Calculation results
   * @returns {Array} - Categories with percentages
   */
  export const getCategoryBreakdown = (results) => {
    const breakdown = Object.entries(results.byCategory)
      .filter(([_, emissions]) => emissions > 0)
      .map(([category, emissions]) => ({
        category,
        name: results.byCategoryDetailed[category].name,
        icon: results.byCategoryDetailed[category].icon,
        emissions: parseFloat(emissions.toFixed(2)),
        spending: results.byCategoryDetailed[category].spending,
        percentage: parseFloat(((emissions / results.totalEmissions) * VALIDATION.PERCENTAGE_MULTIPLIER).toFixed(1)),
        transactionCount: results.byCategoryDetailed[category].transactions.length
      }))
      .sort((a, b) => b.emissions - a.emissions);
  
    return breakdown;
  };
  
  /**
   * Calculate equivalent metrics (trees, plastic bottles, etc.)
   * 
   * @param {number} totalEmissions - Total kg CO2e
   * @returns {Object} - Equivalent metrics
   */
  export const calculateEquivalents = (totalEmissions) => {
    return {
      trees: parseFloat((totalEmissions / CARBON_EQUIVALENTS.TREE_ABSORPTION_KG_PER_YEAR).toFixed(1)),
      laptopCharges: Math.round(totalEmissions / CARBON_EQUIVALENTS.LAPTOP_CHARGE_KG),
      plasticBottles: Math.round(totalEmissions / CARBON_EQUIVALENTS.PLASTIC_BOTTLE_KG),
      carKilometers: Math.round(totalEmissions / CARBON_EQUIVALENTS.CAR_KM_KG)
    };
  };
  
  /**
   * Generate reduction recommendations
   * 
   * @param {Object} results - Calculation results
   * @returns {Array} - Recommendations
   */
  export const generateRecommendations = (results) => {
    const breakdown = getCategoryBreakdown(results);
    const recommendations = [];
  
    // Analyze each category
    breakdown.forEach((cat, index) => {
      if (index < 3) { // Top 3 categories
        switch (cat.category) {
          case 'food_dining':
            recommendations.push({
              category: cat.name,
              icon: cat.icon,
              currentEmissions: cat.emissions,
              suggestion: 'Consider eating at hawker centers more often instead of restaurants',
              potentialSaving: parseFloat((cat.emissions * REDUCTION_PERCENTAGES.FOOD_DINING).toFixed(2)),
              explanation: 'Hawker food has lower emissions due to local sourcing and simpler preparation'
            });
            break;
  
          case 'transport':
            recommendations.push({
              category: cat.name,
              icon: cat.icon,
              currentEmissions: cat.emissions,
              suggestion: 'Use MRT/bus instead of Grab/taxi when possible',
              potentialSaving: parseFloat((cat.emissions * REDUCTION_PERCENTAGES.TRANSPORT).toFixed(2)),
              explanation: 'Public transport has 85% lower emissions per passenger-km than private cars'
            });
            break;
  
          case 'shopping':
            recommendations.push({
              category: cat.name,
              icon: cat.icon,
              currentEmissions: cat.emissions,
              suggestion: 'Buy second-hand or reduce impulse purchases',
              potentialSaving: parseFloat((cat.emissions * REDUCTION_PERCENTAGES.SHOPPING).toFixed(2)),
              explanation: 'Manufacturing new goods has high embedded carbon'
            });
            break;
  
          case 'travel':
            recommendations.push({
              category: cat.name,
              icon: cat.icon,
              currentEmissions: cat.emissions,
              suggestion: 'Consider regional travel instead of long-haul flights',
              potentialSaving: parseFloat((cat.emissions * REDUCTION_PERCENTAGES.TRAVEL).toFixed(2)),
              explanation: 'Flights are the highest-emission activity per dollar spent'
            });
            break;
  
          default:
            recommendations.push({
              category: cat.name,
              icon: cat.icon,
              currentEmissions: cat.emissions,
              suggestion: 'Reduce consumption in this category',
              potentialSaving: parseFloat((cat.emissions * REDUCTION_PERCENTAGES.DEFAULT).toFixed(2)),
              explanation: 'Any reduction helps lower your carbon footprint'
            });
        }
      }
    });
  
    return recommendations;
  };
  
  /**
   * Compare with Singapore averages
   * 
   * @param {number} totalEmissions - Total monthly emissions
   * @returns {Object} - Comparison data
   */
  export const compareWithSingaporeAverage = (totalEmissions) => {
    return {
      yourEmissions: totalEmissions,
      singaporeAverage: SINGAPORE_AVERAGES.PER_CAPITA_MONTHLY,
      singaporeTarget: SINGAPORE_AVERAGES.TARGET_MONTHLY,
      vsAverage: parseFloat((((totalEmissions - SINGAPORE_AVERAGES.PER_CAPITA_MONTHLY) / SINGAPORE_AVERAGES.PER_CAPITA_MONTHLY) * VALIDATION.PERCENTAGE_MULTIPLIER).toFixed(1)),
      vsTarget: parseFloat((((totalEmissions - SINGAPORE_AVERAGES.TARGET_MONTHLY) / SINGAPORE_AVERAGES.TARGET_MONTHLY) * VALIDATION.PERCENTAGE_MULTIPLIER).toFixed(1)),
      status: totalEmissions < SINGAPORE_AVERAGES.TARGET_MONTHLY ? 'excellent' : 
              totalEmissions < SINGAPORE_AVERAGES.PER_CAPITA_MONTHLY ? 'good' : 'above_average'
    };
  };
  
  // Export all functions
  const emissionCalculator = {
    calculateFootprint,
    compareWithDBS,
    getTopEmissionSources,
    getCategoryBreakdown,
    calculateEquivalents,
    generateRecommendations,
    compareWithSingaporeAverage
  };
  
  export default emissionCalculator;