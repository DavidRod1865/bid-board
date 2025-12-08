import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { 
  WeeklyDueReport, 
  ProjectCostsDue, 
  ReportSummary,  
} from './reportFilters';
import { 
  sortProjectsByUrgency 
} from './reportFilters';
import type { Vendor } from '../types';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
    lastAutoTable?: {
      finalY: number;
    };
  }
}

// Design constants for consistent styling
const DESIGN = {
  colors: {
    primary: [212, 175, 55] as [number, number, number], // Brand gold
    dark: [45, 45, 45] as [number, number, number], // Dark text
    gray: [128, 128, 128] as [number, number, number], // Muted text
    lightGray: [245, 245, 245] as [number, number, number], // Background
    success: [34, 139, 34] as [number, number, number], // Green
    pending: [255, 140, 0] as [number, number, number], // Orange
    border: [220, 220, 220] as [number, number, number], // Light border
    // New alternating project colors
    project1: [230, 242, 255] as [number, number, number], // Light blue
    project2: [240, 255, 240] as [number, number, number], // Light green
    project3: [255, 245, 230] as [number, number, number], // Light orange
    project4: [250, 235, 255] as [number, number, number], // Light purple
    project5: [255, 240, 245] as [number, number, number], // Light pink
    headerBg: [54, 96, 146] as [number, number, number], // Professional blue
    white: [255, 255, 255] as [number, number, number],
  },
  fonts: {
    title: 24,
    heading: 18,
    subheading: 15,
    body: 11,
    small: 9,
    caption: 8,
  },
  spacing: {
    section: 30,
    paragraph: 20,
    line: 8,
    projectSeparator: 15,
  }
};

// Project color rotation helper
function getProjectColor(index: number): [number, number, number] {
  const colors = [
    DESIGN.colors.project1,
    DESIGN.colors.project2, 
    DESIGN.colors.project3,
    DESIGN.colors.project4,
    DESIGN.colors.project5
  ];
  return colors[index % colors.length];
}

export class WeeklyVendorCostsPDFGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;
  private currentProjectIndex: number = 0;

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 25; // Increased margin for breathing room
    this.currentY = this.margin;
  }

  /**
   * Generate complete PDF report
   */
  generateReport(report: WeeklyDueReport, summary: ReportSummary): Blob {
    this.addHeader();
    this.addSummaryCards(summary);
    this.addProjectDetails(report);
    this.addFooter();
    
    return this.doc.output('blob');
  }

  /**
   * Add enhanced professional header with better styling
   */
  private addHeader(): void {
    // Professional header background
    this.doc.setFillColor(...DESIGN.colors.headerBg);
    this.doc.rect(0, 0, this.pageWidth, 65, 'F');
    
    // Company name with white text
    this.doc.setTextColor(...DESIGN.colors.white);
    this.doc.setFontSize(DESIGN.fonts.title);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('With Pride Air Conditioning & Heating', this.pageWidth / 2, this.currentY + 20, { align: 'center' });
    
    // Report title
    this.doc.setFontSize(DESIGN.fonts.heading);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Weekly Bids & Vendor Costs Report', this.pageWidth / 2, this.currentY + 35, { align: 'center' });
    
    // Generation date
    this.doc.setFontSize(DESIGN.fonts.body);
    this.doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`, this.pageWidth / 2, this.currentY + 50, { align: 'center' });
    
    // Gold accent line
    this.doc.setDrawColor(...DESIGN.colors.primary);
    this.doc.setLineWidth(3);
    this.doc.line(this.margin, this.currentY + 60, this.pageWidth - this.margin, this.currentY + 60);
    
    this.currentY += 80;
  }

  /**
   * Add enhanced summary cards with better visual design
   */
  private addSummaryCards(summary: ReportSummary): void {
    this.doc.setTextColor(...DESIGN.colors.dark);
    this.doc.setFontSize(DESIGN.fonts.heading);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Executive Summary', this.margin, this.currentY);
    
    this.currentY += DESIGN.spacing.paragraph;
    
    // Enhanced card layout with shadows
    const cardWidth = (this.pageWidth - (2 * this.margin) - 15) / 2;
    const cardHeight = 45;
    const cardSpacing = 15;
    
    // Projects card with enhanced styling
    this.addEnhancedSummaryCard(
      this.margin,
      this.currentY,
      cardWidth,
      cardHeight,
      summary.totalProjects.toString(),
      'Total Bids Due',
      DESIGN.colors.primary,
      '📊'
    );
    
    // Pending vendors card with enhanced styling
    this.addEnhancedSummaryCard(
      this.margin + cardWidth + cardSpacing,
      this.currentY,
      cardWidth,
      cardHeight,
      summary.totalPendingVendors.toString(),
      'Costs Pending',
      DESIGN.colors.pending,
      '⏳'
    );
    
    this.currentY += cardHeight + DESIGN.spacing.section;
  }

  /**
   * Add enhanced individual summary card with icon and shadow effect
   */
  private addEnhancedSummaryCard(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    value: string, 
    label: string, 
    accentColor: [number, number, number],
    icon: string
  ): void {
    // Card shadow effect
    this.doc.setFillColor(200, 200, 200);
    this.doc.rect(x + 2, y + 2, width, height, 'F');
    
    // Card background
    this.doc.setFillColor(...DESIGN.colors.white);
    this.doc.rect(x, y, width, height, 'F');
    
    // Card border
    this.doc.setDrawColor(...DESIGN.colors.border);
    this.doc.setLineWidth(1);
    this.doc.rect(x, y, width, height, 'S');
    
    // Accent top border
    this.doc.setDrawColor(...accentColor);
    this.doc.setLineWidth(4);
    this.doc.line(x, y, x + width, y);
    
    // Icon (using text for PDF compatibility)
    this.doc.setTextColor(...accentColor);
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(icon, x + 12, y + 18);
    
    // Value
    this.doc.setTextColor(...DESIGN.colors.dark);
    this.doc.setFontSize(28);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(value, x + width / 2, y + 22, { align: 'center' });
    
    // Label
    this.doc.setFontSize(DESIGN.fonts.body);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...DESIGN.colors.gray);
    this.doc.text(label, x + width / 2, y + 35, { align: 'center' });
  }

  /**
   * Add detailed project information with clean layout
   */
  private addProjectDetails(report: WeeklyDueReport): void {
    const sortedProjects = sortProjectsByUrgency(report);
    
    this.doc.setFontSize(DESIGN.fonts.heading);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...DESIGN.colors.dark);
    this.doc.text('Bid Details', this.margin, this.currentY);
    
    this.currentY += DESIGN.spacing.paragraph;
    
    sortedProjects.forEach((project, index) => {
      this.currentProjectIndex = index;
      this.addCleanProjectSection(project, index === sortedProjects.length - 1);
    });
  }

  /**
   * Add individual project with enhanced visual design and color coding
   */
  private addCleanProjectSection(project: ProjectCostsDue, isLastProject: boolean): void {
    // Check if we need a new page
    if (this.currentY > this.pageHeight - 120) {
      this.doc.addPage();
      this.currentY = this.margin + 20;
    }
    
    // Calculate total pending vendors for this project
    const totalPendingVendors = Object.values(project.dueDates)
      .reduce((total, dueDateData) => total + dueDateData.pendingVendors.length, 0);
    
    // Get project color based on index (track this in the calling function)
    const projectIndex = this.getCurrentProjectIndex();
    const projectColor = getProjectColor(projectIndex);
    
    // Project header with enhanced styling and color coding
    this.doc.setFillColor(...projectColor);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - (2 * this.margin), 35, 'F');
    
    // Add border
    this.doc.setDrawColor(...DESIGN.colors.primary);
    this.doc.setLineWidth(2);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - (2 * this.margin), 35, 'S');
    
    // Project icon and number
    this.doc.setTextColor(...DESIGN.colors.primary);
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`🏗️ Project ${projectIndex + 1}`, this.margin + 10, this.currentY + 12);
    
    // Project title
    this.doc.setTextColor(...DESIGN.colors.dark);
    this.doc.setFontSize(DESIGN.fonts.subheading);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(project.bid.title, this.margin + 10, this.currentY + 24);
    
    // Due date with urgency indicator
    const bidDueDate = new Date(project.bid.due_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((bidDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    let dueDateText = `Due: ${bidDueDate.toLocaleDateString()}`;
    let urgencyIcon = '';
    let urgencyColor = DESIGN.colors.gray;
    
    if (daysUntilDue <= 3 && daysUntilDue >= 0) {
      urgencyIcon = '🔴';
      urgencyColor = DESIGN.colors.pending;
      dueDateText += ` (${daysUntilDue} days!)`;
    } else if (daysUntilDue <= 7 && daysUntilDue >= 0) {
      urgencyIcon = '🟡';
      urgencyColor = DESIGN.colors.pending;
      dueDateText += ` (${daysUntilDue} days)`;
    } else if (daysUntilDue > 7) {
      urgencyIcon = '🟢';
      urgencyColor = DESIGN.colors.success;
    }
    
    this.doc.setFontSize(DESIGN.fonts.body);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...urgencyColor);
    this.doc.text(`${urgencyIcon} ${dueDateText}`, this.pageWidth - this.margin - 10, this.currentY + 15, { align: 'right' });
    
    // Add pending vendor count with visual indicator
    if (totalPendingVendors > 0) {
      this.doc.setFontSize(DESIGN.fonts.small);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(...DESIGN.colors.pending);
      this.doc.text(
        `⏳ ${totalPendingVendors} vendor${totalPendingVendors !== 1 ? 's' : ''} pending`,
        this.pageWidth - this.margin - 10,
        this.currentY + 27,
        { align: 'right' }
      );
    }
    
    this.currentY += 45;
    
    // Create consolidated vendor table with project color
    this.addConsolidatedVendorTable(project, projectColor);
    
    // Add visual separator between projects
    if (!isLastProject) {
      this.currentY += DESIGN.spacing.projectSeparator;
      // Add subtle separator line
      this.doc.setDrawColor(...DESIGN.colors.border);
      this.doc.setLineWidth(0.5);
      this.doc.line(this.margin + 20, this.currentY - 5, this.pageWidth - this.margin - 20, this.currentY - 5);
    }
  }

  private getCurrentProjectIndex(): number {
    return this.currentProjectIndex;
  }
  
  private incrementProjectIndex(): void {
    this.currentProjectIndex++;
  }

  /**
   * Add consolidated vendor table with enhanced styling and project color
   */
  private addConsolidatedVendorTable(project: ProjectCostsDue, projectColor?: [number, number, number]): void {
    // Collect all vendors from all due dates
    const allVendorData: Array<{
      vendor: Vendor | null | undefined;
      status: string;
      dueDate: string;
      formattedDueDate: string;
    }> = [];
    
    Object.entries(project.dueDates).forEach(([dueDate, dueDateData]) => {
      // Add submitted vendors
      dueDateData.submittedVendors.forEach(vendorData => {
        allVendorData.push({
          vendor: vendorData.vendor,
          status: 'Complete',
          dueDate,
          formattedDueDate: new Date(dueDate).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })
        });
      });
      
      // Add pending vendors
      dueDateData.pendingVendors.forEach(vendorData => {
        allVendorData.push({
          vendor: vendorData.vendor,
          status: 'Pending',
          dueDate,
          formattedDueDate: new Date(dueDate).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })
        });
      });
    });
    
    // Sort by due date, then by status (Complete first, then Pending)
    allVendorData.sort((a, b) => {
      const dateCompare = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (dateCompare !== 0) return dateCompare;
      
      // If same date, show Complete status first
      if (a.status !== b.status) {
        return a.status === 'Complete' ? -1 : 1;
      }
      return 0;
    });
    
    if (allVendorData.length > 0) {
      const vendorTableData = allVendorData.map(data => [
        data.vendor?.company_name || 'Unknown Vendor',
        data.status,
        data.formattedDueDate,
        this.formatContactInfo(data.vendor)
      ]);
      
      autoTable(this.doc, {
        startY: this.currentY,
        head: [['🏢 Vendor Company', '📊 Status', '📅 Due Date', '📞 Contact']],
        body: vendorTableData,
        theme: 'grid',
        headStyles: { 
          fillColor: DESIGN.colors.headerBg,
          textColor: DESIGN.colors.white,
          fontSize: DESIGN.fonts.small,
          fontStyle: 'bold',
          lineColor: DESIGN.colors.border,
          lineWidth: 1,
          halign: 'center' as const
        },
        bodyStyles: { 
          fontSize: DESIGN.fonts.small,
          lineColor: DESIGN.colors.border,
          lineWidth: 0.5,
          cellPadding: 4
        },
        alternateRowStyles: {
          fillColor: projectColor || DESIGN.colors.lightGray
        },
        margin: { left: this.margin + 15, right: this.margin },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 25, halign: 'center' as const, fontStyle: 'bold' },
          2: { cellWidth: 25, halign: 'center' as const },
          3: { cellWidth: 48 }
        },
        didParseCell: (data: any) => {
          // Enhanced status column styling with icons
          if (data.column.index === 1) {
            if (data.cell.text[0] === 'Complete') {
              data.cell.styles.textColor = DESIGN.colors.success;
              data.cell.styles.fontStyle = 'bold';
              data.cell.text[0] = '✅ Complete';
            } else if (data.cell.text[0] === 'Pending') {
              data.cell.styles.textColor = DESIGN.colors.pending;
              data.cell.styles.fontStyle = 'bold';
              data.cell.text[0] = '⏳ Pending';
            }
          }
        }
      });
      
      this.currentY = (this.doc.lastAutoTable?.finalY || this.currentY) + 10;
    }
  }

  /**
   * Format contact information cleanly
   */
  private formatContactInfo(vendor: Vendor | null | undefined): string {
    if (!vendor) return '-';
    
    const parts: string[] = [];
    if (vendor.contact_person) parts.push(vendor.contact_person);
    if (vendor.phone) parts.push(vendor.phone);
    if (vendor.email) parts.push(vendor.email);
    
    return parts.length > 0 ? parts.join(' • ') : '-';
  }

  /**
   * Add enhanced professional footer with branding
   */
  private addFooter(): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      // Footer background
      this.doc.setFillColor(...DESIGN.colors.lightGray);
      this.doc.rect(0, this.pageHeight - 25, this.pageWidth, 25, 'F');
      
      // Footer accent line
      this.doc.setDrawColor(...DESIGN.colors.primary);
      this.doc.setLineWidth(2);
      this.doc.line(0, this.pageHeight - 25, this.pageWidth, this.pageHeight - 25);
      
      // Company name with icon
      this.doc.setTextColor(...DESIGN.colors.dark);
      this.doc.setFontSize(DESIGN.fonts.caption);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(
        '🏠 With Pride Air Conditioning & Heating',
        this.margin,
        this.pageHeight - 12
      );
      
      // Page number with styling
      this.doc.setTextColor(...DESIGN.colors.gray);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(
        `Page ${i} of ${pageCount} | Generated ${new Date().toLocaleDateString()}`,
        this.pageWidth - this.margin,
        this.pageHeight - 12,
        { align: 'right' }
      );
    }
  }
}

/**
 * Generate weekly vendor costs PDF report
 */
export function generateWeeklyVendorCostsPDF(
  report: WeeklyDueReport,
  summary: ReportSummary
): Blob {
  const generator = new WeeklyVendorCostsPDFGenerator();
  return generator.generateReport(report, summary);
}

/**
 * Active Project Report PDF Generator
 */
export class ActiveProjectReportPDFGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;
  private currentProjectIndex: number = 0;

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 25;
    this.currentY = this.margin;
  }

  /**
   * Generate complete active projects PDF report
   */
  generateReport(projects: any[]): Blob {
    this.addActiveProjectHeader();
    this.addActiveProjectSummary(projects.length);
    this.addActiveProjectDetails(projects);
    this.addActiveProjectFooter();
    
    return this.doc.output('blob');
  }

  /**
   * Add header for active projects report
   */
  private addActiveProjectHeader(): void {
    // Professional header background
    this.doc.setFillColor(...DESIGN.colors.headerBg);
    this.doc.rect(0, 0, this.pageWidth, 65, 'F');
    
    // Company name with white text
    this.doc.setTextColor(...DESIGN.colors.white);
    this.doc.setFontSize(DESIGN.fonts.title);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('With Pride Air Conditioning & Heating', this.pageWidth / 2, this.currentY + 20, { align: 'center' });
    
    // Report title
    this.doc.setFontSize(DESIGN.fonts.heading);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Active Projects Starting Within 60 Days', this.pageWidth / 2, this.currentY + 35, { align: 'center' });
    
    // Generation date
    this.doc.setFontSize(DESIGN.fonts.body);
    this.doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`, this.pageWidth / 2, this.currentY + 50, { align: 'center' });
    
    // Gold accent line
    this.doc.setDrawColor(...DESIGN.colors.primary);
    this.doc.setLineWidth(3);
    this.doc.line(this.margin, this.currentY + 60, this.pageWidth - this.margin, this.currentY + 60);
    
    this.currentY += 80;
  }

  /**
   * Add summary section for active projects
   */
  private addActiveProjectSummary(projectCount: number): void {
    this.doc.setTextColor(...DESIGN.colors.dark);
    this.doc.setFontSize(DESIGN.fonts.heading);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Report Summary', this.margin, this.currentY);
    
    this.currentY += DESIGN.spacing.paragraph;
    
    // Single summary card for project count
    const cardWidth = (this.pageWidth - (2 * this.margin)) / 2;
    const cardHeight = 45;
    
    this.addActiveProjectSummaryCard(
      this.margin,
      this.currentY,
      cardWidth,
      cardHeight,
      projectCount.toString(),
      'Active Projects Starting Soon',
      DESIGN.colors.primary,
      '🚀'
    );
    
    this.currentY += cardHeight + DESIGN.spacing.section;
  }

  /**
   * Add summary card for active projects
   */
  private addActiveProjectSummaryCard(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    value: string, 
    label: string, 
    accentColor: [number, number, number],
    icon: string
  ): void {
    // Card shadow effect
    this.doc.setFillColor(200, 200, 200);
    this.doc.rect(x + 2, y + 2, width, height, 'F');
    
    // Card background
    this.doc.setFillColor(...DESIGN.colors.white);
    this.doc.rect(x, y, width, height, 'F');
    
    // Card border
    this.doc.setDrawColor(...DESIGN.colors.border);
    this.doc.setLineWidth(1);
    this.doc.rect(x, y, width, height, 'S');
    
    // Accent top border
    this.doc.setDrawColor(...accentColor);
    this.doc.setLineWidth(4);
    this.doc.line(x, y, x + width, y);
    
    // Icon
    this.doc.setTextColor(...accentColor);
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(icon, x + 12, y + 18);
    
    // Value
    this.doc.setTextColor(...DESIGN.colors.dark);
    this.doc.setFontSize(28);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(value, x + width / 2, y + 22, { align: 'center' });
    
    // Label
    this.doc.setFontSize(DESIGN.fonts.body);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...DESIGN.colors.gray);
    this.doc.text(label, x + width / 2, y + 35, { align: 'center' });
  }

  /**
   * Add detailed active project information
   */
  private addActiveProjectDetails(projects: any[]): void {
    this.doc.setFontSize(DESIGN.fonts.heading);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...DESIGN.colors.dark);
    this.doc.text('Project Details', this.margin, this.currentY);
    
    this.currentY += DESIGN.spacing.paragraph;
    
    projects.forEach((projectData, index) => {
      this.currentProjectIndex = index;
      this.addActiveProjectSection(projectData, index === projects.length - 1);
    });
  }

  /**
   * Add individual active project section with styling
   */
  private addActiveProjectSection(projectData: any, isLastProject: boolean): void {
    // Check if we need a new page
    if (this.currentY > this.pageHeight - 120) {
      this.doc.addPage();
      this.currentY = this.margin + 20;
    }

    const project = projectData.project;
    const vendors = projectData.vendors || [];
    const equipmentInfo = projectData.equipmentRequestInfo || [];

    // Get project color
    const projectColor = getProjectColor(this.currentProjectIndex);
    
    // Project header with enhanced styling and color coding
    this.doc.setFillColor(...projectColor);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - (2 * this.margin), 50, 'F');
    
    // Add border
    this.doc.setDrawColor(...DESIGN.colors.primary);
    this.doc.setLineWidth(2);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - (2 * this.margin), 50, 'S');
    
    // Project number and icon
    this.doc.setTextColor(...DESIGN.colors.primary);
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`🏗️ Project ${this.currentProjectIndex + 1}`, this.margin + 10, this.currentY + 15);
    
    // Project title
    this.doc.setTextColor(...DESIGN.colors.dark);
    this.doc.setFontSize(DESIGN.fonts.subheading);
    this.doc.setFont('helvetica', 'bold');
    const projectTitle = project.project_name || project.title || 'Unnamed Project';
    this.doc.text(projectTitle, this.margin + 10, this.currentY + 28);
    
    // Project address
    this.doc.setFontSize(DESIGN.fonts.small);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...DESIGN.colors.gray);
    const projectAddress = project.project_address || 'Address not provided';
    this.doc.text(`📍 ${projectAddress}`, this.margin + 10, this.currentY + 38);
    
    // Start date
    if (project.project_start_date) {
      const startDate = new Date(project.project_start_date);
      const today = new Date();
      const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let startDateText = `Starts: ${startDate.toLocaleDateString()}`;
      let urgencyIcon = '';
      let urgencyColor = DESIGN.colors.gray;
      
      if (daysUntilStart <= 7 && daysUntilStart >= 0) {
        urgencyIcon = '🔴';
        urgencyColor = DESIGN.colors.pending;
        startDateText += ` (${daysUntilStart} days!)`;
      } else if (daysUntilStart <= 30 && daysUntilStart >= 0) {
        urgencyIcon = '🟡';
        urgencyColor = DESIGN.colors.pending;
        startDateText += ` (${daysUntilStart} days)`;
      } else if (daysUntilStart > 30) {
        urgencyIcon = '🟢';
        urgencyColor = DESIGN.colors.success;
      }
      
      this.doc.setFontSize(DESIGN.fonts.body);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(...urgencyColor);
      this.doc.text(`${urgencyIcon} ${startDateText}`, this.pageWidth - this.margin - 10, this.currentY + 20, { align: 'right' });
    }

    // Vendor count
    if (vendors.length > 0) {
      this.doc.setFontSize(DESIGN.fonts.small);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(...DESIGN.colors.gray);
      this.doc.text(
        `👥 ${vendors.length} vendor${vendors.length !== 1 ? 's' : ''} assigned`,
        this.pageWidth - this.margin - 10,
        this.currentY + 35,
        { align: 'right' }
      );
    }

    this.currentY += 60;

    // Add vendor and equipment table
    this.addActiveProjectVendorTable(vendors, equipmentInfo, projectColor);
    
    // Add project notes if available
    if (projectData.mostRecentNote && projectData.mostRecentNote !== 'No notes available') {
      this.addProjectNotes(projectData.mostRecentNote);
    }

    // Add visual separator between projects
    if (!isLastProject) {
      this.currentY += DESIGN.spacing.projectSeparator;
      this.doc.setDrawColor(...DESIGN.colors.border);
      this.doc.setLineWidth(0.5);
      this.doc.line(this.margin + 20, this.currentY - 5, this.pageWidth - this.margin - 20, this.currentY - 5);
    }
  }

  /**
   * Add vendor and equipment information table
   */
  private addActiveProjectVendorTable(vendors: any[], equipmentInfo: any[], projectColor: [number, number, number]): void {
    if (vendors.length === 0) {
      // Show "No vendors assigned" message
      this.doc.setFillColor(...DESIGN.colors.lightGray);
      this.doc.rect(this.margin + 15, this.currentY, this.pageWidth - (2 * this.margin) - 30, 25, 'F');
      
      this.doc.setTextColor(...DESIGN.colors.gray);
      this.doc.setFontSize(DESIGN.fonts.body);
      this.doc.setFont('helvetica', 'italic');
      this.doc.text('📝 No vendors assigned to this project', this.pageWidth / 2, this.currentY + 15, { align: 'center' });
      
      this.currentY += 35;
      return;
    }

    // Create vendor table data
    const vendorTableData = vendors.map((vendor: any) => {
      const equipment = equipmentInfo.find(eq => eq.vendorName === vendor.company_name);
      const equipmentStatus = !equipment?.equipmentRequestedDate ? 'No request' :
        !equipment?.equipmentReleasedDate ? 'Requested - Pending' : 'Released';
      
      return [
        vendor.company_name || 'Unknown Vendor',
        vendor.contact_person || '-',
        vendor.phone || '-',
        equipment?.equipmentRequestedDate ? 
          new Date(equipment.equipmentRequestedDate).toLocaleDateString() : '-',
        equipmentStatus
      ];
    });

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['🏢 Vendor', '👤 Contact', '📞 Phone', '📅 Equipment Requested', '📦 Status']],
      body: vendorTableData,
      theme: 'grid',
      headStyles: { 
        fillColor: DESIGN.colors.headerBg,
        textColor: DESIGN.colors.white,
        fontSize: DESIGN.fonts.small,
        fontStyle: 'bold',
        lineColor: DESIGN.colors.border,
        lineWidth: 1,
        halign: 'center' as const
      },
      bodyStyles: { 
        fontSize: DESIGN.fonts.small,
        lineColor: DESIGN.colors.border,
        lineWidth: 0.5,
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: projectColor
      },
      margin: { left: this.margin + 15, right: this.margin },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: 'bold' },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25, halign: 'center' as const },
        4: { cellWidth: 30, halign: 'center' as const, fontStyle: 'bold' }
      },
      didParseCell: (data: any) => {
        // Style status column with colors and icons
        if (data.column.index === 4) {
          if (data.cell.text[0] === 'Released') {
            data.cell.styles.textColor = DESIGN.colors.success;
            data.cell.text[0] = '✅ Released';
          } else if (data.cell.text[0] === 'Requested - Pending') {
            data.cell.styles.textColor = DESIGN.colors.pending;
            data.cell.text[0] = '⏳ Pending';
          } else {
            data.cell.styles.textColor = DESIGN.colors.gray;
            data.cell.text[0] = '❌ No Request';
          }
        }
      }
    });
    
    this.currentY = (this.doc.lastAutoTable?.finalY || this.currentY) + 15;
  }

  /**
   * Add project notes section
   */
  private addProjectNotes(note: string): void {
    // Notes header
    this.doc.setTextColor(...DESIGN.colors.dark);
    this.doc.setFontSize(DESIGN.fonts.body);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('📝 Most Recent Note:', this.margin + 15, this.currentY);
    
    this.currentY += 10;
    
    // Notes content with background
    const maxWidth = this.pageWidth - (2 * this.margin) - 30;
    const noteLines = this.doc.splitTextToSize(note, maxWidth);
    const noteHeight = noteLines.length * 6 + 10;
    
    this.doc.setFillColor(...DESIGN.colors.lightGray);
    this.doc.rect(this.margin + 15, this.currentY - 5, maxWidth, noteHeight, 'F');
    
    this.doc.setDrawColor(...DESIGN.colors.border);
    this.doc.setLineWidth(0.5);
    this.doc.rect(this.margin + 15, this.currentY - 5, maxWidth, noteHeight, 'S');
    
    this.doc.setTextColor(...DESIGN.colors.dark);
    this.doc.setFontSize(DESIGN.fonts.small);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(noteLines, this.margin + 20, this.currentY + 2);
    
    this.currentY += noteHeight + 10;
  }

  /**
   * Add footer for active projects report
   */
  private addActiveProjectFooter(): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      // Footer background
      this.doc.setFillColor(...DESIGN.colors.lightGray);
      this.doc.rect(0, this.pageHeight - 25, this.pageWidth, 25, 'F');
      
      // Footer accent line
      this.doc.setDrawColor(...DESIGN.colors.primary);
      this.doc.setLineWidth(2);
      this.doc.line(0, this.pageHeight - 25, this.pageWidth, this.pageHeight - 25);
      
      // Company name with icon
      this.doc.setTextColor(...DESIGN.colors.dark);
      this.doc.setFontSize(DESIGN.fonts.caption);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(
        '🏠 With Pride Air Conditioning & Heating - Active Projects Report',
        this.margin,
        this.pageHeight - 12
      );
      
      // Page number with styling
      this.doc.setTextColor(...DESIGN.colors.gray);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(
        `Page ${i} of ${pageCount} | Generated ${new Date().toLocaleDateString()}`,
        this.pageWidth - this.margin,
        this.pageHeight - 12,
        { align: 'right' }
      );
    }
  }
}

/**
 * Generate active projects PDF report
 */
export function generateActiveProjectsPDF(projects: any[]): Blob {
  const generator = new ActiveProjectReportPDFGenerator();
  return generator.generateReport(projects);
}

/**
 * Generate Equipment Release Report PDF - matches the email report exactly
 */
export function generateEquipmentReleaseReportPDF(reportData: {
  projectsWithin60Days: Array<{
    project: any;
    vendors: any[];
    mostRecentNote: string;
    equipmentRequestInfo: Array<{
      vendorName: string;
      equipmentRequestedDate: string | null;
      equipmentReleasedDate: string | null;
      equipmentReleaseNotes: string;
    }>;
  }>;
}): Blob {
  const projects = reportData.projectsWithin60Days;
  
  // Create PDF using jsPDF with table layout - matches edge function exactly
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'letter'
  });

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 5;

  // Design constants - match edge function
  const DESIGN = {
    colors: {
      headerBg: [54, 96, 146] as [number, number, number],
      dark: [45, 45, 45] as [number, number, number],
      gray: [128, 128, 128] as [number, number, number],
      success: [34, 139, 34] as [number, number, number],
      pending: [255, 140, 0] as [number, number, number],
      border: [220, 220, 220] as [number, number, number],
      white: [255, 255, 255] as [number, number, number],
    }
  };

  // Company header
  doc.setFillColor(...DESIGN.colors.headerBg);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('With Pride Air Conditioning & Heating', pageWidth/2, 15, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Equipment Release Report', pageWidth/2, 25, { align: 'center' });
  
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  doc.setFontSize(10);
  doc.text(`Generated on ${currentDate}`, pageWidth/2, 32, { align: 'center' });

  // Summary card
  let yPos = 50;
  doc.setTextColor(...DESIGN.colors.dark);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Report Summary - ${projects.length.toString()} Projects Starting Within 60 Days`, margin, yPos);

  // Prepare table data - exactly like edge function
  const tableData: string[][] = [];

  projects.forEach((projectData) => {
    const project = projectData.project;
    const vendors = projectData.vendors || [];
    const equipmentInfo = projectData.equipmentRequestInfo || [];

    const startDate = project.project_start_date ? 
      new Date(project.project_start_date).toLocaleDateString() : 'Not set';
    
    if (vendors.length === 0) {
      tableData.push([
        project.project_name || project.title || 'Unnamed Project',
        project.project_address || 'Not provided',
        project.general_contractor || 'Not specified',
        startDate,
        'No vendors assigned',
        '-',
        '-',
        'No Request',
        ''
      ]);
    } else {
      vendors.forEach((vendor: any, vendorIndex) => {
        const equipment = equipmentInfo.find(eq => eq.vendorName === vendor.company_name);
        
        const requestedDate = equipment?.equipmentRequestedDate ? 
          new Date(equipment.equipmentRequestedDate).toLocaleDateString() : '-';
        const releasedDate = equipment?.equipmentReleasedDate ? 
          new Date(equipment.equipmentReleasedDate).toLocaleDateString() : '-';
        
        let equipmentStatus = 'No Request';
        if (equipment?.equipmentRequestedDate) {
          if (equipment?.equipmentReleasedDate) {
            equipmentStatus = 'Released';
          } else {
            equipmentStatus = 'Pending Release';
          }
        }

        const equipmentNotes = equipment?.equipmentReleaseNotes || '';

        tableData.push([
          vendorIndex === 0 ? (project.project_name || project.title || 'Unnamed Project') : '',
          vendorIndex === 0 ? (project.project_address || 'Not provided') : '',
          vendorIndex === 0 ? (project.general_contractor || 'Not specified') : '',
          vendorIndex === 0 ? startDate : '',
          vendor.company_name || 'Unknown Vendor',
          requestedDate,
          releasedDate,
          equipmentStatus,
          equipmentNotes
        ]);
      });
    }
  });

  // Add table using autoTable - exactly like edge function
  yPos += 5;
  autoTable(doc, {
    startY: yPos,
    head: [['Project Name', 'Project Address', 'General Contractor', 'Start Date', 'Vendor Name', 'Equipment Requested', 'Equipment Released', 'Status', 'Release Notes']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: DESIGN.colors.border,
      lineWidth: 0.5
    },
    headStyles: {
      fillColor: DESIGN.colors.headerBg,
      textColor: DESIGN.colors.white,
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle'
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250]
    },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: 'bold', textColor: DESIGN.colors.headerBg },
      1: { cellWidth: 35 },
      2: { cellWidth: 28 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 32, fontStyle: 'bold' },
      5: { cellWidth: 22, halign: 'center' },
      6: { cellWidth: 22, halign: 'center' },
      7: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      8: { cellWidth: 55, fontSize: 7 }
    },
    didParseCell: function(data: { column: { index: number }; cell: { text: string[]; styles: any } }) {
      if (data.column.index === 7) { // Status column
        const status = data.cell.text[0]?.toLowerCase() || '';
        if (status.includes('released')) {
          data.cell.styles.fillColor = DESIGN.colors.success;
          data.cell.styles.textColor = DESIGN.colors.white;
        } else if (status.includes('pending')) {
          data.cell.styles.fillColor = DESIGN.colors.pending;
          data.cell.styles.textColor = DESIGN.colors.white;
        } else {
          data.cell.styles.fillColor = [200, 50, 50];
          data.cell.styles.textColor = DESIGN.colors.white;
        }
      }
    },
    margin: { left: margin, right: margin }
  });

  // Footer
  doc.setTextColor(...DESIGN.colors.gray);
  doc.setFontSize(8);
  doc.text('With Pride Air Conditioning & Heating', pageWidth/2, pageHeight - 15, { align: 'center' });
  doc.text(`Equipment Release Report | Generated ${currentDate}`, pageWidth/2, pageHeight - 8, { align: 'center' });

  return doc.output('blob');
}