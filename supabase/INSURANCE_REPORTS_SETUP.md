# Insurance Expiry Reports Setup Guide

This guide explains how to set up and deploy the automated bi-weekly insurance expiry reports for vendor certificates.

## Overview

The system automatically sends email reports on the 1st and 15th of every month, listing all vendors whose insurance certificates are expiring within 30 days.

## Features

- **Automated Scheduling**: Uses PostgreSQL's `pg_cron` extension for reliable scheduling
- **Professional Email Templates**: Branded HTML emails with company information
- **SMTP2GO Integration**: Leverages existing email service infrastructure
- **Error Handling**: Comprehensive error logging and reporting
- **Manual Testing**: Includes test functions for validation

## Environment Variables

### Production Environment Variables (Supabase Dashboard)

Set these in your Supabase project dashboard under Settings > Edge Functions:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Email Service Configuration (SMTP2GO)
VITE_SMTP2GO_API_KEY=your-smtp2go-api-key
VITE_SMTP2GO_SENDER_EMAIL=your-sender@withpridehvac.net

# Report Recipients
HR_EMAIL=hr-email-address
```

### Local Development Environment Variables

The system uses your existing `env.local` file format with VITE_ prefixes:

```bash
# Supabase Configuration (from your existing env.local)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Email Service Configuration (from your existing env.local)  
VITE_SMTP2GO_API_KEY=your-smtp2go-api-key
VITE_SMTP2GO_SENDER_EMAIL=your-sender@withpridehvac.net

# Report Recipients
HR_EMAIL=hr-email-address
```

## Deployment Steps

### 1. Deploy Edge Functions

```bash
# Deploy the main insurance report function
supabase functions deploy insurance-expiry-report

# Deploy the test function (optional)
supabase functions deploy test-insurance-report
```

### 2. Set Environment Variables

In your Supabase dashboard:
1. Go to Settings > Edge Functions
2. Add each environment variable listed above
3. Save the configuration

### 3. Apply Database Migration

```bash
# Apply the cron job setup migration
supabase db push
```

### 4. Update Migration with Your Project Details

Edit `supabase/migrations/20231113_setup_insurance_expiry_cron.sql`:

Replace the placeholder values:
- `your-project-ref.supabase.co` → Your actual Supabase project URL
- `your-service-role-key` → Your actual service role key

Then reapply the migration:
```bash
supabase db push
```

## Testing

### Production Testing

1. Manually trigger the report via SQL in Supabase dashboard:
```sql
SELECT trigger_insurance_expiry_report();
```

2. Check cron job status:
```sql
SELECT * FROM cron.job WHERE jobname LIKE 'insurance-report%';
```

3. View cron job history:
```sql
SELECT * FROM cron.job_run_details WHERE jobid IN (
  SELECT jobid FROM cron.job WHERE jobname LIKE 'insurance-report%'
) ORDER BY start_time DESC LIMIT 10;
```

## Schedule Details

- **Frequency**: Bi-weekly (1st and 15th of every month)
- **Time**: 9:00 AM server time
- **Recipients**: HR team (configurable via environment variable)
- **Content**: Vendors with insurance expiring within 30 days

## Monitoring

### Email Delivery
- Check SMTP2GO dashboard for delivery status
- Review Edge Function logs in Supabase dashboard
- Monitor `project_notes` table for automated log entries

### Cron Job Health
```sql
-- Check if cron jobs are scheduled
SELECT jobname, schedule, active FROM cron.job 
WHERE jobname LIKE 'insurance-report%';

-- Check recent cron job runs
SELECT jobname, start_time, end_time, return_message 
FROM cron.job_run_details jrd
JOIN cron.job j ON jrd.jobid = j.jobid
WHERE j.jobname LIKE 'insurance-report%'
ORDER BY start_time DESC LIMIT 5;
```

## Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   - Error: "Missing Supabase/SMTP2GO configuration"
   - Solution: Verify all environment variables are set in Supabase dashboard

2. **Permission Errors**
   - Error: Database permission denied
   - Solution: Ensure service role key has proper permissions

3. **Email Sending Failures**
   - Error: SMTP2GO API errors
   - Solution: Check SMTP2GO account status and API key validity

4. **Cron Jobs Not Running**
   - Check if pg_cron extension is enabled
   - Verify cron job syntax in migration
   - Check server timezone settings

### Manual Maintenance

```sql
-- Temporarily disable cron jobs
UPDATE cron.job SET active = false WHERE jobname LIKE 'insurance-report%';

-- Re-enable cron jobs
UPDATE cron.job SET active = true WHERE jobname LIKE 'insurance-report%';

-- Remove cron jobs (if needed)
SELECT cron.unschedule('insurance-report-1st');
SELECT cron.unschedule('insurance-report-15th');
```

## Email Template Customization

To customize the email template, modify the `generateInsuranceExpiryEmailTemplate` function in `/supabase/functions/insurance-expiry-report/index.ts`:

- Update company branding colors
- Modify email content and messaging  
- Adjust table columns and formatting
- Change footer information

After making changes, redeploy the function:
```bash
supabase functions deploy insurance-expiry-report
```

## Support

For issues or questions about the insurance expiry reporting system:
1. Check Supabase Edge Function logs
2. Review SMTP2GO delivery reports
3. Examine database cron job history
4. Validate environment variable configuration