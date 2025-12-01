import React, { useState, useEffect } from "react";

interface AnimatedUsersProps {
  color?: string;
  size?: number;
  className?: string;
  isActive?: boolean;
  isHovered?: boolean;
}

const AnimatedUsers: React.FC<AnimatedUsersProps> = ({
  color = "#6b7280",
  size = 1,
  className = "",
  isActive = false,
  isHovered = false,
}) => {
  const [showTeam, setShowTeam] = useState(isActive);

  // Sync team visibility with isActive or isHovered
  useEffect(() => {
    setShowTeam(isActive || isHovered);
  }, [isActive, isHovered]);

  const scaleStyle = { transform: `scale(${size})` };

  return (
    <div style={scaleStyle} className={className}>
      <div className="relative w-6 h-6 flex items-center justify-center cursor-pointer">
        {/* Center user (large) */}
        <div className="relative z-30">
          <LargeUserIcon color={color} />
        </div>

        {/* Left user */}
        <div
          className="absolute z-20 right-2.75 bottom-1.25 transition-all duration-300 ease-out"
          style={{
            opacity: showTeam ? 1 : 0,
            transform: showTeam ? "translateX(0)" : "translateX(4px)",
          }}
        >
          <SmallUserIcon color="#fbbf24" />
        </div>

        {/* Right user */}
        <div
          className="absolute z-20 left-2.75 bottom-1.25 transition-all duration-300 ease-out"
          style={{
            opacity: showTeam ? 1 : 0,
            transform: showTeam ? "translateX(0)" : "translateX(-4px)",
          }}
        >
          <SmallUserIcon color="#fbbf24" />
        </div>
      </div>
    </div>
  );
};

// User icon components
interface UserIconProps {
  color: string;
}

const LargeUserIcon: React.FC<UserIconProps> = ({ color }) => {
  return (
    <div className="flex flex-col items-center transition-colors duration-200">
      {/* Head */}
      <div className="border-2 border-slate-200 rounded-full">
        <div
          className="w-2.5 h-2.5 rounded-full mb-0.2"
          style={{ backgroundColor: color }}
        />
      </div>
      {/* Body */}
      <div className="border-2 border-slate-200 rounded-t-md">
      <div
        className="w-4 h-3.5 rounded-t-sm"
        style={{ backgroundColor: color }}
      />
      </div>
    </div>
  );
};

const SmallUserIcon: React.FC<UserIconProps> = ({ color }) => (
  <div className="flex flex-col items-center transition-colors duration-200 hover:scale-110">
    {/* Head */}
    <div
      className="w-2.5 h-2.5 rounded-full mb-0.2"
      style={{ backgroundColor: color }}
    />
    {/* Body */}
    <div
      className="m-0.5 w-4 h-3.5 rounded-t-sm"
      style={{ backgroundColor: color }}
    />
  </div>
);

export default AnimatedUsers;
