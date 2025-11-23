import React, { useState } from 'react';
import emissionFactors from '../data/emissionFactors.json';

const MethodologyInfo = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const sources = emissionFactors.metadata.sources;
  const methodology = emissionFactors.metadata.methodology;

  return (
    <div className="methodology-section">
      <div className="methodology-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>
          <span className="methodology-icon">📊</span>
          How We Calculate Your Carbon Footprint
        </h3>
        <button className={`expand-button ${isExpanded ? 'expanded' : ''}`}>
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div className="methodology-content">
          {/* Calculation Method */}
          <div className="methodology-subsection">
            <h4>🧮 Calculation Method</h4>
            <p>
              We use a <strong>spend-based approach</strong> to calculate your carbon footprint:
            </p>
            <div className="formula-box">
              <strong>Carbon Emissions = Transaction Amount × Emission Factor</strong>
            </div>
            <p className="methodology-note">
              Each transaction is categorized (e.g., food, transport, shopping) and multiplied 
              by a Singapore-specific emission factor to estimate the carbon footprint in kg CO₂e 
              (carbon dioxide equivalent).
            </p>
          </div>

          {/* Data Sources */}
          <div className="methodology-subsection">
            <h4>📚 Data Sources & References</h4>
            <p>Our emission factors are sourced from authoritative databases, prioritized as follows:</p>
            
            <div className="sources-list">
              <div className="source-item priority-1">
                <div className="source-header">
                  <span className="priority-badge">Priority 1</span>
                  <h5>{sources.sefr.name}</h5>
                </div>
                <p className="source-details">
                  <strong>Authority:</strong> {sources.sefr.authority}<br />
                  <strong>Version:</strong> {sources.sefr.version}<br />
                  <a href={sources.sefr.url} target="_blank" rel="noopener noreferrer" className="source-link">
                    Visit SEFR Website →
                  </a>
                </p>
                <p className="source-description">
                  Singapore-specific emission factors for local businesses and activities. 
                  Used as the primary source for Singapore-relevant categories.
                </p>
              </div>

              <div className="source-item priority-2">
                <div className="source-header">
                  <span className="priority-badge">Priority 2</span>
                  <h5>{sources.ema.name}</h5>
                </div>
                <p className="source-details">
                  <strong>Data:</strong> {sources.ema.data}<br />
                  <strong>Factor Used:</strong> 0.4120 kg CO₂e/kWh (Grid Emission Factor 2023)<br />
                  <a href={sources.ema.url} target="_blank" rel="noopener noreferrer" className="source-link">
                    Visit EMA Website →
                  </a>
                </p>
                <p className="source-description">
                  <strong>✅ Confirmed in database:</strong> EMA data is actively used for electricity calculations. 
                  The Singapore Grid Emission Factor (0.4120 kg CO₂e/kWh) is sourced from EMA and applied to all 
                  electricity transactions. This is the most accurate factor available for Singapore electricity.
                </p>
              </div>

              <div className="source-item priority-3">
                <div className="source-header">
                  <span className="priority-badge">Priority 3</span>
                  <h5>{sources.defra.name}</h5>
                </div>
                <p className="source-details">
                  <strong>Version:</strong> {sources.defra.version}<br />
                  <strong>Note:</strong> {sources.defra.note}<br />
                  <a href={sources.defra.url} target="_blank" rel="noopener noreferrer" className="source-link">
                    Visit DEFRA Website →
                  </a>
                </p>
                <p className="source-description">
                  UK government conversion factors, adjusted for Singapore Dollar (SGD) where applicable. 
                  Used when Singapore-specific factors are not available.
                </p>
              </div>

              <div className="source-item priority-4">
                <div className="source-header">
                  <span className="priority-badge">Research</span>
                  <h5>Industry Research & Estimates</h5>
                </div>
                <p className="source-details">
                  <strong>Methodology:</strong> Research-based estimates and industry averages
                </p>
                <p className="source-description">
                  For categories where Singapore-specific factors are not available, we use research-based estimates 
                  derived from:
                  <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    <li><strong>UK DEFRA factors</strong> - Adjusted for Singapore context and SGD</li>
                    <li><strong>Industry literature</strong> - Peer-reviewed research on spend-based carbon factors</li>
                    <li><strong>EXIOBASE & EPA USEEIO</strong> - Referenced in methodology but factors are primarily DEFRA-adjusted estimates</li>
                  </ul>
                  <strong>Note:</strong> Most factors marked as "Research estimate" are based on DEFRA factors adjusted for Singapore, 
                  not directly from EXIOBASE/USEEIO databases. These are estimates with medium to low confidence.
                </p>
              </div>
            </div>
          </div>

          {/* Methodology Approach */}
          <div className="methodology-subsection">
            <h4>🔬 Methodology Approach</h4>
            <p><strong>Hybrid Approach:</strong> {methodology.approach}</p>
            <ul className="methodology-list">
              <li>
                <strong>Activity-based:</strong> Used for utilities (electricity, water) and transport 
                where we can directly measure the activity (kWh, km traveled).
              </li>
              <li>
                <strong>Spend-based:</strong> Used for consumption categories (food, shopping, entertainment) 
                where we estimate emissions based on spending amount and average emission factors per dollar.
              </li>
            </ul>
          </div>

          {/* Limitations & Notes */}
          <div className="methodology-subsection">
            <h4>⚠️ Important Limitations</h4>
            <ul className="limitations-list">
              {methodology.limitations.map((limitation, index) => (
                <li key={index}>{limitation}</li>
              ))}
              <li>
                <strong>Educational Purpose:</strong> This calculator is designed for educational and 
                personal carbon footprint awareness. Results should not be used for regulatory reporting 
                or carbon offsetting without professional verification.
              </li>
            </ul>
          </div>

          {/* Coverage */}
          <div className="methodology-subsection">
            <h4>📋 What's Covered</h4>
            <p>Our calculator covers the following transaction categories:</p>
            <div className="categories-grid">
              {Object.entries(emissionFactors.categories).map(([key, category]) => (
                <div key={key} className="category-chip">
                  <span className="category-chip-icon">{category.icon}</span>
                  <span className="category-chip-name">{category.name}</span>
                </div>
              ))}
            </div>
            <p className="methodology-note">
              Transactions are automatically categorized using AI (Claude API) with keyword matching as a fallback. 
              Uncategorized transactions use a default emission factor.
            </p>
          </div>

          {/* Currency & Region */}
          <div className="methodology-subsection">
            <h4>🌏 Region & Currency</h4>
            <p>
              <strong>Region:</strong> {emissionFactors.metadata.region}<br />
              <strong>Currency:</strong> {emissionFactors.metadata.currency}<br />
              <strong>Last Updated:</strong> {new Date(emissionFactors.metadata.last_updated).toLocaleDateString('en-SG', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MethodologyInfo;

