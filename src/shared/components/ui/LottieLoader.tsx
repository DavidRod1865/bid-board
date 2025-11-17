import React from 'react';
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface LottieLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LottieLoader: React.FC<LottieLoaderProps> = ({ 
  size = 'lg', 
  className = '' 
}) => {
  // Size mappings
  const sizeClasses = {
    sm: 'w-64 h-64',
    md: 'w-96 h-96', 
    lg: 'w-128 h-128'
  };

  return (
    <div className={`${sizeClasses[size]} mx-auto ${className}`}>
      <DotLottieReact
        src="/animations/building-loader.lottie"
        autoplay
        loop
        speed={1.15}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default LottieLoader;