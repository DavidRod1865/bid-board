export interface ResponseData {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export interface TrendData {
  month: string;
  responseRate: number;
  totalBids: number;
  responsesReceived: number;
  date: Date;
}

export interface VendorData {
  id: number;
  name: string;
  responseRate: number;
  totalBids: number;
  avgResponseTime: number;
  reliabilityScore: number;
  positiveResponses: number;
  responses: number;
}

export interface TimeDistributionData {
  range: string;
  count: number;
  percentage: number;
}

export interface AnalyticsFilters {
  filterType: 'quick' | 'month' | 'custom';
  timeframe: '30days' | '90days' | '12months' | 'all';
  selectedMonth?: string; // Format: "2024-01" for January 2024
  startDate?: string;     // Format: "2024-01-15" 
  endDate?: string;       // Format: "2024-02-15"
  costRange: 'all' | 'under10k' | '10k-50k' | '50k-100k' | 'over100k';
  vendorType: 'all' | 'top-performers' | 'frequent' | 'new';
}

export interface KPIData {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  urgent?: boolean;
}

export interface AnalyticsDashboardData {
  responseDistribution: ResponseData[];
  trendData: TrendData[];
  vendorData: VendorData[];
  timeDistribution: TimeDistributionData[];
  kpis: KPIData[];
}