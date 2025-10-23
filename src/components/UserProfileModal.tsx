import React, { useState, useEffect } from "react";
import DialogModal from './ui/DialogModal';
import Button from './ui/Button';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  currentColorPreference: string;
  onSave: (name: string, colorPreference: string) => Promise<void>;
}

const colorOptions = [
  { name: "Gold", value: "#d4af37", description: "Brand Gold" },
  { name: "Dark Gold", value: "#b8941f", description: "Dark Gold" },
  { name: "Light Gold", value: "#e6c563", description: "Light Gold" },
  { name: "Emerald", value: "#10b981", description: "Emerald Green" },
  { name: "Blue", value: "#3b82f6", description: "Sky Blue" },
  { name: "Purple", value: "#8b5cf6", description: "Purple" },
  { name: "Pink", value: "#ec4899", description: "Pink" },
  { name: "Orange", value: "#f97316", description: "Orange" },
  { name: "Gray", value: "#6b7280", description: "Cool Gray" },
  { name: "Dark Gray", value: "#374151", description: "Dark Gray" },
];

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentName,
  currentColorPreference,
  onSave,
}) => {
  const [name, setName] = useState(currentName);
  const [colorPreference, setColorPreference] = useState(currentColorPreference);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setColorPreference(currentColorPreference);
      setError(null);
    }
  }, [isOpen, currentName, currentColorPreference]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(name.trim(), colorPreference);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setName(currentName);
    setColorPreference(currentColorPreference);
    setError(null);
    onClose();
  };

  return (
    <DialogModal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Edit Profile"
      footer={
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isLoading || !name.trim()}
            className="flex-1"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-transparent text-gray-900 bg-white"
              placeholder="Enter your display name"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* Color Preference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Avatar Color
            </label>
            <div className="grid grid-cols-5 gap-3">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setColorPreference(color.value)}
                  className={`relative w-12 h-12 rounded-full border-2 transition-all ${
                    colorPreference === color.value
                      ? "border-gray-800 scale-110"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.description}
                  disabled={isLoading}
                >
                  {colorPreference === color.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-gray-800 rounded-full"></div>
                      </div>
                    </div>
                  )}
                  {/* Show initial in color preview */}
                  <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
                    {name ? name.charAt(0).toUpperCase() : currentName.charAt(0).toUpperCase()}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Preview</p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm"
                style={{ backgroundColor: colorPreference }}
              >
                {name ? name.charAt(0).toUpperCase() : currentName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-900">
                {name || "Your Name"}
              </span>
            </div>
          </div>
        </div>
    </DialogModal>
  );
};

export default UserProfileModal;