import type { 
  ResponseData, 
  TrendData, 
  VendorData, 
  TimeDistributionData,
  AnalyticsFilters 
} from '../types/analytics';

// Mock data generation for development
export const generateMockAnalyticsData = () => {
  return {
    responseDistribution: [
      { status: 'Yes Bid', count: 45, percentage: 45, color: '#10b981' },
      { status: 'No Bid', count: 25, percentage: 25, color: '#f59e0b' },
      { status: 'Pending', count: 30, percentage: 30, color: '#6b7280' }
    ],
    
    trendData: [
      { month: 'Jan 24', responseRate: 68, totalBids: 120, date: new Date('2024-01-01') },
      { month: 'Feb 24', responseRate: 72, totalBids: 135, date: new Date('2024-02-01') },
      { month: 'Mar 24', responseRate: 75, totalBids: 142, date: new Date('2024-03-01') },
      { month: 'Apr 24', responseRate: 70, totalBids: 128, date: new Date('2024-04-01') },
      { month: 'May 24', responseRate: 78, totalBids: 156, date: new Date('2024-05-01') },
      { month: 'Jun 24', responseRate: 82, totalBids: 167, date: new Date('2024-06-01') },
      { month: 'Jul 24', responseRate: 76, totalBids: 145, date: new Date('2024-07-01') },
      { month: 'Aug 24', responseRate: 74, totalBids: 139, date: new Date('2024-08-01') },
      { month: 'Sep 24', responseRate: 79, totalBids: 158, date: new Date('2024-09-01') },
      { month: 'Oct 24', responseRate: 81, totalBids: 162, date: new Date('2024-10-01') },
      { month: 'Nov 24', responseRate: 85, totalBids: 174, date: new Date('2024-11-01') }
    ],
    
    vendorData: [
      { id: 1, name: 'ABC Construction', responseRate: 92, totalBids: 45, avgResponseTime: 2.1, reliabilityScore: 88, positiveResponses: 35, responses: 41 },
      { id: 2, name: 'BuildRight Inc', responseRate: 85, totalBids: 38, avgResponseTime: 3.2, reliabilityScore: 82, positiveResponses: 28, responses: 32 },
      { id: 3, name: 'Premier Contractors', responseRate: 78, totalBids: 52, avgResponseTime: 4.1, reliabilityScore: 75, positiveResponses: 32, responses: 41 },
      { id: 4, name: 'Elite Building Co', responseRate: 95, totalBids: 28, avgResponseTime: 1.8, reliabilityScore: 92, positiveResponses: 24, responses: 27 },
      { id: 5, name: 'Metro Construction', responseRate: 68, totalBids: 35, avgResponseTime: 5.2, reliabilityScore: 65, positiveResponses: 19, responses: 24 },
      { id: 6, name: 'Skyline Builders', responseRate: 89, totalBids: 41, avgResponseTime: 2.8, reliabilityScore: 85, positiveResponses: 31, responses: 36 },
      { id: 7, name: 'Foundation Pro', responseRate: 72, totalBids: 29, avgResponseTime: 6.1, reliabilityScore: 68, positiveResponses: 17, responses: 21 },
      { id: 8, name: 'Apex Construction', responseRate: 91, totalBids: 33, avgResponseTime: 2.5, reliabilityScore: 87, positiveResponses: 26, responses: 30 },
      { id: 9, name: 'Reliable Builders', responseRate: 83, totalBids: 37, avgResponseTime: 3.8, reliabilityScore: 79, positiveResponses: 25, responses: 31 },
      { id: 10, name: 'Summit Construction', responseRate: 76, totalBids: 44, avgResponseTime: 4.8, reliabilityScore: 72, positiveResponses: 28, responses: 33 }
    ],
    
    timeDistribution: [
      { range: 'Same Day', count: 25, percentage: 18 },
      { range: '1-3 Days', count: 45, percentage: 32 },
      { range: '4-7 Days', count: 35, percentage: 25 },
      { range: '1-2 Weeks', count: 22, percentage: 16 },
      { range: '2+ Weeks', count: 13, percentage: 9 }
    ]
  };
};

// Data processing functions
export const processResponseData = (rawData: any[]): ResponseData[] => {
  if (!rawData || rawData.length === 0) {
    return [
      { status: 'No Data', count: 0, percentage: 100, color: '#9ca3af' }
    ];
  }

  const statusCounts = rawData.reduce((acc, item) => {
    const status = item.status === 'yes bid' ? 'Yes Bid' : 
                   item.status === 'no bid' ? 'No Bid' : 'Pending';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = rawData.length;
  const colors = {
    'Yes Bid': '#10b981',
    'No Bid': '#f59e0b', 
    'Pending': '#6b7280'
  };

  return Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count: count as number,
    percentage: Math.round(((count as number) / total) * 100),
    color: colors[status as keyof typeof colors] || '#9ca3af'
  }));
};

export const processTrendData = (rawData: any[], filters?: AnalyticsFilters): TrendData[] => {
  if (!rawData || rawData.length === 0) return [];

  // Determine time granularity and range based on filters
  let startDate: Date;
  let endDate = new Date();
  let granularity: 'day' | 'month' = 'day';
  
  if (filters) {
    const dateRange = getDateRangeFromFilters(filters);
    startDate = dateRange.startDate;
    endDate = dateRange.endDate;
    
    // Use monthly granularity for periods longer than 90 days
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      granularity = 'month';
    }
  } else {
    // Default to last 30 days
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
  }

  // Group data by day or month
  const timeData = rawData.reduce((acc, item) => {
    const date = new Date(item.created_at);
    const timeKey = granularity === 'month' 
      ? `${date.getFullYear()}-${date.getMonth()}`
      : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    
    if (!acc[timeKey]) {
      const displayDate = granularity === 'month' 
        ? new Date(date.getFullYear(), date.getMonth(), 1)
        : new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      acc[timeKey] = {
        month: granularity === 'month' 
          ? displayDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : displayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        date: displayDate,
        total: 0,
        responded: 0
      };
    }
    
    acc[timeKey].total++;
    if (item.response_received_date || item.status === 'yes bid' || item.status === 'no bid') {
      acc[timeKey].responded++;
    }
    
    return acc;
  }, {} as Record<string, any>);

  // Fill in missing periods with zero values
  const allPeriods = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const existingData = Object.values(timeData).find((data: any) => 
      data.date.toDateString() === current.toDateString()
    ) as any;
    
    allPeriods.push({
      month: granularity === 'month'
        ? current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      responseRate: existingData ? 
        (existingData.total > 0 ? Math.round((existingData.responded / existingData.total) * 100) : 0) : 0,
      totalBids: existingData ? existingData.total : 0,
      responsesReceived: existingData ? existingData.responded : 0,
      date: new Date(current)
    });
    
    if (granularity === 'month') {
      current.setMonth(current.getMonth() + 1);
    } else {
      current.setDate(current.getDate() + 1);
    }
  }

  return allPeriods.sort((a, b) => a.date.getTime() - b.date.getTime());
};

export const processVendorData = (rawData: any[]): VendorData[] => {
  if (!rawData || rawData.length === 0) return [];

  // Group data by vendor
  const vendorStats = rawData.reduce((acc, item) => {
    if (!item.vendors) return acc;
    
    const vendorId = item.vendor_id;
    const vendorName = item.vendors.company_name;
    
    if (!acc[vendorId]) {
      acc[vendorId] = {
        id: vendorId,
        name: vendorName,
        totalBids: 0,
        responses: 0,
        positiveResponses: 0,
        responseTimes: []
      };
    }
    
    acc[vendorId].totalBids++;
    
    // Count responses
    if (item.response_received_date || item.status === 'yes bid' || item.status === 'no bid') {
      acc[vendorId].responses++;
    }
    
    // Count positive responses
    if (item.status === 'yes bid') {
      acc[vendorId].positiveResponses++;
    }
    
    // Calculate response time
    if (item.response_received_date && item.created_at) {
      const responseTime = Math.floor(
        (new Date(item.response_received_date).getTime() - new Date(item.created_at).getTime()) 
        / (1000 * 60 * 60 * 24)
      );
      if (responseTime >= 0) {
        acc[vendorId].responseTimes.push(responseTime);
      }
    }
    
    return acc;
  }, {} as Record<string, any>);

  return Object.values(vendorStats)
    .map((vendor: any) => {
      const responseRate = vendor.totalBids > 0 ? Math.round((vendor.responses / vendor.totalBids) * 100) : 0;
      const avgResponseTime = vendor.responseTimes.length > 0 
        ? Math.round(vendor.responseTimes.reduce((sum: number, time: number) => sum + time, 0) / vendor.responseTimes.length)
        : 0;
      
      return {
        id: vendor.id,
        name: vendor.name,
        responseRate,
        totalBids: vendor.totalBids,
        avgResponseTime,
        reliabilityScore: calculateReliabilityScore({
          responseRate,
          avgResponseTime,
          totalBids: vendor.totalBids
        }),
        positiveResponses: vendor.positiveResponses,
        responses: vendor.responses
      };
    })
    .filter(vendor => vendor.totalBids >= 2) // Only include vendors with at least 2 bids
    .sort((a, b) => b.responseRate - a.responseRate);
};

export const processTimeDistributionData = (rawData: any[]): TimeDistributionData[] => {
  const ranges = ['Same Day', '1-3 Days', '4-7 Days', '1-2 Weeks', '2+ Weeks'];
  const distribution = ranges.map(range => ({ range, count: 0 }));
  
  rawData.forEach(item => {
    if (!item.response_received_date || !item.created_at) return;
    
    const daysDiff = Math.floor(
      (new Date(item.response_received_date).getTime() - new Date(item.created_at).getTime()) 
      / (1000 * 60 * 60 * 24)
    );
    
    if (daysDiff === 0) {
      distribution[0].count++;
    } else if (daysDiff <= 3) {
      distribution[1].count++;
    } else if (daysDiff <= 7) {
      distribution[2].count++;
    } else if (daysDiff <= 14) {
      distribution[3].count++;
    } else {
      distribution[4].count++;
    }
  });
  
  const total = distribution.reduce((sum, d) => sum + d.count, 0);
  
  return distribution.map(d => ({
    ...d,
    percentage: total > 0 ? Math.round((d.count / total) * 100) : 0
  }));
};

export const calculateReliabilityScore = (vendor: any): number => {
  const responseRate = vendor.responseRate || 0;
  const avgResponseTime = vendor.avgResponseTime || 10;
  const totalBids = vendor.totalBids || 0;

  // Weighted scoring algorithm
  let score = 0;
  
  // Response rate (50% weight)
  score += responseRate * 0.5;
  
  // Speed score (30% weight) - inverse of response time
  const speedScore = Math.max(0, (14 - avgResponseTime) / 14) * 30;
  score += speedScore;
  
  // Volume bonus (20% weight) - more bids = more reliable data
  const volumeScore = Math.min(20, totalBids * 0.5);
  score += volumeScore;

  return Math.min(100, Math.round(score));
};

// Helper function to get date range based on filter type
export const getDateRangeFromFilters = (filters: AnalyticsFilters) => {
  let startDate: Date;
  let endDate: Date = new Date();

  switch (filters.filterType) {
    case 'month':
      if (filters.selectedMonth) {
        const [year, month] = filters.selectedMonth.split('-');
        startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        endDate = new Date(parseInt(year), parseInt(month), 0); // Last day of month
      } else {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }
      break;
    
    case 'custom':
      if (filters.startDate && filters.endDate) {
        startDate = new Date(filters.startDate);
        endDate = new Date(filters.endDate);
      } else {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }
      break;
    
    case 'quick':
    default:
      startDate = new Date();
      switch (filters.timeframe) {
        case '30days':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '12months':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        case 'all':
          startDate = new Date('2000-01-01'); // Far back date for all data
          break;
      }
      break;
  }

  return { startDate, endDate };
};

// Filter application functions
export const applyAnalyticsFilters = (data: any[], filters: AnalyticsFilters) => {
  let filteredData = [...data];
  
  // Apply date range filter based on filter type
  const { startDate, endDate } = getDateRangeFromFilters(filters);
  
  filteredData = filteredData.filter(item => {
    const itemDate = new Date(item.created_at);
    return itemDate >= startDate && itemDate <= endDate;
  });
  
  // Apply cost range filter
  if (filters.costRange !== 'all') {
    filteredData = filteredData.filter(item => {
      const cost = item.cost_amount || 0;
      
      switch (filters.costRange) {
        case 'under10k':
          return cost < 10000;
        case '10k-50k':
          return cost >= 10000 && cost < 50000;
        case '50k-100k':
          return cost >= 50000 && cost < 100000;
        case 'over100k':
          return cost >= 100000;
        default:
          return true;
      }
    });
  }
  
  return filteredData;
};

// SQL query generators for analytics
export const getAnalyticsQueries = () => {
  return {
    responseDistribution: `
      SELECT 
        status,
        COUNT(*) as count
      FROM project_vendors pv
      JOIN est_responses er ON pv.id = er.project_vendor_id
      WHERE created_at >= $1
      GROUP BY status
    `,
    
    trendData: `
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(CASE WHEN status IN ('yes bid', 'no bid') THEN 1 END) * 100.0 / COUNT(*) as response_rate,
        COUNT(*) as total_bids
      FROM project_vendors pv
      JOIN est_responses er ON pv.id = er.project_vendor_id
      WHERE created_at >= $1
      GROUP BY month
      ORDER BY month
    `,
    
    vendorPerformance: `
      SELECT 
        v.id,
        v.name,
        COUNT(*) as total_bids,
        COUNT(CASE WHEN bv.status IN ('yes bid', 'no bid') THEN 1 END) as responses,
        COUNT(CASE WHEN bv.status = 'yes bid' THEN 1 END) as positive_responses,
        ROUND(COUNT(CASE WHEN bv.status IN ('yes bid', 'no bid') THEN 1 END) * 100.0 / COUNT(*), 1) as response_rate,
        ROUND(AVG(EXTRACT(days FROM (bv.response_received_date - bv.created_at))), 1) as avg_response_time
      FROM project_vendors pv
      JOIN est_responses er ON pv.id = er.project_vendor_id bv
      JOIN vendors v ON bv.vendor_id = v.id
      WHERE bv.created_at >= $1
      GROUP BY v.id, v.name
      HAVING COUNT(*) >= 3
      ORDER BY response_rate DESC, positive_responses DESC
    `,
    
    timeDistribution: `
      SELECT 
        bv.*
      FROM project_vendors pv
      JOIN est_responses er ON pv.id = er.project_vendor_id bv
      WHERE bv.response_received_date IS NOT NULL
      AND bv.created_at >= $1
    `
  };
};