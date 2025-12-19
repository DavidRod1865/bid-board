import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { 
  ArrowRightIcon, 
  QuestionMarkCircleIcon, 
  Cog6ToothIcon, 
  ArrowLeftEndOnRectangleIcon 
} from "@heroicons/react/24/outline";
import { useAuth0 } from "../../../auth";
import { ViewToggle } from "./ViewToggle";
import { useUserProfile } from "../../../contexts/UserContext";
import type { TeamView } from "../../../contexts/UserContext";
import UserProfileModal from "../modals/UserProfileModal";
import HelpModal from "../modals/HelpModal";
import wpbbBlueIcon from "../../../assets/WPBB_blue.png";
import Folder from "../../../components/Folder";
import AnimatedUsers from "../../../components/AnimatedUsers";
import AnimatedCalendar from "../../../components/AnimatedCalendar";
import AnimatedAdmin from "../../../components/AnimatedAdmin";
import { Link } from "react-router-dom";


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

interface NavigationItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ReactElement | null;
  path: string | null;
  disabled: boolean;
  isDivider?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ showViewToggle = false }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebar-collapsed");
      return saved ? JSON.parse(saved) : false;
    } catch {
      // localStorage not available or data corrupted - use default
      return false;
    }
  });
  const { user, logout } = useAuth0();
  const { userProfile, updateProfile, currentView } = useUserProfile();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Save sidebar state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed", JSON.stringify(isCollapsed));
    } catch {
      // localStorage not available - state will be session-only
      console.warn("Could not save sidebar preference to localStorage");
    }
  }, [isCollapsed]);


  const handleProfileSave = async (name: string, colorPreference: string) => {
    await updateProfile(name, colorPreference);
    setShowProfileModal(false);
  };

  const displayName = userProfile?.name || user?.name || user?.email || "User";
  const displayColor = userProfile?.color_preference || "#b8941f";

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === "/estimating" && location.pathname === "/") return true;
    if (path === "/apm/projects" && (location.pathname === "/apm" || location.pathname === "/apm/projects")) return true;
    return location.pathname === path;
  };

  // Get view-specific accent colors
  const getViewAccentColor = (isActive: boolean, isHovered: boolean) => {
    if (isActive || isHovered) {
      return currentView === "apm" ? "#16a34a" : "#2563eb"; // green-600 or blue-600
    }
    return "#6b7280"; // gray-500 for inactive
  };

  // Helper function to get Estimating-only navigation items
  const getEstimatingItems = (): NavigationItem[] => {
    return [
      {
        id: "dashboard",
        label: "Follow Ups",
        shortLabel: "DAILY",
        icon: (
          <div className="w-6 h-6 flex items-center justify-center">
            <Folder
              size={0.2}
              color={getViewAccentColor(
                isActive("/estimating"),
                hoveredItem === "dashboard"
              )}
              isActive={isActive("/estimating")}
              isHovered={hoveredItem === "dashboard"}
            />
          </div>
        ),
        path: "/estimating",
        disabled: false,
      },
      {
        id: "on-hold",
        label: "Bids On Hold",
        shortLabel: "ON HOLD",
        icon: (
          <div className="w-6 h-6 flex items-center justify-center">
            <Folder
              size={0.2}
              color={getViewAccentColor(
                isActive("/on-hold"),
                hoveredItem === "on-hold"
              )}
              isActive={isActive("/on-hold")}
              isHovered={hoveredItem === "on-hold"}
            />
          </div>
        ),
        path: "/on-hold",
        disabled: false,
      },
      {
        id: "sent-to-apm",
        label: "Bids Sent to APM",
        shortLabel: "SENT",
        icon: (
          <div className="w-6 h-6 flex items-center justify-center">
            <Folder
              size={0.2}
              color={getViewAccentColor(
                isActive("/estimating/bids-sent-to-apm"),
                hoveredItem === "sent-to-apm"
              )}
              isActive={isActive("/estimating/bids-sent-to-apm")}
              isHovered={hoveredItem === "sent-to-apm"}
            />
          </div>
        ),
        path: "/estimating/bids-sent-to-apm",
        disabled: false,
      },
      {
        id: "archives",
        label: "Closed Bids",
        shortLabel: "COMPLETED",
        icon: (
          <div className="w-6 h-6 flex items-center justify-center">
            <Folder
              size={0.2}
              color={getViewAccentColor(
                isActive("/archives"),
                hoveredItem === "archives"
              )}
              isActive={isActive("/archives")}
              isHovered={hoveredItem === "archives"}
            />
          </div>
        ),
        path: "/archives",
        disabled: false,
      },
      {
        id: "calendar",
        label: "Calendar",
        shortLabel: "CALENDAR",
        icon: (
          <div className="w-6 h-6 flex items-center justify-center">
            <AnimatedCalendar
              size={1}
              color={getViewAccentColor(
                isActive("/calendar"),
                hoveredItem === "calendar"
              )}
              isActive={isActive("/calendar")}
              isHovered={hoveredItem === "calendar"}
            />
          </div>
        ),
        path: "/calendar",
        disabled: false,
      },
      {
        id: "vendors",
        label: "Contacts",
        shortLabel: "CONTACTS",
        icon: (
          <div className="w-6 h-6 flex items-center justify-center">
            <AnimatedUsers
              size={1}
              color={getViewAccentColor(
                isActive("/vendors"),
                hoveredItem === "vendors"
              )}
              isActive={isActive("/vendors")}
              isHovered={hoveredItem === "vendors"}
            />
          </div>
        ),
        path: "/vendors",
        disabled: false,
      }
    ];
  };

  // Helper function to get APM-only navigation items  
  const getAPMItems = (): NavigationItem[] => {
    return [
      {
        id: "apm-projects",
        label: "Active Projects",
        shortLabel: "ACTIVE",
        icon: (
          <div className="w-6 h-6 flex items-center justify-center">
            <Folder
              size={0.2}
              color={getViewAccentColor(
                isActive("/apm/projects"),
                hoveredItem === "apm-projects"
              )}
              isActive={isActive("/apm/projects")}
              isHovered={hoveredItem === "apm-projects"}
            />
          </div>
        ),
        path: "/apm/projects",
        disabled: false,
      },
      {
        id: "apm-on-hold",
        label: "Pending Closeouts",
        shortLabel: "CLOSEOUTS",
        icon: (
          <div className="w-6 h-6 flex items-center justify-center">
            <Folder
              size={0.2}
              color={getViewAccentColor(
                isActive("/apm/on-hold"),
                hoveredItem === "apm-on-hold"
              )}
              isActive={isActive("/apm/on-hold")}
              isHovered={hoveredItem === "apm-on-hold"}
            />
          </div>
        ),
        path: "/apm/on-hold",
        disabled: false,
      },
      {
        id: "apm-archives",
        label: "Closed Projects",
        shortLabel: "COMPLETED",
        icon: (
          <div className="w-6 h-6 flex items-center justify-center">
            <Folder
              size={0.2}
              color={getViewAccentColor(
                isActive("/apm/archives"),
                hoveredItem === "apm-archives"
              )}
              isActive={isActive("/apm/archives")}
              isHovered={hoveredItem === "apm-archives"}
            />
          </div>
        ),
        path: "/apm/archives",
        disabled: false,
      },
      {
        id: "apm-calendar",
        label: "Calendar",
        shortLabel: "CALENDAR",
        icon: (
          <div className="w-6 h-6 flex items-center justify-center">
            <AnimatedCalendar
              size={1}
              color={getViewAccentColor(
                isActive("/calendar"),
                hoveredItem === "apm-calendar"
              )}
              isActive={isActive("/calendar")}
              isHovered={hoveredItem === "apm-calendar"}
            />
          </div>
        ),
        path: "/calendar",
        disabled: false,
      },
      {
        id: "apm-vendors",
        label: "Contacts",
        shortLabel: "CONTACTS",
        icon: (
          <div className="w-6 h-6 flex items-center justify-center">
            <AnimatedUsers
              size={1}
              color={getViewAccentColor(
                isActive("/vendors"),
                hoveredItem === "apm-vendors"
              )}
              isActive={isActive("/vendors")}
              isHovered={hoveredItem === "apm-vendors"}
            />
          </div>
        ),
        path: "/vendors",
        disabled: false,
      }
    ];
  };

  // Navigation items based on current view
  const getNavigationItems = (view: TeamView): NavigationItem[] => {
    const userRole = userProfile?.role;
    
    // If user has a specific role (not Admin), only show their role's items
    if (userRole === 'Estimating') {
      return getEstimatingItems();
    } else if (userRole === 'APM') {
      return getAPMItems();
    }
    
    // Admin users see items based on current view, including admin button
    if (view === "apm") {
      const apmItems: NavigationItem[] = [
        {
          id: "apm-projects",
          label: "Active Projects",
          shortLabel: "ACTIVE",
          icon: (
            <div className="w-6 h-6 flex items-center justify-center">
              <Folder
                size={0.2}
                color={getViewAccentColor(
                  isActive("/apm/projects"),
                  hoveredItem === "apm-projects"
                )}
                isActive={isActive("/apm/projects")}
                isHovered={hoveredItem === "apm-projects"}
              />
            </div>
          ),
          path: "/apm/projects",
          disabled: false,
        },
        {
          id: "apm-on-hold",
          label: "Pending Closeouts",
          shortLabel: "CLOSEOUTS",
          icon: (
            <div className="w-6 h-6 flex items-center justify-center">
              <Folder
                size={0.2}
                color={getViewAccentColor(
                  isActive("/apm/on-hold"),
                  hoveredItem === "apm-on-hold"
                )}
                isActive={isActive("/apm/on-hold")}
                isHovered={hoveredItem === "apm-on-hold"}
              />
            </div>
          ),
          path: "/apm/on-hold",
          disabled: false,
        },
        {
          id: "apm-archives",
          label: "Closed Projects",
          shortLabel: "COMPLETED",
          icon: (
            <div className="w-6 h-6 flex items-center justify-center">
              <Folder
                size={0.2}
                color={getViewAccentColor(
                  isActive("/apm/archives"),
                  hoveredItem === "apm-archives"
                )}
                isActive={isActive("/apm/archives")}
                isHovered={hoveredItem === "apm-archives"}
              />
            </div>
          ),
          path: "/apm/archives",
          disabled: false,
        },
        {
          id: "apm-calendar",
          label: "Calendar",
          shortLabel: "CALENDAR",
          icon: (
            <div className="w-6 h-6 flex items-center justify-center">
              <AnimatedCalendar
                size={1}
                color={getViewAccentColor(
                  isActive("/calendar"),
                  hoveredItem === "apm-calendar"
                )}
                isActive={isActive("/calendar")}
                isHovered={hoveredItem === "apm-calendar"}
              />
            </div>
          ),
          path: "/calendar",
          disabled: false,
        },
        {
          id: "apm-vendors",
          label: "Contacts",
          shortLabel: "CONTACTS",
          icon: (
            <div className="w-6 h-6 flex items-center justify-center">
              <AnimatedUsers
                size={1}
                color={getViewAccentColor(
                  isActive("/vendors"),
                  hoveredItem === "apm-vendors"
                )}
                isActive={isActive("/vendors")}
                isHovered={hoveredItem === "apm-vendors"}
              />
            </div>
          ),
          path: "/vendors",
          disabled: false,
        },
      ];
      
      // Add admin section if user is Admin
      if (userRole === 'Admin') {
        apmItems.push(
          {
            id: "divider-apm-admin",
            label: "",
            shortLabel: "",
            icon: <div></div>,
            path: "",
            disabled: false,
            isDivider: true,
          } as NavigationItem,
          {
            id: "admin-apm",
            label: "Admin",
            shortLabel: "ADMIN",
            icon: (
              <div className="w-6 h-6 flex items-center justify-center">
                <AnimatedAdmin
                  size={1}
                  color={getViewAccentColor(
                    isActive("/admin"),
                    hoveredItem === "admin-apm"
                  )}
                  isActive={isActive("/admin")}
                  isHovered={hoveredItem === "admin-apm"}
                />
              </div>
            ),
            path: "/admin",
            disabled: false,
          }
        );
      }
      
      return apmItems;
    }

    // Default to estimating view - build base items first
    const baseItems: NavigationItem[] = [
      {
        id: "projects",
        label: "Active Bids",
        shortLabel: "ACTIVE",
        icon: (
          <div className="w-6 h-6 flex items-center justify-center">
            <Folder
              size={0.2}
              color={getViewAccentColor(
                isActive("/estimating"),
                hoveredItem === "projects"
              )}
              isActive={isActive("/estimating")}
              isHovered={hoveredItem === "projects"}
            />
          </div>
        ),
        path: "/estimating",
        disabled: false,
      },
      {
        id: "on-hold",
        label: "On-Hold Bids",
        shortLabel: "HOLD",
        icon: (
          <div className="w-6 h-6 flex items-center justify-center">
            <Folder
              size={0.2}
              color={getViewAccentColor(
                isActive("/on-hold"),
                hoveredItem === "on-hold"
              )}
              isActive={isActive("/on-hold")}
              isHovered={hoveredItem === "on-hold"}
            />
          </div>
        ),
        path: "/on-hold",
        disabled: false,
      },
      {
        id: "sent-to-apm",
        label: "Bids to APM",
        shortLabel: "SENT",
        icon: (
          <div className="w-6 h-6 flex items-center justify-center">
            <Folder
              size={0.2}
              color={getViewAccentColor(
                isActive("/estimating/bids-sent-to-apm"),
                hoveredItem === "sent-to-apm"
              )}
              isActive={isActive("/estimating/bids-sent-to-apm")}
              isHovered={hoveredItem === "sent-to-apm"}
            />
          </div>
        ),
        path: "/estimating/bids-sent-to-apm",
        disabled: false,
      },
      {
        id: "archives",
        label: "Closed Bids",
        shortLabel: "COMPLETED",
        icon: (
          <div className="w-6 h-6 flex items-center justify-center">
            <Folder
              size={0.2}
              color={getViewAccentColor(
                isActive("/archives"),
                hoveredItem === "archives"
              )}
              isActive={isActive("/archives")}
              isHovered={hoveredItem === "archives"}
            />
          </div>
        ),
        path: "/archives",
        disabled: false,
      },
      {
        id: "calendar",
        label: "Calendar",
        shortLabel: "CALENDAR",
        icon: (
          <div className="w-6 h-6 flex items-center justify-center">
            <AnimatedCalendar
              size={1}
              color={getViewAccentColor(
                isActive("/calendar"),
                hoveredItem === "calendar"
              )}
              isActive={isActive("/calendar")}
              isHovered={hoveredItem === "calendar"}
            />
          </div>
        ),
        path: "/calendar",
        disabled: false,
      },
      {
        id: "vendors",
        label: "Contacts",
        shortLabel: "CONTACTS",
        icon: (
          <div className="w-6 h-6 flex items-center justify-center">
            <AnimatedUsers
              size={1}
              color={getViewAccentColor(
                isActive("/vendors"),
                hoveredItem === "vendors"
              )}
              isActive={isActive("/vendors")}
              isHovered={hoveredItem === "vendors"}
            />
          </div>
        ),
        path: "/vendors",
        disabled: false,
      }
    ];

    // Add admin section if user is Admin
    if (userRole === 'Admin') {
      baseItems.push(
        {
          id: "divider-2",
          label: "",
          shortLabel: "",
          icon: <div></div>,
          path: "",
          disabled: false,
          isDivider: true,
        } as NavigationItem,
        {
          id: "admin",
          label: "Admin",
          shortLabel: "ADMIN",
          icon: (
            <div className="w-6 h-6 flex items-center justify-center">
              <AnimatedAdmin
                size={1}
                color={getViewAccentColor(
                  isActive("/admin"),
                  hoveredItem === "admin"
                )}
                isActive={isActive("/admin")}
                isHovered={hoveredItem === "admin"}
              />
            </div>
          ),
          path: "/admin",
          disabled: false,
        }
      );
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems(currentView);

  // Get view-specific background class
  const getSidebarBackgroundClass = () => {
    return currentView === "apm" ? "sidebar-bg-apm" : "sidebar-bg-estimating";
  };

  return (
    <div
      className={`${
        isCollapsed ? "w-fit items-center" : "min-w-54"
      } ${getSidebarBackgroundClass()} border-r border-gray-300 flex flex-col transition-all duration-500 ease-in-out`}
    >

      {/* Header with logo and toggle button */}
      <div
        className={`flex items-center justify-between p-4 border-b border-gray-300 ${getSidebarBackgroundClass()}`}
      >
        <div
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center cursor-pointer"
        >
          <img 
            src={wpbbBlueIcon} 
            alt="With Pride Building Board" 
            className="h-6 w-auto" 
          />
        </div>
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="rounded-lg transition-all duration-300 ease-in-out"
          >
            <ArrowRightIcon className="w-6 h-6 text-gray-600 transition-transform duration-500 ease-in-out rotate-180" />
          </button>
        )}
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-3 overflow-y-auto">
        <nav className="space-y px-3">
          {navigationItems.map((item) => {
            const active = isActive(item.path ?? undefined);

            // Handle divider items
            if (item.isDivider) {
              return (
                <div key={item.id} className="w-full my-2">
                  <div className="border-t border-gray-300"></div>
                </div>
              );
            }

            // Handle disabled items as divs (non-clickable)
            if (item.disabled) {
              return (
                <div key={item.id}>
                  <div
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`
                      w-full flex px-3 py-3 rounded-lg text-left transition-all duration-500 ease-in-out
                      ${
                        isCollapsed
                          ? "flex-col items-center gap-1"
                          : "flex-row items-center gap-3"
                      }
                      text-gray-400 cursor-not-allowed
                      ${isCollapsed ? "justify-center" : "justify-start"}
                    `}
                  >
                    <span className="flex-shrink-0">
                      {item.icon}
                    </span>
                    <span
                      className={`text-xs font-semibold transition-all duration-300 ease-in-out ${
                        !isCollapsed
                          ? "opacity-0 scale-95 translate-y-2"
                          : "opacity-100 scale-100 translate-y-0 delay-200"
                      } ${!isCollapsed ? "hidden" : "block"} text-gray-400`}
                    >
                      {item.shortLabel}
                    </span>
                    <span
                      className={`font-semibold text-sm transition-all duration-300 ease-in-out ${
                        isCollapsed
                          ? "opacity-0 scale-95 -translate-x-2"
                          : "opacity-100 scale-100 translate-x-0 delay-200"
                      } ${isCollapsed ? "hidden" : "block"}`}
                    >
                      {item.label} (Coming Soon)
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div key={item.id}>
                <Link
                  to={item.path || "/"}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`
                    w-full flex px-3 py-3 rounded-lg text-left transition-all duration-500 ease-in-out
                    ${
                      isCollapsed
                        ? "flex-col items-center gap-1"
                        : "flex-row items-center gap-3"
                    }
                    ${
                      active
                        ? `${
                            currentView === "apm"
                              ? "text-green-600"
                              : "text-blue-600"
                          } font-medium`
                        : `text-gray-900 ${
                            currentView === "apm"
                              ? "hover:text-green-600"
                              : "hover:text-blue-600"
                          }`
                    }
                    ${isCollapsed ? "justify-center" : "justify-start"}
                  `}
                >
                  <span
                    className={`flex-shrink-0 ${
                      active
                        ? currentView === "apm"
                          ? "text-green-600"
                          : "text-blue-600"
                        : ""
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={`text-xs font-semibold transition-all duration-300 ease-in-out ${
                      !isCollapsed
                        ? "opacity-0 scale-95 translate-y-2"
                        : "opacity-100 scale-100 translate-y-0 delay-200"
                    } ${!isCollapsed ? "hidden" : "block"} ${
                      active
                        ? currentView === "apm"
                          ? "text-green-600"
                          : "text-blue-600"
                        : "text-gray-500"
                    }`}
                  >
                    {item.shortLabel}
                  </span>
                  <span
                    className={`font-semibold text-sm transition-all duration-300 ease-in-out ${
                      isCollapsed
                        ? "opacity-0 scale-95 -translate-x-2"
                        : "opacity-100 scale-100 translate-x-0 delay-200"
                    } ${isCollapsed ? "hidden" : "block"}`}
                  >
                    {item.label}
                  </span>
                </Link>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Action Icons */}
      <div className={`p-3 w-full border-b border-gray-300 ${getSidebarBackgroundClass()}`}>
        <div className={`flex ${isCollapsed ? 'flex-col items-center gap-3' : 'flex-row gap-3 justify-center'}`}>
          {/* Help Icon */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-2 rounded-lg transition-all duration-300 ease-in-out cursor-pointer hover:bg-gray-100 text-gray-600"
            title="Help"
          >
            <QuestionMarkCircleIcon className="w-6 h-6" />
          </button>
          
          {/* Settings Icon */}
          <button
            onClick={() => setShowProfileModal(true)}
            className="p-2 rounded-lg transition-all duration-300 ease-in-out cursor-pointer hover:bg-gray-100 text-gray-600"
            title="Settings"
          >
            <Cog6ToothIcon className="w-6 h-6" />
          </button>
          
          {/* Logout Icon */}
          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="p-2 rounded-lg transition-all duration-300 ease-in-out cursor-pointer hover:bg-gray-100"
            title="Sign Out"
          >
            <ArrowLeftEndOnRectangleIcon className="w-6 h-6 text-red-600" />
          </button>
        </div>
      </div>

      {/* View Toggle at bottom - only for Admin users */}
      {showViewToggle && userProfile?.role === 'Admin' && (
        <div className={`px-2 py-3 ${getSidebarBackgroundClass()}`}>
          <ViewToggle isCollapsed={isCollapsed} />
        </div>
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentName={displayName}
        currentColorPreference={displayColor}
        onSave={handleProfileSave}
      />

      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        currentView={currentView}
        userRole={userProfile?.role ?? null}
      />
    </div>
  );
};

export default Sidebar;
