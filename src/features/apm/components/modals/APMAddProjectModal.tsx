import React, { useState, useEffect, useMemo } from "react";
import type { Bid, User, Vendor, VendorContact } from "../../../../shared/types";
import { dbOperations } from "../../../../shared/services/supabase";
import { useUserProfile } from "../../../../contexts/UserContext";
import DialogModal from "../../../../shared/components/ui/DialogModal";
import { Input, Textarea, Select } from "../../../../shared/components/ui/FormField";
import { Button } from "../../../../shared/components/ui/Button";
import VendorSelectorPopup from "../../../../shared/components/modals/VendorSelectorPopup";
import { Checkbox } from "@/shared/components/ui/checkbox";

interface APMAddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProject: (projectData: Omit<Bid, "id">) => void;
  onCreateProjectWithVendors?: (
    projectData: Omit<Bid, "id">,
    selectedVendorIds: number[]
  ) => Promise<void>;
  users: User[];
  vendors?: Vendor[];
  isLoading?: boolean;
}

const STEPS = [
  { id: 1, title: "Project Info" },
  { id: 2, title: "General Contractor" },
  { id: 3, title: "Project Details" },
  { id: 4, title: "Vendors" },
  { id: 5, title: "Review" },
];

const APMAddProjectModal: React.FC<APMAddProjectModalProps> = ({
  isOpen,
  onClose,
  onAddProject,
  onCreateProjectWithVendors,
  users,
  vendors = [],
  isLoading = false,
}) => {
  const { userProfile } = useUserProfile();
  const [currentStep, setCurrentStep] = useState(1);

  // Find the database user that matches the current Auth0 user by email
  const getCurrentDatabaseUser = () => {
    if (!userProfile?.email) return null;
    return users.find((user) => user.email === userProfile.email) || null;
  };

  const getInitialFormData = () => {
    const currentDbUser = getCurrentDatabaseUser();
    return {
      project_name: "",
      project_address: "",
      general_contractor: "",
      project_description: "",
      project_email: "",
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      project_start_date: "",
      status: "New",
      priority: false,
      assign_to: null as string | null,
      file_location: "",
      created_by: currentDbUser?.id || null,
      gc_system: null as "Procore" | "AutoDesk" | "Email" | "Other" | null,
      added_to_procore: false,
      assigned_pm: "",
      binder: false,
      gc_contact_id: null as number | null,
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState<Vendor[]>([]);
  const [showVendorSelector, setShowVendorSelector] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<"Estimating" | "APM">("APM");
  const [gcContacts, setGcContacts] = useState<VendorContact[]>([]);
  const [loadingGcContacts, setLoadingGcContacts] = useState(false);
  const [showAddNewGC, setShowAddNewGC] = useState(false);
  const [isCreatingGC, setIsCreatingGC] = useState(false);
  
  // Simple GC form state
  const [newGCForm, setNewGCForm] = useState({
    company_name: "",
    address: "",
    contact_name: "",
    contact_title: "",
    contact_phone: "",
    contact_email: "",
  });
  const [newGCErrors, setNewGCErrors] = useState<Record<string, string>>({});

  // Filter vendors to get only General Contractors (memoized to prevent infinite re-renders)
  const gcVendors = useMemo(
    () => vendors.filter((v) => v.vendor_type === "General Contractor"),
    [vendors]
  );

  // Check if user is admin
  const isAdmin = userProfile?.role === "Admin";

  // Fetch GC contacts when general_contractor changes
  useEffect(() => {
    const fetchGcContacts = async () => {
      const gcName = formData.general_contractor?.trim();
      if (!gcName) {
        setGcContacts([]);
        return;
      }

      const gcVendor = gcVendors.find((v) => v.company_name === gcName);

      if (!gcVendor) {
        setGcContacts([]);
        return;
      }

      setLoadingGcContacts(true);
      try {
        const contacts = await dbOperations.getVendorContacts(gcVendor.id);
        setGcContacts(contacts || []);
      } catch (error) {
        console.error('Error fetching GC contacts:', error);
        setGcContacts([]);
      } finally {
        setLoadingGcContacts(false);
      }
    };

    fetchGcContacts();
  }, [formData.general_contractor, gcVendors]);

  // Validate current step
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.project_name.trim()) {
        newErrors.project_name = "Project name is required";
      }
      if (!formData.project_address.trim()) {
        newErrors.project_address = "Project address is required";
      }
    } else if (step === 2) {
      if (!formData.general_contractor.trim()) {
        newErrors.general_contractor = "General contractor is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isLoading || isSubmitting) return;

    setIsSubmitting(true);

    const projectData = {
      ...formData,
      title: formData.project_name,
      due_date: new Date(formData.due_date).toISOString(),
      project_start_date: formData.project_start_date || null,
      created_by: formData.created_by || null,
      assign_to: formData.assign_to || null,
      estimated_value: 0,
      notes: "",
      archived: false,
      archived_at: null,
      archived_by: null,
      on_hold: false,
      on_hold_at: null,
      on_hold_by: null,
      department: selectedDepartment,
      sent_to_apm: true,
      sent_to_apm_at: new Date().toISOString(),
      apm_on_hold: false,
      apm_on_hold_at: null,
      apm_archived: false,
      apm_archived_at: null,
      gc_system: formData.gc_system,
      added_to_procore: formData.added_to_procore,
      made_by_apm: true,
      gc_contact_id: formData.gc_contact_id || null,
      assigned_pm: formData.assigned_pm || null,
      binder: formData.binder,
    };

    try {
      if (selectedVendors.length > 0 && onCreateProjectWithVendors) {
        const vendorIds = selectedVendors.map((vendor) => vendor.id);
        await onCreateProjectWithVendors(projectData, vendorIds);
      } else {
        await Promise.resolve(onAddProject(projectData));
      }

      setFormData(getInitialFormData());
      setSelectedVendors([]);
      setErrors({});
      setCurrentStep(1);
      onClose();
    } catch (err) {
      console.error("Failed to create project", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    field: keyof typeof formData,
    value: string | boolean | number | null
  ) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      if (field === "general_contractor") {
        newData.gc_contact_id = null;
      }
      return newData;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleClose = () => {
    if (!isLoading && !isSubmitting) {
      onClose();
      setFormData(getInitialFormData());
      setSelectedVendors([]);
      setErrors({});
      setShowAddNewGC(false);
      setCurrentStep(1);
      setNewGCForm({
        company_name: "",
        address: "",
        contact_name: "",
        contact_title: "",
        contact_phone: "",
        contact_email: "",
      });
      setNewGCErrors({});
    }
  };

  // Handle simple GC form input change
  const handleNewGCInputChange = (field: keyof typeof newGCForm, value: string) => {
    setNewGCForm((prev) => ({ ...prev, [field]: value }));
    if (newGCErrors[field]) {
      setNewGCErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Reset simple GC form
  const resetNewGCForm = () => {
    setNewGCForm({
      company_name: "",
      address: "",
      contact_name: "",
      contact_title: "",
      contact_phone: "",
      contact_email: "",
    });
    setNewGCErrors({});
  };

  // Validate and create new GC
  const handleCreateNewGC = async () => {
    const errors: Record<string, string> = {};
    
    if (!newGCForm.company_name.trim()) {
      errors.company_name = "Company name is required";
    }
    if (!newGCForm.address.trim()) {
      errors.address = "Address is required";
    }
    if (!newGCForm.contact_name.trim()) {
      errors.contact_name = "Contact name is required";
    }

    if (Object.keys(errors).length > 0) {
      setNewGCErrors(errors);
      return;
    }

    // Check if GC already exists
    const existingGC = gcVendors.find(
      (v) => v.company_name.toLowerCase() === newGCForm.company_name.trim().toLowerCase()
    );
    if (existingGC) {
      setNewGCErrors({ company_name: "A General Contractor with this name already exists" });
      return;
    }

    setIsCreatingGC(true);
    try {
      const gcVendorData = {
        company_name: newGCForm.company_name.trim(),
        address: newGCForm.address.trim(),
        vendor_type: "General Contractor" as const,
        notes: null,
        specialty: null,
        is_priority: false,
        insurance_expiry_date: null,
        insurance_notes: null,
        insurance_file_path: null,
        insurance_file_name: null,
        insurance_file_size: null,
        insurance_file_uploaded_at: null,
        primary_contact_id: null,
      };

      const contactsToCreate = [
        {
          contact_name: newGCForm.contact_name.trim(),
          contact_title: newGCForm.contact_title.trim() || null,
          phone: newGCForm.contact_phone.trim() || null,
          email: newGCForm.contact_email.trim() || null,
          contact_type: "General Contractor",
          is_primary: true,
          is_emergency_contact: false,
          notes: null,
        },
      ];

      const newVendor = await dbOperations.createVendorWithContacts(
        gcVendorData,
        contactsToCreate
      );

      // Set vendor.primary_contact_id to the newly created primary contact (if found)
      try {
        const contacts = await dbOperations.getVendorContacts(newVendor.id);
        const primary = (contacts || []).find((c: any) => c.is_primary);
        if (primary?.id) {
          await dbOperations.updateVendor(newVendor.id, {
            primary_contact_id: primary.id,
          });
        }
      } catch (err) {
        // Non-blocking: vendor was created; primary_contact_id can be set later
        console.warn("Failed to set vendor primary_contact_id", err);
      }

      handleInputChange("general_contractor", newVendor.company_name);
      setShowAddNewGC(false);
      resetNewGCForm();

      // Trigger refresh to get updated vendor list
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("supabase-data-changed"));
      }
    } catch (error) {
      console.error("Error creating new GC:", error);
      setNewGCErrors({ company_name: "Failed to create General Contractor. Please try again." });
    } finally {
      setIsCreatingGC(false);
    }
  };

  const handleVendorSelection = (newSelectedVendors: Vendor[]) => {
    setSelectedVendors(newSelectedVendors);
  };

  const removeVendor = (vendorId: number) => {
    setSelectedVendors((prev) => prev.filter((vendor) => vendor.id !== vendorId));
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const user = users.find((u) => u.id === userId);
    return user?.name || "Unknown";
  };

  const getContactName = (contactId: number | null) => {
    if (!contactId) return "Not selected";
    const contact = gcContacts.find((c) => c.id === contactId);
    return contact?.contact_name || "Unknown";
  };

  // Footer buttons based on current step (hidden when vendor wizard is showing)
  const footerButtons = showAddNewGC ? null : (
    <div className="flex justify-between w-full">
      <div>
        {currentStep > 1 && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleBack}
            disabled={isLoading || isSubmitting}
          >
            Back
          </Button>
        )}
      </div>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={handleClose}
          disabled={isLoading || isSubmitting}
        >
          Cancel
        </Button>
        {currentStep < STEPS.length ? (
          <Button
            type="button"
            variant="default"
            onClick={handleNext}
            disabled={isLoading || isSubmitting}
          >
            Next
          </Button>
        ) : (
          <Button
            type="button"
            variant="default"
            onClick={() => handleSubmit()}
            disabled={isLoading || isSubmitting}
          >
            {isLoading || isSubmitting ? "Creating..." : "Create Project"}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <DialogModal
        isOpen={isOpen}
        onClose={handleClose}
        title={showAddNewGC ? "Add New General Contractor" : "Add New Project"}
        footer={footerButtons}
      >
        {/* Step Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep === step.id
                        ? "bg-[#d4af37] text-white"
                        : currentStep > step.id
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {currentStep > step.id ? "✓" : step.id}
                  </div>
                  <span className="text-xs mt-1 text-gray-600 hidden sm:block">
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      currentStep > step.id ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <form id="apm-add-project-form" onSubmit={handleSubmit} className="min-h-[300px]">
          {/* Step 1: Project Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Project Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name *
                </label>
                <Input
                  type="text"
                  value={formData.project_name}
                  onChange={(e) => handleInputChange("project_name", e.target.value)}
                  placeholder="Enter project name"
                  disabled={isLoading || isSubmitting}
                />
                {errors.project_name && (
                  <p className="text-red-600 text-sm mt-1">{errors.project_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Address *
                </label>
                <Input
                  type="text"
                  value={formData.project_address}
                  onChange={(e) => handleInputChange("project_address", e.target.value)}
                  placeholder="Enter project address"
                  disabled={isLoading || isSubmitting}
                />
                {errors.project_address && (
                  <p className="text-red-600 text-sm mt-1">{errors.project_address}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Description
                </label>
                <Textarea
                  value={formData.project_description}
                  onChange={(e) => handleInputChange("project_description", e.target.value)}
                  placeholder="Enter project description"
                  rows={3}
                  disabled={isLoading || isSubmitting}
                />
              </div>
            </div>
          )}

          {/* Step 2: General Contractor */}
          {currentStep === 2 && !showAddNewGC && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">General Contractor</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  General Contractor *
                </label>
                <div className="space-y-2">
                  <Select
                    value={formData.general_contractor}
                    onChange={(e) => {
                      if (e.target.value === "__add_new__") {
                        setShowAddNewGC(true);
                      } else {
                        handleInputChange("general_contractor", e.target.value);
                      }
                    }}
                    disabled={isLoading || isSubmitting}
                  >
                    <option value="">Select a General Contractor</option>
                    {gcVendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.company_name}>
                        {vendor.company_name}
                      </option>
                    ))}
                    <option value="__add_new__">+ Add new General Contractor...</option>
                  </Select>
                  {gcVendors.length === 0 && (
                    <p className="text-xs text-gray-500">
                      No General Contractors found.{" "}
                      <button
                        type="button"
                        className="text-[#d4af37] hover:underline"
                        onClick={() => setShowAddNewGC(true)}
                      >
                        Add one now
                      </button>
                    </p>
                  )}
                </div>
                {errors.general_contractor && (
                  <p className="text-red-600 text-sm mt-1">{errors.general_contractor}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  General Contractor Contact
                </label>
                {loadingGcContacts ? (
                  <span className="text-gray-400 text-sm">Loading contacts...</span>
                ) : gcContacts.length > 0 ? (
                  <Select
                    value={formData.gc_contact_id?.toString() || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "gc_contact_id",
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    disabled={isLoading || isSubmitting}
                  >
                    <option value="">Select a contact</option>
                    {gcContacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.contact_name}
                        {contact.contact_title ? ` - ${contact.contact_title}` : ''}
                        {contact.is_primary ? ' (Primary)' : ''}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Select 
                    value=""
                    onChange={() => {}}
                    disabled={isLoading || isSubmitting || !formData.general_contractor}
                  >
                    <option value="">
                      {!formData.general_contractor 
                        ? "Select a GC first" 
                        : "No contacts available"}
                    </option>
                  </Select>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Add New General Contractor (Simple Form) */}
          {currentStep === 2 && showAddNewGC && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New General Contractor</h3>
              <p className="text-sm text-gray-500 mb-4">
                Enter the GC name, address, and primary contact. You can add more contacts later from the Vendors page.
              </p>
              
              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <Input
                  type="text"
                  value={newGCForm.company_name}
                  onChange={(e) => handleNewGCInputChange("company_name", e.target.value)}
                  placeholder="Enter company name"
                  disabled={isCreatingGC}
                />
                {newGCErrors.company_name && (
                  <p className="text-red-600 text-sm mt-1">{newGCErrors.company_name}</p>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address *
                </label>
                <Input
                  type="text"
                  value={newGCForm.address}
                  onChange={(e) => handleNewGCInputChange("address", e.target.value)}
                  placeholder="Enter company address"
                  disabled={isCreatingGC}
                />
                {newGCErrors.address && (
                  <p className="text-red-600 text-sm mt-1">{newGCErrors.address}</p>
                )}
              </div>

              {/* Primary Contact */}
              <div className="border-t border-gray-200 pt-4 mt-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-700">Primary Contact</h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Name *
                  </label>
                  <Input
                    type="text"
                    value={newGCForm.contact_name}
                    onChange={(e) =>
                      handleNewGCInputChange("contact_name", e.target.value)
                    }
                    placeholder="Enter contact name"
                    disabled={isCreatingGC}
                  />
                  {newGCErrors.contact_name && (
                    <p className="text-red-600 text-sm mt-1">
                      {newGCErrors.contact_name}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <Input
                      type="text"
                      value={newGCForm.contact_title}
                      onChange={(e) =>
                        handleNewGCInputChange("contact_title", e.target.value)
                      }
                      placeholder="e.g. Project Manager"
                      disabled={isCreatingGC}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <Input
                      type="tel"
                      value={newGCForm.contact_phone}
                      onChange={(e) =>
                        handleNewGCInputChange("contact_phone", e.target.value)
                      }
                      placeholder="Enter phone number"
                      disabled={isCreatingGC}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={newGCForm.contact_email}
                    onChange={(e) =>
                      handleNewGCInputChange("contact_email", e.target.value)
                    }
                    placeholder="Enter email address"
                    disabled={isCreatingGC}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowAddNewGC(false);
                    resetNewGCForm();
                  }}
                  disabled={isCreatingGC}
                >
                  ← Back to Selection
                </Button>
                <Button
                  type="button"
                  variant="default"
                  onClick={handleCreateNewGC}
                  disabled={isCreatingGC}
                >
                  {isCreatingGC ? "Creating..." : "Create General Contractor"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Project Details */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Project Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    General Contractor System
                  </label>
                  <select
                    value={formData.gc_system || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleInputChange(
                        "gc_system",
                        value === "" ? null : (value as "Procore" | "AutoDesk" | "Email" | "Other")
                      );
                    }}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-[#d4af37] focus:border-[#d4af37] sm:text-sm rounded-md"
                    disabled={isLoading || isSubmitting}
                  >
                    <option value="">Select a system type</option>
                    <option value="Procore">Procore</option>
                    <option value="AutoDesk">AutoDesk</option>
                    <option value="Email">Email</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Start Date
                  </label>
                  <Input
                    type="date"
                    value={formData.project_start_date}
                    onChange={(e) => handleInputChange("project_start_date", e.target.value)}
                    onClick={(e) => (e.target as HTMLInputElement).showPicker()}
                    disabled={isLoading || isSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    APM
                  </label>
                  <Select
                    value={formData.assign_to || ""}
                    onChange={(e) => handleInputChange("assign_to", e.target.value || null)}
                    disabled={isLoading || isSubmitting}
                  >
                    <option value="">Unassigned</option>
                    {users
                      .filter((u) => u.role === "APM" || u.role === "Admin")
                      .map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PM
                  </label>
                  <Input
                    type="text"
                    value={formData.assigned_pm}
                    onChange={(e) => handleInputChange("assigned_pm", e.target.value)}
                    placeholder="Enter PM name"
                    disabled={isLoading || isSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Added to Procore
                  </label>
                  <div className="flex items-center">
                    <Checkbox
                      checked={formData.added_to_procore || false}
                      onCheckedChange={(checked) =>
                        handleInputChange("added_to_procore", checked === true)
                      }
                      disabled={isLoading || isSubmitting}
                    />
                    <span className="ml-2 text-sm text-gray-600">Yes</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Binder Made
                  </label>
                  <div className="flex items-center">
                    <Checkbox
                      checked={formData.binder || false}
                      onCheckedChange={(checked) =>
                        handleInputChange("binder", checked === true)
                      }
                      disabled={isLoading || isSubmitting}
                    />
                    <span className="ml-2 text-sm text-gray-600">Yes</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Vendor Assignment */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Vendor Assignment</h3>
              
              {vendors.length > 0 ? (
                <div>
                  <div className="mb-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowVendorSelector(true)}
                      disabled={isLoading || isSubmitting}
                    >
                      Add Vendors ({selectedVendors.length} selected)
                    </Button>
                  </div>

                  {selectedVendors.length > 0 ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Selected Vendors
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {selectedVendors.map((vendor) => (
                          <div
                            key={vendor.id}
                            className="flex items-center justify-between bg-white border border-gray-200 rounded px-3 py-2"
                          >
                            <span className="text-sm text-gray-900">
                              {vendor.company_name}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeVendor(vendor.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                              disabled={isLoading || isSubmitting}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Vendors will be assigned with default settings (status: pending, priority: normal)
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-gray-500">No vendors selected</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Click "Add Vendors" to assign vendors to this project
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-gray-500">No vendors available</p>
                  <p className="text-xs text-gray-400 mt-1">
                    You can add vendors after creating the project
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Review & Create</h3>
              <p className="text-sm text-gray-600 mb-4">Please review the project details before creating.</p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">Project Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Name:</span>{" "}
                      <span className="font-medium">{formData.project_name || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Address:</span>{" "}
                      <span className="font-medium">{formData.project_address || "—"}</span>
                    </div>
                    {formData.project_description && (
                      <div className="md:col-span-2">
                        <span className="text-gray-500">Description:</span>{" "}
                        <span className="font-medium">{formData.project_description}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">General Contractor</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">GC:</span>{" "}
                      <span className="font-medium">{formData.general_contractor || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Contact:</span>{" "}
                      <span className="font-medium">{getContactName(formData.gc_contact_id)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">Project Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">GC System:</span>{" "}
                      <span className="font-medium">{formData.gc_system || "Not set"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Start Date:</span>{" "}
                      <span className="font-medium">
                        {formData.project_start_date 
                          ? new Date(formData.project_start_date).toLocaleDateString() 
                          : "Not set"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">APM:</span>{" "}
                      <span className="font-medium">{getUserName(formData.assign_to)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">PM:</span>{" "}
                      <span className="font-medium">{formData.assigned_pm || "Not assigned"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Added to Procore:</span>{" "}
                      <span className="font-medium">{formData.added_to_procore ? "Yes" : "No"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Binder Made:</span>{" "}
                      <span className="font-medium">{formData.binder ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">Assigned Vendors</h4>
                  {selectedVendors.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedVendors.map((vendor) => (
                        <span
                          key={vendor.id}
                          className="bg-white border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          {vendor.company_name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No vendors assigned</p>
                  )}
                </div>
              </div>

              {isAdmin && (
                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department Assignment (Admin)
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="department"
                        value="Estimating"
                        checked={selectedDepartment === "Estimating"}
                        onChange={(e) => setSelectedDepartment(e.target.value as "Estimating" | "APM")}
                        className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300"
                        disabled={isLoading || isSubmitting}
                      />
                      <span className="ml-2 block text-sm text-gray-700">Estimating</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="department"
                        value="APM"
                        checked={selectedDepartment === "APM"}
                        onChange={(e) => setSelectedDepartment(e.target.value as "Estimating" | "APM")}
                        className="h-4 w-4 text-[#d4af37] focus:ring-[#d4af37] border-gray-300"
                        disabled={isLoading || isSubmitting}
                      />
                      <span className="ml-2 block text-sm text-gray-700">APM</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </DialogModal>

      {showVendorSelector && (
        <VendorSelectorPopup
          isOpen={showVendorSelector}
          onClose={() => setShowVendorSelector(false)}
          vendors={vendors}
          selectedVendors={selectedVendors}
          onVendorsSelected={handleVendorSelection}
        />
      )}
    </>
  );
};

export default APMAddProjectModal;
