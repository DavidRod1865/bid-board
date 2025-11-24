import React, { useState, useEffect } from "react";
import { Cog6ToothIcon } from "@heroicons/react/24/solid";

interface AnimatedAdminProps {
  color?: string;
  size?: number;
  className?: string;
  isActive?: boolean;
  isHovered?: boolean;
}

const AnimatedAdmin: React.FC<AnimatedAdminProps> = ({
  color = "#6b7280",
  size = 1,
  className = "",
  isActive = false,
  isHovered = false,
}) => {
  const [showGears, setShowGears] = useState(isActive);

  // Sync gears visibility with isActive or isHovered
  useEffect(() => {
    setShowGears(isActive || isHovered);
  }, [isActive, isHovered]);

  const scaleStyle = { transform: `scale(${size})` };

  return (
    <div style={scaleStyle} className={className}>
      <div className="relative w-6 h-6 flex items-center justify-center cursor-pointer">
        {/* Center gear (large) */}
        <div className="relative z-30">
          <LargeUserIcon color={color} />
        </div>

        {/* Left gear */}
        <div
          className="absolute z-20 right-3.5 bottom-1.25 transition-all duration-300 ease-out"
          style={{
            opacity: showGears ? 1 : 0,
            transform: showGears ? "translateX(0)" : "translateX(4px)",
          }}
        >
          <SmallGearIcon color="#fbbf24" />
        </div>

        {/* Right gear */}
        <div
          className="absolute z-20 left-3.5 bottom-1.25 transition-all duration-300 ease-out"
          style={{
            opacity: showGears ? 1 : 0,
            transform: showGears ? "translateX(0)" : "translateX(-4px)",
          }}
        >
          <SmallGearIcon color="#fbbf24" />
        </div>
      </div>
    </div>
  );
};

// Gear icon components
interface GearIconProps {
  color: string;
}

const LargeUserIcon: React.FC<GearIconProps> = ({ color }) => {
  return (
    <div className="flex flex-col items-center transition-colors duration-200">
      {/* Head */}
      <div className="border-2 border-white rounded-full">
        <div
          className="w-2.5 h-2.5 rounded-full mb-0.2"
          style={{ backgroundColor: color }}
        />
      </div>
      {/* Body */}
      <div className="border-2 border-white rounded-t-md">
      <div
        className="w-4 h-3.5 rounded-t-sm"
        style={{ backgroundColor: color }}
      />
      </div>
    </div>
  );
};

const SmallGearIcon: React.FC<GearIconProps> = ({ color }) => (
  <div className="transition-colors duration-200 hover:scale-110">
    <Cog6ToothIcon 
      className="w-5 h-5" 
      style={{ color: color }}
    />
  </div>
);

export default AnimatedAdmin;