import { 
  parseISO, 
  format, 
  startOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval
} from 'date-fns';
import type {
  BidCompletionAnalytics,
  VendorResponseAnalytics,
  StatusDurationAnalytics,
  ChartDataPoint,
  TimeSeriesDataPoint,
  GanttChartData
} from '../types';
import { STATUS_COLORS } from './constants';

/**
 * Convert PostgreSQL interval string to hours
 */
export function intervalToHours(interval: string | null): number {
  if (!interval) return 0;
  
  // Parse PostgreSQL interval format like "1 day 02:30:00" or "05:30:00"
  const match = interval.match(/(?:(\d+)\s+days?\s+)?(\d{2}):(\d{2}):(\d{2})/);
  
  if (!match) return 0;
  
  const [, days = '0', hours, minutes, seconds] = match;
  
  return parseInt(days) * 24 + parseInt(hours) + parseInt(minutes) / 60 + parseInt(seconds) / 3600;
}

/**
 * Calculate percentiles for a dataset
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  
  if (index === Math.floor(index)) {
    return sorted[index];
  }
  
  const lower = sorted[Math.floor(index)];
  const upper = sorted[Math.ceil(index)];
  const weight = index - Math.floor(index);
  
  return lower + weight * (upper - lower);
}

/**
 * Calculate statistical summary for a dataset
 */
export function calculateStatistics(values: number[]) {
  if (values.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      p25: 0,
      p75: 0,
      p90: 0,
      stdDev: 0
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return {
    count: values.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round(mean * 100) / 100,
    median: calculatePercentile(values, 50),
    p25: calculatePercentile(values, 25),
    p75: calculatePercentile(values, 75),
    p90: calculatePercentile(values, 90),
    stdDev: Math.round(stdDev * 100) / 100
  };
}

/**
 * Transform bid completion data for bar charts
 */
export function transformCompletionDataForBarChart(data: BidCompletionAnalytics[]): ChartDataPoint[] {
  const statusCounts = new Map<string, number>();
  const statusTotals = new Map<string, number>();

  data.forEach(bid => {
    if (bid.completion_hours !== null) {
      statusCounts.set(bid.status, (statusCounts.get(bid.status) || 0) + bid.completion_hours);
      statusTotals.set(bid.status, (statusTotals.get(bid.status) || 0) + 1);
    }
  });

  return Array.from(statusCounts.entries()).map(([status, totalHours]) => ({
    label: status,
    value: Math.round((totalHours / (statusTotals.get(status) || 1)) * 10) / 10,
    category: 'completion_time',
    color: STATUS_COLORS[status.toLowerCase() as keyof typeof STATUS_COLORS] || STATUS_COLORS.default,
    metadata: {
      count: statusTotals.get(status) || 0,
      totalHours
    }
  }));
}

/**
 * Transform vendor response data for charts
 */
export function transformVendorResponseDataForChart(data: VendorResponseAnalytics[]): ChartDataPoint[] {
  const vendorStats = new Map<string, { responses: number; totalRequests: number; totalResponseTime: number }>();

  data.forEach(vendor => {
    const key = vendor.company_name;
    const current = vendorStats.get(key) || { responses: 0, totalRequests: 0, totalResponseTime: 0 };
    
    current.totalRequests += 1;
    
    if (vendor.response_status === 'Responded' && vendor.response_hours !== null) {
      current.responses += 1;
      current.totalResponseTime += vendor.response_hours;
    }
    
    vendorStats.set(key, current);
  });

  return Array.from(vendorStats.entries())
    .filter(([, stats]) => stats.totalRequests >= 2) // Only vendors with 2+ requests
    .map(([vendorName, stats]) => ({
      label: vendorName,
      value: stats.responses > 0 ? Math.round((stats.totalResponseTime / stats.responses) * 10) / 10 : 0,
      category: 'response_time',
      color: '#3B82F6',
      metadata: {
        responseRate: Math.round((stats.responses / stats.totalRequests) * 100),
        totalRequests: stats.totalRequests,
        responses: stats.responses
      }
    }))
    .sort((a, b) => a.value - b.value);
}

/**
 * Transform data for time series charts
 */
export function transformDataForTimeSeries(
  data: BidCompletionAnalytics[] | VendorResponseAnalytics[],
  dateField: 'created_at' | 'email_sent_date',
  valueField: 'completion_hours' | 'response_hours',
  groupBy: 'week' | 'month' = 'week'
): TimeSeriesDataPoint[] {
  const timeGroups = new Map<string, number[]>();

  data.forEach(item => {
    const dateValue = dateField === 'created_at' 
      ? (item as BidCompletionAnalytics).created_at
      : (item as VendorResponseAnalytics).email_sent_date;
    if (!dateValue || item[valueField as keyof typeof item] === null) return;

    const date = parseISO(dateValue);
    const groupKey = groupBy === 'week' 
      ? format(startOfWeek(date), 'yyyy-MM-dd')
      : format(startOfMonth(date), 'yyyy-MM-dd');

    const values = timeGroups.get(groupKey) || [];
    values.push(item[valueField as keyof typeof item] as number);
    timeGroups.set(groupKey, values);
  });

  return Array.from(timeGroups.entries())
    .map(([dateStr, values]) => ({
      date: parseISO(dateStr),
      value: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
      metadata: {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values)
      }
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Transform status duration data for Gantt chart
 */
export function transformStatusDataForGantt(data: StatusDurationAnalytics[]): GanttChartData[] {
  const bidGroups = new Map<number, StatusDurationAnalytics[]>();

  // Group by bid_id
  data.forEach(item => {
    const bidData = bidGroups.get(item.bid_id) || [];
    bidData.push(item);
    bidGroups.set(item.bid_id, bidData);
  });

  const ganttData: GanttChartData[] = [];

  bidGroups.forEach((statusHistory, bidId) => {
    const sortedHistory = statusHistory.sort((a, b) => a.status_sequence - b.status_sequence);
    
    sortedHistory.forEach((status, index) => {
      const startDate = index === 0 
        ? parseISO(status.changed_at)
        : parseISO(sortedHistory[index - 1].changed_at);
      
      const endDate = parseISO(status.changed_at);
      const duration = status.duration_hours || 0;

      ganttData.push({
        id: `${bidId}-${status.status_sequence}`,
        name: `${status.bid_title || `Bid ${bidId}`} - ${status.new_status}`,
        startDate,
        endDate,
        duration,
        category: status.new_status,
        color: STATUS_COLORS[status.new_status.toLowerCase() as keyof typeof STATUS_COLORS] || STATUS_COLORS.default
      });
    });
  });

  return ganttData.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

/**
 * Calculate completion rate trends
 */
export function calculateCompletionTrends(data: BidCompletionAnalytics[], periods: number = 6) {
  const now = new Date();
  const trends = [];

  for (let i = periods - 1; i >= 0; i--) {
    const periodStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - i, 1));
    const periodEnd = endOfMonth(periodStart);
    
    const periodData = data.filter(bid => {
      const createdDate = parseISO(bid.created_at);
      return isWithinInterval(createdDate, { start: periodStart, end: periodEnd });
    });

    const completedBids = periodData.filter(bid => bid.completed_at);
    const onTimeBids = completedBids.filter(bid => bid.completion_status === 'On Time');

    trends.push({
      period: format(periodStart, 'MMM yyyy'),
      date: periodStart,
      totalBids: periodData.length,
      completedBids: completedBids.length,
      onTimeBids: onTimeBids.length,
      completionRate: periodData.length > 0 ? (completedBids.length / periodData.length) * 100 : 0,
      onTimeRate: completedBids.length > 0 ? (onTimeBids.length / completedBids.length) * 100 : 0,
      avgCompletionTime: completedBids.length > 0 
        ? completedBids.reduce((sum, bid) => sum + (bid.completion_hours || 0), 0) / completedBids.length
        : 0
    });
  }

  return trends;
}

/**
 * Calculate vendor performance scores
 */
export function calculateVendorPerformanceScores(data: VendorResponseAnalytics[]) {
  const vendorStats = new Map<string, {
    totalRequests: number;
    responses: number;
    totalResponseTime: number;
    onTimeResponses: number;
  }>();

  data.forEach(vendor => {
    const key = `${vendor.vendor_id}-${vendor.company_name}`;
    const current = vendorStats.get(key) || {
      totalRequests: 0,
      responses: 0,
      totalResponseTime: 0,
      onTimeResponses: 0
    };

    current.totalRequests += 1;

    if (vendor.response_status === 'Responded' && vendor.response_hours !== null) {
      current.responses += 1;
      current.totalResponseTime += vendor.response_hours;
      
      // Consider on-time if responded within target hours
      if (vendor.target_response_hours && vendor.response_hours <= vendor.target_response_hours) {
        current.onTimeResponses += 1;
      }
    }

    vendorStats.set(key, current);
  });

  return Array.from(vendorStats.entries())
    .filter(([, stats]) => stats.totalRequests >= 2)
    .map(([key, stats]) => {
      const [vendorId, companyName] = key.split('-');
      const responseRate = (stats.responses / stats.totalRequests) * 100;
      const avgResponseTime = stats.responses > 0 ? stats.totalResponseTime / stats.responses : 0;
      const onTimeRate = stats.responses > 0 ? (stats.onTimeResponses / stats.responses) * 100 : 0;
      
      // Calculate composite performance score (0-100)
      const responseScore = Math.min(responseRate * 1.2, 100); // Weight response rate
      const speedScore = avgResponseTime > 0 ? Math.max(0, 100 - (avgResponseTime / 24) * 20) : 0; // Penalty for slow response
      const reliabilityScore = onTimeRate;
      
      const performanceScore = (responseScore * 0.4 + speedScore * 0.3 + reliabilityScore * 0.3);

      return {
        vendorId: parseInt(vendorId),
        companyName,
        responseRate: Math.round(responseRate * 10) / 10,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        onTimeRate: Math.round(onTimeRate * 10) / 10,
        performanceScore: Math.round(performanceScore * 10) / 10,
        totalRequests: stats.totalRequests,
        totalResponses: stats.responses,
        grade: performanceScore >= 90 ? 'A' : 
               performanceScore >= 80 ? 'B' : 
               performanceScore >= 70 ? 'C' : 
               performanceScore >= 60 ? 'D' : 'F'
      };
    })
    .sort((a, b) => b.performanceScore - a.performanceScore);
}

/**
 * Identify bottlenecks in the bid process
 */
export function identifyBottlenecks(data: StatusDurationAnalytics[]) {
  const statusDurations = new Map<string, number[]>();

  data.forEach(item => {
    if (item.duration_hours !== null) {
      const durations = statusDurations.get(item.new_status) || [];
      durations.push(item.duration_hours);
      statusDurations.set(item.new_status, durations);
    }
  });

  return Array.from(statusDurations.entries())
    .map(([status, durations]) => {
      const stats = calculateStatistics(durations);
      
      return {
        status,
        ...stats,
        isBottleneck: stats.mean > stats.median * 1.5, // Bottleneck if mean is 50% higher than median
        severity: stats.mean > stats.median * 2 ? 'high' : 
                  stats.mean > stats.median * 1.5 ? 'medium' : 'low'
      };
    })
    .sort((a, b) => b.mean - a.mean);
}

/**
 * Generate forecasting data based on trends
 */
export function generateForecast(trends: TimeSeriesDataPoint[], periods: number = 3): TimeSeriesDataPoint[] {
  if (trends.length < 2) return [];

  // Simple linear regression for forecasting
  const n = trends.length;
  const sumX = trends.reduce((sum, _, i) => sum + i, 0);
  const sumY = trends.reduce((sum, point) => sum + point.value, 0);
  const sumXY = trends.reduce((sum, point, i) => sum + (i * point.value), 0);
  const sumX2 = trends.reduce((sum, _, i) => sum + (i * i), 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const forecast: TimeSeriesDataPoint[] = [];
  const lastDate = trends[trends.length - 1].date;

  for (let i = 1; i <= periods; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setMonth(forecastDate.getMonth() + i);
    
    const forecastValue = slope * (n + i - 1) + intercept;
    
    forecast.push({
      date: forecastDate,
      value: Math.max(0, Math.round(forecastValue * 10) / 10), // Ensure non-negative
      category: 'forecast',
      metadata: {
        isForecast: true,
        confidence: Math.max(0.5, 1 - (i * 0.1)) // Decreasing confidence
      }
    });
  }

  return forecast;
}