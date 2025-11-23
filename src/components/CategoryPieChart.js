import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { CHART_CONFIG, VALIDATION } from '../constants';

// Colors for different categories
const COLORS = {
  'food_dining': '#FF8C42',    // Orange-red (warm, appetizing)
  'food': '#FF8C42',           // Alias for food_dining (backward compatibility)
  'transport': '#4ECDC4',      // Teal
  'shopping': '#45B7D1',       // Blue
  'utilities': '#FFA07A',      // Light orange
  'entertainment': '#98D8C8',   // Mint
  'travel': '#FFD93D',         // Yellow
  'uncategorized': '#9CA3AF'    // Medium grey (softer than before)
};

const CategoryPieChart = ({ data }) => {
  if (!data || !data.byCategory || !data.byCategoryDetailed) return null;

  // Transform data for Recharts
  const chartData = Object.entries(data.byCategory)
    .map(([categoryKey, emissions]) => {
      const categoryDetail = data.byCategoryDetailed[categoryKey];
      return {
        name: categoryDetail.name,
        label: `${categoryDetail.icon} ${categoryDetail.name}`, // For Y-axis display
        value: Math.round(emissions),
        icon: categoryDetail.icon,
        categoryKey: categoryKey,
        percentage: ((emissions / data.totalEmissions) * VALIDATION.PERCENTAGE_MULTIPLIER).toFixed(1)
      };
    })
    .filter(item => item.value > 0)  // Only show categories with emissions
    .sort((a, b) => b.value - a.value);  // Sort by highest emissions first

  // Custom label renderer
  const renderCustomLabel = (entry) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percentage } = entry;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show label if percentage is significant
    if (parseFloat(percentage) < CHART_CONFIG.MIN_PERCENTAGE_FOR_LABEL) return null;

    // Get category key from the data - Recharts passes the data point
    const dataPoint = entry.payload || entry;
    const isUncategorized = dataPoint?.categoryKey === 'uncategorized';

    return (
      <text 
        x={x} 
        y={y} 
        fill="#FFFFFF" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="14"
        fontWeight="bold"
        style={{
          textShadow: isUncategorized 
            ? '2px 2px 4px rgba(0, 0, 0, 0.9), -1px -1px 2px rgba(0, 0, 0, 0.9), 0 0 4px rgba(0, 0, 0, 0.8)' 
            : '1px 1px 2px rgba(0, 0, 0, 0.6)'
        }}
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
      
      <ResponsiveContainer width="100%" height={CHART_CONFIG.PIE_CHART_HEIGHT}>
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
                fill={COLORS[entry.categoryKey] || COLORS['uncategorized']} 
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry) => `${entry.payload.icon} ${value}`}
            wrapperStyle={{ color: '#1a1a1a', fontSize: '14px', fontWeight: '500' }}
            iconType="square"
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Category breakdown - Vertical Bar Chart */}
      <div className="category-breakdown">
        <h4>Detailed Breakdown</h4>
        <ResponsiveContainer width="100%" height={CHART_CONFIG.PIE_CHART_HEIGHT}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 40, left: 140, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" strokeOpacity={0.6} />
            <XAxis 
              type="number" 
              label={{ value: 'kg CO₂e', position: 'insideBottom', offset: -10, style: { textAnchor: 'middle', fontSize: '14px', fontWeight: '600', fill: '#1a1a1a' } }}
              tick={{ fontSize: 13, fill: '#4a5568', fontWeight: '500' }}
              tickLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
            />
            <YAxis 
              type="category" 
              dataKey="label"
              width={150}
              tick={{ fontSize: 14, fill: '#1a1a1a', fontWeight: '500' }}
              tickLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
              axisLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
            />
            <Tooltip 
              formatter={(value, name, props) => [
                `${value} kg CO₂e (${props.payload.percentage}%)`,
                props.payload.icon + ' ' + props.payload.name
              ]}
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                border: '2px solid #667eea',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                padding: '12px',
                fontSize: '14px',
                fontWeight: '500'
              }}
              labelStyle={{ 
                fontWeight: '600',
                marginBottom: '8px',
                fontSize: '15px',
                color: '#1a1a1a'
              }}
            />
            <Bar 
              dataKey="value" 
              radius={[0, 4, 4, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`bar-cell-${index}`} 
                  fill={COLORS[entry.categoryKey] || COLORS['uncategorized']} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CategoryPieChart;