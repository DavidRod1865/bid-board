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
  },
  fonts: {
    title: 22,
    heading: 16,
    subheading: 14,
    body: 11,
    small: 9,
    caption: 8,
  },
  spacing: {
    section: 25,
    paragraph: 15,
    line: 8,
  }
};

export class WeeklyVendorCostsPDFGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;

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
   * Add clean, professional header
   */
  private addHeader(): void {
    // Clean header with subtle styling
    this.doc.setTextColor(...DESIGN.colors.dark);
    this.doc.setFontSize(DESIGN.fonts.title);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('With Pride Air Conditioning & Heating', this.pageWidth / 2, this.currentY + 15, { align: 'center' });
    
    // Report title
    this.doc.setFontSize(DESIGN.fonts.heading);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...DESIGN.colors.gray);
    this.doc.text('Weekly Bids & Vendor Costs Report', this.pageWidth / 2, this.currentY + 30, { align: 'center' });
    
    // Generation date
    this.doc.setFontSize(DESIGN.fonts.body);
    this.doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`, this.pageWidth / 2, this.currentY + 42, { align: 'center' });
    
    // Subtle divider line
    this.doc.setDrawColor(...DESIGN.colors.primary);
    this.doc.setLineWidth(2);
    this.doc.line(this.margin, this.currentY + 55, this.pageWidth - this.margin, this.currentY + 55);
    
    this.currentY += 70;
  }

  /**
   * Add summary as clean cards instead of table
   */
  private addSummaryCards(summary: ReportSummary): void {
    this.doc.setTextColor(...DESIGN.colors.dark);
    this.doc.setFontSize(DESIGN.fonts.heading);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Summary', this.margin, this.currentY);
    
    this.currentY += DESIGN.spacing.paragraph;
    
    // Card layout for metrics (now 2 cards instead of 3)
    const cardWidth = (this.pageWidth - (2 * this.margin) - 10) / 2;
    const cardHeight = 35;
    const cardSpacing = 10;
    
    // Projects card
    this.addSummaryCard(
      this.margin,
      this.currentY,
      cardWidth,
      cardHeight,
      summary.totalProjects.toString(),
      'Bids Due',
      DESIGN.colors.primary
    );
    
    // Pending vendors card
    this.addSummaryCard(
      this.margin + cardWidth + cardSpacing,
      this.currentY,
      cardWidth,
      cardHeight,
      summary.totalPendingVendors.toString(),
      'Costs Pending',
      DESIGN.colors.pending
    );
    
    this.currentY += cardHeight + DESIGN.spacing.section;
  }

  /**
   * Add individual summary card
   */
  private addSummaryCard(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    value: string, 
    label: string, 
    accentColor: [number, number, number]
  ): void {
    // Card background
    this.doc.setFillColor(...DESIGN.colors.lightGray);
    this.doc.rect(x, y, width, height, 'F');
    
    // Accent border
    this.doc.setDrawColor(...accentColor);
    this.doc.setLineWidth(3);
    this.doc.line(x, y, x + width, y);
    
    // Value
    this.doc.setTextColor(...DESIGN.colors.dark);
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(value, x + width / 2, y + 18, { align: 'center' });
    
    // Label
    this.doc.setFontSize(DESIGN.fonts.body);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...DESIGN.colors.gray);
    this.doc.text(label, x + width / 2, y + 30, { align: 'center' });
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
      this.addCleanProjectSection(project, index === sortedProjects.length - 1);
    });
  }

  /**
   * Add individual project with clean, scannable design
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
    
    // Project header with clean styling
    this.doc.setFillColor(255, 255, 255); // White background
    this.doc.setDrawColor(...DESIGN.colors.border);
    this.doc.setLineWidth(1);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - (2 * this.margin), 25);
    
    // Project title
    this.doc.setTextColor(...DESIGN.colors.dark);
    this.doc.setFontSize(DESIGN.fonts.subheading);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(project.bid.title, this.margin + 10, this.currentY + 10);
    
    // Due date - simplified presentation
    const bidDueDate = new Date(project.bid.due_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((bidDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    let dueDateText = `Due: ${bidDueDate.toLocaleDateString()}`;
    if (daysUntilDue <= 7 && daysUntilDue >= 0) {
      dueDateText += ` (${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''})`;
    }
    
    this.doc.setFontSize(DESIGN.fonts.body);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...DESIGN.colors.gray);
    this.doc.text(dueDateText, this.pageWidth - this.margin - 10, this.currentY + 10, { align: 'right' });
    
    // Add pending vendor count to header
    if (totalPendingVendors > 0) {
      this.doc.setFontSize(DESIGN.fonts.small);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(...DESIGN.colors.pending);
      this.doc.text(
        `${totalPendingVendors} vendor${totalPendingVendors !== 1 ? 's' : ''} pending`,
        this.margin + 10,
        this.currentY + 20
      );
    }
    
    this.currentY += 35;
    
    // Create consolidated vendor table for all due dates
    this.addConsolidatedVendorTable(project);
    
    // Add spacing between projects
    if (!isLastProject) {
      this.currentY += DESIGN.spacing.paragraph;
    }
  }

  /**
   * Add consolidated vendor table for all due dates in a project
   */
  private addConsolidatedVendorTable(project: ProjectCostsDue): void {
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
        head: [['Vendor Company', 'Status', 'Due Date', 'Contact']],
        body: vendorTableData,
        theme: 'plain',
        headStyles: { 
          fillColor: false,
          textColor: DESIGN.colors.gray,
          fontSize: DESIGN.fonts.small,
          fontStyle: 'bold',
          lineColor: DESIGN.colors.border,
          lineWidth: 0.5
        },
        bodyStyles: { 
          fontSize: DESIGN.fonts.small,
          lineColor: DESIGN.colors.border,
          lineWidth: 0.1
        },
        margin: { left: this.margin + 15, right: this.margin },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 25, halign: 'center' as const },
          2: { cellWidth: 25, halign: 'center' as const },
          3: { cellWidth: 48 }
        },
        didParseCell: (data: any) => {
          // Style status column
          if (data.column.index === 1) {
            if (data.cell.text[0] === 'Complete') {
              data.cell.styles.textColor = DESIGN.colors.success;
              data.cell.styles.fontStyle = 'bold';
            } else if (data.cell.text[0] === 'Pending') {
              data.cell.styles.textColor = DESIGN.colors.pending;
              data.cell.styles.fontStyle = 'bold';
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
   * Add clean, professional footer
   */
  private addFooter(): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      // Simple footer line
      this.doc.setDrawColor(...DESIGN.colors.border);
      this.doc.setLineWidth(0.5);
      this.doc.line(this.margin, this.pageHeight - 20, this.pageWidth - this.margin, this.pageHeight - 20);
      
      // Footer text
      this.doc.setTextColor(...DESIGN.colors.gray);
      this.doc.setFontSize(DESIGN.fonts.caption);
      this.doc.setFont('helvetica', 'normal');
      
      this.doc.text(
        'With Pride Air Conditioning & Heating',
        this.margin,
        this.pageHeight - 12
      );
      
      this.doc.text(
        `Page ${i} of ${pageCount}`,
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