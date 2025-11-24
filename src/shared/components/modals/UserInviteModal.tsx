import React, { useState, useEffect } from 'react';
import { XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import type { User } from '../../types';
import { useToast } from '../../hooks/useToast';
import { auth0Service } from '../../services/auth0Service';
import { dbOperations } from '../../services/supabase';

interface UserInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: (user: User) => void;
  existingUsers: User[];
  currentUser?: User;
}

const UserInviteModal: React.FC<UserInviteModalProps> = ({
  isOpen,
  onClose,
  onUserCreated,
  existingUsers,
  currentUser
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [colorPreference, setColorPreference] = useState('#3b82f6');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { showSuccess, showError } = useToast();

  // Available colors for user selection
  const availableColors = [
    '#3b82f6', // Blue
    '#10b981', // Green  
    '#f59e0b', // Yellow
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#f97316', // Orange
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#ec4899', // Pink
    '#6b7280', // Gray
  ];

  // Available roles
  const availableRoles = [
    { value: 'Admin', label: 'Admin' },
    { value: 'Estimating', label: 'Estimating' },
    { value: 'APM', label: 'APM' },
  ];

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setName('');
      setRole('');
      setColorPreference('#3b82f6');
      setErrors({});
    }
  }, [isOpen]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    } else if (existingUsers.some(user => user.email.toLowerCase() === email.trim().toLowerCase())) {
      newErrors.email = 'A user with this email already exists';
    }

    // Name validation
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Role validation
    if (!role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Clear specific field error when user starts typing
  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!auth0Service.isConfigured()) {
      showError('Configuration Error', 'Auth0 Management API is not configured. Please check environment variables.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create user in Auth0 with invitation
      const auth0User = await auth0Service.createUserWithInvitation(
        email.trim(),
        name.trim(),
        role,
        currentUser?.id || 'admin'
      );

      // Create corresponding user record in Supabase
      const supabaseUserData = {
        auth0_id: auth0User.user_id,
        email: email.trim(),
        name: name.trim(),
        color_preference: colorPreference,
        is_active: false, // User will be activated on first login
        role: role,
        invitation_sent_at: new Date().toISOString(),
        invited_by: currentUser?.id || null
      };

      const newUser = await dbOperations.createPendingUser(supabaseUserData);
      
      // Call the parent callback
      onUserCreated(newUser);
      
      // Show success message
      showSuccess(
        'Invitation Sent', 
        `Invitation sent to ${email}. They will receive an email with setup instructions.`
      );
      
      // Close modal
      onClose();
      
    } catch (error) {
      console.error('Error creating user:', error);
      showError(
        'Invitation Failed', 
        error instanceof Error ? error.message : 'Failed to send invitation. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative w-full max-w-md transform rounded-lg bg-white shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <UserPlusIcon className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Invite New User</h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              disabled={isSubmitting}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4">
            <div className="space-y-4">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError('email');
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300'
                  }`}
                  placeholder="user@company.com"
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearFieldError('name');
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300'
                  }`}
                  placeholder="John Doe"
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Role Field */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    clearFieldError('role');
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.role 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                >
                  <option value="">Select a role...</option>
                  {availableRoles.map((roleOption) => (
                    <option key={roleOption.value} value={roleOption.value}>
                      {roleOption.label}
                    </option>
                  ))}
                </select>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600">{errors.role}</p>
                )}
              </div>

              {/* Color Preference */}
              <div>
                <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
                  Color Preference
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setColorPreference(color)}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        colorPreference === color 
                          ? 'border-gray-900 scale-110' 
                          : 'border-gray-300 hover:border-gray-500'
                      }`}
                      style={{ backgroundColor: color }}
                      disabled={isSubmitting}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Configuration Check */}
            {!auth0Service.isConfigured() && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Auth0 Management API is not configured. 
                  Please check your environment variables.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !auth0Service.isConfigured()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <UserPlusIcon className="h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserInviteModal;