#!/bin/bash

# Equipment Release Reports Deployment Script
# This script deploys the automated equipment release reporting system

set -e  # Exit on any error

echo "🚀 Deploying Equipment Release Reports System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI is not installed. Please install it first:"
    echo "https://supabase.com/docs/guides/cli/getting-started#installing-the-supabase-cli"
    exit 1
fi

print_status "Supabase CLI found"

# Check if logged in to Supabase
if ! supabase projects list &> /dev/null; then
    print_warning "Not logged in to Supabase. Please run 'supabase login' first"
    exit 1
fi

print_status "Supabase authentication verified"

# Check if project is linked by checking for .supabase directory
if [ ! -d ".supabase" ]; then
    print_warning "Local project not linked to Supabase project"
    echo ""
    echo "To link your project, run one of these commands:"
    echo "1. Link to existing project: supabase link --project-ref YOUR_PROJECT_REF"
    echo "2. Or create new project: supabase projects create YOUR_PROJECT_NAME"
    echo ""
    echo "You can find your project ref in your Supabase dashboard URL:"
    echo "https://app.supabase.com/project/YOUR_PROJECT_REF"
    exit 1
fi

print_status "Project linkage verified"

# Deploy Edge Functions
echo ""
echo "📦 Deploying Edge Functions..."

# Deploy equipment release report function
echo "Deploying equipment-release-report function..."
if supabase functions deploy equipment-release-report; then
    print_status "equipment-release-report function deployed"
else
    print_error "Failed to deploy equipment-release-report function"
    exit 1
fi

# Apply database migrations
echo ""
echo "🗃️ Applying database migrations..."
if supabase db push; then
    print_status "Database migrations applied"
else
    print_error "Failed to apply database migrations"
    exit 1
fi

# Test the function
echo ""
echo "🧪 Testing equipment release report function..."
echo "Running test query to verify setup..."

# Create a test SQL file
cat > /tmp/test_equipment_report.sql << 'EOF'
-- Test the equipment release report setup
SELECT 'Testing Equipment Release Report Setup' as status;

-- Check if cron jobs are scheduled
SELECT 
    jobname,
    schedule,
    command,
    active
FROM equipment_report_cron_jobs;

-- Test the trigger function (this will actually send a report if there's relevant data)
-- Comment out the line below if you don't want to send a test email
-- SELECT trigger_equipment_release_report();
EOF

if supabase db psql -f /tmp/test_equipment_report.sql; then
    print_status "Database setup verified"
else
    print_warning "Database test encountered issues (this may be normal)"
fi

# Clean up test file
rm -f /tmp/test_equipment_report.sql

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Set environment variables in your Supabase dashboard:"
echo "   - VITE_SUPABASE_URL (should already be set)"
echo "   - VITE_SUPABASE_SERVICE_ROLE_KEY"
echo "   - VITE_SMTP2GO_API_KEY"
echo "   - VITE_SMTP2GO_SENDER_EMAIL"
echo "   - APM_EMAIL (recipient for equipment reports)"
echo ""
echo "2. Update database settings with your actual project details:"
echo "   Run these SQL commands in your Supabase SQL editor:"
echo "   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project-id.supabase.co';"
echo "   ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';"
echo ""
echo "3. Test the system manually:"
echo "   - Run 'SELECT trigger_equipment_release_report();' in your database"
echo "   - Check that emails are received at the APM_EMAIL address"
echo ""
echo "4. Verify cron jobs are scheduled:"
echo "   - Run 'SELECT * FROM equipment_report_cron_jobs;' to see scheduled jobs"
echo "   - Reports will automatically send bi-weekly (1st & 15th) at 9 AM"
echo ""
echo "📚 The system will automatically:"
echo "   - Find timeline events with 'pending' or 'in_progress' status"
echo "   - Include OVERDUE events (past their order_by date)"
echo "   - Check events due within 30 days of today"
echo "   - Include associated equipment and vendor details"
echo "   - Generate professional PDF reports with proper status color-coding"
echo "   - Email reports to the APM team bi-weekly"