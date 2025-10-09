import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth0 } from '../../auth';
import { useUserProfile } from '../../contexts/UserContext';
import UserProfileModal from '../UserProfileModal';
import withPrideLogo from '../../assets/With Pride Logo.png';

interface SidebarProps {
  statusFilter: string[];
  setStatusFilter: (statuses: string[]) => void;
  onNewProject?: () => void;
  onCopyProject?: () => void;
  onWeeklyCostsReport?: () => void;
  isEmailingReport?: boolean;
  onAddVendor?: () => void;
  onEditProject?: () => void;
  onDeleteProject?: () => void;
  onArchiveProject?: () => void;
  onAddNote?: () => void;
  onSaveProject?: () => void;
  onCancelProject?: () => void;
  isEditingProject?: boolean;
  isSavingProject?: boolean;
  onEditVendor?: () => void;
  onDeleteVendor?: () => void;
  onSaveVendor?: () => void;
  onCancelVendor?: () => void;
  isEditingVendor?: boolean;
  isSavingVendor?: boolean;
  // Project vendor management
  onAddProjectVendor?: () => void;
  onRemoveProjectVendors?: () => void;
  selectedVendorsCount?: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  onNewProject,
  onCopyProject,
  onWeeklyCostsReport,
  isEmailingReport,
  onAddVendor,
  onEditProject,
  onDeleteProject,
  onArchiveProject,
  onAddNote,
  onSaveProject,
  onCancelProject,
  isEditingProject,
  isSavingProject,
  onEditVendor,
  onDeleteVendor,
  onSaveVendor,
  onCancelVendor,
  isEditingVendor,
  isSavingVendor,
  onAddProjectVendor,
  onRemoveProjectVendors,
  selectedVendorsCount = 0
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth0();
  const { userProfile, updateProfile } = useUserProfile();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleProfileSave = async (name: string, colorPreference: string) => {
    await updateProfile(name, colorPreference);
    setShowProfileModal(false);
    setShowUserMenu(false);
  };

  const displayName = userProfile?.name || user?.name || user?.email || 'User';
  const displayColor = userProfile?.color_preference || '#d4af37';

  // Navigation items with icons (main navigation only)
  const navigationItems = [
    {
      id: 'projects',
      label: 'Projects',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0H8v0z" />
        </svg>
      ),
      path: '/',
      onClick: () => navigate('/'),
      disabled: false
    },
    {
      id: 'archives',
      label: 'Archives',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      ),
      path: '/archives',
      onClick: () => navigate('/archives'),
      disabled: false
    },
    {
      id: 'vendors',
      label: 'Vendors', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      path: '/vendors',
      onClick: () => navigate('/vendors'),
      disabled: false
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v16a2 2 0 002 2z" />
        </svg>
      ),
      path: '/calendar',
      onClick: () => navigate('/calendar'),
      disabled: false
    }
  ];

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path;
  };

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300`}>
      {/* Header with logo and toggle button */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center">
            <img
              src={withPrideLogo}
              alt="With Pride HVAC"
              className="h-8 w-auto"
            />
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg 
            className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {navigationItems.map((item) => {
            const active = isActive(item.path);
            
            return (
              <div key={item.id}>
                <button
                  onClick={item.onClick}
                  disabled={item.disabled}
                  className={`
                    w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200
                    ${active 
                      ? 'bg-[#d4af37]/10 text-[#d4af37] border-l-4 border-[#d4af37]' 
                      : item.disabled 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-gray-700 hover:bg-gray-100 hover:text-[#d4af37]'
                    }
                    ${isCollapsed ? 'justify-center' : 'justify-start'}
                  `}
                >
                  <span className={`flex-shrink-0 ${active ? 'text-[#d4af37]' : ''}`}>
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="font-medium text-sm">
                      {item.label}
                      {item.disabled && ' (Coming Soon)'}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Action Buttons - visible on projects page */}
        {location.pathname === '/' && (
          <div className="px-3 mt-6 pt-6 border-t border-gray-200">
            <div className="space-y-1">
              <button
                onClick={onNewProject}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-[#d4af37]
                  ${isCollapsed ? 'justify-center' : 'justify-start'}
                `}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {!isCollapsed && <span className="font-medium text-sm">Create</span>}
              </button>

              <button
                onClick={onCopyProject}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-[#d4af37]
                  ${isCollapsed ? 'justify-center' : 'justify-start'}
                `}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {!isCollapsed && <span className="font-medium text-sm">Copy Project</span>}
              </button>

              <button
                onClick={onWeeklyCostsReport}
                disabled={isEmailingReport}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-[#d4af37] ${isEmailingReport ? 'opacity-50 cursor-not-allowed' : ''}
                  ${isCollapsed ? 'justify-center' : 'justify-start'}
                `}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {!isCollapsed && (
                  <span className="font-medium text-sm">
                    {isEmailingReport ? 'Sending Report...' : 'Email Report'}
                  </span>
                )}
                {isEmailingReport && (
                  <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Add Vendor Button - visible on vendors page */}
        {location.pathname === '/vendors' && (
          <div className="px-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={onAddVendor}
              className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-[#d4af37]
                ${isCollapsed ? 'justify-center' : 'justify-start'}
              `}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {!isCollapsed && <span className="font-medium text-sm">Add Vendor</span>}
            </button>
          </div>
        )}

        {/* Project Detail Actions */}
        {location.pathname.startsWith('/project/') && (
          <div className="px-3 mt-6 pt-6 border-t border-gray-200">
            <div className="space-y-1">
              <button
                onClick={() => navigate('/')}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-[#d4af37]
                  ${isCollapsed ? 'justify-center' : 'justify-start'}
                `}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {!isCollapsed && <span className="font-medium text-sm">Back to Projects</span>}
              </button>

              {!isEditingProject ? (
                <>
                  <button
                    onClick={onEditProject}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-[#d4af37]
                      ${isCollapsed ? 'justify-center' : 'justify-start'}
                    `}
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {!isCollapsed && <span className="font-medium text-sm">Edit Project</span>}
                  </button>

                  <button
                    onClick={onAddNote}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-[#d4af37]
                      ${isCollapsed ? 'justify-center' : 'justify-start'}
                    `}
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {!isCollapsed && <span className="font-medium text-sm">Add Note</span>}
                  </button>

                  <button
                    onClick={onAddProjectVendor}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-[#d4af37]
                      ${isCollapsed ? 'justify-center' : 'justify-start'}
                    `}
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {!isCollapsed && <span className="font-medium text-sm">Add Vendor</span>}
                  </button>

                </>
              ) : (
                <>
                  <button
                    onClick={onSaveProject}
                    disabled={isSavingProject}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-green-600 hover:bg-green-50 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed
                      ${isCollapsed ? 'justify-center' : 'justify-start'}
                    `}
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {!isCollapsed && <span className="font-medium text-sm">{isSavingProject ? 'Saving...' : 'Save Changes'}</span>}
                  </button>

                  <button
                    onClick={onCancelProject}
                    disabled={isSavingProject}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed
                      ${isCollapsed ? 'justify-center' : 'justify-start'}
                    `}
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {!isCollapsed && <span className="font-medium text-sm">Cancel</span>}
                  </button>
                </>
              )}
            </div>

            {/* Bottom action section - Remove Vendors, Archive Project, or Delete Project */}
            {!isEditingProject && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                {selectedVendorsCount > 0 ? (
                  <button
                    onClick={onRemoveProjectVendors}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-red-600 hover:bg-red-50 hover:text-red-700
                      ${isCollapsed ? 'justify-center' : 'justify-start'}
                    `}
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {!isCollapsed && <span className="font-medium text-sm">Remove Selected ({selectedVendorsCount})</span>}
                  </button>
                ) : (
                  <div className="space-y-1">
                    {onArchiveProject && (
                      <button
                        onClick={onArchiveProject}
                        className={`
                          w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700
                          ${isCollapsed ? 'justify-center' : 'justify-start'}
                        `}
                      >
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        {!isCollapsed && <span className="font-medium text-sm">Archive Project</span>}
                      </button>
                    )}
                    <button
                      onClick={onDeleteProject}
                      className={`
                        w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-red-600 hover:bg-red-50 hover:text-red-700
                        ${isCollapsed ? 'justify-center' : 'justify-start'}
                      `}
                    >
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      {!isCollapsed && <span className="font-medium text-sm">Delete Project</span>}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Vendor Detail Actions */}
        {location.pathname.startsWith('/vendor/') && (
          <div className="px-3 mt-6 pt-6 border-t border-gray-200">
            <div className="space-y-1">
              <button
                onClick={() => navigate('/vendors')}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-[#d4af37]
                  ${isCollapsed ? 'justify-center' : 'justify-start'}
                `}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {!isCollapsed && <span className="font-medium text-sm">Back to Vendors</span>}
              </button>

              {!isEditingVendor ? (
                <>
                  <button
                    onClick={onEditVendor}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-[#d4af37]
                      ${isCollapsed ? 'justify-center' : 'justify-start'}
                    `}
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {!isCollapsed && <span className="font-medium text-sm">Edit Vendor</span>}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onSaveVendor}
                    disabled={isSavingVendor}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-green-600 hover:bg-green-50 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed
                      ${isCollapsed ? 'justify-center' : 'justify-start'}
                    `}
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {!isCollapsed && <span className="font-medium text-sm">{isSavingVendor ? 'Saving...' : 'Save Changes'}</span>}
                  </button>

                  <button
                    onClick={onCancelVendor}
                    disabled={isSavingVendor}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed
                      ${isCollapsed ? 'justify-center' : 'justify-start'}
                    `}
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {!isCollapsed && <span className="font-medium text-sm">Cancel</span>}
                  </button>
                </>
              )}
            </div>

            {/* Delete Vendor - Separated at bottom */}
            {!isEditingVendor && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={onDeleteVendor}
                  className={`
                    w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-red-600 hover:bg-red-50 hover:text-red-700
                    ${isCollapsed ? 'justify-center' : 'justify-start'}
                  `}
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {!isCollapsed && <span className="font-medium text-sm">Delete Vendor</span>}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Menu at bottom */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-100 transition-colors ${isCollapsed ? 'justify-center' : 'justify-start'}`}
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
              style={{ backgroundColor: displayColor }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </>
            )}
          </button>

          {showUserMenu && !isCollapsed && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <button
                onClick={() => {
                  setShowProfileModal(true);
                  setShowUserMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Edit Profile
              </button>
              <button
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentName={displayName}
        currentColorPreference={displayColor}
        onSave={handleProfileSave}
      />
    </div>
  );
};

export default Sidebar;