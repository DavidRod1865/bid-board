import type { Bid, BidVendor, Vendor, ProjectNote } from '../types';
import { supabase } from './supabase';
import { formatDate } from '../utils/formatters';

interface ActiveProjectReportData {
  project: Bid;
  vendors: Vendor[];
  mostRecentNote: string;
  equipmentRequestInfo: {
    vendorName: string;
    equipmentRequestedDate: string | null;
    equipmentReleasedDate: string | null;
    equipmentReleaseNotes: string;
  }[];
}

interface ActiveProjectReportSummary {
  projectsWithin60Days: ActiveProjectReportData[];
  totalProjects: number;
  totalVendors: number;
}

/**
 * Service for generating active project reports based on start dates
 */
export class ActiveProjectReportService {
  
  /**
   * Get active projects with start dates within 60 days from now
   */
  static async getActiveProjectsReport(): Promise<ActiveProjectReportSummary> {
    try {
      const today = new Date();
      const sixtyDaysFromNow = new Date(today);
      sixtyDaysFromNow.setDate(today.getDate() + 60);
      
      // Format dates for PostgreSQL
      const todayFormatted = today.toISOString().split('T')[0];
      const sixtyDaysFormatted = sixtyDaysFromNow.toISOString().split('T')[0];
      
      // Query active projects with start dates within 60 days
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('sent_to_apm', true)
        .eq('apm_activity_cycle', 'Active')
        .not('project_start_date', 'is', null)
        .gte('project_start_date', todayFormatted)
        .lte('project_start_date', sixtyDaysFormatted)
        .order('project_start_date', { ascending: true });

      if (projectsError) {
        throw new Error(`Failed to fetch projects: ${projectsError.message}`);
      }

      if (!projects || projects.length === 0) {
        return {
          projectsWithin60Days: [],
          totalProjects: 0,
          totalVendors: 0
        };
      }

      // Get project IDs for related queries
      const projectIds = projects.map(p => p.id);

      // Get project vendors for these projects
      const { data: projectVendors, error: projectVendorsError } = await supabase
        .from('project_vendors')
        .select('*')
        .in('project_id', projectIds);

      if (projectVendorsError) {
        throw new Error(`Failed to fetch project vendors: ${projectVendorsError.message}`);
      }

      // Get vendor IDs and fetch vendor details
      const vendorIds = [...new Set(projectVendors?.map((pv: any) => pv.vendor_id) || [])];
      
      const { data: vendors, error: vendorsError } = await supabase
        .from('vendors')
        .select('*')
        .in('id', vendorIds);

      if (vendorsError) {
        throw new Error(`Failed to fetch vendors: ${vendorsError.message}`);
      }

      // Get project notes
      const { data: projectNotes, error: notesError } = await supabase
        .from('project_notes')
        .select(`
          *,
          user:users(name, color_preference)
        `)
        .in('bid_id', projectIds)
        .order('created_at', { ascending: false });

      if (notesError) {
        throw new Error(`Failed to fetch project notes: ${notesError.message}`);
      }

      // Process the data (already sorted by project_start_date)
      const processedData = await this.processProjectData(
        projects,
        projectVendors || [],
        vendors || [],
        projectNotes || []
      );

      // Calculate totals
      const totalVendors = new Set(
        processedData.flatMap(p => p.vendors.map(v => v.id))
      ).size;

      return {
        projectsWithin60Days: processedData,
        totalProjects: processedData.length,
        totalVendors
      };

    } catch (error) {
      console.error('Error generating active project report:', error);
      throw error;
    }
  }

  /**
   * Process raw data into structured report format
   */
  private static async processProjectData(
    projects: Bid[],
    projectVendors: any[],
    vendors: Vendor[],
    projectNotes: ProjectNote[]
  ): Promise<ActiveProjectReportData[]> {
    
    return projects.map(project => {
      // Get vendors for this project
      const projectBidVendors = projectVendors.filter((pv: any) => pv.project_id === project.id);
      const projectVendorsList = projectBidVendors
        .map((pv: any) => vendors.find(v => v.id === pv.vendor_id))
        .filter(v => v !== undefined) as Vendor[];

      // Get most recent project note
      const projectSpecificNotes = projectNotes.filter(note => note.bid_id === project.id);
      const mostRecentNote = this.getMostRecentNote(projectSpecificNotes);

      // Get equipment request information for each vendor
      const equipmentRequestInfo = projectBidVendors.map((pv: any) => {
        const vendor = vendors.find(v => v.id === pv.vendor_id);
        return {
          vendorName: vendor?.company_name || 'Unknown Vendor',
          equipmentRequestedDate: null, // Legacy field not in normalized structure
          equipmentReleasedDate: null, // Legacy field not in normalized structure  
          equipmentReleaseNotes: '' // Legacy field not in normalized structure
        };
      });

      return {
        project,
        vendors: projectVendorsList,
        mostRecentNote,
        equipmentRequestInfo
      };
    });
  }

  /**
   * Get the most recent project note with formatting
   */
  private static getMostRecentNote(projectNotes: ProjectNote[]): string {
    if (projectNotes.length === 0) {
      return 'No notes available';
    }

    // Sort by created_at in descending order to get the most recent
    const sortedNotes = projectNotes.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const mostRecent = sortedNotes[0];
    const noteDate = formatDate(mostRecent.created_at);
    const noteAuthor = mostRecent.user?.name || 'Unknown';

    return `[${noteDate} - ${noteAuthor}] ${mostRecent.content}`;
  }

  /**
   * Get projects by specific date range (used for testing)
   */
  static async getProjectsByDateRange(startDate: Date, endDate: Date): Promise<Bid[]> {
    const startFormatted = startDate.toISOString().split('T')[0];
    const endFormatted = endDate.toISOString().split('T')[0];

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('sent_to_apm', true)
      .eq('apm_activity_cycle', 'Active')
      .not('project_start_date', 'is', null)
      .gte('project_start_date', startFormatted)
      .lte('project_start_date', endFormatted)
      .order('project_start_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch projects by date range: ${error.message}`);
    }

    return projects || [];
  }

  /**
   * Get summary statistics for reporting
   */
  static async getReportSummary(): Promise<{
    totalActiveProjects: number;
    projectsWithStartDates: number;
    projectsIn30Days: number;
    projectsIn60Days: number;
  }> {
    try {
      const today = new Date();
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      const sixtyDaysFromNow = new Date(today);
      sixtyDaysFromNow.setDate(today.getDate() + 60);
      
      const thirtyDaysFormatted = thirtyDaysFromNow.toISOString().split('T')[0];
      const sixtyDaysFormatted = sixtyDaysFromNow.toISOString().split('T')[0];

      // Get total active APM projects
      const { count: totalActive } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('sent_to_apm', true)
        .eq('apm_activity_cycle', 'Active');

      // Get projects with start dates
      const { count: withStartDates } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('sent_to_apm', true)
        .eq('apm_activity_cycle', 'Active')
        .not('project_start_date', 'is', null);

      // Get projects in 30 days
      const { count: in30Days } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('sent_to_apm', true)
        .eq('apm_activity_cycle', 'Active')
        .eq('project_start_date', thirtyDaysFormatted);

      // Get projects in 60 days
      const { count: in60Days } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('sent_to_apm', true)
        .eq('apm_activity_cycle', 'Active')
        .eq('project_start_date', sixtyDaysFormatted);

      return {
        totalActiveProjects: totalActive || 0,
        projectsWithStartDates: withStartDates || 0,
        projectsIn30Days: in30Days || 0,
        projectsIn60Days: in60Days || 0
      };

    } catch (error) {
      console.error('Error getting report summary:', error);
      throw error;
    }
  }
}

export default ActiveProjectReportService;