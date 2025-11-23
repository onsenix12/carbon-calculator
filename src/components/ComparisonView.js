import React from 'react';

const ComparisonView = ({ ourResults, dbsTotal }) => {
  if (!ourResults || !dbsTotal) return null;

  const ourTotal = Math.round(ourResults.totalEmissions);
  const difference = ourTotal - dbsTotal;
  const percentageDiff = Math.round((difference / dbsTotal) * 100);
  const withinRange = Math.abs(percentageDiff) <= 20;

  // Determine accuracy status
  const getAccuracyStatus = () => {
    const absDiff = Math.abs(percentageDiff);
    if (absDiff <= 10) return { label: 'Excellent Match', color: 'excellent', icon: '🎯' };
    if (absDiff <= 20) return { label: 'Good Match', color: 'good', icon: '✓' };
    if (absDiff <= 30) return { label: 'Moderate Difference', color: 'moderate', icon: '⚠' };
    return { label: 'Significant Difference', color: 'poor', icon: '⚠️' };
  };

  const accuracyStatus = getAccuracyStatus();

  return (
    <div className="comparison-view">
      <div className="comparison-header">
        <h2>📊 DBS LiveBetter Comparison</h2>
        <p className="comparison-subtitle">
          How our calculation compares to DBS's carbon tracking tool
        </p>
      </div>

      <div className="comparison-container">
        {/* Side-by-side comparison */}
        <div className="comparison-cards">
          <div className="comparison-card our-calculation">
            <div className="card-header">
              <span className="card-icon">🧮</span>
              <span className="card-title">Our Calculation</span>
            </div>
            <div className="card-value">{ourTotal} kg CO₂e</div>
            <div className="card-subtitle">
              Using Singapore-specific emission factors (SEFR + UK DEFRA)
            </div>
          </div>

          <div className="comparison-divider">
            <span className="vs-text">VS</span>
            <div className="difference-arrow">
              {difference > 0 ? '→' : '←'}
            </div>
          </div>

          <div className="comparison-card dbs-calculation">
            <div className="card-header">
              <span className="card-icon">🏦</span>
              <span className="card-title">DBS LiveBetter</span>
            </div>
            <div className="card-value">{dbsTotal} kg CO₂e</div>
            <div className="card-subtitle">
              DBS's proprietary calculation method
            </div>
          </div>
        </div>

        {/* Difference analysis */}
        <div className="difference-analysis">
          <div className="difference-box">
            <div className="difference-label">Difference</div>
            <div className={`difference-value ${difference >= 0 ? 'higher' : 'lower'}`}>
              {difference > 0 ? '+' : ''}{difference} kg CO₂e
              <span className="difference-percentage">
                ({percentageDiff > 0 ? '+' : ''}{percentageDiff}%)
              </span>
            </div>
          </div>

          <div className={`accuracy-status ${accuracyStatus.color}`}>
            <span className="status-icon">{accuracyStatus.icon}</span>
            <span className="status-label">{accuracyStatus.label}</span>
          </div>
        </div>

        {/* Validation message */}
        <div className={`validation-message ${withinRange ? 'valid' : 'caution'}`}>
          {withinRange ? (
            <>
              <span className="validation-icon">✓</span>
              <div className="validation-text">
                <strong>Within Acceptable Range</strong>
                <p>Our calculation is within ±20% of DBS LiveBetter, indicating good accuracy.</p>
              </div>
            </>
          ) : (
            <>
              <span className="validation-icon">⚠</span>
              <div className="validation-text">
                <strong>Outside Expected Range</strong>
                <p>Difference exceeds ±20%. This may indicate different categorization approaches or emission factors.</p>
              </div>
            </>
          )}
        </div>

        {/* Methodology differences */}
        <div className="methodology-section">
          <h3>Why the difference?</h3>
          <div className="methodology-grid">
            <div className="methodology-item">
              <div className="methodology-title">🔍 Categorization</div>
              <div className="methodology-description">
                DBS uses proprietary AI algorithms, while we use Claude API with explicit rules
              </div>
            </div>
            <div className="methodology-item">
              <div className="methodology-title">📊 Emission Factors</div>
              <div className="methodology-description">
                We use SEFR (Singapore) + UK DEFRA standards. DBS's factors are not publicly disclosed
              </div>
            </div>
            <div className="methodology-item">
              <div className="methodology-title">🏷️ Transaction Matching</div>
              <div className="methodology-description">
                Different merchant databases and subcategory assignments can affect accuracy
              </div>
            </div>
            <div className="methodology-item">
              <div className="methodology-title">⚡ Update Frequency</div>
              <div className="methodology-description">
                DBS updates factors regularly. Our factors are based on 2024 SEFR data
              </div>
            </div>
          </div>
        </div>

        {/* Category comparison breakdown */}
        {ourResults.byCategoryDetailed && (
          <div className="category-comparison">
            <h3>Category-by-Category Breakdown</h3>
            <p className="category-note">
              Note: DBS category totals not available - showing our detailed breakdown
            </p>
            <div className="category-breakdown-grid">
              {Object.entries(ourResults.byCategory)
                .filter(([_, emissions]) => emissions > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([categoryKey, emissions]) => {
                  const categoryInfo = ourResults.byCategoryDetailed[categoryKey];
                  const percentage = ((emissions / ourResults.totalEmissions) * 100).toFixed(1);
                  return (
                    <div key={categoryKey} className="category-breakdown-item">
                      <div className="category-breakdown-header">
                        <span className="category-icon">{categoryInfo.icon}</span>
                        <span className="category-name">{categoryInfo.name}</span>
                      </div>
                      <div className="category-breakdown-value">
                        {Math.round(emissions)} kg CO₂e
                        <span className="category-percentage">({percentage}%)</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparisonView;