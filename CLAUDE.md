# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production 
npm run build

# Run linting
npm run lint

# Preview production build
npm run preview
```

## Technology Stack & Dependencies

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4.x (with @tailwindcss/vite plugin)
- **Backend**: Supabase (PostgreSQL + Real-time)
- **Authentication**: Auth0 (configured but not actively used)
- **Routing**: React Router v7
- **PDF Generation**: jsPDF + jspdf-autotable
- **Icons**: Lucide React
- **Email**: SMTP2GO API (via Vite proxy)

## Architecture Overview

### Application Structure
- **App.tsx**: Root component with Auth0 + UserContext providers
- **AppContent.tsx**: Main application state management and routing
- **components/Dashboard/**: Main dashboard with bid table and filtering
- **components/Vendor/**: Vendor management pages and forms
- **lib/supabase.ts**: Database operations and real-time subscriptions
- **types/index.ts**: TypeScript interfaces for all data models

### Data Flow
1. **AppContent.tsx** manages global state for bids, vendors, bidVendors, users, and project notes
2. Real-time subscriptions automatically sync data changes across the app
3. Database operations are centralized in `dbOperations` object in `lib/supabase.ts`
4. Components receive data and callbacks via props (no global state management library)

### Database Schema (Supabase)
- **bids**: Project information, status, due dates
- **vendors**: Contractor/vendor directory 
- **bid_vendors**: Junction table linking vendors to specific bids
- **project_notes**: Notes attached to projects with user attribution
- **users**: User profiles with color preferences
- **user_presence**: Real-time user activity tracking

### Real-time Features
The app uses Supabase real-time subscriptions for live updates:
- Bid status changes sync instantly across users
- Vendor responses update in real-time
- Project notes appear immediately when added
- All managed via `RealtimeManager` class in `lib/supabase.ts`

## Key Components & Patterns

### State Management
- React hooks (useState/useEffect) for local state
- Props drilling for data flow (no Redux/Zustand)
- Real-time subscriptions handle data synchronization
- Optimistic updates for better UX

### Authentication
- Auth0 is configured but **currently not enforced**
- User creation/lookup happens in database directly
- `created_by` fields often set to null due to auth being optional

### PDF Generation & Email
- Weekly vendor cost reports generated with jsPDF
- Email service uses SMTP2GO API via Vite proxy
- Reports include bids and vendor costs due within 7 days

### Component Architecture
- **Dashboard/**: Main project view with filtering, pagination, search
- **Vendor/**: Complete vendor management with CRUD operations
- **ui/**: Reusable components (Modal, Button, Card, etc.)
- **ProjectDetail**: Split-panel layout for individual project management

## Important Files

### Core Logic
- `src/lib/supabase.ts`: All database operations and real-time subscriptions
- `src/AppContent.tsx`: Main state management and data flow
- `src/types/index.ts`: TypeScript definitions for all data models

### Key Components
- `src/components/Dashboard/Dashboard.tsx`: Main dashboard with filtering
- `src/components/Dashboard/BidTable.tsx`: Project table with status management
- `src/components/ProjectDetail.tsx`: Individual project management
- `src/components/Vendor/VendorPage.tsx`: Vendor directory management

### Utilities
- `src/utils/pdfGenerator.ts`: PDF report generation
- `src/utils/formatters.ts`: Date/status formatting utilities
- `src/services/emailService.ts`: SMTP2GO email integration

## Environment Variables

Required for development:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_SMTP2GO_API_KEY=your-smtp2go-api-key
VITE_SMTP2GO_SENDER_EMAIL=your-sender@domain.com

# Auth0 (configured but optional)
VITE_AUTH0_DOMAIN=your-domain.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_REDIRECT_URI=http://localhost:5173
```

## Code Conventions

- **TypeScript**: Strict typing with interfaces in `types/index.ts`
- **Styling**: Tailwind CSS classes, gold theme color `#d4af37`
- **Components**: Functional components with TypeScript
- **Error Handling**: Try/catch blocks with user-friendly error states
- **Real-time**: Use `realtimeManager` for subscriptions, cleanup on unmount
- **Database**: Use `dbOperations` object for all Supabase operations