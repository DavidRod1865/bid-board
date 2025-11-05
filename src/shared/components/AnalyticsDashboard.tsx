import React, { useState, useEffect } from "react";
import {
  ChartBarIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  CalendarIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import BidCompletionChart from "./BidCompletionChart";
import VendorResponseChart from "./VendorResponseChart";
import TimelineChart from "./TimelineChart";
import TrendChart from "./TrendChart";
import { analyticsService } from "../services/analyticsService";
import { calculateVendorPerformanceScores } from "../utils/analyticsCalculations";
import type {
  VendorResponseAnalytics,
  BidTimelineData,
  AnalyticsFilters,
} from "../types";
import { useToast } from "../hooks/useToast";
import { BRAND_COLORS } from "../utils/constants";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";

const AnalyticsDashboard: React.FC = () => {
  const { showError } = useToast();

  // Data states
  const [activeBidsData, setActiveBidsData] = useState<
    { status: string; count: number; percentage: number }[]
  >([]);
  const [vendorData, setVendorData] = useState<VendorResponseAnalytics[]>([]);
  const [timelineData, setTimelineData] = useState<BidTimelineData[]>([]);
  const [summary, setSummary] = useState<{
    totalBids: number;
    avgCompletionTime: number;
    onTimeRate: number;
    vendorResponseRate: number;
    avgResponseTime: number;
    overdueBids?: number;
    totalVendorRequests?: number;
    completedBids?: number;
  } | null>(null);
  const [trendingData, setTrendingData] = useState<
    {
      date: Date;
      avgCompletionTime: number;
      avgResponseTime: number;
      completedBids: number;
      vendorResponses: number;
      month: string;
    }[]
  >([]);

  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "completion" | "vendors" | "timeline" | "trends"
  >("overview");
  const [filters] = useState<AnalyticsFilters>({
    dateRange: {
      startDate: startOfMonth(subMonths(new Date(), 3)),
      endDate: endOfMonth(new Date()),
    },
    statuses: [],
    vendors: [],
    completionStatus: [],
  });

  // Load analytics data
  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const [summaryData, trending, activeBids] = await Promise.all([
        analyticsService.getAnalyticsSummary({
          startDate: filters.dateRange.startDate!,
          endDate: filters.dateRange.endDate!,
        }),
        analyticsService.getTrendingData(6),
        analyticsService.getActiveBidsStatusData(),
      ]);

      setSummary(summaryData.summary);
      setVendorData(summaryData.vendorResponseData);
      setTrendingData(trending);
      setActiveBidsData(activeBids);

      // Load timeline data for first few bids
      if (summaryData.completionData.length > 0) {
        const bidId = summaryData.completionData[0].id;
        const timeline = await analyticsService.getBidTimelineData(bidId);
        setTimelineData(timeline);
      }
    } catch (error) {
      console.error("Error loading analytics data:", error);
      showError("Analytics Error", "Failed to load analytics data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [filters]);

  // Calculate derived data
  const vendorScores = calculateVendorPerformanceScores(vendorData);

  // KPI Cards Component
  const KPICard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ComponentType<{ className?: string }>;
    trend?: number;
    color?: string;
  }> = ({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    color = BRAND_COLORS.primary,
  }) => (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex flex-col items-end">
          <div className="h-8 w-8" style={{ color }}>
            <Icon className="h-8 w-8" />
          </div>
          {trend !== undefined && (
            <div
              className={`text-sm font-medium ${
                trend >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {trend > 0 ? "+" : ""}
              {trend.toFixed(1)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Tab Navigation
  const tabs = [
    { id: "overview", label: "Overview", icon: ChartBarIcon },
    { id: "completion", label: "Completion Times", icon: ClockIcon },
    { id: "vendors", label: "Vendor Performance", icon: UserGroupIcon },
    { id: "timeline", label: "Timeline Analysis", icon: CalendarIcon },
    { id: "trends", label: "Trends", icon: ArrowTrendingUpIcon },
  ] as const;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        <span className="ml-3 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-end">
        <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
          <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2" />
          Filters
        </button>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Bids"
            value={summary.totalBids}
            subtitle="In selected period"
            icon={ChartBarIcon}
            color={BRAND_COLORS.primary}
          />
          <KPICard
            title="Avg Completion Time"
            value={`${summary.avgCompletionTime}h`}
            subtitle="Hours to complete"
            icon={ClockIcon}
            color="#3B82F6"
          />
          <KPICard
            title="On-Time Rate"
            value={`${summary.onTimeRate}%`}
            subtitle="Completed on schedule"
            icon={ArrowTrendingUpIcon}
            color="#10B981"
          />
          <KPICard
            title="Vendor Response Rate"
            value={`${summary.vendorResponseRate}%`}
            subtitle={`Avg: ${summary.avgResponseTime}h`}
            icon={UserGroupIcon}
            color="#8B5CF6"
          />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? "border-yellow-500 text-yellow-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <BidCompletionChart
                  data={activeBidsData}
                  width={500}
                  height={300}
                  title="Active Bids"
                />
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <VendorResponseChart
                  data={vendorData}
                  width={500}
                  height={300}
                  title="Top Vendor Response Times"
                  showResponseRate={true}
                />
              </div>
            </div>

            {/* Performance Summary */}
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Performance Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Top Performing Vendors
                  </h4>
                  <div className="space-y-2">
                    {vendorScores.slice(0, 3).map((vendor) => (
                      <div
                        key={vendor.vendorId}
                        className="flex justify-between items-center"
                      >
                        <span className="text-sm text-gray-600">
                          {vendor.companyName}
                        </span>
                        <span
                          className={`text-sm font-medium px-2 py-1 rounded ${
                            vendor.grade === "A"
                              ? "bg-green-100 text-green-800"
                              : vendor.grade === "B"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {vendor.grade}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Recent Trends
                  </h4>
                  <div className="space-y-2">
                    {trendingData.slice(-3).map((trend, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center"
                      >
                        <span className="text-sm text-gray-600">
                          {trend.month}
                        </span>
                        <span className="text-sm font-medium">
                          {trend.completedBids} completed
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Quick Stats
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Overdue Bids
                      </span>
                      <span className="text-sm font-medium text-red-600">
                        {summary?.overdueBids || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Vendor Requests
                      </span>
                      <span className="text-sm font-medium">
                        {summary?.totalVendorRequests || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Completed This Month
                      </span>
                      <span className="text-sm font-medium">
                        {summary?.completedBids || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "completion" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <BidCompletionChart
                data={activeBidsData}
                width={800}
                height={400}
                title="Complete Bids"
              />
            </div>
          </div>
        )}

        {activeTab === "vendors" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <VendorResponseChart
                data={vendorData}
                width={800}
                height={400}
                title="Comprehensive Vendor Analysis"
                showResponseRate={true}
              />
            </div>

            {/* Vendor Performance Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Vendor Performance Scores
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Response Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Response Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Performance Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Grade
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vendorScores.slice(0, 10).map((vendor) => (
                      <tr key={vendor.vendorId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {vendor.companyName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vendor.responseRate}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vendor.avgResponseTime}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vendor.performanceScore}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              vendor.grade === "A"
                                ? "bg-green-100 text-green-800"
                                : vendor.grade === "B"
                                ? "bg-blue-100 text-blue-800"
                                : vendor.grade === "C"
                                ? "bg-yellow-100 text-yellow-800"
                                : vendor.grade === "D"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {vendor.grade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "timeline" && timelineData.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <TimelineChart
              data={timelineData}
              width={900}
              height={500}
              title="Bid Process Timeline Analysis"
            />
          </div>
        )}

        {activeTab === "trends" && (
          <div className="space-y-6">
            {trendingData.length > 0 && (
              <>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <TrendChart
                    data={trendingData.map((d) => ({
                      date: d.date,
                      value: d.avgCompletionTime,
                      metadata: { count: d.completedBids },
                    }))}
                    width={800}
                    height={300}
                    title="Average Completion Time Trend"
                    yAxisLabel="Hours"
                    showForecast={true}
                  />
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <TrendChart
                    data={trendingData.map((d) => ({
                      date: d.date,
                      value: d.avgResponseTime,
                      metadata: { count: d.vendorResponses },
                    }))}
                    width={800}
                    height={300}
                    title="Vendor Response Time Trend"
                    yAxisLabel="Hours"
                    showForecast={true}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
