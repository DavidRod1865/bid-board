import React, { useState, useEffect } from "react";
import { XMarkIcon, TrashIcon, UserIcon } from "@heroicons/react/24/outline";
import type { User } from "../../types";
import { Button } from "../ui/Button";
import FormField, { Input, Select } from "../ui/FormField";

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdateUser: (userId: string, userData: Partial<User>) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
}

const UserEditModal: React.FC<UserEditModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onDeleteUser,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    is_active: true,
    color_preference: "#d4af37",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when user changes or modal opens
  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        role: user.role || "User",
        is_active: user.is_active !== false, // Default to true if undefined
        color_preference: user.color_preference || "#d4af37",
      });
      setErrors({});
    }
  }, [user, isOpen]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.role.trim()) {
      newErrors.role = "Role is required";
    }

    if (!formData.color_preference.trim()) {
      newErrors.color_preference = "Color preference is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !validateForm()) return;

    try {
      setIsLoading(true);
      await onUpdateUser(user.id, formData);
      onClose();
    } catch (error) {
      console.error("Error updating user:", error);
      setErrors({ submit: "Failed to update user. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete user "${user.name}"? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      setIsLoading(true);
      await onDeleteUser(user.id);
      onClose();
    } catch (error) {
      console.error("Error deleting user:", error);
      setErrors({ submit: "Failed to delete user. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto border border-gray-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
              <p className="text-sm text-gray-600">Update user information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name Field */}
          <FormField label="Full Name" error={errors.name} required>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Enter full name"
              disabled={isLoading}
            />
          </FormField>

          {/* Email Field */}
          <FormField label="Email Address" error={errors.email} required>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="Enter email address"
              disabled={isLoading}
            />
          </FormField>

          {/* Role Field */}
          <FormField label="Role" error={errors.role} required>
            <Select
              value={formData.role}
              onChange={(e) => handleInputChange("role", e.target.value)}
              disabled={isLoading}
            >
              <option value="">Select a role</option>
              <option value="Admin">Admin</option>
              <option value="APM">APM</option>
              <option value="Estimating">Estimating</option>
            </Select>
          </FormField>

          {/* Status Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${formData.is_active ? "text-green-700" : "text-gray-500"}`}>
                Active
              </span>
              <button
                type="button"
                onClick={() => handleInputChange("is_active", !formData.is_active)}
                disabled={isLoading}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  formData.is_active ? "bg-green-600" : "bg-red-400"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.is_active ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${!formData.is_active ? "text-red-700" : "text-gray-500"}`}>
                Inactive
              </span>
            </div>
          </div>

          {/* Color Preference */}
          <div className="flex items-center gap-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Color Preference:
            </label>
              <input
                type="color"
                value={formData.color_preference}
                onChange={(e) => handleInputChange("color_preference", e.target.value)}
                disabled={isLoading}
                className="w-8 h-8 cursor-pointer disabled:cursor-not-allowed"
              />
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
            >
              <TrashIcon className="w-4 h-4" />
              Delete User
            </Button>
            <div className="flex gap-3 ml-auto">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? "Updating..." : "Update User"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserEditModal;