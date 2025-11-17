#!/bin/bash

# Insurance Expiry Reports Deployment Script
# This script deploys the automated insurance expiry reporting system

set -e  # Exit on any error

echo "🚀 Deploying Insurance Expiry Reports System..."

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

# Deploy main insurance report function
echo "Deploying insurance-expiry-report function..."
if supabase functions deploy insurance-expiry-report; then
    print_status "insurance-expiry-report function deployed"
else
    print_error "Failed to deploy insurance-expiry-report function"
    exit 1
fi

# Deploy test function
echo "Deploying test-insurance-report function..."
if supabase functions deploy test-insurance-report; then
    print_status "test-insurance-report function deployed"
else
    print_warning "Failed to deploy test-insurance-report function (optional)"
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

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Set environment variables in your Supabase dashboard:"
echo "   - VITE_SUPABASE_URL"
echo "   - VITE_SUPABASE_SERVICE_ROLE_KEY"
echo "   - VITE_SMTP2GO_API_KEY"
echo "   - VITE_SMTP2GO_SENDER_EMAIL"
echo "   - HR_EMAIL"
echo ""
echo "2. Update the migration file with your actual project details:"
echo "   - Edit supabase/migrations/20231113_setup_insurance_expiry_cron.sql"
echo "   - Replace placeholder URLs and keys"
echo "   - Reapply with 'supabase db push'"
echo ""
echo "3. Test the system:"
echo "   - Run 'SELECT trigger_insurance_expiry_report();' in your database"
echo "   - Check that emails are received"
echo ""
echo "📚 See supabase/INSURANCE_REPORTS_SETUP.md for detailed instructions"