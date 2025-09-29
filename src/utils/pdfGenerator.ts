import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { 
  WeeklyDueReport, 
  ProjectCostsDue, 
  ReportSummary, 
  VendorCostsDueData 
} from './reportFilters';
import { 
  formatDueDate, 
  getDueDateUrgency, 
  sortProjectsByUrgency 
} from './reportFilters';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

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
    this.margin = 20;
    this.currentY = this.margin;
  }

  /**
   * Generate complete PDF report
   */
  generateReport(report: WeeklyDueReport, summary: ReportSummary): Blob {
    this.addHeader();
    this.addSummary(summary);
    this.addProjectDetails(report);
    this.addFooter();
    
    return this.doc.output('blob');
  }

  /**
   * Add header with company branding
   */
  private addHeader(): void {
    // Company header background
    this.doc.setFillColor(212, 175, 55); // #d4af37
    this.doc.rect(0, 0, this.pageWidth, 50, 'F');
    
    // Company name
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('With Pride HVAC', this.pageWidth / 2, 20, { align: 'center' });
    
    // Report title
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Weekly Bids & Vendor Costs Due Report', this.pageWidth / 2, 35, { align: 'center' });
    
    this.currentY = 60;
  }

  /**
   * Add executive summary section
   */
  private addSummary(summary: ReportSummary): void {
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Executive Summary', this.margin, this.currentY);
    
    this.currentY += 10;
    
    // Summary table
    const summaryData = [
      ['Report Date', summary.reportDate],
      ['Projects with Upcoming Deadlines', summary.totalProjects.toString()],
      ['Vendors with Pending Submissions', summary.totalPendingVendors.toString()],
      ['Vendors with Submitted Costs', summary.totalSubmittedVendors.toString()]
    ];
    
    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { 
        fillColor: [212, 175, 55],
        textColor: [255, 255, 255],
        fontSize: 12,
        fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 11 },
      margin: { left: this.margin, right: this.margin },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 50, halign: 'center' }
      }
    });
    
    this.currentY = (this.doc as any).lastAutoTable.finalY + 20;
  }

  /**
   * Add detailed project information
   */
  private addProjectDetails(report: WeeklyDueReport): void {
    const sortedProjects = sortProjectsByUrgency(report);
    
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Project Details', this.margin, this.currentY);
    
    this.currentY += 15;
    
    sortedProjects.forEach((project, index) => {
      this.addProjectSection(project, index === sortedProjects.length - 1);
    });
  }

  /**
   * Add individual project section
   */
  private addProjectSection(project: ProjectCostsDue, isLastProject: boolean): void {
    // Check if we need a new page
    if (this.currentY > this.pageHeight - 100) {
      this.doc.addPage();
      this.currentY = this.margin;
    }
    
    // Project header
    this.doc.setFillColor(248, 249, 250); // Light gray background
    this.doc.rect(this.margin, this.currentY - 5, this.pageWidth - (2 * this.margin), 20, 'F');
    
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(
      `PROJECT: ${project.bid.title}`, 
      this.margin + 5, 
      this.currentY + 8
    );
    
    // Project bid due date with urgency indicator
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    const bidDueDate = new Date(project.bid.due_date);
    const today = new Date();
    const isWithinWeek = (bidDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 7;
    
    if (isWithinWeek) {
      this.doc.setTextColor(220, 53, 69); // Red for urgent bid
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(
        `⚠ BID DUE: ${bidDueDate.toLocaleDateString()}`,
        this.pageWidth - this.margin - 5,
        this.currentY + 8,
        { align: 'right' }
      );
    } else {
      this.doc.setTextColor(108, 117, 125); // Gray for non-urgent
      this.doc.text(
        `Bid Due: ${bidDueDate.toLocaleDateString()}`,
        this.pageWidth - this.margin - 5,
        this.currentY + 8,
        { align: 'right' }
      );
    }
    
    this.currentY += 25;
    
    // Process each due date for this project
    const sortedDueDates = Object.keys(project.dueDates).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
    
    sortedDueDates.forEach(dueDate => {
      this.addDueDateSection(dueDate, project.dueDates[dueDate]);
    });
    
    // Add spacing between projects
    if (!isLastProject) {
      this.currentY += 10;
    }
  }

  /**
   * Add due date section with vendor details
   */
  private addDueDateSection(
    dueDate: string, 
    dueDateData: { totalVendors: number; pendingVendors: VendorCostsDueData[]; submittedVendors: VendorCostsDueData[] }
  ): void {
    const urgency = getDueDateUrgency(dueDate);
    const formattedDate = formatDueDate(dueDate);
    
    // Due date header with urgency color
    let headerColor: [number, number, number] = [108, 117, 125]; // Default gray
    if (urgency === 'today') headerColor = [220, 53, 69]; // Red
    else if (urgency === 'tomorrow') headerColor = [255, 193, 7]; // Yellow
    else if (urgency === 'thisWeek') headerColor = [255, 152, 0]; // Orange
    
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...headerColor);
    this.doc.text(
      `Vendor Costs Due: ${formattedDate}`,
      this.margin + 10,
      this.currentY
    );
    
    this.currentY += 12;
    
    // Create vendor table data
    const vendorTableData: string[][] = [];
    
    // Add submitted vendors first
    dueDateData.submittedVendors.forEach(vendorData => {
      vendorTableData.push([
        '✓',
        vendorData.vendor?.company_name || 'Unknown Vendor',
        'Submitted',
        vendorData.vendor?.contact_person || '-',
        vendorData.vendor?.phone || '-',
        vendorData.vendor?.email || '-'
      ]);
    });
    
    // Add pending vendors
    dueDateData.pendingVendors.forEach(vendorData => {
      vendorTableData.push([
        '⚠',
        vendorData.vendor?.company_name || 'Unknown Vendor',
        'PENDING',
        vendorData.vendor?.contact_person || '-',
        vendorData.vendor?.phone || '-',
        vendorData.vendor?.email || '-'
      ]);
    });
    
    if (vendorTableData.length > 0) {
      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Status', 'Vendor', 'Cost Status', 'Contact', 'Phone', 'Email']],
        body: vendorTableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [52, 58, 64],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: { fontSize: 8 },
        margin: { left: this.margin + 15, right: this.margin },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 35 },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 35 }
        },
        didParseCell: (data: any) => {
          // Style pending rows differently
          if (data.cell.text[0] === '⚠') {
            data.cell.styles.textColor = [220, 53, 69]; // Red for pending
            if (data.column.index === 2) { // Cost Status column
              data.cell.styles.fontStyle = 'bold';
            }
          } else if (data.cell.text[0] === '✓') {
            data.cell.styles.textColor = [40, 167, 69]; // Green for submitted
          }
        }
      });
      
      this.currentY = (this.doc as any).lastAutoTable.finalY;
    }
    
    // Add summary for this due date
    const pendingCount = dueDateData.pendingVendors.length;
    
    this.doc.setTextColor(0, 0, 0);
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'italic');
    this.doc.text(
      `Summary: ${pendingCount} of ${dueDateData.totalVendors} vendors pending`,
      this.margin + 15,
      this.currentY + 8
    );
    
    this.currentY += 20;
  }

  /**
   * Add footer
   */
  private addFooter(): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      // Footer line
      this.doc.setDrawColor(212, 175, 55);
      this.doc.setLineWidth(0.5);
      this.doc.line(this.margin, this.pageHeight - 25, this.pageWidth - this.margin, this.pageHeight - 25);
      
      // Footer text
      this.doc.setTextColor(128, 128, 128);
      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'normal');
      
      this.doc.text(
        'Generated by Bid Dashboard System - With Pride HVAC',
        this.margin,
        this.pageHeight - 15
      );
      
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth - this.margin,
        this.pageHeight - 15,
        { align: 'right' }
      );
      
      this.doc.text(
        new Date().toLocaleString(),
        this.pageWidth / 2,
        this.pageHeight - 15,
        { align: 'center' }
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