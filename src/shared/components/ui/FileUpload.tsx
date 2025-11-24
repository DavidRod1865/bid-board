import React, { useState, useRef } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { 
  CloudArrowUpIcon, 
  DocumentIcon, 
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Button } from './Button';
import { validateFile, formatFileSize } from '../../services/fileStorage';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  isUploading?: boolean;
  uploadProgress?: number;
  selectedFile?: File | null;
  existingFileName?: string | null;
  existingFileSize?: number | null;
  error?: string | null;
  disabled?: boolean;
  accept?: string;
  maxSizeText?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onFileRemove,
  isUploading = false,
  uploadProgress = 0,
  selectedFile = null,
  existingFileName = null,
  existingFileSize = null,
  error = null,
  disabled = false,
  accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  maxSizeText = "Max 10MB"
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelection = (file: File) => {
    // Validate file before selecting
    const validation = validateFile(file);
    if (validation) {
      // Let parent handle the error
      return;
    }

    onFileSelect(file);
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current && !disabled && !isUploading) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveFile = () => {
    onFileRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (fileName: string) => {
    if (!fileName) return DocumentIcon;
    
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    
    if (['.pdf'].includes(extension)) {
      return DocumentIcon;
    }
    if (['.jpg', '.jpeg', '.png'].includes(extension)) {
      return DocumentIcon;
    }
    if (['.doc', '.docx'].includes(extension)) {
      return DocumentIcon;
    }
    
    return DocumentIcon;
  };

  // Show existing file if no new file selected
  const currentFile = selectedFile || (existingFileName ? { name: existingFileName, size: existingFileSize || 0 } : null);

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Upload area or file display */}
      {!currentFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center transition-all
            ${isDragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${disabled || isUploading 
              ? 'opacity-50 cursor-not-allowed' 
              : 'cursor-pointer hover:bg-gray-50'
            }
            ${error ? 'border-red-300 bg-red-50' : ''}
          `}
          onClick={handleBrowseClick}
        >
          <div className="flex flex-col items-center space-y-2">
            <CloudArrowUpIcon className="h-8 w-8 text-gray-400" />
            <div className="text-sm text-gray-600">
              <span className="font-medium text-blue-600 hover:text-blue-500">
                Click to upload
              </span>
              {' '}or drag and drop
            </div>
            <div className="text-xs text-gray-500">
              PDF, JPG, PNG, DOC, DOCX ({maxSizeText})
            </div>
          </div>
        </div>
      ) : (
        <div className={`
          border rounded-lg p-4 bg-gray-50
          ${isUploading ? 'border-blue-300' : 'border-gray-200'}
        `}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              {React.createElement(getFileIcon(currentFile.name), { 
                className: "h-5 w-5 text-gray-400 flex-shrink-0" 
              })}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {currentFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(currentFile.size)}
                  {selectedFile && existingFileName && ' (replacing existing file)'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              {isUploading && (
                <div className="flex items-center space-x-2">
                  <div className="text-xs text-blue-600">{uploadProgress}%</div>
                  <div className="w-20 bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {!isUploading && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="text-gray-500 hover:text-red-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload progress bar (full width when uploading) */}
      {isUploading && currentFile && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-2 flex items-center space-x-1 text-sm text-red-600">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Success indicator */}
      {!isUploading && currentFile && !error && selectedFile && (
        <div className="mt-2 flex items-center space-x-1 text-sm text-green-600">
          <CheckCircleIcon className="h-4 w-4" />
          <span>Ready to upload</span>
        </div>
      )}

      {/* File type help text */}
      <div className="mt-2 text-xs text-gray-500">
        <strong>Supported formats:</strong> PDF for insurance certificates, images (JPG, PNG) for scanned documents, Word documents (DOC, DOCX) for additional paperwork
      </div>
    </div>
  );
};

export default FileUpload;