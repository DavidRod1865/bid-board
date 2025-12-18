/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// @ts-expect-error - Deno doesn't recognize these modules
import jsPDF from 'https://esm.sh/jspdf@2.5.1'
// @ts-expect-error - Deno doesn't recognize these modules
import autoTable from 'https://esm.sh/jspdf-autotable@3.6.0'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
    lastAutoTable?: {
      finalY: number;
    };
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TimelineEventEquipmentData {
  timeline_event_id: number;
  event_name: string;
  event_category: string;
  order_by: string | null;
  required_by: string | null;
  status: string;
  notes: string | null;
  project_id: number;
  project_name: string;
  project_address: string | null;
  project_start_date: string | null;
  general_contractor: string | null;
  equipment: {
    id: number;
    description: string;
    quantity: number;
    unit: string | null;
    po_number: string | null;
    date_received: string | null;
    vendor_name: string;
  }[];
}

// PDF Design constants for consistent styling
const DESIGN = {
  colors: {
    primary: [212, 175, 55] as [number, number, number], // Brand gold
    dark: [45, 45, 45] as [number, number, number], // Dark text
    gray: [128, 128, 128] as [number, number, number], // Muted text
    lightGray: [245, 245, 245] as [number, number, number], // Background
    success: [34, 139, 34] as [number, number, number], // Green
    pending: [255, 140, 0] as [number, number, number], // Orange
    overdue: [220, 53, 69] as [number, number, number], // Red
    border: [220, 220, 220] as [number, number, number], // Light border
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
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // @ts-ignore - Deno environment access
    const supabaseClient = createClient(
      Deno.env.get('VITE_SUPABASE_URL') ?? '',
      Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting Equipment Release Report generation...')

    // Calculate date ranges
    const today = new Date()
    const thirtyDaysFromNow = new Date(today)
    thirtyDaysFromNow.setDate(today.getDate() + 30)
    
    const todayFormatted = today.toISOString().split('T')[0]
    const thirtyDaysFormatted = thirtyDaysFromNow.toISOString().split('T')[0]

    console.log(`Looking for timeline events: future events within 30 days (${todayFormatted} to ${thirtyDaysFormatted}) + overdue events`)

    // Query timeline events that are pending, in_progress, or overdue within 30 days
    // Include: 1) Future events within 30 days, 2) Overdue events (past order_by date)
    const { data: timelineEvents, error: eventsError } = await supabaseClient
      .from('project_timeline_events')
      .select(`
        id,
        event_name,
        event_category,
        order_by,
        required_by,
        status,
        notes,
        project_id,
        projects!project_id (
          project_name,
          project_address,
          project_start_date,
          old_general_contractor
        )
      `)
      .in('status', ['pending', 'in_progress'])
      .not('order_by', 'is', null)
      .lte('order_by', thirtyDaysFormatted)
      .order('order_by', { ascending: true })

    if (eventsError) {
      throw new Error(`Failed to fetch timeline events: ${eventsError.message}`)
    }

    if (!timelineEvents || timelineEvents.length === 0) {
      console.log('No relevant timeline events found')
      return new Response(
        JSON.stringify({ 
          message: 'No timeline events found requiring equipment release within 30 days',
          success: true 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    console.log(`Found ${timelineEvents.length} timeline events`)

    // Get equipment associated with these timeline events
    const timelineEventIds = timelineEvents.map((te: any) => te.id)
    
    const { data: equipmentData, error: equipmentError } = await supabaseClient
      .from('project_equipment')
      .select(`
        id,
        description,
        quantity,
        unit,
        po_number,
        date_received,
        timeline_event_id,
        project_vendor_id,
        project_vendors!project_vendor_id (
          vendor_id,
          vendors!vendor_id (
            company_name
          )
        )
      `)
      .in('timeline_event_id', timelineEventIds)
      .order('timeline_event_id', { ascending: true })

    if (equipmentError) {
      throw new Error(`Failed to fetch equipment: ${equipmentError.message}`)
    }

    // Process the data to create the final report structure
    const processedData = processTimelineEventData(
      timelineEvents,
      equipmentData || []
    )

    console.log(`Processed: ${processedData.length} timeline events with equipment`)

    // Generate PDF report
    console.log('Generating PDF report...')
    const pdfResults = await generateEquipmentReleasePDF(processedData)
    console.log(`PDF generation result: reportFile=${pdfResults.reportFile ? 'generated' : 'null'}, filename=${pdfResults.filename}`)

    // Send email with PDF report
    let emailResult = null
    
    if (pdfResults.reportFile) {
      console.log('Sending PDF report email...')
      try {
        emailResult = await sendReportEmail(
          pdfResults.reportFile,
          pdfResults.filename,
          processedData.length
        ) as boolean
        console.log('Email sent successfully')
      } catch (emailError) {
        console.error('Failed to send email:', emailError)
        emailResult = false
      }
    } else {
      console.log('No PDF file generated, skipping email')
    }

    console.log('Equipment Release report generation completed successfully')

    return new Response(
      JSON.stringify({
        message: 'Equipment Release report generated successfully',
        eventsWithEquipment: processedData.length,
        totalEvents: timelineEvents.length,
        pdfGenerated: pdfResults.reportFile !== null,
        emailSent: emailResult === true,
        emailError: emailResult === false ? 'Email delivery failed' : undefined,
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in Equipment Release report generation:', error)
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

function processTimelineEventData(
  timelineEvents: any[],
  equipmentData: any[]
): TimelineEventEquipmentData[] {
  return timelineEvents.map(event => {
    // Get equipment for this timeline event
    const eventEquipment = equipmentData
      .filter(eq => eq.timeline_event_id === event.id)
      .map(eq => ({
        id: eq.id,
        description: eq.description,
        quantity: eq.quantity,
        unit: eq.unit,
        po_number: eq.po_number,
        date_received: eq.date_received,
        vendor_name: eq.project_vendors?.vendors?.company_name || 'Unknown Vendor'
      }))

    const project = event.projects

    return {
      timeline_event_id: event.id,
      event_name: event.event_name,
      event_category: event.event_category,
      order_by: event.order_by,
      required_by: event.required_by,
      status: event.status,
      notes: event.notes,
      project_id: event.project_id,
      project_name: project?.project_name || 'Unknown Project',
      project_address: project?.project_address,
      project_start_date: project?.project_start_date,
      general_contractor: project?.old_general_contractor,
      equipment: eventEquipment
    }
  }).filter(data => data.equipment.length > 0) // Only include events that have equipment
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Not set'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getStatusColor(status: string, isOverdue: boolean): [number, number, number] {
  if (isOverdue) {
    return DESIGN.colors.overdue
  }
  
  switch (status.toLowerCase()) {
    case 'pending':
      return DESIGN.colors.pending
    case 'in_progress':
      return DESIGN.colors.primary
    case 'completed':
      return DESIGN.colors.success
    default:
      return DESIGN.colors.overdue
  }
}

function isOverdue(orderByDate: string | null): boolean {
  if (!orderByDate) return false
  const today = new Date()
  const orderDate = new Date(orderByDate)
  return orderDate < today
}

async function generateEquipmentReleasePDF(events: TimelineEventEquipmentData[]): Promise<{ reportFile: Uint8Array | null; filename: string }> {
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '').replace('T', '_')
  const filename = `Equipment_Release_Report_${timestamp}.pdf`
  let reportFile: Uint8Array | null = null

  if (events.length > 0) {
    try {
      // Create PDF using jsPDF with landscape layout
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter'
      })

      // Page dimensions
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 8

      // Company header
      doc.setFillColor(...DESIGN.colors.headerBg)
      doc.rect(0, 0, pageWidth, 40, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('With Pride Air Conditioning & Heating', pageWidth/2, 15, { align: 'center' })
      
      doc.setFontSize(14)
      doc.setFont('helvetica', 'normal')
      doc.text('Equipment Release Report - 30 Day Outlook', pageWidth/2, 25, { align: 'center' })
      
      const currentDate = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
      doc.setFontSize(10)
      doc.text(`Generated on ${currentDate}`, pageWidth/2, 32, { align: 'center' })

      // Summary section
      let yPos = 50
      doc.setTextColor(...DESIGN.colors.dark)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      
      const totalEquipment = events.reduce((sum, event) => sum + event.equipment.length, 0)
      const pendingEvents = events.filter(e => e.status === 'pending').length
      const inProgressEvents = events.filter(e => e.status === 'in_progress').length
      const overdueEvents = events.filter(e => isOverdue(e.order_by)).length
      
      doc.text(`Equipment Release Summary - ${events.length} Events, ${totalEquipment} Equipment Items`, margin, yPos)
      
      yPos += 8
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`• Pending Events: ${pendingEvents} • In Progress: ${inProgressEvents} • Overdue: ${overdueEvents}`, margin, yPos)

      // Prepare table data
      const tableData: (string | { content: string; styles?: any })[][] = []

      events.forEach((eventData) => {
        eventData.equipment.forEach((equipment, equipmentIndex) => {
          const isEventOverdue = isOverdue(eventData.order_by)
          const statusColor = getStatusColor(eventData.status, isEventOverdue)
          
          tableData.push([
            equipmentIndex === 0 ? eventData.project_name : '',
            equipmentIndex === 0 ? (eventData.project_address || 'Not provided') : '',
            equipmentIndex === 0 ? (eventData.general_contractor || 'Not specified') : '',
            equipmentIndex === 0 ? formatDate(eventData.project_start_date) : '',
            equipmentIndex === 0 ? eventData.event_name : '',
            equipmentIndex === 0 ? eventData.event_category.charAt(0).toUpperCase() + eventData.event_category.slice(1) : '',
            equipmentIndex === 0 ? formatDate(eventData.order_by) : '',
            equipmentIndex === 0 ? {
              content: isEventOverdue ? 'OVERDUE' : eventData.status.replace('_', ' ').toUpperCase(),
              styles: { 
                fillColor: statusColor,
                textColor: DESIGN.colors.white,
                fontStyle: 'bold'
              }
            } : '',
            equipment.vendor_name,
            equipment.description,
            `${equipment.quantity} ${equipment.unit || ''}`.trim(),
            equipment.po_number || '-',
            equipment.date_received ? formatDate(equipment.date_received) : 'Not received'
          ])
        })
      })

      // Add table using autoTable
      yPos += 10
      autoTable(doc, {
        startY: yPos,
        head: [[
          'Project Name',
          'Project Address', 
          'General Contractor',
          'Project Start',
          'Event Name',
          'Category',
          'Order By',
          'Status',
          'Vendor',
          'Equipment Description',
          'Quantity',
          'PO Number',
          'Date Received'
        ]],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 7,
          cellPadding: 2,
          lineColor: DESIGN.colors.border,
          lineWidth: 0.3
        },
        headStyles: {
          fillColor: DESIGN.colors.headerBg,
          textColor: DESIGN.colors.white,
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        columnStyles: {
          0: { cellWidth: 22, fontStyle: 'bold', fontSize: 6 },  // Project Name
          1: { cellWidth: 20, fontSize: 6 },                     // Project Address
          2: { cellWidth: 18, fontSize: 6 },                     // GC
          3: { cellWidth: 15, halign: 'center', fontSize: 6 },   // Start Date
          4: { cellWidth: 20, fontStyle: 'bold', fontSize: 6 },  // Event Name
          5: { cellWidth: 12, halign: 'center', fontSize: 6 },   // Category
          6: { cellWidth: 15, halign: 'center', fontSize: 6 },   // Order By
          7: { cellWidth: 16, halign: 'center', fontSize: 6 },   // Status
          8: { cellWidth: 18, fontStyle: 'bold', fontSize: 6 },  // Vendor
          9: { cellWidth: 25, fontSize: 6 },                     // Equipment
          10: { cellWidth: 12, halign: 'center', fontSize: 6 },  // Quantity
          11: { cellWidth: 15, halign: 'center', fontSize: 6 },  // PO
          12: { cellWidth: 15, halign: 'center', fontSize: 6 },  // Received
        },
        margin: { left: margin, right: margin }
      })

      // Footer
      doc.setTextColor(...DESIGN.colors.gray)
      doc.setFontSize(8)
      doc.text('With Pride Air Conditioning & Heating | Equipment Release Report', pageWidth/2, pageHeight - 15, { align: 'center' })
      doc.text(`Generated ${currentDate} | Bi-Weekly Report (1st & 15th)`, pageWidth/2, pageHeight - 8, { align: 'center' })

      // Convert to Uint8Array
      const pdfBuffer = doc.output('arraybuffer')
      reportFile = new Uint8Array(pdfBuffer)
      
    } catch (error) {
      console.error('Error generating PDF report:', error)
      reportFile = null
    }
  }

  return { reportFile, filename }
}

async function sendReportEmail(
  fileData: Uint8Array,
  filename: string,
  eventCount: number
): Promise<boolean> {
  try {
    // @ts-ignore - Deno environment access
    const apiKey = Deno.env.get('VITE_SMTP2GO_API_KEY')
    // @ts-ignore - Deno environment access
    const senderEmail = Deno.env.get('VITE_SMTP2GO_SENDER_EMAIL')
    // @ts-ignore - Deno environment access
    const recipientEmail = Deno.env.get('APM_EMAIL')

    if (!apiKey || !senderEmail || !recipientEmail) {
      throw new Error('Missing email configuration')
    }

    // Convert Uint8Array to base64
    let binary = '';
    const bytes = new Uint8Array(fileData);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Data = btoa(binary);

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const subject = `Equipment Release Report - ${currentDate} - ${eventCount} Events Requiring Action`

    const htmlBody = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Equipment Release Report</title>
        <style>
          body { 
            font-family: Arial, sans-serif;
            line-height: 1.6; 
            color: #333;
            margin: 0;
            padding: 0;
          }
          .email-wrapper {
            width: 100%;
            background-color: #f4f4f4;
            padding: 20px 0;
          }
          .email-container {
            width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
          }
          .header { 
            background-color: #365f92;
            color: white; 
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0 0 10px 0;
            font-size: 26px;
          }
          .header h2 {
            margin: 0;
            font-size: 18px;
            font-weight: normal;
          }
          .content { 
            padding: 30px 25px;
          }
          .footer { 
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
            background-color: #f9f9f9;
            border-top: 1px solid #e0e0e0;
          }
          strong {
            color: #365f92;
          }
          .urgent {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <table class="email-container" width="600" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="header">
                    <h1>With Pride Air Conditioning & Heating</h1>
                    <h2>Equipment Release Report</h2>
                  </td>
                </tr>
                <tr>
                  <td class="content">
                    <p>Dear APM Team,</p>
                    
                    <p>Please find attached the bi-weekly Equipment Release Report for <strong>${currentDate}</strong>.</p>
                    
                    <div class="urgent">
                      <strong>📋 ${eventCount} Timeline Events require equipment ordering action within the next 30 days.</strong>
                    </div>
                    
                    <p>This report includes:</p>
                    <ul>
                      <li><strong>Timeline Events</strong> - Project milestones requiring equipment</li>
                      <li><strong>Equipment Details</strong> - Specific equipment needed for each event</li>
                      <li><strong>Order Dates</strong> - When equipment must be ordered to meet project schedules</li>
                      <li><strong>Project Context</strong> - Project names, addresses, and contractors</li>
                      <li><strong>Vendor Information</strong> - Equipment suppliers and PO tracking</li>
                    </ul>
                    
                    <p><strong>Action Items:</strong></p>
                    <ul>
                      <li>Review each event's "Order By" date to prioritize equipment orders</li>
                      <li>Coordinate with vendors on equipment availability and delivery</li>
                      <li>Update equipment status once orders are placed</li>
                      <li>Monitor project start dates to ensure equipment arrives on time</li>
                    </ul>
                    
                    <p>Best regards,<br>
                    With Pride Bid Board System</p>
                  </td>
                </tr>
                <tr>
                  <td class="footer">
                    <p>This report automatically generates bi-weekly (1st & 15th of each month)<br>
                    Powered by <a href="https://wpbidboard.netlify.app">With Pride Bid Board</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

    const emailRequest = {
      sender: senderEmail,
      to: [recipientEmail],
      subject,
      html_body: htmlBody,
      attachments: [
        {
          filename: filename,
          fileblob: base64Data,
          mimetype: 'application/pdf'
        }
      ]
    }

    console.log('Sending email to:', recipientEmail)
    console.log('PDF attachment size:', fileData.length, 'bytes')

    const response = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Smtp2go-Api-Key': apiKey
      },
      body: JSON.stringify(emailRequest)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`SMTP2GO API error (${response.status}): ${errorText}`)
    }

    const result = await response.json()
    
    if (result.data && result.data.failed > 0) {
      throw new Error('Email sending failed on SMTP2GO server')
    }

    console.log('Equipment Release Report email sent successfully')
    return true

  } catch (error) {
    console.error('Failed to send Equipment Release Report email:', error)
    throw error
  }
}