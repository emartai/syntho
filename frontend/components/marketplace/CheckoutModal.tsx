'use client';

import { useState } from 'react';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { Check, Download, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { generateTxRef } from '@/lib/flutterwave';
import { toast } from 'sonner';

interface CheckoutModalProps {
  listing: {
    id: string;
    title: string;
    price: number;
    seller_id: string;
    seller_name?: string;
  };
  user: {
    id: string;
    email?: string;
    full_name?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (purchase: any) => void;
}

export function CheckoutModal({
  listing,
  user,
  isOpen,
  onClose,
  onSuccess,
}: CheckoutModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<any>(null);

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      const txRef = generateTxRef(user.id, listing.id);

      let splitConfig = undefined;
      try {
        const payoutResponse = await api.seller.getPayoutStatus();
        if (payoutResponse.data.is_setup && payoutResponse.data.subaccount_id) {
          splitConfig = {
            subaccounts: [
              {
                id: payoutResponse.data.subaccount_id,
                transaction_charge_type: 'percentage',
                transaction_charge: 80,
              },
            ],
          };
        }
      } catch (e) {
        // Seller doesn't have payout set up, proceed without split
      }

      const config: any = {
        public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY!,
        tx_ref: txRef,
        amount: listing.price,
        currency: 'NGN',
        payment_options: 'card,banktransfer,ussd',
        customer: {
          email: user.email || '',
          name: user.full_name || user.email || 'Customer',
        },
        customizations: {
          title: 'Syntho Marketplace',
          description: `Purchase: ${listing.title}`,
          logo: '/logo.png',
        },
        callback: async (response: any) => {
          if (response.status === 'successful' || response.verify === 'success') {
            await verifyPayment(txRef);
          } else {
            setIsProcessing(false);
            toast.error('Payment was not successful', {
              description: 'Please try again or contact support.',
            });
          }
          closePaymentModal();
        },
        onClose: () => {
          setIsProcessing(false);
        },
      };

      if (splitConfig) {
        config.split = splitConfig;
      }

      await useFlutterwave(config);
    } catch (error: any) {
      setIsProcessing(false);
      toast.error('Failed to initialize payment', {
        description: error?.message || 'Please try again.',
      });
    }
  };

  const verifyPayment = async (txRef: string) => {
    try {
      const response = await api.purchases.verify(txRef);
      setPurchaseResult(response.data);
      setPurchaseComplete(true);
      toast.success('Purchase successful!', {
        description: 'Your dataset is ready for download.',
      });
      onSuccess?.(response.data);
    } catch (error: any) {
      toast.error('Payment verification failed', {
        description: error?.response?.data?.detail || error.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (purchaseResult?.download_url) {
      window.open(purchaseResult.download_url, '_blank');
    }
  };

  const handleClose = () => {
    setPurchaseComplete(false);
    setPurchaseResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {purchaseComplete ? 'Purchase Complete' : 'Complete Purchase'}
          </DialogTitle>
        </DialogHeader>

        {!purchaseComplete ? (
          <div className="space-y-6">
            <div className="rounded-lg border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)] p-4 space-y-3">
              <div>
                <div className="text-sm text-[rgba(241,240,255,0.38)]">Dataset</div>
                <div className="font-medium text-text">{listing.title}</div>
              </div>
              <div>
                <div className="text-sm text-[rgba(241,240,255,0.38)]">Seller</div>
                <div className="text-text">{listing.seller_name || 'Anonymous'}</div>
              </div>
              <div className="pt-2 border-t border-[rgba(167,139,250,0.10)]">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[rgba(241,240,255,0.65)]">Total</span>
                  <span className="font-display text-2xl font-bold text-primary">
                    ₦{listing.price.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-[rgba(6,182,212,0.10)] p-3 text-xs text-cyan-400">
              <p className="font-medium">Secure Payment via Flutterwave</p>
              <p className="mt-1 text-[rgba(241,240,255,0.65)]">
                Your payment is secured with 256-bit SSL encryption.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                loading={isProcessing}
                className="flex-1 bg-gradient-to-r from-primary to-accent"
              >
                Pay ₦{listing.price.toLocaleString()}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(34,197,94,0.10)]">
                <Check className="h-8 w-8 text-green-400" />
              </div>
            </div>

            <div>
              <h3 className="font-display text-xl font-bold text-text">
                Payment Successful!
              </h3>
              <p className="mt-1 text-sm text-[rgba(241,240,255,0.65)]">
                Your purchase of <span className="text-primary">{listing.title}</span> is complete.
              </p>
            </div>

            <div className="rounded-lg border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[rgba(241,240,255,0.38)]">Amount Paid</span>
                <span className="font-medium text-primary">
                  ₦{listing.price.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Close
              </Button>
              <Button onClick={handleDownload} className="flex-1 bg-gradient-to-r from-primary to-accent">
                <Download className="h-4 w-4 mr-2" />
                Download Dataset
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}