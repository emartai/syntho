'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  ctaHref?: string;
}

export function UpgradeModal({
  open,
  onOpenChange,
  title = 'Upgrade required',
  description = 'This feature is available on a paid plan. Upgrade to continue.',
  ctaHref = '/settings/billing',
}: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[rgba(167,139,250,0.18)] bg-[#0f0a1f] text-[#f1f0ff]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-[rgba(241,240,255,0.68)]">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 pt-2">
          <Button asChild className="flex-1">
            <a href={ctaHref}>Go to Billing</a>
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
