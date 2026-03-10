'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dropzone } from '@/components/upload/Dropzone';
import { SchemaPreview } from '@/components/upload/SchemaPreview';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface UploadResponse {
  dataset_id: string;
  name: string;
  schema: Array<{
    name: string;
    type: string;
    null_percentage?: number;
    sample_values?: any[];
  }>;
  row_count: number;
  column_count: number;
  file_size: number;
  file_type: string;
}

export default function UploadPage() {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const [description, setDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedData, setUploadedData] = useState<UploadResponse | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', datasetName || file.name.replace(/\.[^/.]+$/, ''));
      if (description) {
        formData.append('description', description);
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await axios.post<UploadResponse>(
        `${apiUrl}/api/v1/datasets`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(progress);
            }
          },
        }
      );

      return response.data;
    },
    onSuccess: (data) => {
      setUploadedData(data);
      toast.success('Dataset uploaded successfully!', {
        description: `${data.name} has been processed and is ready for synthetic data generation.`,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to upload dataset';
      toast.error('Upload failed', {
        description: errorMessage,
      });
      setUploadProgress(0);
    },
  });

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    // Auto-fill dataset name from filename if not already set
    if (!datasetName) {
      setDatasetName(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('No file selected', {
        description: 'Please select a file to upload',
      });
      return;
    }

    if (!datasetName.trim()) {
      toast.error('Dataset name required', {
        description: 'Please provide a name for your dataset',
      });
      return;
    }

    uploadMutation.mutate(selectedFile);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setDatasetName('');
    setDescription('');
    setUploadProgress(0);
    setUploadedData(null);
    uploadMutation.reset();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 
          className="text-3xl font-bold mb-2"
          style={{ 
            fontFamily: 'Clash Display, sans-serif',
            color: '#f1f0ff'
          }}
        >
          Upload Dataset
        </h1>
        <p className="text-[rgba(241,240,255,0.65)]">
          Upload your dataset to generate synthetic data. Supported formats: CSV, JSON, Parquet, XLSX
        </p>
      </div>

      {!uploadedData ? (
        <>
          {/* Dropzone */}
          <Dropzone
            onFileSelect={handleFileSelect}
            uploadProgress={uploadProgress}
            isUploading={uploadMutation.isPending}
            error={uploadMutation.error ? 'Upload failed. Please try again.' : null}
            success={false}
          />

          {/* Dataset details form */}
          {selectedFile && !uploadMutation.isPending && (
            <div 
              className="relative rounded-[14px] p-6 border border-[rgba(167,139,250,0.10)] space-y-4"
              style={{ 
                background: 'rgba(255,255,255,0.04)', 
                backdropFilter: 'blur(20px)', 
                WebkitBackdropFilter: 'blur(20px)' 
              }}
            >
              <h3 className="text-base font-semibold text-[#f1f0ff] mb-4" style={{ fontFamily: 'Clash Display, sans-serif' }}>
                Dataset Details
              </h3>

              {/* Dataset name */}
              <div className="space-y-2">
                <Label htmlFor="dataset-name" className="text-sm text-[rgba(241,240,255,0.65)]">
                  Dataset Name <span className="text-[#ef4444]">*</span>
                </Label>
                <Input
                  id="dataset-name"
                  type="text"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="Enter dataset name"
                  className="bg-[rgba(255,255,255,0.04)] border-[rgba(167,139,250,0.10)] text-[#f1f0ff] placeholder:text-[rgba(241,240,255,0.38)]"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm text-[rgba(241,240,255,0.65)]">
                  Description (Optional)
                </Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your dataset..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(167,139,250,0.10)] text-[#f1f0ff] placeholder:text-[rgba(241,240,255,0.38)] text-sm focus:outline-none focus:ring-2 focus:ring-[#a78bfa] focus:border-transparent resize-none"
                  style={{ fontFamily: 'Satoshi, sans-serif' }}
                />
              </div>

              {/* Upload button */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending || !datasetName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all"
                  style={{ 
                    background: uploadMutation.isPending || !datasetName.trim() 
                      ? 'rgba(167,139,250,0.12)' 
                      : 'linear-gradient(135deg, #a78bfa, #06b6d4)',
                    color: uploadMutation.isPending || !datasetName.trim() 
                      ? 'rgba(241,240,255,0.38)' 
                      : '#f1f0ff',
                    cursor: uploadMutation.isPending || !datasetName.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload & Process'
                  )}
                </Button>
                
                <Button
                  onClick={handleReset}
                  disabled={uploadMutation.isPending}
                  className="px-6 py-3 rounded-lg text-sm font-semibold transition-all"
                  style={{ 
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(241,240,255,0.65)',
                    border: '1px solid rgba(167,139,250,0.10)'
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Success state with schema preview */}
          <div 
            className="relative rounded-[14px] p-6 border border-[rgba(34,197,94,0.25)]"
            style={{ 
              background: 'rgba(34,197,94,0.10)', 
              backdropFilter: 'blur(20px)', 
              WebkitBackdropFilter: 'blur(20px)' 
            }}
          >
            <div className="flex items-start gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(34,197,94,0.20)' }}
              >
                <svg className="w-5 h-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-[#22c55e] mb-1" style={{ fontFamily: 'Clash Display, sans-serif' }}>
                  Upload Successful!
                </h3>
                <p className="text-sm text-[rgba(241,240,255,0.65)]">
                  Your dataset <span className="font-semibold text-[#f1f0ff]">{uploadedData.name}</span> has been uploaded and processed successfully.
                </p>
              </div>
            </div>
          </div>

          {/* Schema preview */}
          <SchemaPreview
            datasetId={uploadedData.dataset_id}
            datasetName={uploadedData.name}
            schema={uploadedData.schema}
            rowCount={uploadedData.row_count}
            columnCount={uploadedData.column_count}
          />

          {/* Upload another button */}
          <div className="text-center">
            <Button
              onClick={handleReset}
              className="px-6 py-3 rounded-lg text-sm font-semibold transition-all"
              style={{ 
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(241,240,255,0.65)',
                border: '1px solid rgba(167,139,250,0.10)'
              }}
            >
              Upload Another Dataset
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
