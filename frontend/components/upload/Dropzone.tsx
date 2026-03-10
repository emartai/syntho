'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  uploadProgress: number;
  isUploading: boolean;
  error: string | null;
  success: boolean;
}

const ACCEPTED_FILE_TYPES = {
  'text/csv': ['.csv'],
  'application/json': ['.json'],
  'application/vnd.apache.parquet': ['.parquet'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function Dropzone({ onFileSelect, uploadProgress, isUploading, error, success }: DropzoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setFileError(null);

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setFileError('File size exceeds 100MB limit');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setFileError('Invalid file type. Please upload CSV, JSON, Parquet, or XLSX files only');
      } else {
        setFileError('Invalid file. Please try again');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled: isUploading || success,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFileError(null);
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          relative rounded-[14px] p-12 transition-all duration-200 cursor-pointer
          ${isDragActive 
            ? 'border-2 border-[#a78bfa] bg-[rgba(167,139,250,0.08)]' 
            : 'border-2 border-dashed border-[rgba(167,139,250,0.22)] hover:border-[rgba(167,139,250,0.40)] hover:bg-[rgba(255,255,255,0.07)]'
          }
          ${(isUploading || success) ? 'opacity-50 cursor-not-allowed' : ''}
          ${(fileError || error) ? 'border-[#ef4444] bg-[rgba(239,68,68,0.05)]' : ''}
        `}
        style={{ 
          background: isDragActive ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center text-center">
          {success ? (
            <>
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'rgba(34,197,94,0.12)' }}
              >
                <CheckCircle className="w-8 h-8 text-[#22c55e]" />
              </div>
              <h3 className="text-lg font-semibold text-[#22c55e] mb-2" style={{ fontFamily: 'Clash Display, sans-serif' }}>
                Upload Successful!
              </h3>
              <p className="text-sm text-[rgba(241,240,255,0.65)]">
                Your dataset has been uploaded and processed
              </p>
            </>
          ) : (
            <>
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: isDragActive ? 'rgba(167,139,250,0.20)' : 'rgba(167,139,250,0.12)' }}
              >
                <Upload className="w-8 h-8 text-[#a78bfa]" />
              </div>
              
              {isDragActive ? (
                <h3 className="text-lg font-semibold text-[#a78bfa] mb-2" style={{ fontFamily: 'Clash Display, sans-serif' }}>
                  Drop your file here
                </h3>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-[#f1f0ff] mb-2" style={{ fontFamily: 'Clash Display, sans-serif' }}>
                    Drag & drop your dataset
                  </h3>
                  <p className="text-sm text-[rgba(241,240,255,0.65)] mb-4">
                    or click to browse files
                  </p>
                </>
              )}
              
              <div className="flex flex-wrap justify-center gap-2 mb-3">
                {['.csv', '.json', '.parquet', '.xlsx'].map((ext) => (
                  <span 
                    key={ext}
                    className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ 
                      background: 'rgba(167,139,250,0.12)', 
                      color: '#a78bfa',
                      border: '1px solid rgba(167,139,250,0.25)'
                    }}
                  >
                    {ext}
                  </span>
                ))}
              </div>
              
              <p className="text-xs text-[rgba(241,240,255,0.38)]">
                Maximum file size: 100MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* Selected file info */}
      {selectedFile && !success && (
        <div 
          className="relative rounded-[14px] p-4 border border-[rgba(167,139,250,0.10)]"
          style={{ 
            background: 'rgba(255,255,255,0.04)', 
            backdropFilter: 'blur(20px)', 
            WebkitBackdropFilter: 'blur(20px)' 
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(167,139,250,0.12)' }}
            >
              <File className="w-5 h-5 text-[#a78bfa]" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#f1f0ff] truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-[rgba(241,240,255,0.65)]">
                {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Unknown type'}
              </p>
            </div>

            {!isUploading && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[rgba(239,68,68,0.12)] transition-colors"
              >
                <X className="w-4 h-4 text-[rgba(241,240,255,0.65)] hover:text-[#ef4444]" />
              </button>
            )}
          </div>

          {/* Upload progress */}
          {isUploading && (
            <div className="mt-4 space-y-2">
              <Progress value={uploadProgress} shimmer />
              <div className="flex justify-between text-xs text-[rgba(241,240,255,0.65)]">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {(fileError || error) && (
        <div 
          className="relative rounded-[14px] p-4 border border-[rgba(239,68,68,0.25)]"
          style={{ 
            background: 'rgba(239,68,68,0.10)', 
            backdropFilter: 'blur(20px)', 
            WebkitBackdropFilter: 'blur(20px)' 
          }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#ef4444] mb-1">
                Upload Error
              </p>
              <p className="text-sm text-[rgba(241,240,255,0.65)]">
                {fileError || error}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
