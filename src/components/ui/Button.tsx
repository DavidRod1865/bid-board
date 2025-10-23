import React from 'react';
import { Button as ShadcnButton } from './button-shadcn';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';

// Custom button variants that extend Shadcn's buttonVariants
const customButtonVariants = cva(
  // Base classes from Shadcn, keeping accessibility and interaction states
  "",
  {
    variants: {
      variant: {
        primary: "bg-[#d4af37] text-white hover:bg-[#b8941f] focus-visible:ring-[#d4af37]/50",
        secondary: "bg-gray-600 text-white hover:bg-gray-700 focus-visible:ring-gray-500/50",
        danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/50",
        success: "bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500/50",
        outline: "border-2 border-[#d4af37] text-[#d4af37] bg-transparent hover:bg-[#d4af37] hover:text-white focus-visible:ring-[#d4af37]/50",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4 text-sm", 
        lg: "h-10 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  onClick,
  type = 'button'
}) => {
  return (
    <ShadcnButton
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        customButtonVariants({ variant, size }),
        className
      )}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          Loading...
        </div>
      ) : (
        children
      )}
    </ShadcnButton>
  );
};

export default Button;
export type { ButtonProps };