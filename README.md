# Bid Board - Construction Project Management

A modern React TypeScript application for managing construction project bids, vendors, and project tracking built with Vite and Tailwind CSS.

## Features

### 📊 Project Management
- **Project Dashboard** - Overview of all construction projects with advanced filtering and sorting
- **Project Details** - Comprehensive project information with tabbed interface
- **Equipment Tracking** - Track equipment deliveries by vendor with PO numbers, quantities, and received dates
- **Real-time Updates** - Live data synchronization using Supabase real-time subscriptions for projects, notes, equipment, and vendor changes
- **Status Tracking** - Visual status indicators with color-coded urgency levels
- **Notes System** - Project notes with user attribution, timestamps, and real-time editing capabilities
- **Bulk Operations** - Select and perform actions on multiple projects

### 👥 Vendor Management
- **Vendor Directory** - Complete vendor database with contact information
- **Vendor-Project Association** - Link vendors to specific projects with cost tracking
- **Response Tracking** - Monitor vendor bid responses and due dates
- **Priority Vendors** - Mark vendors as priority with visual highlighting
- **Vendor Performance** - Track response rates and project history
- **Insurance Tracking** - Monitor vendor insurance certificate expiration dates

### 🔍 Advanced Filtering & Search
- **Multi-status Filtering** - Filter projects by multiple statuses simultaneously
- **Date Range Filtering** - Filter by due dates and date ranges
- **Search Functionality** - Search across project names, addresses, and descriptions
- **Vendor Search** - Search vendors by company name, contact person, or specialty
- **Sortable Tables** - Click column headers to sort data
- **Reset Filters** - One-click reset for all active filters

### 📄 Data Management
- **Sortable Tables** - Click any column header to sort data (projects, vendors, costs, dates)
- **Pagination** - Configurable items per page (10-15 items) for optimal performance
- **Priority Sorting** - Priority vendors automatically sorted to top
- **Urgency Indicators** - Visual indicators for overdue and due-today items

### 🎨 Modern UI/UX
- **Professional Design** - Clean, business-focused interface
- **Brand Colors** - Consistent gold (#d4af37) accent with professional styling
- **Tailwind CSS 4.x** - Latest utility-first CSS framework
- **Responsive Design** - Works across desktop and mobile devices
- **Visual Status Indicators** - Color-coded borders and highlighting for urgency and priority

### 📦 Equipment Management
- **Equipment Tracking** - Track equipment received per vendor with detailed information
- **Daily Equipment Reports** - Query equipment received on specific dates for daily reporting
- **Equipment Details** - PO numbers, quantities, descriptions, units, and received dates
- **Inline Editing** - Add, edit, and delete equipment entries directly in project views
- **Real-time Updates** - Live equipment data synchronization across all users

### 📧 Automated Reporting
- **Insurance Expiry Reports** - Automated bi-weekly reports for vendor insurance certificates
- **Equipment Reports** - Daily equipment delivery reports by date for project tracking
- **Email Notifications** - Professional HTML email reports via SMTP2GO
- **Scheduled Reports** - Automated reports on 1st and 15th of every month
- **Real-time Monitoring** - Track vendors with insurance expiring within 30 days

## Technology Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 7.x
- **Styling**: Tailwind CSS 4.x (no config file - uses Vite plugin)
- **Backend**: Supabase (PostgreSQL + Real-time subscriptions + Edge Functions)
- **Authentication**: Auth0 with UserContext for proper user identification
- **Routing**: React Router v7
- **State Management**: React Hooks (useState/useEffect)
- **Table Library**: TanStack Table (@tanstack/react-table)
- **Email Service**: SMTP2GO for automated reports
- **Task Scheduling**: PostgreSQL pg_cron for automated reports
- **Deployment**: Netlify SPA with proper routing

## Project Structure

```
src/
├── components/
│   ├── Dashboard/          # Dashboard components and bid table
│   │   ├── Dashboard.tsx
│   │   ├── BidTable.tsx
│   │   └── SearchFilters.tsx
│   ├── Vendor/            # Vendor management components
│   │   ├── VendorPage.tsx
│   │   ├── VendorList.tsx
│   │   ├── VendorTable.tsx
│   │   └── VendorDetail.tsx
│   ├── ui/                # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── CardComponent.tsx
│   │   ├── data-table.tsx
│   │   └── ...
│   ├── Analytics/         # Analytics and reporting
│   ├── Archives.tsx       # Archived projects
│   └── OnHold.tsx        # Projects on hold
├── lib/
│   ├── table-columns/     # Table column definitions
│   ├── supabase.ts       # Database client
│   └── utils.ts          # Utility functions
├── types/                 # TypeScript interfaces
├── utils/                 # Utility functions and formatters
├── hooks/                # Custom React hooks
└── supabase/             # Supabase configuration
    ├── functions/        # Edge Functions for automation
    │   ├── insurance-expiry-report/  # Automated insurance reports
    │   └── test-insurance-report/    # Testing functions
    ├── migrations/       # Database migrations and cron jobs
    └── config.toml      # Supabase project configuration
```

## Key Components

### Dashboard & Project Management
- **BidTable**: Sortable table with status management, priority highlighting, and bulk actions
- **SearchFilters**: Multi-status filtering with date ranges and search capabilities
- **ProjectDetail**: Tabbed interface with project overview, vendors, notes, and equipment tracking
- **EquipmentTable**: Equipment management with inline forms and real-time updates
- **Archives/OnHold**: Dedicated views for archived and on-hold projects

### Vendor Management
- **VendorPage**: Complete vendor management with sortable table and pagination
- **VendorTable**: Project-specific vendor table with priority sorting and cost tracking
- **VendorDetail**: Individual vendor management and project associations

### Data Tables
- **DataTable**: Reusable table component with sorting, pagination, and selection
- **Column Definitions**: Configurable column headers with custom sorting functions
- **Row Styling**: Priority highlighting, urgency indicators, and selection states

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Configure your credentials (see Environment Variables section)
```

### Development Commands
```bash
# Start development server (Vite + React)
npm run dev

# Build for production (TypeScript compilation + Vite build)
npm run build

# Preview production build locally
npm run preview

# Run ESLint for code quality
npm run lint
```

### Environment Variables
Required environment variables (see `.env.example` for template):

```bash
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Auth0 Configuration (Optional - app works without)
VITE_AUTH0_DOMAIN=your-domain.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_REDIRECT_URI=http://localhost:5173

# Email Service (Required for automated insurance reports)
VITE_SMTP2GO_API_KEY=your-smtp2go-api-key
VITE_SMTP2GO_SENDER_EMAIL=your-sender@domain.com
```

## Database Schema

The application uses Supabase with both legacy and normalized table structures:

**Legacy Tables:**
- **bids** - Project information, status, dates, and assignments
- **bid_vendors** - Legacy project-vendor associations (being phased out)

**Normalized Tables:**
- **projects** - Normalized project information
- **project_vendors** - Normalized project-vendor relationships
- **project_equipment** - Equipment tracking per project-vendor relationship
- **project_financials** - Financial tracking for normalized structure
- **apm_phases** - APM workflow phase management

**Shared Tables:**
- **vendors** - Contractor directory with contact information and insurance tracking
- **vendor_contacts** - Contact information for vendor representatives  
- **project_notes** - User-attributed notes with timestamps
- **users** - User management with Auth0 integration

### Real-time Subscriptions
**Active Real-time Channels:**
- `projects` - Project updates, status changes, and metadata
- `project_vendors` - Project-vendor relationship changes
- `project_equipment` - Equipment tracking and delivery updates
- `project_notes` - Note creation, editing, and deletion (dedicated channel)
- `vendors` - Vendor information updates
- `vendor_contacts` - Contact information changes
- `est_responses` - Estimating response tracking
- `project_financials` - Financial data updates
- `apm_phases` - APM workflow phase tracking

**Features:**
- **Dedicated Channels** - Separate subscriptions for critical data like notes and projects
- **Debounced Updates** - 100ms debounce to prevent rapid-fire refresh events
- **Fallback Triggers** - Manual refresh triggers for environments where real-time may be delayed
- **Event Deduplication** - Prevents duplicate updates and ensures data consistency

## Equipment Management System

### Overview
The Equipment Management system allows project managers to track equipment deliveries for each vendor-project relationship. This feature provides detailed tracking of equipment received on-site with support for daily reporting and real-time updates.

### Features
- **Equipment Entry**: Track PO numbers, quantities, descriptions, units, and received dates
- **Vendor Association**: Equipment entries are linked to specific project-vendor relationships
- **Daily Reports**: Query all equipment received on specific dates for daily project tracking
- **Inline Forms**: Add and edit equipment entries directly within project detail views
- **Real-time Updates**: Live synchronization of equipment data across all users
- **Equipment Count**: Visual display of total equipment entries per vendor

### Database Structure
The equipment system uses the normalized database architecture:

```sql
-- Equipment table linked to project vendors
project_equipment (
  id SERIAL PRIMARY KEY,
  project_vendor_id INTEGER REFERENCES project_vendors(id),
  po_number TEXT,                    -- Purchase order number
  quantity NUMERIC NOT NULL,         -- Equipment quantity (supports decimals)
  description TEXT NOT NULL,         -- Equipment description
  unit TEXT,                        -- Unit of measurement (each, feet, tons, etc.)
  date_received DATE,               -- Date equipment was received on site
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### API Operations
- **`getProjectEquipment(projectVendorId)`** - Get all equipment for a specific project-vendor
- **`createProjectEquipment(equipmentData)`** - Add new equipment entry
- **`updateProjectEquipment(equipmentId, updates)`** - Update existing equipment
- **`deleteProjectEquipment(equipmentId)`** - Remove equipment entry
- **`getEquipmentByDate(date)`** - Get all equipment received on a specific date

### Usage
1. Navigate to a project detail page
2. Click the "Equipment" tab
3. Expand a vendor to view/add equipment entries
4. Use inline forms to add new equipment or edit existing entries
5. Equipment updates are synchronized in real-time across all users

## Automated Insurance Reporting

### Overview
The application includes an automated insurance expiry reporting system that monitors vendor insurance certificates and sends bi-weekly email reports to the contracts team.

### Features
- **Automated Scheduling**: Reports sent on the 1st and 15th of every month at 9:00 AM
- **Insurance Monitoring**: Tracks vendors with insurance certificates expiring within 30 days
- **Professional Email Reports**: HTML-formatted emails with company branding
- **Contact Integration**: Pulls vendor contact details from the `vendor_contacts` table
- **Manual Testing**: SQL function for immediate report generation

### Technical Implementation
- **Supabase Edge Functions**: Server-side TypeScript functions for report generation
- **PostgreSQL pg_cron**: Reliable scheduling for bi-weekly automation
- **SMTP2GO Integration**: Professional email delivery service
- **Database Triggers**: Automated logging of report generation

### Setup and Configuration
For detailed setup instructions, see `/supabase/INSURANCE_REPORTS_SETUP.md`

#### Quick Setup:
1. **Deploy Edge Functions**: `supabase functions deploy insurance-expiry-report`
2. **Configure Environment Variables**: Set email credentials in Supabase dashboard
3. **Apply Database Migration**: Run migration to set up cron jobs
4. **Test System**: `SELECT trigger_insurance_expiry_report();`

#### Environment Variables for Edge Functions:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_SMTP2GO_API_KEY=your-smtp2go-api-key
VITE_SMTP2GO_SENDER_EMAIL=your-sender-email
HR_EMAIL=hr-email-address
```

## Deployment

### Netlify Configuration
The app deploys as a Single Page Application (SPA) on Netlify:

- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Routing**: `public/_redirects` handles client-side routing

## Architecture Patterns

### State Management
- **Global State**: AppContent.tsx manages all application data
- **Local State**: Component-level useState for UI state
- **Props Drilling**: Data flows through component hierarchy
- **Real-time Subscriptions**: Managed via realtimeManager

### Data Flow
1. **AppContent.tsx** - Global state container for all data
2. **Real-time Manager** - Handles Supabase subscriptions and updates
3. **Component State** - Local UI state and user interactions
4. **Optimistic Updates** - Immediate UI updates with real-time sync

### Table Sorting & Pagination
- **TanStack Table** - Professional table management with sorting and pagination
- **Column Definitions** - Reusable column configurations with custom sorting
- **Priority Sorting** - Automatic priority vendor sorting with due date secondary sort
- **Data Transformation** - Client-side data processing for optimal performance

## Recent Updates & Fixes

### Real-time System Improvements (December 2025)
- **✅ Fixed Project Notes Real-time**: Notes now update instantly across all users when created, edited, or deleted
- **✅ User Authentication Fix**: Resolved user identification issue where wrong user was being attributed to notes
- **✅ Enhanced Real-time Subscriptions**: Added dedicated channels for critical data tables to ensure reliable updates
- **✅ TypeScript Build Fixes**: Resolved all compilation errors and type mismatches for production builds
- **✅ Improved Error Handling**: Enhanced error handling in note creation/update operations with proper user feedback

### Technical Improvements
- **Real-time Architecture**: Implemented dual subscription pattern with main channel + dedicated channels for critical tables
- **User Context Integration**: Proper Auth0 integration with UserContext for accurate user identification
- **Type Safety**: Fixed CalendarEvent interface mismatches and Select component prop requirements
- **Clean Code**: Removed debugging logs while maintaining robust error handling

### Database Optimizations
- **Real-time Publications**: Verified and optimized Supabase real-time publications for all critical tables
- **UUID Field Handling**: Fixed PostgreSQL UUID constraint violations by properly handling empty string to null conversions
- **Foreign Key Integrity**: Resolved project_notes table foreign key references

## Performance Optimizations

- **useMemo** for expensive calculations and data transformations
- **Pagination** via DataTable component (10-15 items per page)
- **Efficient Re-renders** with proper dependency arrays
- **Real-time Deduplication** to prevent duplicate entries
- **Component-level Optimization** with selective re-rendering
- **Debounced Real-time Updates** - 100ms debounce prevents excessive refresh events

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For support and questions, contact the development team or create an issue in the repository.