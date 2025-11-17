// App-wide constants for the bid board application

export const BID_STATUSES = [
  "New",
  "Pending",
  "Completed",
  "Won Bid",
  "Lost Bid"
] as const;

export const BRAND_COLORS = {
  primary: "#d4af37", // With Pride Gold
  dark: "#1a1a1a",    // With Pride Dark
  white: "#ffffff",
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6", 
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827"
  }
} as const;

export const STATUS_COLORS = {
  "new": "#3b82f6",         // Blue for new bids
  "pending": "#f59e0b",     // Amber for pending work
  "completed": "#10b981",   // Green for completed work
  "won bid": "#059669",     // Darker green for won bids
  "won": "#059669",
  "lost bid": "#dc2626",    // Red for lost bids
  "lost": "#dc2626",
  "default": "#6b7280"      // Gray for default/unknown
} as const;

export const VENDOR_STATUS_COLORS = {
  "pending": "text-gray-600 bg-gray-50",
  "no bid": "text-red-600 bg-red-50",
  "yes bid": "text-green-600 bg-green-50",
  "overdue": "text-red-600 bg-red-50"
} as const;

export const FORM_VALIDATION = {
  required: "This field is required",
  email: "Please enter a valid email address",
  minLength: (min: number) => `Must be at least ${min} characters`,
  maxLength: (max: number) => `Must be no more than ${max} characters`
} as const;

export const DATE_FORMATS = {
  short: { month: 'short', day: 'numeric', year: 'numeric' } as const,
  long: { month: 'long', day: 'numeric', year: 'numeric' } as const,
  withTime: { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit', 
    minute: '2-digit' 
  } as const
} as const;

export const CURRENCY_FORMAT = {
  style: 'currency',
  currency: 'USD'
} as const;