import { supabase } from './supabase';

// Storage bucket name for vendor insurance files
const INSURANCE_BUCKET = 'vendor-insurance-files';

// File upload configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// File type extensions for validation
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];

export interface FileUploadResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
}

export interface FileUploadError {
  message: string;
  code?: string;
}

/**
 * Validates a file before upload
 */
export const validateFile = (file: File): FileUploadError | null => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      message: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      code: 'FILE_TOO_LARGE'
    };
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return {
        message: 'File type not allowed. Supported formats: PDF, JPG, PNG, DOC, DOCX',
        code: 'INVALID_FILE_TYPE'
      };
    }
  }

  // Check filename
  if (!file.name || file.name.trim() === '') {
    return {
      message: 'File must have a valid name',
      code: 'INVALID_FILENAME'
    };
  }

  return null;
};

/**
 * Generates a unique file path for storage
 */
const generateFilePath = (vendorId: number, fileName: string): string => {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `vendor-${vendorId}/insurance-${timestamp}-${sanitizedFileName}`;
};

/**
 * Uploads an insurance file for a vendor
 */
export const uploadInsuranceFile = async (
  vendorId: number, 
  file: File,
  _onProgress?: (progress: number) => void
): Promise<FileUploadResult> => {
  // Validate file
  const validation = validateFile(file);
  if (validation) {
    throw new Error(validation.message);
  }

  try {
    // Generate unique file path
    const filePath = generateFilePath(vendorId, file.name);
    
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(INSURANCE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false // Don't overwrite existing files
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    if (!data?.path) {
      throw new Error('Upload completed but no file path returned');
    }

    // Return file metadata
    return {
      filePath: data.path,
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('File upload failed:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('File upload failed due to an unexpected error');
  }
};

/**
 * Downloads an insurance file from storage
 */
export const downloadInsuranceFile = async (filePath: string): Promise<Blob> => {
  try {
    const { data, error } = await supabase.storage
      .from(INSURANCE_BUCKET)
      .download(filePath);

    if (error) {
      console.error('Storage download error:', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }

    if (!data) {
      throw new Error('No file data received');
    }

    return data;

  } catch (error) {
    console.error('File download failed:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('File download failed due to an unexpected error');
  }
};

/**
 * Gets a public URL for viewing a file (if bucket allows public access)
 */
export const getInsuranceFileUrl = (filePath: string): string | null => {
  try {
    const { data } = supabase.storage
      .from(INSURANCE_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Failed to get file URL:', error);
    return null;
  }
};

/**
 * Gets a signed URL for temporary access to a private file
 */
export const getInsuranceFileSignedUrl = async (
  filePath: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> => {
  try {
    const { data, error } = await supabase.storage
      .from(INSURANCE_BUCKET)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Failed to create signed URL:', error);
      throw new Error(`Failed to create download link: ${error.message}`);
    }

    if (!data?.signedUrl) {
      throw new Error('No signed URL received');
    }

    return data.signedUrl;

  } catch (error) {
    console.error('Signed URL creation failed:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create download link');
  }
};

/**
 * Deletes an insurance file from storage
 */
export const deleteInsuranceFile = async (filePath: string): Promise<void> => {
  try {
    const { error } = await supabase.storage
      .from(INSURANCE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Storage delete error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }

  } catch (error) {
    console.error('File deletion failed:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('File deletion failed due to an unexpected error');
  }
};

/**
 * Replaces an existing insurance file with a new one
 */
export const replaceInsuranceFile = async (
  vendorId: number,
  newFile: File,
  oldFilePath?: string,
  onProgress?: (progress: number) => void
): Promise<FileUploadResult> => {
  try {
    // Upload new file first
    const uploadResult = await uploadInsuranceFile(vendorId, newFile, onProgress);

    // If upload successful and there was an old file, delete it
    if (oldFilePath) {
      try {
        await deleteInsuranceFile(oldFilePath);
      } catch (deleteError) {
        // Log error but don't fail the operation
        console.warn('Failed to delete old file:', deleteError);
      }
    }

    return uploadResult;

  } catch (error) {
    console.error('File replacement failed:', error);
    throw error;
  }
};

/**
 * Utility function to format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Utility function to get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
};

/**
 * Utility function to determine if a file type is supported
 */
export const isFileTypeSupported = (filename: string): boolean => {
  const extension = '.' + getFileExtension(filename);
  return ALLOWED_EXTENSIONS.includes(extension);
};