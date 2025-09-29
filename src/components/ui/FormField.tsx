import React from 'react';
import { BRAND_COLORS } from '../../utils/constants';

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
}

interface InputProps {
  type?: 'text' | 'email' | 'number' | 'date' | 'tel' | 'datetime-local';
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  min?: string;
  max?: string;
  step?: string;
}

interface TextareaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  autoFocus?: boolean;
}

interface SelectProps {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  children,
  error,
  required = false,
  className = ''
}) => {
  return (
    <div className={`detail-item ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

// Input component with consistent styling
export const Input: React.FC<InputProps> = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
  min,
  max,
  step
}) => {
  const baseClasses = `
    w-full px-3 py-2 border border-gray-300 rounded-md 
    focus:outline-none focus:border-[${BRAND_COLORS.primary}] 
    text-sm transition-colors
    disabled:bg-gray-100 disabled:cursor-not-allowed
  `;
  
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`${baseClasses} ${className}`}
      min={min}
      max={max}
      step={step}
    />
  );
};

// Textarea component with consistent styling
export const Textarea: React.FC<TextareaProps> = ({
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled = false,
  className = '',
  onKeyDown,
  autoFocus
}) => {
  const baseClasses = `
    w-full px-3 py-2 border border-gray-300 rounded-md 
    focus:outline-none focus:border-[${BRAND_COLORS.primary}] 
    text-sm resize-y transition-colors
    disabled:bg-gray-100 disabled:cursor-not-allowed
  `;
  
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={`${baseClasses} ${className}`}
      onKeyDown={onKeyDown}
      autoFocus={autoFocus}
    />
  );
};

// Select component with consistent styling
export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  children,
  disabled = false,
  className = ''
}) => {
  const baseClasses = `
    w-full px-3 py-2 border border-gray-300 rounded-md 
    focus:outline-none focus:border-[${BRAND_COLORS.primary}] 
    text-sm bg-white transition-colors
    disabled:bg-gray-100 disabled:cursor-not-allowed
  `;
  
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`${baseClasses} ${className}`}
    >
      {children}
    </select>
  );
};

export default FormField;