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
    // Vertical layout for collapsed sidebar with larger clickable area
    return (
      <div 
        className="flex flex-col items-center gap-1 py-3 px-3 cursor-pointer rounded-lg transition-colors mx-2"
        onClick={() => handleSwitchChange(currentView !== 'apm')}
      >
        <Switch
          checked={currentView === 'apm'}
          onCheckedChange={handleSwitchChange}
          className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-blue-600"
          aria-label="Switch between Estimating and APM views"
        />
        <div className="text-center relative h-4 flex items-center justify-center">
          <div className={`absolute text-xs font-medium transition-all duration-500 ease-in-out ${
            currentView === 'estimating' 
              ? 'opacity-100 transform translate-y-0 delay-100' 
              : 'opacity-0 transform -translate-y-4'
          }`}>
            <span className="text-blue-600 font-semibold">EST</span>
          </div>
          <div className={`absolute text-xs font-medium transition-all duration-500 ease-in-out ${
            currentView === 'apm' 
              ? 'opacity-100 transform translate-y-0 delay-100' 
              : 'opacity-0 transform -translate-y-4'
          }`}>
            <span className="text-green-600 font-semibold">APM</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center py-1 px-2 ${className}`}>
      <div className="flex items-center gap-2.5 w-full justify-center">
        <span className={`text-xs font-medium transition-colors ${
          currentView === 'estimating' ? 'text-blue-600 font-semibold' : 'text-gray-500'
        }`}>
          Estimating
        </span>
        <Switch
          checked={currentView === 'apm'}
          onCheckedChange={handleSwitchChange}
          className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-blue-600 scale-90"
          aria-label="Switch between Estimating and APM views"
        />
        <span className={`text-xs font-medium transition-colors ${
          currentView === 'apm' ? 'text-green-600 font-semibold' : 'text-gray-500'
        }`}>
          APM
        </span>
      </div>
    </div>
  );
};