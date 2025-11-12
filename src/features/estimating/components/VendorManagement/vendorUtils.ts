import type { VendorType } from '../../../../shared/types';

// Helper function to check insurance status
export const getInsuranceStatus = (expiryDate: string | null): 'valid' | 'expiring' | 'expired' | 'none' => {
  if (!expiryDate) return 'none';
  
  const expiry = new Date(expiryDate);
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);
  
  if (expiry < today) return 'expired';
  if (expiry <= thirtyDaysFromNow) return 'expiring';
  return 'valid';
};

// Helper function for insurance status styling
export const getInsuranceStatusStyle = (status: 'valid' | 'expiring' | 'expired' | 'none') => {
  switch (status) {
    case 'valid':
      return { 
        text: 'text-green-600', 
        icon: '🟢', 
        label: 'Insurance Valid',
        bg: 'bg-green-50',
        border: 'border-green-200'
      };
    case 'expiring':
      return { 
        text: 'text-amber-600', 
        icon: '🟡', 
        label: 'Expiring Soon',
        bg: 'bg-amber-50',
        border: 'border-amber-200'
      };
    case 'expired':
      return { 
        text: 'text-red-600', 
        icon: '🔴', 
        label: 'Expired',
        bg: 'bg-red-50',
        border: 'border-red-200'
      };
    case 'none':
      return { 
        text: 'text-gray-500', 
        icon: '⚪', 
        label: 'No Insurance Info',
        bg: 'bg-gray-50',
        border: 'border-gray-200'
      };
  }
};

// Helper function for vendor type styling
export const getVendorTypeStyle = (type: VendorType) => {
  switch (type) {
    case 'Vendor':
      return { 
        bg: 'bg-blue-50', 
        text: 'text-blue-700', 
        border: 'border-blue-200',
        icon: '🔵'
      };
    case 'Subcontractor':
      return { 
        bg: 'bg-green-50', 
        text: 'text-green-700', 
        border: 'border-green-200',
        icon: '🟢'
      };
    case 'General Contractor':
      return { 
        bg: 'bg-purple-50', 
        text: 'text-purple-700', 
        border: 'border-purple-200',
        icon: '🟣'
      };
    default:
      return { 
        bg: 'bg-gray-50', 
        text: 'text-gray-700', 
        border: 'border-gray-200',
        icon: '⚪'
      };
  }
};

// Format vendor display information for header
export const formatVendorHeader = (vendor: { company_name: string; vendor_type?: VendorType | null; specialty?: string | null; insurance_expiry_date?: string | null }) => {
  const vendorTypeStyle = getVendorTypeStyle(vendor.vendor_type || 'Vendor');
  const insuranceStatus = getInsuranceStatus(vendor.insurance_expiry_date ?? null);
  const insuranceStyle = getInsuranceStatusStyle(insuranceStatus);
  
  return {
    title: vendor.company_name,
    subtitle: vendor.vendor_type && vendor.specialty 
      ? `${vendor.vendor_type} • ${vendor.specialty}`
      : vendor.vendor_type || vendor.specialty || '',
    vendorTypeStyle,
    insuranceStatus,
    insuranceStyle
  };
};

// Format phone number for display
export const formatPhoneNumber = (phone: string | null): string => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX if it's a 10-digit US number
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // Return original if not a standard format
  return phone;
};

// Format date for display
export const formatDate = (date: string | null): string => {
  if (!date) return 'Not provided';
  
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};