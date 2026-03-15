'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, XCircle, Power } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger' | 'warning';
  onConfirm: () => void;
  loading?: boolean;
}

const variantConfig = {
  default: {
    icon: AlertTriangle,
    iconColor: 'text-[#a78bfa]',
    buttonVariant: 'default' as const,
  },
  danger: {
    icon: Trash2,
    iconColor: 'text-[#ef4444]',
    buttonVariant: 'destructive' as const,
  },
  warning: {
    icon: XCircle,
    iconColor: 'text-[#f59e0b]',
    buttonVariant: 'default' as const,
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                'bg-[rgba(167,139,250,0.08)]'
              )}
            >
              <Icon className={cn('w-5 h-5', config.iconColor)} />
            </div>
            <DialogTitle
              style={{ fontFamily: 'Clash Display, sans-serif' }}
            >
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-[rgba(241,240,255,0.65)]">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Pre-configured dialogs for common actions
export function DeleteDatasetDialog({
  open,
  onOpenChange,
  datasetName,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetName: string;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Dataset"
      description={`Are you sure you want to delete "${datasetName}"? This action cannot be undone.`}
      confirmLabel="Delete Dataset"
      variant="danger"
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}

export function RevokeApiKeyDialog({
  open,
  onOpenChange,
  keyName,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyName: string;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Revoke API Key"
      description={`Are you sure you want to revoke "${keyName}"? Any applications using this key will lose access immediately.`}
      confirmLabel="Revoke Key"
      variant="danger"
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}

export function DeactivateListingDialog({
  open,
  onOpenChange,
  listingTitle,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingTitle: string;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Deactivate Listing"
      description={`Are you sure you want to deactivate "${listingTitle}"? It will no longer appear in the marketplace.`}
      confirmLabel="Deactivate"
      variant="warning"
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}

export function CancelJobDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cancel Generation"
      description="Are you sure you want to cancel this generation job? Progress will be lost."
      confirmLabel="Cancel Job"
      variant="danger"
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}