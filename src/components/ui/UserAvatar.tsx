import React from 'react';
import { generateInitials } from '../../utils/formatters';
import type { User } from '../../types';

interface UserAvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  user, 
  size = 'md', 
  showName = false,
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm', 
    lg: 'w-10 h-10 text-base'
  };
  
  const avatarClasses = `
    ${sizeClasses[size]} 
    rounded-full 
    flex 
    items-center 
    justify-center 
    text-white 
    font-semibold 
    flex-shrink-0
    ${className}
  `;
  
  const initials = generateInitials(user.name);
  
  if (showName) {
    return (
      <div className="flex items-center gap-2">
        <div 
          className={avatarClasses}
          style={{ backgroundColor: user.color_preference }}
        >
          {initials}
        </div>
        <span className="text-gray-900 text-sm">{user.name}</span>
      </div>
    );
  }
  
  return (
    <div 
      className={avatarClasses}
      style={{ backgroundColor: user.color_preference }}
      title={user.name}
    >
      {initials}
    </div>
  );
};

export default UserAvatar;