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

interface ActiveProjectReportData {
  project: Record<string, unknown>;
  vendors: Record<string, unknown>[];
  mostRecentNote: string;
  equipmentRequestInfo: {
    vendorName: string;
    equipmentRequestedDate: string | null;
    equipmentReleasedDate: string | null;
    equipmentReleaseNotes: string;
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
  },
  spacing: {
    section: 30,
    paragraph: 20,
    line: 8,
    projectSeparator: 15,
  }
}



serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // @ts-ignore - Deno environment access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting active project report generation...')

    // Calculate target dates
    const today = new Date()
    const sixtyDaysFromNow = new Date(today)
    sixtyDaysFromNow.setDate(today.getDate() + 60)
    
    const todayFormatted = today.toISOString().split('T')[0]
    const sixtyDaysFormatted = sixtyDaysFromNow.toISOString().split('T')[0]

    console.log(`Looking for projects with start dates between ${todayFormatted} and ${sixtyDaysFormatted}`)

    // Query active projects within 60 days
    const { data: projects, error: projectsError } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('sent_to_apm', true)
      .eq('apm_activity_cycle', 'Active')
      .not('project_start_date', 'is', null)
      .gte('project_start_date', todayFormatted)
      .lte('project_start_date', sixtyDaysFormatted)
      .order('project_start_date', { ascending: true })

    if (projectsError) {
      throw new Error(`Failed to fetch projects: ${projectsError.message}`)
    }

    if (!projects || projects.length === 0) {
      console.log('No projects found with start dates within 60 days')
      return new Response(
        JSON.stringify({ 
          message: 'No projects found with start dates within 60 days from now',
          success: true 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    console.log(`Found ${projects.length} projects`)

    const projectIds = projects.map(p => p.id)

    // Get bid vendors
    const { data: projectVendors, error: projectVendorsError } = await supabaseClient
      .from('project_vendors')
      .select('*')
      .in('project_id', projectIds)

    if (projectVendorsError) {
      throw new Error(`Failed to fetch project vendors: ${projectVendorsError.message}`)
    }

    // Get vendors
    const vendorIds = [...new Set(projectVendors?.map(pv => pv.vendor_id) || [])]
    const { data: vendors, error: vendorsError } = await supabaseClient
      .from('vendors')
      .select('*')
      .in('id', vendorIds)

    if (vendorsError) {
      throw new Error(`Failed to fetch vendors: ${vendorsError.message}`)
    }

    // Get project notes
    const { data: projectNotes, error: notesError } = await supabaseClient
      .from('project_notes')
      .select(`
        *,
        user:users(name, color_preference)
      `)
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })

    if (notesError) {
      throw new Error(`Failed to fetch project notes: ${notesError.message}`)
    }

    // Process the data (already sorted by project_start_date)
    const processedData = processProjectData(
      projects,
      projectVendors || [],
      vendors || [],
      projectNotes || []
    )

    console.log(`Processed: ${processedData.length} projects within 60 days`)

    // Generate PDF report only
    console.log('Generating PDF report...')
    const pdfResults = await generatePDFReport(processedData)
    console.log(`PDF generation result: reportFile=${pdfResults.reportFile ? 'generated' : 'null'}, filename=${pdfResults.filename}`)

    // Send email with PDF report
    let emailResult = null
    
    if (pdfResults.reportFile) {
      console.log('Sending PDF report email...')
      try {
        emailResult = await sendReportEmail(
          pdfResults.reportFile,
          pdfResults.filename,
          'Within 60 Days',
          processedData.length
        )
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
        projectsWithin60Days: processedData.length,
        pdfGenerated: pdfResults.reportFile !== null,
        emailSent: emailResult === true,
        emailError: emailResult === false ? 'Email delivery failed' : null,
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in active project report generation:', error)
    
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

function processProjectData(
  projects: Record<string, unknown>[],
  projectVendors: Record<string, unknown>[],
  vendors: Record<string, unknown>[],
  projectNotes: Record<string, unknown>[]
): ActiveProjectReportData[] {
  return projects.map(project => {
    // Get vendors for this project
    const projectBidVendors = projectVendors.filter(pv => pv.project_id === project.id)
    const projectVendorsList = projectBidVendors
      .map(pv => vendors.find(v => v.id === pv.vendor_id))
      .filter(v => v !== undefined)

    // Get most recent project note
    const projectSpecificNotes = projectNotes.filter(note => note.project_id === project.id)
    const mostRecentNote = getMostRecentNote(projectSpecificNotes)

    // Get equipment request information for each vendor
    const equipmentRequestInfo = projectBidVendors.map(pv => {
      const vendor = vendors.find(v => v.id === pv.vendor_id)
      return {
        vendorName: (vendor?.company_name as string) || 'Unknown Vendor',
        equipmentRequestedDate: null, // Legacy field not in normalized structure
        equipmentReleasedDate: null, // Legacy field not in normalized structure
        equipmentReleaseNotes: '' // Legacy field not in normalized structure
      }
    })

    return {
      project,
      vendors: projectVendorsList,
      mostRecentNote,
      equipmentRequestInfo
    }
  })
}

function getMostRecentNote(projectNotes: Record<string, unknown>[]): string {
  if (projectNotes.length === 0) {
    return 'No notes available'
  }

  const sortedNotes = projectNotes.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const mostRecent = sortedNotes[0]
  const noteDate = formatDate(mostRecent.created_at)
  const noteAuthor = mostRecent.user?.name || 'Unknown'

  return `[${noteDate} - ${noteAuthor}] ${mostRecent.content}`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

async function generatePDFReport(projects: ActiveProjectReportData[]): Promise<{ reportFile: Uint8Array | null; filename: string }> {
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '').replace('T', '_')
  const filename = `Equipment_Release_Report_${timestamp}.pdf`
  let reportFile: Uint8Array | null = null

  if (projects.length > 0) {
    try {
      // Create PDF using jsPDF with table layout
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter'
      })

      // Page dimensions
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 5

      // Company header
      doc.setFillColor(...DESIGN.colors.headerBg)
      doc.rect(0, 0, pageWidth, 40, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('With Pride Air Conditioning & Heating', pageWidth/2, 15, { align: 'center' })
      
      doc.setFontSize(14)
      doc.setFont('helvetica', 'normal')
      doc.text('Equipment Release Report', pageWidth/2, 25, { align: 'center' })
      
      const currentDate = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
      doc.setFontSize(10)
      doc.text(`Generated on ${currentDate}`, pageWidth/2, 32, { align: 'center' })

      // Summary card
      let yPos = 50
      doc.setTextColor(...DESIGN.colors.dark)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(`Report Summary - ${projects.length.toString()} Projects Starting Within 60 Days`, margin, yPos)

      // Prepare table data
      const tableData: string[][] = []

      projects.forEach((projectData) => {
        const project = projectData.project
        const vendors = projectData.vendors || []
        const equipmentInfo = projectData.equipmentRequestInfo || []
        const mostRecentNote = projectData.mostRecentNote

        const startDate = project.project_start_date ? 
          new Date(project.project_start_date as string).toLocaleDateString() : 'Not set'
        
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
          ])
        } else {
          vendors.forEach((vendor: Record<string, unknown>, vendorIndex) => {
            const equipment = equipmentInfo.find(eq => eq.vendorName === vendor.company_name)
            
            const requestedDate = equipment?.equipmentRequestedDate ? 
              new Date(equipment.equipmentRequestedDate).toLocaleDateString() : '-'
            const releasedDate = equipment?.equipmentReleasedDate ? 
              new Date(equipment.equipmentReleasedDate).toLocaleDateString() : '-'
            
            let equipmentStatus = 'No Request'
            if (equipment?.equipmentRequestedDate) {
              if (equipment?.equipmentReleasedDate) {
                equipmentStatus = 'Released'
              } else {
                equipmentStatus = 'Pending Release'
              }
            }

            // Use equipment release notes for each vendor instead of general project notes
            const equipmentNotes = equipment?.equipmentReleaseNotes || ''

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
            ])
          })
        }
      })

      // Add table using autoTable
      yPos += 5
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
        didParseCell: function(data: { column: { index: number }; cell: { text: string[]; styles: Record<string, unknown> } }) {
          // Apply status-specific styling
          if (data.column.index === 7) { // Status column
            const status = data.cell.text[0]?.toLowerCase() || ''
            if (status.includes('released')) {
              data.cell.styles.fillColor = DESIGN.colors.success
              data.cell.styles.textColor = DESIGN.colors.white
            } else if (status.includes('pending')) {
              data.cell.styles.fillColor = DESIGN.colors.pending
              data.cell.styles.textColor = DESIGN.colors.white
            } else {
              data.cell.styles.fillColor = [200, 50, 50]
              data.cell.styles.textColor = DESIGN.colors.white
            }
          }
        },
        margin: { left: margin, right: margin }
      })

      // Footer - add it at the bottom of the page
      doc.setTextColor(...DESIGN.colors.gray)
      doc.setFontSize(8)
      doc.text('With Pride Air Conditioning & Heating', pageWidth/2, pageHeight - 15, { align: 'center' })
      doc.text(`Equipment Release Report | Generated ${currentDate}`, pageWidth/2, pageHeight - 8, { align: 'center' })

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
  dateRange: string,
  projectCount: number
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

    // Convert Uint8Array to base64 - using a more robust method for large files
    let binary = '';
    const bytes = new Uint8Array(fileData);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Data = btoa(binary);
    
    console.log(`File size: ${fileData.length} bytes`)
    console.log(`Base64 data length: ${base64Data.length} chars`)
    console.log(`Filename: ${filename}`)
    console.log(`Base64 prefix: ${base64Data.substring(0, 50)}...`)

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    const subject = `Equipment Release Report - ${currentDate} - ${projectCount} Projects`

    const htmlBody = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Active Projects Report</title>
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
                    
                    <p>Please find attached the equipment release report for projects starting within 60 days (<strong>as of ${currentDate}</strong>).</p>
                    
                    <p><strong>A total of ${projectCount} projects fall within 60 day window.</strong></p>
                    <p>The attached report includes:</p>
                    <ul>
                      <li>Project name, address, and general contractor</li>
                      <li>Equipment request and release status</li>
                      <li>Notes for each vendor regarding equipment release</li>
                    </ul>
                    
                    <p>Best regards,<br>
                    With Pride Bid Board</p>
                  </td>
                </tr>
                <tr>
                  <td class="footer">
                    <p>This report will automatically generate on the 1st and 15th of each month by the <a href="https://wpbidboard.netlify.app">
                    With Pride Bid Board</a>.</p>
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
    
    // Validate the email request before sending
    if (!emailRequest.sender || emailRequest.sender.trim() === '') {
      throw new Error('Invalid sender email')
    }
    if (!emailRequest.to || emailRequest.to.length === 0) {
      throw new Error('Invalid recipient email')
    }
    if (!emailRequest.attachments || emailRequest.attachments.length === 0) {
      throw new Error('No attachments provided')
    }
    if (!emailRequest.attachments[0].fileblob || emailRequest.attachments[0].fileblob === '') {
      throw new Error('Invalid attachment data')
    }
    
    console.log('Email request structure:', {
      sender: emailRequest.sender,
      to: emailRequest.to,
      subject: emailRequest.subject,
      attachmentCount: emailRequest.attachments.length,
      attachmentFilename: emailRequest.attachments[0].filename,
      attachmentMimetype: emailRequest.attachments[0].mimetype,
      attachmentDataLength: emailRequest.attachments[0].fileblob.length,
      recipientEmail,
      apiKeyPresent: !!apiKey,
      senderEmailPresent: !!senderEmail
    })

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

    console.log(`Email sent successfully for ${dateRange} projects`)
    return true

  } catch (error) {
    console.error(`Failed to send email for ${dateRange} projects:`, error)
    throw error
  }
}