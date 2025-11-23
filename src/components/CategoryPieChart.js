import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

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
        percentage: ((emissions / data.totalEmissions) * 100).toFixed(1)
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

    // Only show label if percentage is significant (>5%)
    if (parseFloat(percentage) < 5) return null;

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
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              type="number" 
              label={{ value: 'kg CO₂e', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle' } }}
            />
            <YAxis 
              type="category" 
              dataKey="label"
              width={130}
              tick={{ fontSize: 12, fill: '#1a1a1a' }}
            />
            <Tooltip 
              formatter={(value, name, props) => [
                `${value} kg CO₂e (${props.payload.percentage}%)`,
                props.payload.icon + ' ' + props.payload.name
              ]}
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #ccc',
                borderRadius: '4px'
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