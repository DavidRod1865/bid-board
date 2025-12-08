import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  subtitle?: string;
  noteText?: string;
  cleanStyle?: boolean;
}

const AlertDialogModal: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  subtitle,
  noteText,
  cleanStyle = false
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getIcon = () => {
    const iconClass = "w-6 h-6";
    
    switch (variant) {
      case 'danger':
      case 'warning':
        return <ExclamationTriangleIcon className={`${iconClass} text-red-600`} />;
      case 'info':
        return <InformationCircleIcon className={`${iconClass} text-blue-600`} />;
      default:
        return <ExclamationTriangleIcon className={`${iconClass} text-red-600`} />;
    }
  };

  const getIconBgColor = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-100';
      case 'warning':
        return 'bg-yellow-100';
      case 'info':
        return 'bg-blue-100';
      default:
        return 'bg-red-100';
    }
  };

  const getConfirmButtonClass = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      default:
        return 'bg-red-600 hover:bg-red-700 text-white';
    }
  };

  if (cleanStyle) {
    return (
      <AlertDialog open={isOpen} onOpenChange={onClose}>
        <AlertDialogContent className="sm:max-w-md animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-550">
          <AlertDialogHeader className="text-center space-y-3">
            <AlertDialogTitle className="text-xl font-bold text-gray-900">
              {title}
            </AlertDialogTitle>
            {subtitle && (
              <p className="text-base text-gray-500">
                {subtitle}
              </p>
            )}
          </AlertDialogHeader>
          
          {noteText && (
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <InformationCircleIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">
                {noteText}
              </p>
            </div>
          )}
          
          <AlertDialogFooter className="flex gap-3 justify-end pt-6">
            <AlertDialogCancel 
              onClick={onClose} 
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {cancelText}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirm}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              {confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="text-center">
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${getIconBgColor()} mb-4`}>
            {getIcon()}
          </div>
          <AlertDialogTitle className="text-lg font-medium text-gray-900">
            {title}
          </AlertDialogTitle>
          {message && (
            <AlertDialogDescription className="text-sm text-gray-500 mt-2">
              {message}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-3 justify-center">
          <AlertDialogCancel onClick={onClose} className="flex-1">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className={`flex-1 ${getConfirmButtonClass()}`}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AlertDialogModal;