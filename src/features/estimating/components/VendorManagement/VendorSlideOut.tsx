import React from 'react';
import type { Vendor, VendorWithContact } from '../../../../shared/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../../../../shared/components/ui/sheet';
import VendorSlideOutContent from './VendorSlideOutContent';
import { formatVendorHeader } from './vendorUtils';

interface VendorSlideOutProps {
  vendor: VendorWithContact | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (vendorId: number, updates: Partial<Vendor>) => Promise<void>;
  onDelete: (vendorId: number) => Promise<void>;
  onVendorUpdated?: () => void;
}

const VendorSlideOut: React.FC<VendorSlideOutProps> = ({
  vendor,
  isOpen,
  onOpenChange,
  onUpdate,
  onDelete,
  onVendorUpdated,
}) => {
  if (!vendor) {
    return null;
  }

  const headerInfo = formatVendorHeader(vendor);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="p-0 overflow-hidden flex flex-col bg-gray-50 !w-[66.67vw] !max-w-[66.67vw]"
      >
        <SheetHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl font-semibold text-gray-900 truncate">
                {headerInfo.title}
              </SheetTitle>
              <div className="flex items-center gap-3 mt-2">
                {/* Vendor Type Badge */}
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${headerInfo.vendorTypeStyle.bg} ${headerInfo.vendorTypeStyle.text} ${headerInfo.vendorTypeStyle.border}`}>
                  <span className="text-xs">{headerInfo.vendorTypeStyle.icon}</span>
                  {vendor.vendor_type}
                </span>
                
                {/* Insurance Status Badge */}
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${headerInfo.insuranceStyle.bg} ${headerInfo.insuranceStyle.text} ${headerInfo.insuranceStyle.border}`}>
                  <span className="text-xs">{headerInfo.insuranceStyle.icon}</span>
                  {headerInfo.insuranceStyle.label}
                </span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <VendorSlideOutContent
            vendor={vendor}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onClose={() => onOpenChange(false)}
            onVendorUpdated={onVendorUpdated}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default VendorSlideOut;