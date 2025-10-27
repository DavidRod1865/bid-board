# Bid Board - Construction Project Management

A modern React TypeScript application for managing construction project bids, vendors, and project tracking built with Vite and Tailwind CSS.

## Features

### 📊 Project Management
- **Project Dashboard** - Overview of all construction projects with advanced filtering and sorting
- **Project Details** - Comprehensive project information with tabbed interface
- **Real-time Updates** - Live data synchronization using Supabase real-time subscriptions
- **Status Tracking** - Visual status indicators with color-coded urgency levels
- **Notes System** - Project notes with user attribution and timestamps
- **Bulk Operations** - Select and perform actions on multiple projects

### 👥 Vendor Management
- **Vendor Directory** - Complete vendor database with contact information
- **Vendor-Project Association** - Link vendors to specific projects with cost tracking
- **Response Tracking** - Monitor vendor bid responses and due dates
- **Priority Vendors** - Mark vendors as priority with visual highlighting
- **Vendor Performance** - Track response rates and project history

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

## Technology Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 7.x
- **Styling**: Tailwind CSS 4.x (no config file - uses Vite plugin)
- **Backend**: Supabase (PostgreSQL + Real-time subscriptions)
- **Authentication**: Auth0 (configured but optional)
- **Routing**: React Router v7
- **State Management**: React Hooks (useState/useEffect)
- **Table Library**: TanStack Table (@tanstack/react-table)
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
└── hooks/                # Custom React hooks
```

## Key Components

### Dashboard & Project Management
- **BidTable**: Sortable table with status management, priority highlighting, and bulk actions
- **SearchFilters**: Multi-status filtering with date ranges and search capabilities
- **ProjectDetail**: Tabbed interface with project overview, vendors, notes, and timeline
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

# Email Service (Optional - for PDF reports)
VITE_SMTP2GO_API_KEY=your-smtp2go-api-key
VITE_SMTP2GO_SENDER_EMAIL=your-sender@domain.com
```

## Database Schema

The application uses Supabase with the following main tables:

- **bids** - Project information, status, dates, and assignments
- **vendors** - Contractor directory with contact information
- **bid_vendors** - Many-to-many project-vendor associations with cost tracking and priority flags
- **project_notes** - User-attributed notes with timestamps
- **users** - User management with Auth0 integration

### Real-time Subscriptions
- `bids_changes` - Project updates
- `vendors_changes` - Vendor updates  
- `bid_vendors_changes` - Project-vendor associations
- `project_notes_changes` - Note updates

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

## Performance Optimizations

- **useMemo** for expensive calculations and data transformations
- **Pagination** via DataTable component (10-15 items per page)
- **Efficient Re-renders** with proper dependency arrays
- **Real-time Deduplication** to prevent duplicate entries
- **Component-level Optimization** with selective re-rendering

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For support and questions, contact the development team or create an issue in the repository.