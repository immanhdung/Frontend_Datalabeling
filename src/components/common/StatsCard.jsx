import React from 'react';

const StatsCard = ({ title, value, icon, color, trend }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500',
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <h3 className="text-3xl font-bold mt-2 text-gray-900">{value}</h3>
          {trend && (
            <p className={`text-sm mt-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% từ tuần trước
            </p>
          )}
        </div>
        <div className={`${colorClasses[color]} p-4 rounded-full text-white flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
