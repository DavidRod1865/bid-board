# Bid Board - Construction Project Management

A modern React TypeScript application for managing construction project bids, vendors, and project tracking built with Vite and Tailwind CSS.

## Features

### 📊 Project Management
- **Project Dashboard** - Overview of all construction projects with advanced filtering
- **Project Details** - Comprehensive project information with split-panel layout
- **Real-time Updates** - Live data synchronization using Supabase real-time subscriptions
- **Status Tracking** - Visual status indicators and progress tracking
- **Notes System** - Project notes with user attribution and real-time updates

### 👥 Vendor Management
- **Vendor Directory** - Complete vendor database with contact information
- **Vendor-Project Association** - Link vendors to specific projects
- **Response Tracking** - Monitor vendor bid responses and follow-ups
- **Vendor Performance** - Track response rates and project history

### 🔍 Advanced Filtering & Search
- **Multi-status Filtering** - Filter projects by multiple statuses simultaneously with toggle buttons
- **Search Functionality** - Search across project names, clients, and descriptions
- **Date Filtering** - Filter by due dates and urgency levels (today, this week, specific date)
- **Vendor Search** - Search vendors by company name, contact person, or specialty
- **Reset Filters** - One-click reset for all active filters

### 📄 Pagination & Navigation
- **Paginated Tables** - 10 items per page for optimal performance
- **Bottom-page Controls** - Pagination controls positioned at page bottom
- **Responsive Design** - Works across desktop and mobile devices

### 🎨 Modern UI/UX
- **Professional Design** - Clean, business-focused interface
- **Brand Colors** - Consistent gold (#d4af37) and dark theme
- **Tailwind CSS 4.x** - Latest utility-first CSS framework
- **Component Library** - Reusable UI components

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4.x
- **Backend**: Supabase (PostgreSQL + Real-time)
- **Authentication**: Auth0 (prepared)
- **Routing**: React Router v7
- **State Management**: React Hooks (useState/useEffect)

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
│   │   └── VendorTable.tsx
│   ├── ui/                # Reusable UI components
│   └── ...
├── types/                 # TypeScript interfaces
├── utils/                 # Utility functions
├── lib/                   # Database and external services
└── data/                  # Mock data for development
```

## Key Components

### Dashboard
- **BidTable**: Sortable table with status management and pagination
- **SearchFilters**: Multi-status filtering with search capabilities
- **ProjectDetail**: Split-panel layout with project overview and tabbed interface

### Vendor Management
- **VendorPage**: Complete vendor management with pagination
- **VendorTable**: Vendor selection and management within projects
- **VendorList**: Searchable and sortable vendor directory

### UI Components
- **Sidebar**: Navigation and action buttons
- **Modal**: Reusable modal components for forms
- **Cards**: Professional project information cards

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
# Start development server (Vite)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

### Environment Variables
Required environment variables (see `.env.example` for template):

```bash
# Auth0 Configuration
VITE_AUTH0_DOMAIN=your-domain.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_REDIRECT_URI=http://localhost:5173

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Email Service (SMTP2GO)
VITE_SMTP2GO_API_KEY=your-smtp2go-api-key
VITE_SMTP2GO_SENDER_EMAIL=your-sender@domain.com
```

## Database Schema

The application uses Supabase with the following main tables:

- **bids** - Project information and status
- **vendors** - Vendor/contractor directory
- **bid_vendors** - Project-vendor associations
- **project_notes** - Project notes with user attribution
- **users** - User management

### 🚧 Features in Development
- **Timeline View** - Project timeline and activity tracking
- **Document Management** - File upload and document tracking
- **Advanced Reporting** - PDF generation and email reporting (partially implemented)
- **Mobile App** - React Native mobile application
- **Advanced Analytics** - Project performance metrics

## Architecture Patterns

### State Management
- **Local React State** - useState/useEffect hooks
- **Props Drilling** - Data flows through component hierarchy
- **Lifting State Up** - Main state managed in parent components

### Data Flow
1. **App.tsx** - Global state management
2. **Dashboard.tsx** - Project filtering and pagination
3. **BidTable.tsx** - Project display and status updates
4. **ProjectDetail.tsx** - Individual project management

### Real-time Updates
- Supabase real-time subscriptions for live data updates
- Automatic UI updates when data changes
- Optimistic updates for better user experience

## Performance Optimizations

- **useMemo** for expensive calculations
- **Pagination** to limit data rendering
- **Efficient Re-renders** with proper dependency arrays
- **Code Splitting** with React Router

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For support and questions, contact the development team or create an issue in the repository.