'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { uploadDataset } from '@/lib/api'
import { Dropzone } from '@/components/upload/Dropzone'
import { SchemaPreview } from '@/components/upload/SchemaPreview'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function UploadPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedData, setUploadedData] = useState<any>(null)

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return await uploadDataset(file, (pct) => setUploadProgress(pct))
    },
    onSuccess: (data) => {
      setUploadedData(data)
      toast.success('Dataset uploaded successfully!', {
        description: `${data?.name ?? 'Dataset'} has been processed and is ready for synthetic data generation.`,
      })
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail ?? error?.message ?? 'Failed to upload dataset'
      toast.error('Upload failed', { description: errorMessage })
      setUploadProgress(0)
    },
  })

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
  }

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('No file selected')
      return
    }
    uploadMutation.mutate(selectedFile)
  }

  const handleReset = () => {
    setSelectedFile(null)
    setUploadProgress(0)
    setUploadedData(null)
    uploadMutation.reset()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: 'Clash Display, sans-serif', color: '#f1f0ff' }}
        >
          Upload Dataset
        </h1>
        <p className="text-[rgba(241,240,255,0.65)]">
          Upload your dataset to generate synthetic data. Supported formats: CSV, JSON, Parquet, XLSX
        </p>
      </div>

      {!uploadedData ? (
        <>
          <Dropzone
            onFileSelect={handleFileSelect}
            uploadProgress={uploadProgress}
            isUploading={uploadMutation.isPending}
            error={uploadMutation.error ? 'Upload failed. Please try again.' : null}
            success={false}
          />

          {selectedFile && !uploadMutation.isPending && (
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold"
                style={{
                  background: 'linear-gradient(135deg, #a78bfa, #06b6d4)',
                  color: '#f1f0ff',
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
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <div
            className="relative rounded-[14px] p-6 border border-[rgba(34,197,94,0.25)]"
            style={{ background: 'rgba(34,197,94,0.10)' }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(34,197,94,0.20)' }}>
                <svg className="w-5 h-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#22c55e] mb-1">Upload Successful!</h3>
                <p className="text-sm text-[rgba(241,240,255,0.65)]">
                  Your dataset <span className="font-semibold text-white">{uploadedData?.name ?? 'Unknown'}</span> is ready.
                </p>
              </div>
            </div>
          </div>

          <SchemaPreview
            datasetId={uploadedData?.id ?? uploadedData?.dataset_id ?? ''}
            datasetName={uploadedData?.name ?? 'Dataset'}
            schema={(uploadedData?.schema?.columns ?? []).map((c: any) => ({
              name: c?.name ?? '',
              type: c?.data_type ?? c?.type ?? 'text',
              null_percentage: c?.null_percentage,
              sample_values: c?.sample_values,
            }))}
            rowCount={uploadedData?.row_count ?? 0}
            columnCount={uploadedData?.column_count ?? 0}
          />

          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => router.push(`/datasets/${uploadedData?.id ?? uploadedData?.dataset_id}`)}
              style={{ background: 'linear-gradient(135deg, #a78bfa, #06b6d4)', color: '#f1f0ff' }}
            >
              View Dataset
            </Button>
            <Button onClick={handleReset} variant="outline">
              Upload Another
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
