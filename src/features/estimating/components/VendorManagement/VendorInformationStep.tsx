import React from "react";
import type { Vendor, VendorType } from "../../../../shared/types";
import FormField, {
  Input,
  Textarea,
  Select,
} from "../../../../shared/components/ui/FormField";

interface VendorInformationStepProps {
  vendorData: Partial<Vendor>;
  onVendorDataChange: (data: Partial<Vendor>) => void;
  errors: Record<string, string>;
}

const VendorInformationStep: React.FC<VendorInformationStepProps> = ({
  vendorData,
  onVendorDataChange,
  errors,
}) => {
  const handleInputChange = (field: string, value: string | boolean) => {
    onVendorDataChange({
      ...vendorData,
      [field]: value,
    });
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Basic Company Information */}
      <div className="space-y-4 flex flex-col">
        <h3 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2">
          Company Information
        </h3>

        <FormField label="Company Name" required error={errors.company_name}>
          <Input
            type="text"
            value={vendorData.company_name || ""}
            onChange={(e) => handleInputChange("company_name", e.target.value)}
            placeholder="Enter company name"
            className={
              errors.company_name ? "border-red-300 focus:border-red-500" : ""
            }
          />
        </FormField>

        <FormField label="Address" required error={errors.address}>
          <Input
            type="text"
            value={vendorData.address || ""}
            onChange={(e) => handleInputChange("address", e.target.value)}
            placeholder="Enter full address"
            className={
              errors.address ? "border-red-300 focus:border-red-500" : ""
            }
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Vendor Type" required error={errors.vendor_type}>
            <Select
              value={vendorData.vendor_type || "Vendor"}
              onChange={(e) =>
                handleInputChange("vendor_type", e.target.value as VendorType)
              }
              className={
                errors.vendor_type ? "border-red-300 focus:border-red-500" : ""
              }
            >
              <option value="Vendor">Vendor</option>
              <option value="Subcontractor">Subcontractor</option>
              <option value="General Contractor">General Contractor</option>
            </Select>
          </FormField>

          <FormField label="Specialty" error={errors.specialty}>
            <Input
              type="text"
              value={vendorData.specialty || ""}
              onChange={(e) => handleInputChange("specialty", e.target.value)}
              placeholder="e.g., Electrical, Plumbing"
              className={
                errors.specialty ? "border-red-300 focus:border-red-500" : ""
              }
            />
          </FormField>
        </div>

        <div className="flex flex-1/3">
          <FormField
            label="Insurance Expiry Date (If Applicable)"
            error={errors.insurance_expiry_date}
          >
            <Input
              type="date"
              value={vendorData.insurance_expiry_date || ""}
              onChange={(e) =>
                handleInputChange("insurance_expiry_date", e.target.value)
              }
              className={
                errors.insurance_expiry_date
                  ? "border-red-300 focus:border-red-500"
                  : ""
              }
            />
          </FormField>
        </div>
      </div>

      {/* Section 3: Additional Information */}
      <div className="space-y-4">
        <div className="border-b border-gray-200" />

        <FormField label="General Notes" error={errors.notes}>
          <Textarea
            value={vendorData.notes || ""}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            placeholder="Additional notes about this vendor..."
            rows={3}
            className={
              errors.notes ? "border-red-300 focus:border-red-500" : ""
            }
          />
        </FormField>
      </div>
    </div>
  );
};

export default VendorInformationStep;
