import React from 'react';
import type { KPIData } from '../../types/analytics';

interface KPICardProps {
  title: string;
  value: string;
  urgent?: boolean;
  description?: string;
}

const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  urgent = false,
  description 
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">{title}</p>
          <div className="flex items-center space-x-2">
            <p className={`text-3xl font-bold ${
              urgent ? 'text-red-600' : 'text-gray-900'
            }`}>
              {value}
            </p>
          </div>
        </div>
      </div>
      {description && (
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      )}
    </div>
  );
};

// KPI Cards Grid Component
interface KPICardsGridProps {
  data: KPIData[];
  dateRange?: string;
}

export const KPICardsGrid: React.FC<KPICardsGridProps> = ({ data, dateRange }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="flex items-end gap-2 mb-3">
        {dateRange && (
          <span className="text-md text-gray-600">{dateRange}</span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {data.map((kpi, index) => (
          <div key={index} className={`text-left ${
            index < data.length - 1 ? 'border-r border-gray-200 pr-12' : ''
          }`}>
            <p className="text-xs font-medium text-gray-600 mb-2">{kpi.title}</p>
            <div className="flex items-center space-x-3">
              <p className={`text-2xl font-bold ${
                kpi.urgent ? 'text-red-600' : 'text-gray-900'
              }`}>
                {kpi.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KPICard;