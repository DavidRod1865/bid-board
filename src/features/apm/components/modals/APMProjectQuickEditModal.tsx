import React, { useEffect, useState } from "react";
import type { Bid, User } from "../../../../shared/types";
import DialogModal from "../../../../shared/components/ui/DialogModal";
import { Input, Select } from "../../../../shared/components/ui/FormField";
import { Button } from "../../../../shared/components/ui/Button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { dbOperations } from "../../../../shared/services/supabase";
import { useToast } from "../../../../shared/hooks/useToast";

interface APMProjectQuickEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Bid | null;
  users: User[];
}

interface FormState {
  project_name: string;
  project_address: string;
  general_contractor: string;
  apm_id: string;
  pm_id: string;
  gc_system: string;
  binder: boolean;
  project_start_date: string;
  added_to_procore: boolean;
}

const APMProjectQuickEditModal: React.FC<APMProjectQuickEditModalProps> = ({
  isOpen,
  onClose,
  project,
  users,
}) => {
  const { showSuccess, showError } = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && project) {
      const toDateInput = (value?: string | null) => {
        if (!value) return "";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "";
        return d.toISOString().split("T")[0];
      };

      setForm({
        project_name: project.project_name || "",
        project_address: project.project_address || "",
        general_contractor: project.general_contractor || "",
        apm_id: project.assign_to || "",
        pm_id: project.assigned_pm || "",
        gc_system: project.gc_system || "",
        binder: Boolean((project as any).binder),
        project_start_date: toDateInput(project.project_start_date),
        added_to_procore: Boolean(project.added_to_procore),
      });
    } else if (!isOpen) {
      setForm(null);
      setIsSubmitting(false);
    }
  }, [isOpen, project]);

  if (!isOpen || !project || !form) {
    return null;
  }

  const handleChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async () => {
    if (isSubmitting || !project || !form) return;

    if (!form.project_name.trim()) {
      showError("Validation Error", "Project name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const startDateIso = form.project_start_date
        ? new Date(form.project_start_date).toISOString()
        : null;

      const updatePayload = {
        project_name: form.project_name,
        project_address: form.project_address || null,
        general_contractor: form.general_contractor,
        assign_to: form.apm_id || null,
        assigned_pm: form.pm_id || null,
        gc_system: form.gc_system || null,
        binder: form.binder,
        project_start_date: startDateIso,
        added_to_procore: form.added_to_procore,
      };

      console.log("APMProjectQuickEditModal: Updating project", project.id, "with payload:", updatePayload);

      const result = await dbOperations.updateAPMProject(project.id, updatePayload);
      
      console.log("APMProjectQuickEditModal: Update result:", result);

      showSuccess("Project Updated", "Project details have been updated.");
      
      // Trigger a data refresh to ensure UI shows the changes
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("supabase-data-changed"));
      }
      
      onClose();
    } catch (error) {
      console.error("APMProjectQuickEditModal: Failed to update project", error);
      showError(
        "Update Failed",
        error instanceof Error ? error.message : "Failed to update project. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const footer = (
    <div className="flex gap-3">
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        disabled={isSubmitting}
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="default"
        onClick={handleSave}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );

  const apmUsers = users.filter((u) => u.role === "APM" || u.role === "Admin");

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Edit Project"
      footer={footer}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project Name *
          </label>
          <Input
            type="text"
            value={form.project_name}
            onChange={(e) => handleChange("project_name", e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project Address
          </label>
          <Input
            type="text"
            value={form.project_address}
            onChange={(e) => handleChange("project_address", e.target.value)}
            disabled={isSubmitting}
            placeholder="Enter project address"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            General Contractor
          </label>
          <Input
            type="text"
            value={form.general_contractor}
            onChange={(e) => handleChange("general_contractor", e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              APM
            </label>
            <Select
              value={form.apm_id}
              onChange={(e) => handleChange("apm_id", e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Unassigned</option>
              {apmUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PM
            </label>
            <Input
              type="text"
              value={form.pm_id}
              onChange={(e) => handleChange("pm_id", e.target.value)}
              placeholder="Enter PM name"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GC System
            </label>
            <Select
              value={form.gc_system}
              onChange={(e) => handleChange("gc_system", e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Not set</option>
              <option value="Procore">Procore</option>
              <option value="AutoDesk">AutoDesk</option>
              <option value="Email">Email</option>
              <option value="Other">Other</option>
            </Select>
          </div>

          <div className="flex items-center mt-6">
            <Checkbox
              checked={form.binder}
              onCheckedChange={(checked) =>
                handleChange("binder", checked === true)
              }
              disabled={isSubmitting}
            />
            <span className="ml-2 text-sm text-gray-700">
              Binder
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <Input
              type="date"
              value={form.project_start_date}
              onChange={(e) => handleChange("project_start_date", e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center mt-6">
            <Checkbox
              checked={form.added_to_procore}
              onCheckedChange={(checked) =>
                handleChange("added_to_procore", checked === true)
              }
              disabled={isSubmitting}
            />
            <span className="ml-2 text-sm text-gray-700">
              Added to Procore
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          To update detailed project notes, go to the project page.
        </p>
      </div>
    </DialogModal>
  );
};

export default APMProjectQuickEditModal;

