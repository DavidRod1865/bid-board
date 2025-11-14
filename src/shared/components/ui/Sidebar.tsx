import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FolderIcon,
  ArchiveBoxIcon,
  PauseCircleIcon,
  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  TrashIcon,
  RectangleStackIcon,
  ChevronDownIcon,
  PencilSquareIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { useAuth0 } from "../../../auth";
import { ViewToggle } from "./ViewToggle";
import { useUserProfile } from "../../../contexts/UserContext";
import type { TeamView } from "../../../contexts/UserContext";
import UserProfileModal from "../modals/UserProfileModal";
import withPrideLogo from "../../../assets/With Pride Logo.png";

interface SidebarProps {
  statusFilter: string[];
  setStatusFilter: (statuses: string[]) => void;
  onEditVendor?: () => void;
  onDeleteVendor?: () => void;
  onSaveVendor?: () => void;
  onCancelVendor?: () => void;
  isEditingVendor?: boolean;
  isSavingVendor?: boolean;
  showViewToggle?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  onEditVendor,
  onDeleteVendor,
  onSaveVendor,
  onCancelVendor,
  showViewToggle = false,
  isEditingVendor,
  isSavingVendor,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth0();
  const { userProfile, updateProfile, currentView } = useUserProfile();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleProfileSave = async (name: string, colorPreference: string) => {
    await updateProfile(name, colorPreference);
    setShowProfileModal(false);
    setShowUserMenu(false);
  };

  const displayName = userProfile?.name || user?.name || user?.email || "User";
  const displayColor = userProfile?.color_preference || "#d4af37";

  // Navigation items based on current view
  const getNavigationItems = (view: TeamView) => {
    if (view === "apm") {
      return [
        {
          id: "apm-dashboard",
          label: "Dashboard",
          icon: <RectangleStackIcon className="w-6 h-6" />,
          path: "/apm",
          onClick: () => navigate("/apm"),
          disabled: false,
        },
        {
          id: "apm-projects",
          label: "Active Projects",
          icon: <FolderIcon className="w-6 h-6" />,
          path: "/apm/projects",
          onClick: () => navigate("/apm/projects"),
          disabled: false,
        },
        {
          id: "apm-on-hold",
          label: "On-Hold Projects",
          icon: <PauseCircleIcon className="w-6 h-6" />,
          path: "/apm/on-hold",
          onClick: () => navigate("/apm/on-hold"),
          disabled: false,
        },
        {
          id: "apm-archives",
          label: "Archived Projects",
          icon: <ArchiveBoxIcon className="w-6 h-6" />,
          path: "/apm/archives",
          onClick: () => navigate("/apm/archives"),
          disabled: false,
        },
        {
          id: "apm-vendors",
          label: "Vendors / Subs",
          icon: <UsersIcon className="w-6 h-6" />,
          path: "/apm/vendors",
          onClick: () => navigate("/apm/vendors"),
          disabled: false,
        },
      ];
    }

    // Default to estimating view
    return [
      {
        id: "projects",
        label: "Active Bids",
        icon: <FolderIcon className="w-6 h-6" />,
        path: "/estimating",
        onClick: () => navigate("/estimating"),
        disabled: false,
      },
      {
        id: "on-hold",
        label: "On-Hold Bids",
        icon: <PauseCircleIcon className="w-6 h-6" />,
        path: "/on-hold",
        onClick: () => navigate("/on-hold"),
        disabled: false,
      },
      {
        id: "sent-to-apm",
        label: "Sent to APM",
        icon: <PaperAirplaneIcon className="w-6 h-6" />,
        path: "/estimating/bids-sent-to-apm",
        onClick: () => navigate("/estimating/bids-sent-to-apm"),
        disabled: false,
      },
      {
        id: "archives",
        label: "Archived Bids",
        icon: <ArchiveBoxIcon className="w-6 h-6" />,
        path: "/archives",
        onClick: () => navigate("/archives"),
        disabled: false,
      },
      {
        id: "vendors",
        label: "Vendors / Subs",
        icon: <UsersIcon className="w-6 h-6" />,
        path: "/vendors",
        onClick: () => navigate("/vendors"),
        disabled: false,
      },
    ];
  };

  const navigationItems = getNavigationItems(currentView);

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === "/estimating" && location.pathname === "/") return true;
    return location.pathname === path;
  };

  return (
    <div
      className={`${
        isCollapsed ? "w-16" : "min-w-64 w-64"
      } bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300`}
    >
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
      <div className="flex-1 py-2 overflow-y-auto">
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
                    ${
                      active
                        ? "bg-[#d4af37]/10 text-[#d4af37] border-l-4 border-[#d4af37]"
                        : item.disabled
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-gray-700 hover:bg-gray-100 hover:text-[#d4af37]"
                    }
                    ${isCollapsed ? "justify-center" : "justify-start"}
                  `}
                >
                  <span
                    className={`flex-shrink-0 ${
                      active ? "text-[#d4af37]" : ""
                    }`}
                  >
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="font-medium text-sm">
                      {item.label}
                      {item.disabled && " (Coming Soon)"}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Vendor Detail Actions */}
        {location.pathname.startsWith("/vendor/") && (
          <div className="px-3 mt-6 pt-6 border-t border-gray-200">
            <div className="space-y-1">
              <button
                onClick={() => navigate("/vendors")}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-[#d4af37]
                  ${isCollapsed ? "justify-center" : "justify-start"}
                `}
              >
                <ArrowLeftIcon className="w-6 h-6 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="font-medium text-sm">Back to Vendors</span>
                )}
              </button>

              {!isEditingVendor ? (
                <>
                  <button
                    onClick={onEditVendor}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-[#d4af37]
                      ${isCollapsed ? "justify-center" : "justify-start"}
                    `}
                  >
                    <PencilSquareIcon className="w-6 h-6 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="font-medium text-sm">Edit Vendor</span>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onSaveVendor}
                    disabled={isSavingVendor}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-green-600 hover:bg-green-50 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed
                      ${isCollapsed ? "justify-center" : "justify-start"}
                    `}
                  >
                    <CheckIcon className="w-6 h-6 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="font-medium text-sm">
                        {isSavingVendor ? "Saving..." : "Save Changes"}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={onCancelVendor}
                    disabled={isSavingVendor}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed
                      ${isCollapsed ? "justify-center" : "justify-start"}
                    `}
                  >
                    <XMarkIcon className="w-6 h-6 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="font-medium text-sm">Cancel</span>
                    )}
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
                    ${isCollapsed ? "justify-center" : "justify-start"}
                  `}
                >
                  <TrashIcon className="w-6 h-6 flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="font-medium text-sm">Delete Vendor</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* View Toggle at bottom */}
      {showViewToggle && (
        <div className="px-2 py-3 border-t border-gray-200 bg-gray-50">
          <ViewToggle isCollapsed={isCollapsed} />
        </div>
      )}

      {/* User Menu at bottom */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-100 transition-colors ${
              isCollapsed ? "justify-center" : "justify-start"
            }`}
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
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {displayName}
                  </p>
                </div>
                <ChevronDownIcon
                  className={`w-6 h-6 text-gray-600 transition-transform duration-200 ${
                    showUserMenu ? "transform rotate-180" : ""
                  }`}
                />
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
                onClick={() =>
                  logout({ logoutParams: { returnTo: window.location.origin } })
                }
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
