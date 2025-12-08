import * as XLSX from 'xlsx-js-style';
import type { Bid, User, Vendor, BidVendor, ProjectNote } from '../types';
import { formatDate } from './formatters';
import { getFollowUpUrgency } from './phaseFollowUpUtils';

// Excel styling utility functions
const ExcelStyles = {
  // Header row styling
  headerStyle: {
    font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Arial', sz: 11 },
    fill: { fgColor: { rgb: '366092' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    }
  },
  
  // Project header styling (first vendor row for each project)
  projectHeaderStyle: {
    font: { bold: true, name: 'Arial', sz: 10, color: { rgb: '1F4E79' } },
    fill: { fgColor: { rgb: 'E2EFDA' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'medium', color: { rgb: '70AD47' } },
      bottom: { style: 'thin', color: { rgb: '70AD47' } },
      left: { style: 'thin', color: { rgb: '70AD47' } },
      right: { style: 'thin', color: { rgb: '70AD47' } }
    }
  },
  
  // Vendor row styling (subsequent vendor rows)
  vendorRowStyle: {
    font: { name: 'Arial', sz: 10 },
    fill: { fgColor: { rgb: 'F8F9FA' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'E0E0E0' } },
      bottom: { style: 'thin', color: { rgb: 'E0E0E0' } },
      left: { style: 'thin', color: { rgb: 'E0E0E0' } },
      right: { style: 'thin', color: { rgb: 'E0E0E0' } }
    }
  },
  
  // Date column styling
  dateStyle: {
    font: { name: 'Arial', sz: 10 },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E0E0E0' } },
      bottom: { style: 'thin', color: { rgb: 'E0E0E0' } },
      left: { style: 'thin', color: { rgb: 'E0E0E0' } },
      right: { style: 'thin', color: { rgb: 'E0E0E0' } }
    }
  },
  
  // Status-based styling
  statusStyles: {
    released: {
      font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Arial', sz: 10 },
      fill: { fgColor: { rgb: '70AD47' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      }
    },
    pending: {
      font: { bold: true, color: { rgb: '000000' }, name: 'Arial', sz: 10 },
      fill: { fgColor: { rgb: 'FFC000' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      }
    },
    noRequest: {
      font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Arial', sz: 10 },
      fill: { fgColor: { rgb: 'C5504B' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      }
    }
  }
};

// Helper function to get status style
const getStatusStyle = (status: string) => {
  if (status.toLowerCase().includes('released')) {
    return ExcelStyles.statusStyles.released;
  } else if (status.toLowerCase().includes('pending') || status.toLowerCase().includes('requested')) {
    return ExcelStyles.statusStyles.pending;
  } else {
    return ExcelStyles.statusStyles.noRequest;
  }
};

// Helper function to apply style to a cell
const setCellStyle = (worksheet: any, cellRef: string, style: any, value: any) => {
  if (!worksheet[cellRef]) {
    worksheet[cellRef] = {};
  }
  worksheet[cellRef].v = value;
  worksheet[cellRef].t = typeof value === 'number' ? 'n' : 's';
  worksheet[cellRef].s = style;
};

// Helper function to get the most recent project note for a project
const getMostRecentNote = (projectId: number, projectNotes: ProjectNote[]): string => {
  const projectSpecificNotes = projectNotes.filter(note => note.bid_id === projectId);
  
  if (projectSpecificNotes.length === 0) {
    return 'No notes';
  }
  
  // Sort by created_at in descending order to get the most recent
  const sortedNotes = projectSpecificNotes.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  const mostRecent = sortedNotes[0];
  const noteDate = formatDate(mostRecent.created_at);
  const noteAuthor = mostRecent.user?.name || 'Unknown';
  
  return `[${noteDate} - ${noteAuthor}] ${mostRecent.content}`;
};

// Helper function to get phase follow-up date
const getPhaseFollowUpDate = (bidVendor: BidVendor, phaseName: string): string | null => {
  switch (phaseName) {
    case 'buy_number':
      return bidVendor.buy_number_follow_up_date;
    case 'po':
      return bidVendor.po_follow_up_date;
    case 'submittals':
      return bidVendor.submittals_follow_up_date;
    case 'revised_plans':
      return bidVendor.revised_plans_follow_up_date;
    case 'equipment_release':
      return bidVendor.equipment_release_follow_up_date;
    case 'closeouts':
      return bidVendor.closeout_follow_up_date;
    default:
      return null;
  }
};

// Helper function to get phase notes
const getPhaseNotes = (bidVendor: BidVendor, phaseName: string): string | null => {
  switch (phaseName) {
    case 'buy_number':
      return bidVendor.buy_number_notes;
    case 'po':
      return bidVendor.po_notes;
    case 'submittals':
      return bidVendor.submittals_notes;
    case 'revised_plans':
      return bidVendor.revised_plans_notes;
    case 'equipment_release':
      return bidVendor.equipment_release_notes;
    case 'closeouts':
      return bidVendor.closeout_notes;
    default:
      return null;
  }
};

// Helper function to check if phase is completed
const hasPhaseBeenCompleted = (bidVendor: BidVendor, phaseName: string): boolean => {
  switch (phaseName) {
    case 'buy_number':
      return !!bidVendor.buy_number_received_date;
    case 'po':
      return !!bidVendor.po_received_date;
    case 'submittals':
      return !!bidVendor.submittals_received_date;
    case 'revised_plans':
      return !!bidVendor.revised_plans_confirmed_date;
    case 'equipment_release':
      return !!bidVendor.equipment_released_date;
    case 'closeouts':
      return !!bidVendor.closeout_received_date;
    default:
      return false;
  }
};

// Interface for individual APM tasks
interface APMTask {
  id: string;
  project: Bid;
  vendor: Vendor;
  bidVendor: BidVendor;
  assignedUser: User | null;
  phase: {
    name: string;
    displayName: string;
    followUpDate: string;
    notes: string | null;
  };
  urgency: ReturnType<typeof getFollowUpUrgency>;
}

/**
 * Export Estimating Active Projects to Excel
 */
export const exportEstimatingProjectsToExcel = (
  projects: Bid[],
  projectNotes: ProjectNote[] = [],
  filename?: string
): void => {
  // Prepare data for Excel - Estimating focused columns
  const excelData = projects.map(project => ({
    'Project Name': project.project_name || project.title,
    'Project Address': project.project_address || 'Not provided',
    'General Contractor': project.general_contractor || 'Not specified',
    'Due Date': formatDate(project.due_date),
    'Status': project.status,
    'Priority': project.priority ? 'High Priority' : 'Standard',
    'Estimated Value': project.estimated_value ? 
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(project.estimated_value) : 
      '$0.00',
    'GC System': project.gc_system || 'N/A',
    'Project Email': project.project_email || 'Not provided',
    'Assigned To': project.assign_to || 'Unassigned',
    'Project Description': project.project_description || '',
    'Most Recent Note': getMostRecentNote(project.id, projectNotes),
    'Notes': project.notes || '',
    'Created By': project.created_by || 'Unknown',
    'File Location': project.file_location || 'Not specified'
  }));

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Set column widths for better readability
  const colWidths = [
    { wch: 25 }, // Project Name
    { wch: 30 }, // Project Address
    { wch: 20 }, // General Contractor
    { wch: 12 }, // Due Date
    { wch: 15 }, // Status
    { wch: 12 }, // Priority
    { wch: 15 }, // Estimated Value
    { wch: 12 }, // GC System
    { wch: 25 }, // Project Email
    { wch: 15 }, // Assigned To
    { wch: 40 }, // Project Description
    { wch: 50 }, // Most Recent Note
    { wch: 30 }, // Notes
    { wch: 15 }, // Created By
    { wch: 25 }  // File Location
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Estimating Projects');

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '').replace('T', '_');
  const finalFilename = filename || `Estimating_Projects_${timestamp}.xlsx`;

  // Save file
  XLSX.writeFile(wb, finalFilename);
};

/**
 * Export APM Active Projects to Excel
 */
export const exportAPMProjectsToExcel = (
  projects: Bid[],
  projectNotes: ProjectNote[] = [],
  filename?: string
): void => {
  // Prepare data for Excel - APM focused columns
  const excelData = projects.map(project => ({
    'Project Name': project.project_name || project.title,
    'Project Address': project.project_address || 'Not provided',
    'General Contractor': project.general_contractor || 'Not specified',
    'Project Start Date': project.project_start_date ? formatDate(project.project_start_date) : 'Not set',
    'Due Date': formatDate(project.due_date),
    'Status': project.status,
    'Priority': project.priority ? 'High Priority' : 'Standard',
    'Estimated Value': project.estimated_value ? 
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(project.estimated_value) : 
      '$0.00',
    'APM Hold Status': project.apm_on_hold ? 'On Hold' : 'Active',
    'APM Hold Date': project.apm_on_hold_at ? formatDate(project.apm_on_hold_at) : '',
    'Sent to APM Date': project.sent_to_apm_at ? formatDate(project.sent_to_apm_at) : '',
    'Made by APM': project.made_by_apm ? 'Yes' : 'No',
    'GC System': project.gc_system || 'N/A',
    'Added to Procore': project.added_to_procore ? 'Yes' : 'No',
    'Project Description': project.project_description || '',
    'Most Recent Note': getMostRecentNote(project.id, projectNotes),
    'Notes': project.notes || ''
  }));

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Set column widths for better readability
  const colWidths = [
    { wch: 25 }, // Project Name
    { wch: 30 }, // Project Address
    { wch: 20 }, // General Contractor
    { wch: 15 }, // Project Start Date
    { wch: 12 }, // Due Date
    { wch: 15 }, // Status
    { wch: 12 }, // Priority
    { wch: 15 }, // Estimated Value
    { wch: 15 }, // APM Hold Status
    { wch: 15 }, // APM Hold Date
    { wch: 15 }, // Sent to APM Date
    { wch: 12 }, // Made by APM
    { wch: 12 }, // GC System
    { wch: 15 }, // Added to Procore
    { wch: 40 }, // Project Description
    { wch: 50 }, // Most Recent Note
    { wch: 30 }  // Notes
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'APM Projects');

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '').replace('T', '_');
  const finalFilename = filename || `APM_Projects_${timestamp}.xlsx`;

  // Save file
  XLSX.writeFile(wb, finalFilename);
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use exportEstimatingProjectsToExcel or exportAPMProjectsToExcel instead
 */
export const exportActiveProjectsToExcel = exportEstimatingProjectsToExcel;

/**
 * Export APM Tasks to Excel
 */
export const exportAPMTasksToExcel = (
  tasks: APMTask[],
  filename?: string
): void => {
  // Prepare data for Excel
  const excelData = tasks.map(task => {
    const urgencyText = task.urgency.level === 'overdue' ? 
      `Overdue by ${Math.abs(task.urgency.businessDaysRemaining)} days` :
      task.urgency.level === 'due_today' ? 
      'Due Today' :
      task.urgency.level === 'critical' ? 
      `Due in ${task.urgency.businessDaysRemaining} days` :
      `Due in ${task.urgency.businessDaysRemaining} days`;

    return {
      'Project Name': task.project.project_name || task.project.title,
      'Project Address': task.project.project_address || 'Not provided',
      'General Contractor': task.project.general_contractor || 'Not specified',
      'Vendor': task.vendor.company_name,
      'Vendor Contact': task.vendor.contact_person || 'Not provided',
      'Vendor Phone': task.vendor.phone || 'Not provided',
      'Vendor Email': task.vendor.email || 'Not provided',
      'Buyout Phase': task.phase.displayName,
      'Follow-Up Date': formatDate(task.phase.followUpDate),
      'Urgency': urgencyText,
      'Status': task.urgency.level === 'overdue' ? 'Overdue' : 
               task.urgency.level === 'due_today' ? 'Due Today' :
               task.urgency.level === 'critical' ? 'Critical' : 'Normal',
      'Assigned To': task.assignedUser?.name || 'Unassigned',
      'Phase Notes': task.phase.notes || '',
      'Project Due Date': formatDate(task.project.due_date),
      'Project Status': task.project.status,
      'Final Quote Amount': task.bidVendor.final_quote_amount ? 
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(task.bidVendor.final_quote_amount)) :
        'Not provided'
    };
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Set column widths for better readability
  const colWidths = [
    { wch: 25 }, // Project Name
    { wch: 30 }, // Project Address
    { wch: 20 }, // General Contractor
    { wch: 20 }, // Vendor
    { wch: 20 }, // Vendor Contact
    { wch: 15 }, // Vendor Phone
    { wch: 25 }, // Vendor Email
    { wch: 15 }, // Buyout Phase
    { wch: 15 }, // Follow-Up Date
    { wch: 20 }, // Urgency
    { wch: 12 }, // Status
    { wch: 15 }, // Assigned To
    { wch: 30 }, // Phase Notes
    { wch: 15 }, // Project Due Date
    { wch: 15 }, // Project Status
    { wch: 15 }  // Final Quote Amount
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'APM Tasks');

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '').replace('T', '_');
  const finalFilename = filename || `APM_Tasks_${timestamp}.xlsx`;

  // Save file
  XLSX.writeFile(wb, finalFilename);
};

/**
 * Export Combined Active Projects and Tasks to Excel (Multi-sheet workbook)
 */
export const exportCombinedToExcel = (
  projects: Bid[],
  tasks: APMTask[],
  filename?: string
): void => {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Prepare Active Projects data
  const projectsData = projects.map(project => ({
    'Project Name': project.project_name || project.title,
    'Project Address': project.project_address || 'Not provided',
    'General Contractor': project.general_contractor || 'Not specified',
    'Project Start Date': project.project_start_date ? formatDate(project.project_start_date) : 'Not set',
    'Due Date': formatDate(project.due_date),
    'Status': project.status,
    'Priority': project.priority ? 'Yes' : 'No',
    'Estimated Value': project.estimated_value ? 
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(project.estimated_value) : 
      '$0.00',
    'Department': project.department || 'Not specified',
    'Made by APM': project.made_by_apm ? 'Yes' : 'No',
    'GC System': project.gc_system || 'N/A',
    'Added to Procore': project.added_to_procore ? 'Yes' : 'No'
  }));

  // Prepare APM Tasks data
  const tasksData = tasks.map(task => {
    const urgencyText = task.urgency.level === 'overdue' ? 
      `Overdue by ${Math.abs(task.urgency.businessDaysRemaining)} days` :
      task.urgency.level === 'due_today' ? 
      'Due Today' :
      task.urgency.level === 'critical' ? 
      `Due in ${task.urgency.businessDaysRemaining} days` :
      `Due in ${task.urgency.businessDaysRemaining} days`;

    return {
      'Project Name': task.project.project_name || task.project.title,
      'Vendor': task.vendor.company_name,
      'Buyout Phase': task.phase.displayName,
      'Follow-Up Date': formatDate(task.phase.followUpDate),
      'Urgency': urgencyText,
      'Assigned To': task.assignedUser?.name || 'Unassigned',
      'Phase Notes': task.phase.notes || ''
    };
  });

  // Create worksheets
  const wsProjects = XLSX.utils.json_to_sheet(projectsData);
  const wsTasks = XLSX.utils.json_to_sheet(tasksData);

  // Set column widths
  wsProjects['!cols'] = [
    { wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, 
    { wch: 15 }, { wch: 8 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, 
    { wch: 12 }, { wch: 15 }
  ];

  wsTasks['!cols'] = [
    { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, 
    { wch: 20 }, { wch: 15 }, { wch: 30 }
  ];

  // Add worksheets to workbook
  XLSX.utils.book_append_sheet(wb, wsProjects, 'Active Projects');
  XLSX.utils.book_append_sheet(wb, wsTasks, 'APM Tasks');

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '').replace('T', '_');
  const finalFilename = filename || `Project_Management_Export_${timestamp}.xlsx`;

  // Save file
  XLSX.writeFile(wb, finalFilename);
};

/**
 * Generate APM Tasks from projects and vendors data
 * (Helper function to transform data into task format)
 */
export const generateAPMTasksFromData = (
  projects: Bid[],
  bidVendors: BidVendor[],
  vendors: Vendor[],
  users: User[]
): APMTask[] => {
  const tasks: APMTask[] = [];
  const phases = ['buy_number', 'po', 'submittals', 'revised_plans', 'equipment_release', 'closeouts'];
  const phaseDisplayNames: Record<string, string> = {
    buy_number: 'Buy#',
    po: 'Purchase Order',
    submittals: 'Submittals',
    revised_plans: 'Revised Plans',
    equipment_release: 'Equipment Release',
    closeouts: 'Closeouts'
  };

  projects.forEach(project => {
    const projectBidVendors = bidVendors.filter(bv => bv.bid_id === project.id);
    
    projectBidVendors.forEach(bidVendor => {
      const vendor = vendors.find(v => v.id === bidVendor.vendor_id);
      if (!vendor) return;

      const assignedUser = bidVendor.assigned_apm_user ? 
        users.find(u => u.id === bidVendor.assigned_apm_user) || null : null;

      phases.forEach(phaseName => {
        const followUpDate = getPhaseFollowUpDate(bidVendor, phaseName);
        if (!followUpDate) return;

        const isCompleted = hasPhaseBeenCompleted(bidVendor, phaseName);
        if (isCompleted) return;

        const notes = getPhaseNotes(bidVendor, phaseName);
        const urgency = getFollowUpUrgency(followUpDate);

        tasks.push({
          id: `${bidVendor.id}-${phaseName}`,
          project,
          vendor,
          bidVendor,
          assignedUser,
          phase: {
            name: phaseName,
            displayName: phaseDisplayNames[phaseName] || phaseName,
            followUpDate,
            notes
          },
          urgency
        });
      });
    });
  });

  return tasks;
};

/**
 * Export Active Project Start Dates Report to Excel - Single file for projects within 60 days with styling
 */
export const exportActiveProjectStartDatesReport = (
  reportData: {
    projectsWithin60Days: Array<{
      project: Bid;
      vendors: Vendor[];
      mostRecentNote: string;
      equipmentRequestInfo: Array<{
        vendorName: string;
        equipmentRequestedDate: string | null;
        equipmentReleasedDate: string | null;
      }>;
    }>;
  }
): { reportFile: Blob | null; filename: string } => {
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '').replace('T', '_');
  
  const filename = `Active_Projects_Within_60_Days_${timestamp}.xlsx`;
  let reportFile: Blob | null = null;

  // Generate report file for all projects within 60 days
  if (reportData.projectsWithin60Days.length > 0) {
    const wb = XLSX.utils.book_new();
    
    // Create worksheet with proper structure
    const ws: any = {};
    
    // Define columns
    const columns = [
      'Project Name', 'Project Address', 'General Contractor', 'Project Start Date',
      'Most Recent Note', 'Vendor Name', 'Equipment Requested Date', 
      'Equipment Released Date', 'Equipment Status'
    ];
    
    // Add header row with styling
    columns.forEach((colName, colIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: colIndex });
      setCellStyle(ws, cellRef, ExcelStyles.headerStyle, colName);
    });
    
    let currentRow = 1;
    
    // Process each project
    reportData.projectsWithin60Days.forEach((projectReport, projectIndex) => {
      if (projectReport.vendors.length === 0) {
        // Project with no vendors - single row
        const rowData = [
          projectReport.project.project_name || projectReport.project.title,
          projectReport.project.project_address || 'Not provided',
          projectReport.project.general_contractor || 'Not specified',
          projectReport.project.project_start_date ? 
            formatDate(projectReport.project.project_start_date) : 'Not set',
          projectReport.mostRecentNote,
          'No vendors assigned',
          '',
          '',
          'No requests'
        ];
        
        // Add row with project header styling
        rowData.forEach((value, colIndex) => {
          const cellRef = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
          if (colIndex === 8) { // Equipment Status column
            setCellStyle(ws, cellRef, getStatusStyle(value.toString()), value);
          } else if (colIndex >= 6) { // Date columns
            setCellStyle(ws, cellRef, ExcelStyles.dateStyle, value);
          } else {
            setCellStyle(ws, cellRef, ExcelStyles.projectHeaderStyle, value);
          }
        });
        
        currentRow++;
      } else {
        // Project with vendors - one row per vendor
        projectReport.vendors.forEach((vendor, vendorIndex) => {
          const equipmentInfo = projectReport.equipmentRequestInfo.find(
            eq => eq.vendorName === vendor.company_name
          );
          
          const equipmentStatus = !equipmentInfo?.equipmentRequestedDate ? 'No request' :
            !equipmentInfo?.equipmentReleasedDate ? 'Requested - Pending Release' : 'Released';
          
          const rowData = [
            vendorIndex === 0 ? (projectReport.project.project_name || projectReport.project.title) : '',
            vendorIndex === 0 ? (projectReport.project.project_address || 'Not provided') : '',
            vendorIndex === 0 ? (projectReport.project.general_contractor || 'Not specified') : '',
            vendorIndex === 0 ? 
              (projectReport.project.project_start_date ? formatDate(projectReport.project.project_start_date) : 'Not set') : '',
            vendorIndex === 0 ? projectReport.mostRecentNote : '',
            vendor.company_name,
            equipmentInfo?.equipmentRequestedDate ? 
              formatDate(equipmentInfo.equipmentRequestedDate) : '',
            equipmentInfo?.equipmentReleasedDate ? 
              formatDate(equipmentInfo.equipmentReleasedDate) : '',
            equipmentStatus
          ];
          
          // Style the row based on whether it's the first vendor (project header) or subsequent vendor
          rowData.forEach((value, colIndex) => {
            const cellRef = XLSX.utils.encode_cell({ r: currentRow, c: colIndex });
            
            if (colIndex === 8) { // Equipment Status column - special status styling
              setCellStyle(ws, cellRef, getStatusStyle(value.toString()), value);
            } else if (colIndex >= 6 && colIndex <= 7) { // Date columns
              setCellStyle(ws, cellRef, ExcelStyles.dateStyle, value);
            } else if (vendorIndex === 0) { // First vendor row - project header style
              setCellStyle(ws, cellRef, ExcelStyles.projectHeaderStyle, value);
            } else { // Subsequent vendor rows - vendor row style
              setCellStyle(ws, cellRef, ExcelStyles.vendorRowStyle, value);
            }
          });
          
          currentRow++;
        });
      }
      
      // Add spacing between projects (except for the last project)
      if (projectIndex < reportData.projectsWithin60Days.length - 1) {
        currentRow++;
      }
    });
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Project Name
      { wch: 30 }, // Project Address
      { wch: 20 }, // General Contractor
      { wch: 15 }, // Project Start Date
      { wch: 50 }, // Most Recent Note
      { wch: 25 }, // Vendor Name
      { wch: 18 }, // Equipment Requested Date
      { wch: 18 }, // Equipment Released Date
      { wch: 25 }  // Equipment Status
    ];
    
    // Set worksheet range
    const range = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: currentRow - 1, c: columns.length - 1 }
    });
    ws['!ref'] = range;
    
    // Freeze the header row
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    
    XLSX.utils.book_append_sheet(wb, ws, 'Projects Within 60 Days');

    reportFile = new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  return { reportFile, filename };
};