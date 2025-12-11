import { supabase } from './supabase';
import type {
  BidCompletionAnalytics,
  VendorResponseAnalytics,
  BidTimelineData
} from '../types';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, differenceInHours } from 'date-fns';

class AnalyticsService {
  
  /**
   * Get bid completion analytics data using existing tables
   */
  async getBidCompletionAnalytics(dateRange: { startDate: Date; endDate: Date }): Promise<BidCompletionAnalytics[]> {
    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select(`
          id,
          project_name,
          created_at,
          est_due_date,
          status,
          completed_at,
          updated_at
        `)
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString())
        .not('est_activity_cycle', 'eq', 'Archived');

      if (error) throw error;

      return (projects || []).map(project => {
        // Calculate completion hours
        let completion_hours = null;
        let completion_status: 'On Time' | 'Late' | 'Overdue' | 'In Progress' = 'In Progress';

        if (project.completed_at) {
          const created = parseISO(project.created_at);
          const completed = parseISO(project.completed_at);
          completion_hours = Math.round((differenceInHours(completed, created) * 10)) / 10;
          
          const dueDate = parseISO(project.est_due_date);
          completion_status = completed <= dueDate ? 'On Time' : 'Late';
        } else if (new Date() > parseISO(project.est_due_date)) {
          completion_status = 'Overdue';
        }

        return {
          id: project.id,
          title: project.project_name || 'Untitled',
          project_name: project.project_name,
          completion_hours,
          completion_status,
          created_at: project.created_at,
          due_date: project.est_due_date,
          status: project.status,
          completed_at: project.completed_at
        } as BidCompletionAnalytics;
      });
    } catch (error) {
      console.error('Error fetching bid completion analytics:', error);
      return [];
    }
  }

  /**
   * Get vendor response analytics data using existing tables
   */
  async getVendorResponseAnalytics(dateRange: { startDate: Date; endDate: Date }): Promise<VendorResponseAnalytics[]> {
    try {
      const { data: projectVendors, error } = await supabase
        .from('project_vendors')
        .select(`
          vendor_id,
          created_at,
          est_responses!inner(
            response_received_date
          ),
          vendors!inner(company_name)
        `)
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString());

      if (error) throw error;

      // Group by vendor
      const vendorMap = new Map<number, {
        vendor_id: number;
        company_name: string;
        responses: Array<{ email_sent_date: string; response_received_date: string | null }>;
      }>();

      (projectVendors || []).forEach((pv: any) => {
        if (!vendorMap.has(pv.vendor_id)) {
          vendorMap.set(pv.vendor_id, {
            vendor_id: pv.vendor_id,
            company_name: pv.vendors.company_name,
            responses: []
          });
        }
        vendorMap.get(pv.vendor_id)!.responses.push({
          email_sent_date: pv.created_at, // Use project_vendor creation as email sent
          response_received_date: pv.est_responses?.response_received_date || null
        });
      });

      return Array.from(vendorMap.values()).map(vendor => {
        const responses = vendor.responses;
        const respondedCount = responses.filter(r => r.response_received_date).length;
        
        let response_hours = null;
        let response_status: 'Responded' | 'Overdue' | 'Pending' | 'Not Contacted' = 'Not Contacted';

        if (responses.length > 0) {
          response_status = 'Pending';
          
          if (respondedCount > 0) {
            response_status = 'Responded';
            const totalHours = responses
              .filter(r => r.response_received_date)
              .reduce((acc, r) => {
                const sent = parseISO(r.email_sent_date);
                const responded = parseISO(r.response_received_date!);
                return acc + differenceInHours(responded, sent);
              }, 0);
            response_hours = Math.round((totalHours / respondedCount) * 10) / 10;
          }
        }

        return {
          vendor_id: vendor.vendor_id,
          company_name: vendor.company_name,
          response_hours,
          response_status,
          email_sent_date: responses[0]?.email_sent_date || new Date().toISOString()
        } as VendorResponseAnalytics;
      });
    } catch (error) {
      console.error('Error fetching vendor response analytics:', error);
      return [];
    }
  }

  /**
   * Get average completion time by status using stored function
   */
  async getCompletionTimeByStatus() {
    try {
      const { data, error } = await supabase.rpc('get_avg_completion_time_by_status');

      if (error) {
        console.error('Error calling get_avg_completion_time_by_status:', error);
        // Fallback to manual calculation
        return this.getCompletionTimeByStatusFallback();
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching completion time by status:', error);
      // Fallback to manual calculation
      return this.getCompletionTimeByStatusFallback();
    }
  }

  /**
   * Fallback method to calculate completion time by status manually
   */
  private async getCompletionTimeByStatusFallback() {
    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, status, created_at, completed_at')
        .not('completed_at', 'is', null)
        .not('est_activity_cycle', 'eq', 'Archived');

      if (error) throw error;

      const statusGroups = new Map<string, number[]>();
      
      (projects || []).forEach(project => {
        if (!statusGroups.has(project.status)) {
          statusGroups.set(project.status, []);
        }
        
        const created = parseISO(project.created_at);
        const completed = parseISO(project.completed_at);
        const hours = differenceInHours(completed, created);
        statusGroups.get(project.status)!.push(hours);
      });

      return Array.from(statusGroups.entries()).map(([status, hours]) => ({
        status,
        avg_hours: Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10,
        count: hours.length,
        median_hours: this.calculateMedian(hours)
      }));
    } catch (error) {
      console.error('Error in completion time fallback:', error);
      return [];
    }
  }

  /**
   * Get vendor response metrics using stored function
   */
  async getVendorResponseMetrics() {
    try {
      const { data, error } = await supabase.rpc('get_vendor_response_metrics');

      if (error) {
        console.error('Error calling get_vendor_response_metrics:', error);
        // Fallback to manual calculation
        return this.getVendorResponseMetricsFallback();
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching vendor response metrics:', error);
      // Fallback to manual calculation
      return this.getVendorResponseMetricsFallback();
    }
  }

  /**
   * Fallback method to calculate vendor response metrics manually
   */
  private async getVendorResponseMetricsFallback() {
    try {
      const { data: projectVendors, error } = await supabase
        .from('project_vendors')
        .select(`
          vendor_id,
          created_at,
          est_responses(
            response_received_date
          ),
          vendors!inner(company_name)
        `);

      if (error) throw error;

      const vendorMap = new Map<number, {
        vendor_id: number;
        vendor_name: string;
        total_requests: number;
        responses: number;
        response_times: number[];
      }>();

      (projectVendors || []).forEach((pv: any) => {
        if (!vendorMap.has(pv.vendor_id)) {
          vendorMap.set(pv.vendor_id, {
            vendor_id: pv.vendor_id,
            vendor_name: pv.vendors.company_name,
            total_requests: 0,
            responses: 0,
            response_times: []
          });
        }

        const vendor = vendorMap.get(pv.vendor_id)!;
        vendor.total_requests++;

        if (pv.est_responses?.response_received_date) {
          vendor.responses++;
          const sent = parseISO(pv.created_at);
          const responded = parseISO(pv.est_responses.response_received_date);
          vendor.response_times.push(differenceInHours(responded, sent));
        }
      });

      return Array.from(vendorMap.values()).map(vendor => ({
        vendor_id: vendor.vendor_id,
        vendor_name: vendor.vendor_name,
        total_requests: vendor.total_requests,
        responses: vendor.responses,
        response_rate: Math.round((vendor.responses / vendor.total_requests) * 100),
        avg_response_hours: vendor.response_times.length > 0 
          ? Math.round((vendor.response_times.reduce((a, b) => a + b, 0) / vendor.response_times.length) * 10) / 10
          : null,
        median_response_hours: vendor.response_times.length > 0 
          ? this.calculateMedian(vendor.response_times)
          : null
      }));
    } catch (error) {
      console.error('Error in vendor response metrics fallback:', error);
      return [];
    }
  }

  /**
   * Get bid timeline data for Gantt chart
   */
  async getBidTimelineData(bidId: number): Promise<BidTimelineData[]> {
    try {
      const { data, error } = await supabase.rpc('get_bid_timeline_data', {
        bid_id_param: bidId
      });

      if (error) {
        console.error('Error calling get_bid_timeline_data:', error);
        // Fallback to bid_status_history table
        return this.getBidTimelineDataFallback(bidId);
      }
      return data || [];
    } catch (error) {
      console.error('Error fetching bid timeline data:', error);
      return this.getBidTimelineDataFallback(bidId);
    }
  }

  /**
   * Fallback method to get timeline data from bid_status_history
   */
  private async getBidTimelineDataFallback(bidId: number): Promise<BidTimelineData[]> {
    try {
      const { data: history, error } = await supabase
        .from('bid_status_history')
        .select(`
          id,
          bid_id,
          previous_status,
          new_status,
          changed_at,
          duration_in_previous_status
        `)
        .eq('bid_id', bidId)
        .order('changed_at', { ascending: true });

      if (error) throw error;

      return (history || []).map((item, index) => {
        const startDate = index === 0 
          ? parseISO(item.changed_at) 
          : parseISO(history[index - 1].changed_at);
        
        const endDate = parseISO(item.changed_at);
        const durationHours = differenceInHours(endDate, startDate);

        return {
          bid_id: item.bid_id,
          status_name: item.new_status,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          duration_hours: Math.round(durationHours * 10) / 10,
          sequence_order: index + 1
        } as BidTimelineData;
      });
    } catch (error) {
      console.error('Error in timeline data fallback:', error);
      return [];
    }
  }

  /**
   * Get analytics summary for dashboard KPIs
   */
  async getAnalyticsSummary(dateRange: { startDate: Date; endDate: Date }) {
    try {
      const [completionData, vendorResponseData] = await Promise.all([
        this.getBidCompletionAnalytics(dateRange),
        this.getVendorResponseAnalytics(dateRange)
      ]);

      // Calculate summary metrics
      const completedBids = completionData.filter(b => b.completed_at);
      const onTimeBids = completedBids.filter(b => b.completion_status === 'On Time');
      const overdueBids = completionData.filter(b => b.completion_status === 'Overdue');

      const avgCompletionTime = completedBids.length > 0 
        ? completedBids.reduce((sum, bid) => sum + (bid.completion_hours || 0), 0) / completedBids.length
        : 0;

      const onTimeRate = completedBids.length > 0 
        ? (onTimeBids.length / completedBids.length) * 100
        : 0;

      const respondedVendors = vendorResponseData.filter(v => v.response_status === 'Responded');
      const avgResponseTime = respondedVendors.length > 0
        ? respondedVendors.reduce((sum, vendor) => sum + (vendor.response_hours || 0), 0) / respondedVendors.length
        : 0;

      const vendorResponseRate = vendorResponseData.length > 0
        ? (respondedVendors.length / vendorResponseData.length) * 100
        : 0;

      return {
        summary: {
          totalBids: completionData.length,
          avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
          onTimeRate: Math.round(onTimeRate),
          vendorResponseRate: Math.round(vendorResponseRate),
          avgResponseTime: Math.round(avgResponseTime * 10) / 10,
          overdueBids: overdueBids.length,
          totalVendorRequests: vendorResponseData.length,
          completedBids: completedBids.length
        },
        completionData,
        vendorResponseData
      };
    } catch (error) {
      console.error('Error fetching analytics summary:', error);
      throw error;
    }
  }

  /**
   * Get trending data for charts (month-over-month)
   */
  async getTrendingData(months: number = 6) {
    try {
      const endDate = endOfMonth(new Date());
      const monthlyData = [];
      
      for (let i = 0; i < months; i++) {
        const monthStart = startOfMonth(subMonths(endDate, months - 1 - i));
        const monthEnd = endOfMonth(subMonths(endDate, months - 1 - i));
        
        const [completionData, vendorData] = await Promise.all([
          this.getBidCompletionAnalytics({ startDate: monthStart, endDate: monthEnd }),
          this.getVendorResponseAnalytics({ startDate: monthStart, endDate: monthEnd })
        ]);

        const completedBids = completionData.filter(bid => bid.completed_at);
        const respondedVendors = vendorData.filter(vendor => vendor.response_status === 'Responded');

        monthlyData.push({
          month: format(monthStart, 'MMM yyyy'),
          date: monthStart,
          avgCompletionTime: completedBids.length > 0 
            ? Math.round((completedBids.reduce((sum, bid) => sum + (bid.completion_hours || 0), 0) / completedBids.length) * 10) / 10
            : 0,
          avgResponseTime: respondedVendors.length > 0
            ? Math.round((respondedVendors.reduce((sum, vendor) => sum + (vendor.response_hours || 0), 0) / respondedVendors.length) * 10) / 10
            : 0,
          completedBids: completedBids.length,
          vendorResponses: respondedVendors.length
        });
      }

      return monthlyData;
    } catch (error) {
      console.error('Error fetching trending data:', error);
      return [];
    }
  }

  /**
   * Get active bids status data for pie chart
   */
  async getActiveBidsStatusData(): Promise<{ status: string; count: number; percentage: number }[]> {
    try {
      // Fetch active projects 
      const { data: projects, error } = await supabase
        .from('projects')
        .select('status')
        .eq('est_activity_cycle', 'Active');

      if (error) throw error;

      // Count projects by status
      const statusCounts = new Map<string, number>();
      const totalProjects = projects?.length || 0;

      (projects || []).forEach((project: any) => {
        const status = project.status;
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
      });

      // Convert to array with percentages
      return Array.from(statusCounts.entries()).map(([status, count]) => ({
        status,
        count,
        percentage: totalProjects > 0 ? Math.round((count / totalProjects) * 100) : 0
      }));
    } catch (error) {
      console.error('Error fetching active bids status data:', error);
      return [];
    }
  }

  /**
   * Utility function to calculate median
   */
  private calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 
      ? sorted[mid] 
      : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;