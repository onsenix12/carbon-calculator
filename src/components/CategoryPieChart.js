import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

// Colors for different categories
const COLORS = {
  'food': '#FF6B6B',      // Red
  'transport': '#4ECDC4', // Teal
  'shopping': '#45B7D1',  // Blue
  'utilities': '#FFA07A', // Orange
  'entertainment': '#98D8C8', // Mint
  'travel': '#FFD93D'     // Yellow
};

const CategoryPieChart = ({ data }) => {
  if (!data || !data.byCategoryDetailed) return null;

  // Transform data for Recharts
  const chartData = Object.entries(data.byCategory)
    .map(([categoryKey, emissions]) => {
      const categoryDetail = data.byCategoryDetailed[categoryKey];
      return {
        name: categoryDetail.name,
        value: Math.round(emissions),
        icon: categoryDetail.icon,
        categoryKey: categoryKey,
        percentage: ((emissions / data.totalEmissions) * 100).toFixed(1)
      };
    })
    .filter(item => item.value > 0)  // Only show categories with emissions
    .sort((a, b) => b.value - a.value);  // Sort by highest emissions first

  // Custom label renderer
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show label if percentage is significant (>5%)
    if (parseFloat(percentage) < 5) return null;

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="14"
        fontWeight="bold"
      >
        {`${percentage}%`}
      </text>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{data.icon} {data.name}</p>
          <p className="tooltip-value">{data.value} kg CO₂e</p>
          <p className="tooltip-percentage">{data.percentage}% of total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="pie-chart-section">
      <h3>Emissions by Category</h3>
      
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={150}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[entry.categoryKey] || '#999999'} 
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry) => `${entry.payload.icon} ${value}`}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Category breakdown list */}
      <div className="category-breakdown">
        <h4>Detailed Breakdown</h4>
        {chartData.map((category, index) => (
          <div key={index} className="category-item">
            <div className="category-header">
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
              <span className="category-percentage">{category.percentage}%</span>
            </div>
            <div className="category-bar-container">
              <div 
                className="category-bar" 
                style={{ 
                  width: `${category.percentage}%`,
                  backgroundColor: COLORS[category.categoryKey] || '#999999'
                }}
              ></div>
            </div>
            <div className="category-value">{category.value} kg CO₂e</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryPieChart;