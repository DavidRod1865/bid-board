interface EmailAttachment {
  filename: string;
  fileblob: string; // Base64 encoded
  mimetype: string;
}

interface EmailRequest {
  sender: string;
  to: string[];
  subject: string;
  html_body: string;
  attachments?: EmailAttachment[];
}

interface EmailResponse {
  request_id: string;
  data: {
    email_id: string;
    succeeded: number;
    failed: number;
  };
}

class EmailService {
  private apiKey: string;
  private senderEmail: string;
  private apiUrl = import.meta.env.DEV
    ? "/api/smtp2go/v3/email/send"
    : "https://api.smtp2go.com/v3/email/send";

  constructor() {
    this.apiKey = import.meta.env.VITE_SMTP2GO_API_KEY;
    this.senderEmail = import.meta.env.VITE_SMTP2GO_SENDER_EMAIL;

    if (!this.apiKey || !this.senderEmail) {
      throw new Error(
        "SMTP2GO configuration missing. Please check environment variables."
      );
    }
  }

  /**
   * Send email with optional PDF attachment
   */
  async sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
    pdfBlob?: Blob,
    pdfFilename?: string
  ): Promise<EmailResponse> {
    try {
      const emailRequest: EmailRequest = {
        sender: this.senderEmail,
        to: [to],
        subject,
        html_body: htmlBody,
      };

      // Add PDF attachment if provided
      if (pdfBlob && pdfFilename) {
        const base64Data = await this.blobToBase64(pdfBlob);
        emailRequest.attachments = [
          {
            filename: pdfFilename,
            fileblob: base64Data,
            mimetype: "application/pdf",
          },
        ];
      }

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Smtp2go-Api-Key": this.apiKey,
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
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `Failed to send email: ${error.message}`
          : "Failed to send email: Unknown error"
      );
    }
  }

  /**
   * Send weekly bids and vendor costs report
   */
  async sendWeeklyVendorCostsReport(
    pdfBlob: Blob,
    projectCount: number,
    pendingVendorCount: number
  ): Promise<EmailResponse> {
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const filename = `weekly-bids-vendor-costs-due-${
      new Date().toISOString().split("T")[0]
    }.pdf`;

    const subject = `Weekly Bids & Costs Report - ${projectCount} Projects Need Attention`;

    const htmlBody = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Weekly Bids & Costs Due Report</title>
        <style>
          body { 
            font-family: Arial, sans-serif;
            line-height: 1.6; 
            color: #333;
            margin: 0;
            padding: 0;
          }
          
          table {
            border-collapse: collapse;
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
            background-color: #d4af37;
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
          
          .content p {
            margin: 0 0 15px 0;
          }
          
          .summary { 
            background-color: #f9f9f9;
            padding: 20px;
            border-left: 4px solid #d4af37;
            margin: 20px 0;
          }
          
          .summary h3 {
            margin: 0 0 15px 0;
            font-size: 18px;
            color: #d4af37;
          }
          
          .summary ul {
            margin: 0;
            padding-left: 20px;
          }
          
          .summary li {
            margin: 8px 0;
          }
          
          .content ul {
            margin: 15px 0;
            padding-left: 20px;
          }
          
          .content ul li {
            margin: 8px 0;
          }
          
          .alert-box {
            background-color: #fffbf0;
            border: 1px solid #d4af37;
            padding: 15px;
            margin: 20px 0;
          }
          
          .signature {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
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
            color: #d4af37;
          }
        </style>
      </head>
      <body>
        <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <table class="email-container" width="600" cellpadding="0" cellspacing="0">
                <!-- Header -->
                <tr>
                  <td class="header">
                    <h1>With Pride Air Conditioning & Heating</h1>
                    <h2>Weekly Bids & Costs Due Report</h2>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td class="content">
                    <p>Dear Team,</p>
                    
                    <p>Please find attached the weekly report generated on <strong>${currentDate}</strong> covering all upcoming bid and vendor cost deadlines.</p>
                    
                    <div class="summary">
                      <h3>Report Summary</h3>
                      <ul>
                        <li><strong>${projectCount}</strong> projects have bids and/or vendor costs due within the next 7 days</li>
                        <li><strong>${pendingVendorCount}</strong> vendors have pending cost submissions</li>
                      </ul>
                    </div>
                    
                    <p><strong>The attached PDF report includes:</strong></p>
                    <ul>
                      <li>Bids due within the next 7 days</li>
                      <li>Vendor costs due within the next 7 days (regardless of bid due date)</li>
                      <li>Vendors that have submitted costs vs. those still pending</li>
                      <li>Contact information for follow-up on pending submissions</li>
                    </ul>
                    
                    <div class="alert-box">
                      <p><strong>Action Required:</strong> Please review the report and follow up on pending submissions to ensure timely completion.</p>
                    </div>
                    
                    <div class="signature">
                      <p>Best regards,<br>
                      With Pride Air Conditioning & Heating</p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td class="footer">
                    <p>This report was automatically generated by the Bid Dashboard system.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return await this.sendEmail(
      "estimating@withpridehvac.net",
      subject,
      htmlBody,
      pdfBlob,
      filename
    );
  }

  /**
   * Convert Blob to Base64 string
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Test email configuration
   */
  async testConfiguration(): Promise<boolean> {
    try {
      const testSubject = "Test Email from Bid Dashboard";
      const testBody =
        "<p>This is a test email to verify SMTP2GO configuration.</p>";

      await this.sendEmail(this.senderEmail, testSubject, testBody);

      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
