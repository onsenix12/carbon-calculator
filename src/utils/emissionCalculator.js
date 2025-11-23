/**
 * Emission Calculator Utility
 * 
 * Calculates carbon footprint from categorized transactions
 * Uses Singapore-specific emission factors (SEFR)
 */

/**
 * Calculate emissions for all transactions
 * 
 * @param {Array} categorizedTransactions - Transactions with categories
 * @param {Object} emissionFactors - Emission factors database
 * @returns {Object} - Complete results object
 */
export const calculateFootprint = (categorizedTransactions, emissionFactors) => {
    console.log('🧮 Calculating carbon footprint...');
    console.log(`   Transactions: ${categorizedTransactions.length}`);
  
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
      const monthMap = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
                         JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
      const currentYear = new Date().getFullYear();
      
      const validDates = results.transactions
        .map(t => {
          try {
            // Parse DD MMM format to Date
            const parts = t.date.trim().split(/\s+/);
            if (parts.length < 2) return null;
            
            const day = parseInt(parts[0]);
            const monthStr = parts[1].toUpperCase();
            const month = monthMap[monthStr];
            
            if (isNaN(day) || day < 1 || day > 31 || month === undefined) {
              return null;
            }
            
            const date = new Date(currentYear, month, day);
            
            // Validate the date is actually valid (handles cases like Feb 30)
            if (date.getDate() !== day || date.getMonth() !== month) {
              return null;
            }
            
            return date;
          } catch (e) {
            console.warn(`Failed to parse date: ${t.date}`, e);
            return null;
          }
        })
        .filter(date => date !== null && !isNaN(date.getTime()));

      if (validDates.length > 0) {
        const minDate = new Date(Math.min(...validDates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...validDates.map(d => d.getTime())));

        // Format dates with proper error handling
        const formatDate = (date) => {
          try {
            const formatted = date.toLocaleDateString('en-SG', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric' 
            });
            // Check if formatting returned "Invalid Date"
            if (formatted === 'Invalid Date' || formatted.includes('Invalid')) {
              // Fallback to manual formatting
              const day = date.getDate().toString().padStart(2, '0');
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const month = monthNames[date.getMonth()];
              const year = date.getFullYear();
              return `${day} ${month} ${year}`;
            }
            return formatted;
          } catch (e) {
            // Fallback formatting
            const day = date.getDate().toString().padStart(2, '0');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = monthNames[date.getMonth()];
            const year = date.getFullYear();
            return `${day} ${month} ${year}`;
          }
        };

        results.metadata.dateRange = {
          start: formatDate(minDate),
          end: formatDate(maxDate)
        };
      } else {
        console.warn('⚠️ No valid dates found in transactions, dateRange will be null');
      }
    }
  
    console.log('✅ Calculation complete');
    console.log(`   Total emissions: ${results.totalEmissions.toFixed(2)} kg CO2e`);
    console.log(`   Categories with emissions: ${Object.values(results.byCategory).filter(v => v > 0).length}`);
  
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
      percentageDiff: Math.round(((ourResults.totalEmissions - dbsTotal) / dbsTotal) * 100),
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
        percentage: parseFloat(((emissions / results.totalEmissions) * 100).toFixed(1)),
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
    // Reference data:
    // - 1 tree absorbs ~21.77 kg CO2/year
    // - 1 laptop charge = ~0.257 kg CO2
    // - 1 plastic bottle = ~82.8g CO2
    // - 1 km by car = ~0.17 kg CO2
  
    return {
      trees: parseFloat((totalEmissions / 21.77).toFixed(1)),
      laptopCharges: Math.round(totalEmissions / 0.257),
      plasticBottles: Math.round(totalEmissions / 0.0828),
      carKilometers: Math.round(totalEmissions / 0.17)
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
              potentialSaving: parseFloat((cat.emissions * 0.20).toFixed(2)),
              explanation: 'Hawker food has lower emissions due to local sourcing and simpler preparation'
            });
            break;
  
          case 'transport':
            recommendations.push({
              category: cat.name,
              icon: cat.icon,
              currentEmissions: cat.emissions,
              suggestion: 'Use MRT/bus instead of Grab/taxi when possible',
              potentialSaving: parseFloat((cat.emissions * 0.60).toFixed(2)),
              explanation: 'Public transport has 85% lower emissions per passenger-km than private cars'
            });
            break;
  
          case 'shopping':
            recommendations.push({
              category: cat.name,
              icon: cat.icon,
              currentEmissions: cat.emissions,
              suggestion: 'Buy second-hand or reduce impulse purchases',
              potentialSaving: parseFloat((cat.emissions * 0.30).toFixed(2)),
              explanation: 'Manufacturing new goods has high embedded carbon'
            });
            break;
  
          case 'travel':
            recommendations.push({
              category: cat.name,
              icon: cat.icon,
              currentEmissions: cat.emissions,
              suggestion: 'Consider regional travel instead of long-haul flights',
              potentialSaving: parseFloat((cat.emissions * 0.40).toFixed(2)),
              explanation: 'Flights are the highest-emission activity per dollar spent'
            });
            break;
  
          default:
            recommendations.push({
              category: cat.name,
              icon: cat.icon,
              currentEmissions: cat.emissions,
              suggestion: 'Reduce consumption in this category',
              potentialSaving: parseFloat((cat.emissions * 0.15).toFixed(2)),
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
    // Singapore per capita average: ~832 kg CO2e/month (from DBS data)
    // Singapore target: ~273 kg CO2e/month
    
    const sgAverage = 832;
    const sgTarget = 273;
  
    return {
      yourEmissions: totalEmissions,
      singaporeAverage: sgAverage,
      singaporeTarget: sgTarget,
      vsAverage: parseFloat((((totalEmissions - sgAverage) / sgAverage) * 100).toFixed(1)),
      vsTarget: parseFloat((((totalEmissions - sgTarget) / sgTarget) * 100).toFixed(1)),
      status: totalEmissions < sgTarget ? 'excellent' : 
              totalEmissions < sgAverage ? 'good' : 'above_average'
    };
  };
  
  // Export all functions
  export default {
    calculateFootprint,
    compareWithDBS,
    getTopEmissionSources,
    getCategoryBreakdown,
    calculateEquivalents,
    generateRecommendations,
    compareWithSingaporeAverage
  };