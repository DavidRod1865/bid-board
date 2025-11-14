import React from 'react';
import { useUserProfile } from '../../../contexts/UserContext';
import { Switch } from './switch';

interface ViewToggleProps {
  className?: string;
  isCollapsed?: boolean;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ className = '', isCollapsed = false }) => {
  const { currentView, switchView } = useUserProfile();

  const handleSwitchChange = (checked: boolean) => {
    // When checked = true, show APM; when false, show Estimating
    switchView(checked ? 'apm' : 'estimating');
  };

  if (isCollapsed) {
    // When sidebar is collapsed, show a simpler version or hide completely
    return null;
  }

  return (
    <div className={`flex items-center justify-center py-1 px-2 ${className}`}>
      <div className="flex items-center gap-2.5 w-full justify-center">
        <span className={`text-xs font-medium transition-colors ${
          currentView === 'estimating' ? 'text-[#d4af37]' : 'text-gray-500'
        }`}>
          Estimating
        </span>
        <Switch
          checked={currentView === 'apm'}
          onCheckedChange={handleSwitchChange}
          className="data-[state=checked]:bg-[#d4af37] data-[state=unchecked]:bg-gray-300 scale-90"
          aria-label="Switch between Estimating and APM views"
        />
        <span className={`text-xs font-medium transition-colors ${
          currentView === 'apm' ? 'text-[#d4af37]' : 'text-gray-500'
        }`}>
          APM
        </span>
      </div>
    </div>
  );
};