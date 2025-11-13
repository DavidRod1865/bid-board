// Insurance Expiry Report Edge Function
// Sends bi-weekly email reports for vendors with insurance certificates expiring within 30 days

/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from 'supabase';

interface VendorInsuranceData {
  id: number;
  company_name: string;
  address?: string;
  insurance_expiry_date: string;
  primary_contact_id?: number;
  vendor_contacts?: {
    contact_name: string;
    phone: string;
    email: string;
    contact_title: string;
  };
}

interface EmailRequest {
  sender: string;
  to: string[];
  subject: string;
  html_body: string;
}

interface EmailResponse {
  request_id: string;
  data: {
    email_id: string;
    succeeded: number;
    failed: number;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate HTML email template for insurance expiry report
function generateInsuranceExpiryEmailTemplate(vendors: VendorInsuranceData[]): string {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long", 
    day: "numeric",
  });

  const vendorRows = vendors.map(vendor => {
    const contact = vendor.vendor_contacts;
    const contactName = contact?.contact_name || 'N/A';
    const contactPhone = contact?.phone || '';
    const contactInfo = contactPhone ? `${contactName} - ${contactPhone}` : contactName;
    const contactEmail = contact?.email || 'N/A';
    
    return `
    <tr>
      <td>${vendor.company_name}</td>
      <td>${vendor.address || 'N/A'}</td>
      <td>${contactInfo}</td>
      <td>${contactEmail}</td>
      <td>${new Date(vendor.insurance_expiry_date).toLocaleDateString('en-US')}</td>
    </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Expiring Insurance Certificates - Bi-weekly Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
        }
        .container {
          width: 90%;
          max-width: 800px;
          margin: 40px auto;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background-color: #eed202;
          color: black;
          text-align: center;
          padding: 20px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 20px;
        }
        .content h2 {
          color: #333;
          font-size: 18px;
          margin-bottom: 10px;
        }
        .summary-box {
          background-color: #fffbf0;
          border: 1px solid #eed202;
          padding: 15px;
          margin: 20px 0;
          border-radius: 5px;
        }
        .summary-box h3 {
          margin: 0 0 10px 0;
          color: #d4af37;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          margin-top: 15px;
        }
        th, td {
          text-align: left;
          padding: 10px;
          border-bottom: 1px solid #ddd;
        }
        th {
          background-color: #eed202;
          color: black;
        }
        tr:hover {
          background-color: #f1f1f1;
        }
        .footer {
          text-align: center;
          background-color: #f0f0f0;
          color: #555;
          font-size: 13px;
          padding: 15px;
        }
        .no-vendors {
          background-color: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
          padding: 15px;
          margin: 20px 0;
          border-radius: 5px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>With Pride Heating & Air Conditioning Inc.</h1>
        </div>

        <!-- Content -->
        <div class="content">
          <h2>Expiring Insurance Certificates Report</h2>
          <p><strong>Report Date:</strong> ${currentDate}</p>
          <p>
            Below is a list of vendors whose insurance certificates are expiring within the next 30 days.
            Please review and take necessary action to ensure compliance and uninterrupted service coverage.
          </p>

          <div class="summary-box">
            <h3>Summary</h3>
            <p><strong>${vendors.length}</strong> vendor${vendors.length !== 1 ? 's have' : ' has'} insurance certificate${vendors.length !== 1 ? 's' : ''} expiring within 30 days.</p>
            ${vendors.length > 0 ? '<p><strong>Action Required:</strong> Contact these vendors to request updated insurance certificates.</p>' : ''}
          </div>

          ${vendors.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Vendor Name</th>
                <th>Address</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Expiration Date</th>
              </tr>
            </thead>
            <tbody>
              ${vendorRows}
            </tbody>
          </table>
          ` : `
          <div class="no-vendors">
            <p><strong>Good News!</strong> No vendor insurance certificates are expiring within the next 30 days.</p>
          </div>
          `}
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>
            &copy; With Pride Heating & Air Conditioning Inc. | 77 Marine Street, Farmingdale, NY 11735 <br/>
            Tel: (516) 731-2573 | Fax: (516) 731-0576
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Send email via SMTP2GO
async function sendEmailViaSMTP2GO(
  apiKey: string,
  senderEmail: string,
  recipients: string[],
  subject: string,
  htmlBody: string
): Promise<EmailResponse> {
  const emailRequest: EmailRequest = {
    sender: senderEmail,
    to: recipients,
    subject,
    html_body: htmlBody,
  };

  const response = await fetch("https://api.smtp2go.com/v3/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Smtp2go-Api-Key": apiKey,
    },
    body: JSON.stringify(emailRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SMTP2GO API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  // Check if email was successfully sent
  if (result.data && result.data.failed > 0) {
    throw new Error("Email sending failed on SMTP2GO server");
  }

  return result;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY');
    const smtp2goApiKey = Deno.env.get('VITE_SMTP2GO_API_KEY');
    const senderEmail = Deno.env.get('VITE_SMTP2GO_SENDER_EMAIL');
    const hrEmail = Deno.env.get('HR_EMAIL') || 'davidr@withpridehvac.net';

    // Validate required environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!smtp2goApiKey || !senderEmail) {
      throw new Error('Missing SMTP2GO configuration');
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // console.log('Starting insurance expiry report generation...');

    // Calculate date 30 days from now
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const thirtyDaysFromNowStr = thirtyDaysFromNow.toISOString().split('T')[0];

    // Query vendors with insurance expiring within 30 days
    const { data: vendorsData, error: queryError } = await supabase
      .from('vendors')
      .select(`
        id,
        company_name,
        address,
        insurance_expiry_date,
        primary_contact_id
      `)
      .not('insurance_expiry_date', 'is', null)
      .lte('insurance_expiry_date', thirtyDaysFromNowStr)
      .order('insurance_expiry_date', { ascending: true });

    if (queryError) {
      throw new Error(`Database query failed: ${queryError.message}`);
    }

    // Get contact info for each vendor
    const vendors: VendorInsuranceData[] = [];
    for (const vendor of vendorsData || []) {
      let contactInfo = null;
      
      if (vendor.primary_contact_id) {
        const { data: contact } = await supabase
          .from('vendor_contacts')
          .select('contact_name, phone, email, contact_title')
          .eq('id', vendor.primary_contact_id)
          .single();
        
        contactInfo = contact;
      }
      
      vendors.push({
        ...vendor,
        vendor_contacts: contactInfo
      });
    }

    // console.log(`Found ${vendors?.length || 0} vendors with insurance expiring within 30 days`);

    // Filter out vendors with past expiry dates (just in case)
    const today = new Date().toISOString().split('T')[0];
    const validVendors: VendorInsuranceData[] = (vendors || []).filter(
      (vendor: any) => vendor.insurance_expiry_date >= today
    );

    console.log(`Filtered to ${validVendors.length} vendors with future expiry dates`);

    // Generate email content
    const htmlBody = generateInsuranceExpiryEmailTemplate(validVendors);
    const subject = validVendors.length > 0 
      ? `Insurance Expiry Alert - ${validVendors.length} Certificate${validVendors.length !== 1 ? 's' : ''} Expiring Soon`
      : 'Insurance Expiry Report - No Certificates Expiring';

    // Send email
    // console.log(`Sending email to ${hrEmail}...`);
    
    const emailResult = await sendEmailViaSMTP2GO(
      smtp2goApiKey,
      senderEmail,
      [hrEmail],
      subject,
      htmlBody
    );

    // console.log('Email sent successfully:', emailResult);

    // Log the report generation to database (optional)
    const { error: logError } = await supabase
      .from('project_notes')
      .insert([{
        content: `Insurance expiry report generated and sent to ${hrEmail}. Found ${validVendors.length} vendors with certificates expiring within 30 days.`,
        user_id: null, // System generated
        bid_id: null, // Not project-specific
      }]);

    if (logError) {
      console.warn('Failed to log report generation:', logError);
      // Don't fail the entire process for logging issues
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Insurance expiry report sent successfully',
        vendorsFound: validVendors.length,
        emailId: emailResult.data.email_id,
        sentTo: hrEmail
      }),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        }
      }
    );

  } catch (error) {
    console.error('Insurance expiry report error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: 'Failed to generate and send insurance expiry report'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        }
      }
    );
  }
});

/* To invoke locally:
  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Set environment variables in .env file:
     SUPABASE_URL=your_supabase_url
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     SMTP2GO_API_KEY=your_smtp2go_api_key
     SMTP2GO_SENDER_EMAIL=your_sender_email
     HR_EMAIL=hr@withpridehvac.net
     
  3. Make an HTTP request:
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/insurance-expiry-report' \
    --header 'Authorization: Bearer your_supabase_anon_key' \
    --header 'Content-Type: application/json' \
    --data '{}'
    
  4. For production cron job scheduling, use pg_cron:
  SELECT cron.schedule('insurance-report-1st', '0 9 1 * *', 
    'SELECT net.http_post(url := ''https://your-project.supabase.co/functions/v1/insurance-expiry-report'', headers := ''{"Authorization": "Bearer your_service_role_key", "Content-Type": "application/json"}'', body := ''{}'')');
    
  SELECT cron.schedule('insurance-report-15th', '0 9 15 * *', 
    'SELECT net.http_post(url := ''https://your-project.supabase.co/functions/v1/insurance-expiry-report'', headers := ''{"Authorization": "Bearer your_service_role_key", "Content-Type": "application/json"}'', body := ''{}'')');
*/