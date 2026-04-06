'use client';

import { useCallback, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, FileSpreadsheet, FileJson, AlertCircle, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface DropzoneProps {
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  onClearFile: () => void;
  uploadProgress: number;
  isUploading: boolean;
  plan: 'free' | 'pro' | 'growth';
  error?: string | null;
}

const ACCEPTED_FILE_TYPES = {
  'text/csv': ['.csv'],
  'application/json': ['.json'],
  'application/vnd.apache.parquet': ['.parquet'],
  'application/octet-stream': ['.parquet'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
};

const FREE_MAX_FILE_SIZE = 10 * 1024 * 1024;
const PAID_MAX_FILE_SIZE = 500 * 1024 * 1024;

function getFileIcon(fileName: string) {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'xlsx') return FileSpreadsheet;
  if (ext === 'json') return FileJson;
  return FileText;
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

export function Dropzone({
  selectedFile,
  onFileSelect,
  onClearFile,
  uploadProgress,
  isUploading,
  plan,
  error,
}: DropzoneProps) {
  const [fileError, setFileError] = useState<string | null>(null);

  const maxFileSize = plan === 'free' ? FREE_MAX_FILE_SIZE : PAID_MAX_FILE_SIZE;

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: { errors: { code: string }[] }[]) => {
      setFileError(null);

      if (rejectedFiles.length > 0) {
        const code = rejectedFiles[0]?.errors?.[0]?.code;
        if (code === 'file-too-large') {
          setFileError(
            plan === 'free'
              ? 'Free plan supports files up to 10MB. Upgrade for larger files.'
              : 'File size exceeds 500MB limit for your plan.'
          );
        } else if (code === 'file-invalid-type') {
          setFileError('Invalid file type. Please upload .csv, .json, .parquet, or .xlsx');
        } else {
          setFileError('Invalid file. Please try again.');
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect, plan]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: maxFileSize,
    multiple: false,
    disabled: isUploading,
  });

  const Icon = useMemo(() => (selectedFile ? getFileIcon(selectedFile.name) : Upload), [selectedFile]);

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`rounded-[14px] border-2 border-dashed p-10 text-center transition-all cursor-pointer ${
          isDragActive
            ? 'border-[#a78bfa] bg-[rgba(167,139,250,0.10)]'
            : 'border-[rgba(167,139,250,0.22)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.07)]'
        } ${isUploading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-[rgba(167,139,250,0.12)] flex items-center justify-center">
          <Icon className="w-7 h-7 text-[#a78bfa]" />
        </div>

        <h3 className="text-lg font-semibold text-[#f1f0ff] mb-1" style={{ fontFamily: 'Clash Display, sans-serif' }}>
          {isDragActive ? 'Drop file to upload' : 'Drag & drop your dataset'}
        </h3>
        <p className="text-sm text-[rgba(241,240,255,0.65)]">
          CSV, JSON, Parquet, XLSX {plan === 'free' ? '(max 10MB)' : '(max 500MB)'}
        </p>
      </div>

      {selectedFile && (
        <div className="rounded-[14px] border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)] p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[rgba(167,139,250,0.12)] flex items-center justify-center">
              <Icon className="w-5 h-5 text-[#a78bfa]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#f1f0ff] truncate">{selectedFile.name}</p>
              <p className="text-xs text-[rgba(241,240,255,0.65)]">{formatFileSize(selectedFile.size)}</p>
            </div>
            {!isUploading && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFileError(null);
                  onClearFile();
                }}
                className="w-8 h-8 rounded-lg hover:bg-[rgba(239,68,68,0.12)] flex items-center justify-center"
                aria-label="Clear selected file"
              >
                <X className="w-4 h-4 text-[rgba(241,240,255,0.65)]" />
              </button>
            )}
          </div>

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

      {(fileError || error) && (
        <div className="rounded-[14px] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.10)] p-4 flex gap-2">
          <AlertCircle className="w-4 h-4 text-[#ef4444] mt-0.5" />
          <p className="text-sm text-[rgba(241,240,255,0.75)]">{fileError || error}</p>
        </div>
      )}
    </div>
  );
}
