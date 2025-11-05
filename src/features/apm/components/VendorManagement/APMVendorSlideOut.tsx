import React from 'react';
import type { BidVendor, Vendor, Bid, User } from '../../../../shared/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../../../../shared/components/ui/sheet';
import APMVendorWorkflowForm from './APMVendorWorkflowForm';

interface APMVendorSlideOutProps {
  vendor: BidVendor | null;
  bid: Bid | null;
  vendorInfo: Vendor | null;
  users: User[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (vendorId: number, updates: Partial<BidVendor>) => Promise<void>;
  trigger?: React.ReactNode;
}

const APMVendorSlideOut: React.FC<APMVendorSlideOutProps> = ({
  vendor,
  bid,
  vendorInfo,
  users,
  isOpen,
  onOpenChange,
  onUpdate,
  trigger
}) => {
  if (!vendor || !bid || !vendorInfo) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      
      <SheetContent 
        side="right" 
        className="w-screen max-w-7xl p-0 overflow-hidden flex flex-col bg-gray-50"
        style={{ width: '1400px' }}
      >
        <SheetHeader className="border-b bg-gray-50">
          <SheetTitle className="text-xl font-semibold text-left">
            {`${vendorInfo.company_name}`}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto bg-gray-50">
          <APMVendorWorkflowForm
            vendor={vendor}
            bid={bid}
            vendorInfo={vendorInfo}
            users={users}
            onUpdate={onUpdate}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default APMVendorSlideOut;