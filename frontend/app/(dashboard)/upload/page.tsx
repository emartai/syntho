'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { uploadDataset, listDatasets } from '@/lib/api';
import { Dropzone } from '@/components/upload/Dropzone';
import { SchemaPreview } from '@/components/upload/SchemaPreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingOverlay } from '@/components/shared/OnboardingOverlay';

function filenameToDatasetName(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
}

export default function UploadPage() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedData, setUploadedData] = useState<any>(null);
  const [datasetName, setDatasetName] = useState('');
  const [description, setDescription] = useState('');
  const plan = profile?.plan ?? 'free';
  const onboarding = useOnboarding();
  const showOnboarding = onboarding.ready && onboarding.eligible && onboarding.step === 1;

  const { data: datasets = [] } = useQuery({
    queryKey: ['datasets-count-upload'],
    queryFn: listDatasets,
    enabled: !!user,
    staleTime: 30_000,
  });

  const isFirstDataset = (datasets?.length ?? 0) === 0;


  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('Please select a file first');
      return uploadDataset(selectedFile, (pct) => setUploadProgress(pct), {
        name: datasetName || filenameToDatasetName(selectedFile.name),
        description,
      });
    },
    onSuccess: (data) => {
      setUploadedData(data);
      onboarding.setOnboardingStep(2);
      toast.success('Dataset uploaded successfully!', {
        description: `${data?.name ?? datasetName || 'Dataset'} is ready for synthetic generation.`,
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail ?? error?.message ?? 'Failed to upload dataset';
      toast.error('Upload failed', { description: errorMessage });
      setUploadProgress(0);
    },
  });

  const onFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!datasetName) {
      setDatasetName(filenameToDatasetName(file.name));
    }
  };

  const resetUploadFlow = () => {
    setSelectedFile(null);
    setUploadedData(null);
    setUploadProgress(0);
    setDatasetName('');
    setDescription('');
    uploadMutation.reset();
  };

  const handleLoadSampleDataset = async () => {
    try {
      const samplePath = process.env.NEXT_PUBLIC_SAMPLE_DATASET_PATH;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (!samplePath || !supabaseUrl) {
        toast.error('Sample dataset is not configured.');
        return;
      }

      const sampleUrl = samplePath.startsWith('http')
        ? samplePath
        : `${supabaseUrl}/storage/v1/object/public/${samplePath.replace(/^\/+/, '')}`;

      const response = await fetch(sampleUrl);
      if (!response.ok) throw new Error('Failed to download sample dataset');

      const blob = await response.blob();
      const filename = samplePath.split('/').pop() || 'sample-dataset.csv';
      const file = new File([blob], filename, { type: 'text/csv' });

      setSelectedFile(file);
      setDatasetName(filenameToDatasetName(filename));
      setDescription('Sample dataset for onboarding');

      toast.success('Sample dataset loaded. Click “Upload & Process” to continue.');
    } catch (error: any) {
      toast.error('Unable to load sample dataset', {
        description: error?.message ?? 'Please try again.',
      });
    }
  };

  const uploadError = uploadMutation.error
    ? 'Upload failed. Please review your file and try again.'
    : null;

  const canUpload = useMemo(() => !!selectedFile && !!datasetName.trim() && !uploadMutation.isPending, [selectedFile, datasetName, uploadMutation.isPending]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Clash Display, sans-serif', color: '#f1f0ff' }}>
          Upload Dataset
        </h1>
        <p className="text-[rgba(241,240,255,0.65)]">
          Upload your dataset to generate synthetic data. Supported formats: CSV, JSON, Parquet, XLSX.
        </p>
      </div>

      {showOnboarding && (
        <div className="rounded-[14px] border border-[rgba(167,139,250,0.25)] bg-[rgba(167,139,250,0.10)] p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#c4b5fd] mb-2">Onboarding</p>
              <h3 className="text-lg font-semibold text-[#f1f0ff]">New here? Try it with our sample dataset</h3>
              <div className="mt-3 flex items-center gap-2 text-sm text-[rgba(241,240,255,0.75)]">
                <span className="px-2 py-1 rounded-full bg-[rgba(255,255,255,0.08)]">1. Upload</span>
                <span>→</span>
                <span className="px-2 py-1 rounded-full bg-[rgba(255,255,255,0.05)]">2. Generate</span>
                <span>→</span>
                <span className="px-2 py-1 rounded-full bg-[rgba(255,255,255,0.05)]">3. Download</span>
              </div>
            </div>
            {isFirstDataset && (
              <Button onClick={handleLoadSampleDataset} className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Load Sample Dataset
              </Button>
            )}
          </div>
        </div>
      )}

      {!uploadedData ? (
        <>
          <div className="rounded-[14px] border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)] p-5 space-y-4">
            <div>
              <label className="text-sm text-[rgba(241,240,255,0.75)] mb-2 block">Dataset name</label>
              <Input
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="e.g. Nigerian Retail Transactions"
              />
            </div>
            <div>
              <label className="text-sm text-[rgba(241,240,255,0.75)] mb-2 block">Description (optional)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add context about this dataset..."
                rows={3}
              />
            </div>
          </div>

          <Dropzone
            selectedFile={selectedFile}
            onFileSelect={onFileSelect}
            onClearFile={() => setSelectedFile(null)}
            uploadProgress={uploadProgress}
            isUploading={uploadMutation.isPending}
            plan={plan}
            error={uploadError}
          />

          {selectedFile && (
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => uploadMutation.mutate()}
                disabled={!canUpload}
                className="flex-1 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #a78bfa, #06b6d4)', color: '#f1f0ff' }}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Upload & Process
                  </>
                )}
              </Button>
              <Button onClick={resetUploadFlow} variant="outline">Cancel</Button>
            </div>
          )}
        </>
      ) : (
        <SchemaPreview
          datasetId={uploadedData?.id ?? uploadedData?.dataset_id ?? ''}
          datasetName={uploadedData?.name ?? datasetName || 'Dataset'}
          schema={(uploadedData?.schema?.columns ?? uploadedData?.schema ?? []).map((c: any) => ({
            name: c?.name ?? '',
            type: c?.data_type ?? c?.type ?? 'text',
            null_percentage: c?.null_percentage,
            sample_values: c?.sample_values,
          }))}
          rowCount={uploadedData?.row_count ?? 0}
          columnCount={uploadedData?.column_count ?? 0}
          plan={plan}
          onUploadDifferent={resetUploadFlow}
        />
      )}


      {showOnboarding && (
        <OnboardingOverlay
          step={1}
          title="Welcome to Syntho. Upload a dataset."
          description="Start by uploading a real dataset. We'll detect schema automatically and prep synthetic generation."
          action={isFirstDataset ? { label: 'Load Sample Dataset', onClick: handleLoadSampleDataset } : undefined}
          onNext={() => onboarding.setOnboardingStep(2)}
          onSkip={onboarding.dismiss}
        />
      )}

      {uploadedData && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => router.push(`/datasets/${uploadedData?.id ?? uploadedData?.dataset_id}`)}>
            View Dataset Details
          </Button>
        </div>
      )}
    </div>
  );
}
