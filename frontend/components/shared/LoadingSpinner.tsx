import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <Loader2
      className={cn(
        'animate-spin text-[#a78bfa]',
        sizeClasses[size],
        className
      )}
    />
  );
}

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[rgba(5,3,15,0.8)] backdrop-blur-sm z-50 rounded-lg">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-[rgba(241,240,255,0.65)]">{message}</p>
      </div>
    </div>
  );
}

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = 'Loading...' }: PageLoaderProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-[rgba(241,240,255,0.65)]">{message}</p>
      </div>
    </div>
  );
}