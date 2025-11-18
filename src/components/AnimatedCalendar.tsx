import React, { useState, useEffect } from 'react';

interface AnimatedCalendarProps {
  color?: string;
  size?: number;
  className?: string;
  isActive?: boolean;
  isHovered?: boolean;
}

const AnimatedCalendar: React.FC<AnimatedCalendarProps> = ({
  color = "#6b7280", // Default grey
  size = 1,
  className = "",
  isActive = false,
  isHovered = false,
}) => {
  const [showRays, setShowRays] = useState(isActive);

  // Sync rays visibility with isActive or isHovered
  useEffect(() => {
    setShowRays(isActive || isHovered);
  }, [isActive, isHovered]);

  const scaleStyle = { transform: `scale(${size})` };
  
  // Ray positions (6 rays going upward from calendar)
  const rayPositions = [
    { x: -8, y: -14, length: 8, angle: -30 },   // left ray
    { x: -4, y: -16, length: 10, angle: -15 },  // left-center ray
    { x: 0, y: -18, length: 12, angle: 0 },     // center ray (tallest)
    { x: 4, y: -16, length: 10, angle: 15 },    // right-center ray
    { x: 8, y: -14, length: 8, angle: 30 },     // right ray
    { x: 0, y: -12, length: 6, angle: 0 },      // short center ray
  ];

  const getRayStyle = (x: number, y: number, _length: number, angle: number, index: number) => {
    return {
      position: 'absolute' as const,
      left: '50%',
      top: '50%',
      transform: `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${showRays ? 1 : 0}) rotate(${angle}deg)`,
      opacity: showRays ? 1 : 0,
      transition: `all 300ms ease-out ${index * 75}ms`, // Staggered timing
      transformOrigin: 'center bottom',
    };
  };

  const RayIcon = ({ length }: { length: number }) => (
    <div 
      className="bg-yellow-400 rounded-full"
      style={{
        width: '2px',
        height: `${length}px`,
        background: 'linear-gradient(to top, #fbbf24, #fde047)',
        boxShadow: '0 0 4px rgba(251, 191, 36, 0.5)',
      }}
    />
  );

  return (
    <div style={scaleStyle} className={className}>
      <div className="relative w-6 h-6 flex items-center justify-center cursor-pointer">
        
        {/* Animated rays */}
        {rayPositions.map((ray, index) => (
          <div
            key={index}
            style={getRayStyle(ray.x, ray.y, ray.length, ray.angle, index)}
          >
            <RayIcon length={ray.length} />
          </div>
        ))}
        
        {/* Calendar body */}
        <div 
          className="relative z-20 transition-all duration-300 ease-out"
          style={{
            transform: showRays ? 'scale(1.1)' : 'scale(1)',
          }}
        >
          {/* Main calendar rectangle */}
          <div 
            className="w-6 h-6 rounded border-2 border-white transition-colors duration-200"
            style={{ backgroundColor: color }}
          >
            
            {/* Date grid inside calendar */}
            <div className="p-0.5 h-full flex flex-col justify-between">
              {/* Header line */}
              <div 
                className="h-0.5 rounded-full opacity-70"
                style={{ backgroundColor: 'white' }}
              />
              
              {/* Date dots grid */}
              <div className="flex-1 grid grid-cols-3 gap-0.5 items-center justify-items-center pt-0.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-0.5 h-0.5 rounded-full opacity-70"
                    style={{ backgroundColor: 'white' }}
                  />
                ))}
              </div>
            </div>
            
            {/* Special date highlight (yellow dot) */}
            <div 
              className="absolute bottom-1 right-1 w-1 h-1 rounded-full transition-all duration-300"
              style={{
                backgroundColor: '#fbbf24',
                opacity: showRays ? 1 : 0,
                transform: showRays ? 'scale(1)' : 'scale(0)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedCalendar;