import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Vendor } from "../../types";
import { dbOperations } from "../../lib/supabase";
import Sidebar from "../ui/Sidebar";
import Button from "../ui/Button";
import ConfirmationModal from "../ui/ConfirmationModal";
import VendorProfile from "./VendorProfile";

interface VendorDetailProps {
  onDeleteVendor?: (vendorId: number) => Promise<void>;
  onUpdateVendor?: (vendorId: number, updatedVendor: Partial<Vendor>) => Promise<void>;
}

const VendorDetail: React.FC<VendorDetailProps> = ({
  onDeleteVendor,
  onUpdateVendor
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Vendor>>({
    company_name: "",
    address: "",
    contact_person: "",
    phone: "",
    email: "",
    notes: "",
    specialty: "",
    is_priority: false,
  });

  // Sidebar state
  const [statusFilter, setStatusFilter] = useState("");

  // Fetch vendor data on component mount
  useEffect(() => {
    const fetchVendor = async () => {
      if (!id) {
        setError("No vendor ID provided");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // Use the more efficient getVendor function to fetch single vendor
        const foundVendor = await dbOperations.getVendor(parseInt(id));
        setVendor(foundVendor);
        
        // Initialize form data with vendor data
        setFormData({
          company_name: foundVendor.company_name || "",
          address: foundVendor.address || "",
          contact_person: foundVendor.contact_person || "",
          phone: foundVendor.phone || "",
          email: foundVendor.email || "",
          notes: foundVendor.notes || "",
          specialty: foundVendor.specialty || "",
          is_priority: foundVendor.is_priority || false,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load vendor");
        setVendor(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendor();
  }, [id]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <Sidebar 
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
          <div className="flex-1 p-8">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4af37] mx-auto mb-4"></div>
              <h2 className="text-2xl font-semibold text-gray-900">Loading vendor...</h2>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error or vendor not found state
  if (error || !vendor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <Sidebar 
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
          <div className="flex-1 p-8">
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {error || "Vendor not found"}
              </h2>
              <Button onClick={() => navigate("/vendors")}>
                ← Back to Vendors
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!vendor) return;
    
    try {
      setIsSaving(true);
      setError(null);

      if (onUpdateVendor) {
        await onUpdateVendor(vendor.id, formData);
        // Update local vendor state with the form data
        setVendor({ ...vendor, ...formData } as Vendor);
      } else {
        // Fallback to direct database operation
        const updatedVendor = await dbOperations.updateVendor(vendor.id, formData);
        setVendor(updatedVendor);
      }
      
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update vendor");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (!vendor) return;
    
    // Reset form data to original vendor values
    setFormData({
      company_name: vendor.company_name || "",
      address: vendor.address || "",
      contact_person: vendor.contact_person || "",
      phone: vendor.phone || "",
      email: vendor.email || "",
      notes: vendor.notes || "",
      specialty: vendor.specialty || "",
      is_priority: vendor.is_priority || false,
    });
    setIsEditing(false);
    setError(null);
  };

  const handleDeleteVendor = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteVendor = async () => {
    if (!vendor) return;
    
    try {
      setError(null);
      if (onDeleteVendor) {
        await onDeleteVendor(vendor.id);
      } else {
        // Fallback to direct database operation
        await dbOperations.deleteVendor(vendor.id);
      }
      navigate("/vendors");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete vendor");
      setShowDeleteModal(false);
    }
  };

  const handleEditVendor = () => {
    setIsEditing(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="flex">
        <Sidebar 
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onEditVendor={handleEditVendor}
          onDeleteVendor={handleDeleteVendor}
          onSaveVendor={handleSave}
          onCancelVendor={handleCancel}
          isEditingVendor={isEditing}
          isSavingVendor={isSaving}
        />
        
        <div className="flex-1 p-8">
          {/* Error display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <VendorProfile
              vendor={vendor}
              formData={formData}
              setFormData={setFormData}
              isEditing={isEditing}
            />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteVendor}
        title="Delete Vendor"
        message="Are you sure you want to delete this vendor? This action cannot be undone."
        confirmText="Delete Vendor"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default VendorDetail;