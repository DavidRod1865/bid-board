import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FolderIcon,
  ArchiveBoxIcon,
  PauseCircleIcon,
  UsersIcon,
  CalendarIcon,
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  DocumentDuplicateIcon,
  EnvelopeIcon,
  ArrowLeftIcon,
  PencilSquareIcon,
  UserPlusIcon,
  CheckIcon,
  XMarkIcon,
  TrashIcon,
  ChevronDownIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { useAuth0 } from '../../auth';
import { useUserProfile } from '../../contexts/UserContext';
import UserProfileModal from '../UserProfileModal';
import withPrideLogo from '../../assets/With Pride Logo.png';
import { PencilIcon } from '@heroicons/react/24/outline';

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
  // Generic bulk actions (works across all pages)
  selectedBidsCount?: number;
  onBulkMoveToActive?: () => void;
  onBulkArchive?: () => void;
  onBulkOnHold?: () => void;
  onBulkDelete?: () => void;
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
  selectedVendorsCount = 0,
  selectedBidsCount = 0,
  onBulkMoveToActive,
  onBulkArchive,
  onBulkOnHold,
  onBulkDelete
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
      label: 'Active Bids',
      icon: (
        <FolderIcon className="w-6 h-6" />
      ),
      path: '/',
      onClick: () => navigate('/'),
      disabled: false
    },
    {
      id: 'on-hold',
      label: 'Bids On Hold',
      icon: (
        <PauseCircleIcon className="w-6 h-6" />
      ),
      path: '/on-hold',
      onClick: () => navigate('/on-hold'),
      disabled: false
    },
    {
      id: 'archives',
      label: 'Archived Bids',
      icon: (
        <ArchiveBoxIcon className="w-6 h-6" />
      ),
      path: '/archives',
      onClick: () => navigate('/archives'),
      disabled: false
    },
    {
      id: 'vendors',
      label: 'Vendors / Subs', 
      icon: (
        <UsersIcon className="w-6 h-6" />
      ),
      path: '/vendors',
      onClick: () => navigate('/vendors'),
      disabled: false
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: (
        <CalendarIcon className="w-6 h-6" />
      ),
      path: '/calendar',
      onClick: () => navigate('/calendar'),
      disabled: false
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: (
        <ChartBarIcon className="w-6 h-6" />
      ),
      path: '/analytics',
      onClick: () => navigate('/analytics'),
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
          {isCollapsed ? (
            <ChevronRightIcon className="w-6 h-6 text-gray-600 transition-transform duration-200" />
          ) : (
            <ChevronLeftIcon className="w-6 h-6 text-gray-600 transition-transform duration-200" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-4 overflow-y-auto">
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
                <PlusIcon className="w-6 h-6 flex-shrink-0" />
                {!isCollapsed && <span className="font-medium text-sm">Create New Bid</span>}
              </button>

              <button
                onClick={onCopyProject}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-[#d4af37]
                  ${isCollapsed ? 'justify-center' : 'justify-start'}
                `}
              >
                <DocumentDuplicateIcon className="w-6 h-6 flex-shrink-0" />
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
                <EnvelopeIcon className="w-6 h-6 flex-shrink-0" />
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

        {/* Generic Bulk Actions - works across all pages when bids are selected */}
        {selectedBidsCount > 0 && (
          <div className="px-3 mt-6 pt-6 border-t border-gray-200">
            <div className="space-y-1">
              {/* Move to Active - show on archives and on-hold pages */}
              {(location.pathname === '/archives' || location.pathname === '/on-hold') && onBulkMoveToActive && (
                <button
                  onClick={onBulkMoveToActive}
                  className={`
                    w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-green-600 hover:bg-green-50 hover:text-green-700
                    ${isCollapsed ? 'justify-center' : 'justify-start'}
                  `}
                >
                  <PlayIcon className="w-6 h-6 flex-shrink-0" />
                  {!isCollapsed && <span className="font-medium text-sm">Move to Active ({selectedBidsCount})</span>}
                </button>
              )}

              {/* Move to On Hold - show on dashboard and archives pages */}
              {(location.pathname === '/' || location.pathname === '/archives') && onBulkOnHold && (
                <button
                  onClick={onBulkOnHold}
                  className={`
                    w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700
                    ${isCollapsed ? 'justify-center' : 'justify-start'}
                  `}
                >
                  <PauseCircleIcon className="w-6 h-6 flex-shrink-0" />
                  {!isCollapsed && <span className="font-medium text-sm">Move to On Hold ({selectedBidsCount})</span>}
                </button>
              )}

              {/* Archive - show on dashboard and on-hold pages */}
              {(location.pathname === '/' || location.pathname === '/on-hold') && onBulkArchive && (
                <button
                  onClick={onBulkArchive}
                  className={`
                    w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700
                    ${isCollapsed ? 'justify-center' : 'justify-start'}
                  `}
                >
                  <ArchiveBoxIcon className="w-6 h-6 flex-shrink-0" />
                  {!isCollapsed && <span className="font-medium text-sm">Move to Archive ({selectedBidsCount})</span>}
                </button>
              )}

              {/* Delete - show on all pages */}
              {onBulkDelete && (
                <button
                  onClick={onBulkDelete}
                  className={`
                    w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-red-600 hover:bg-red-50 hover:text-red-700
                    ${isCollapsed ? 'justify-center' : 'justify-start'}
                  `}
                >
                  <TrashIcon className="w-6 h-6 flex-shrink-0" />
                  {!isCollapsed && <span className="font-medium text-sm">Delete Selected ({selectedBidsCount})</span>}
                </button>
              )}
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
              <PlusIcon className="w-6 h-6 flex-shrink-0" />
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
                <ArrowLeftIcon className="w-6 h-6 flex-shrink-0" />
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
                    <PencilSquareIcon className="w-6 h-6 flex-shrink-0" />
                    {!isCollapsed && <span className="font-medium text-sm">Edit Project</span>}
                  </button>

                  <button
                    onClick={onAddNote}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-[#d4af37]
                      ${isCollapsed ? 'justify-center' : 'justify-start'}
                    `}
                  >
                    <PencilIcon className="w-6 h-6 flex-shrink-0" />
                    {!isCollapsed && <span className="font-medium text-sm">Add Note</span>}
                  </button>

                  <button
                    onClick={onAddProjectVendor}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-[#d4af37]
                      ${isCollapsed ? 'justify-center' : 'justify-start'}
                    `}
                  >
                    <UserPlusIcon className="w-6 h-6 flex-shrink-0" />
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
                    <CheckIcon className="w-6 h-6 flex-shrink-0" />
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
                    <XMarkIcon className="w-6 h-6 flex-shrink-0" />
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
                    <TrashIcon className="w-6 h-6 flex-shrink-0" />
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
                        <ArchiveBoxIcon className="w-6 h-6 flex-shrink-0" />
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
                      <TrashIcon className="w-6 h-6 flex-shrink-0" />
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
                <ArrowLeftIcon className="w-6 h-6 flex-shrink-0" />
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
                    <PencilSquareIcon className="w-6 h-6 flex-shrink-0" />
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
                    <CheckIcon className="w-6 h-6 flex-shrink-0" />
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
                    <XMarkIcon className="w-6 h-6 flex-shrink-0" />
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
                  <TrashIcon className="w-6 h-6 flex-shrink-0" />
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
                </div>
                <ChevronDownIcon className={`w-6 h-6 text-gray-600 transition-transform duration-200 ${showUserMenu ? 'transform rotate-180' : ''}`} />
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