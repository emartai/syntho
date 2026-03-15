'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Check, Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface Bank {
  id: string;
  name: string;
  code: string;
}

export default function PayoutSetupPage() {
  const router = useRouter();
  const [selectedBank, setSelectedBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const { data: banks, isLoading: banksLoading } = useQuery({
    queryKey: ['banks'],
    queryFn: async () => {
      const response = await api.seller.getBanks();
      return response.data.banks as Bank[];
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const response = await api.seller.verifyAccount({
        account_number: accountNumber,
        bank_code: selectedBank,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setAccountName(data.account_name);
      setIsVerified(true);
      toast.success('Account verified successfully');
    },
    onError: (error: any) => {
      toast.error('Account verification failed', {
        description: error?.response?.data?.detail || error.message,
      });
      setIsVerified(false);
    },
  });

  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await api.seller.setupPayout({
        bank_code: selectedBank,
        account_number: accountNumber,
        business_name: businessName,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Payout setup completed');
      router.push('/billing');
    },
    onError: (error: any) => {
      toast.error('Payout setup failed', {
        description: error?.response?.data?.detail || error.message,
      });
    },
  });

  const handleVerifyAccount = async () => {
    if (!selectedBank || !accountNumber) {
      toast.error('Please select a bank and enter account number');
      return;
    }

    setIsVerifying(true);
    try {
      await verifyMutation.mutateAsync();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async () => {
    if (!isVerified || !businessName) {
      toast.error('Please verify your account and enter business name');
      return;
    }

    await setupMutation.mutateAsync();
  };

  const selectedBankInfo = banks?.find(b => b.code === selectedBank);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-text">Set Up Payout</h1>
          <p className="text-sm text-[rgba(241,240,255,0.65)]">
            Connect your bank account to receive earnings from dataset sales
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Bank Account Details
          </CardTitle>
          <CardDescription>
            Your earnings will be transferred to this account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="bank">Bank</Label>
            <Select value={selectedBank} onValueChange={setSelectedBank}>
              <SelectTrigger id="bank">
                <SelectValue placeholder={banksLoading ? 'Loading banks...' : 'Select your bank'} />
              </SelectTrigger>
              <SelectContent>
                {banks?.map((bank) => (
                  <SelectItem key={bank.id} value={bank.code}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number</Label>
            <div className="flex gap-2">
              <Input
                id="accountNumber"
                placeholder="Enter your 10-digit account number"
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value);
                  setIsVerified(false);
                  setAccountName('');
                }}
                maxLength={10}
                disabled={!selectedBank}
              />
              <Button
                variant="secondary"
                onClick={handleVerifyAccount}
                disabled={!selectedBank || !accountNumber || isVerifying || verifyMutation.isPending}
              >
                {isVerifying || verifyMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </Button>
            </div>
          </div>

          {isVerified && accountName && (
            <div className="rounded-lg bg-[rgba(34,197,94,0.10)] border border-[rgba(34,197,94,0.20)] p-4">
              <div className="flex items-center gap-2 text-green-400">
                <Check className="h-4 w-4" />
                <span className="font-medium">Account Verified</span>
              </div>
              <p className="mt-1 text-sm text-[rgba(241,240,255,0.65)]">
                {accountName}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="businessName">Business / Account Name</Label>
            <Input
              id="businessName"
              placeholder="Enter your business or account name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              disabled={!isVerified}
            />
            <p className="text-xs text-[rgba(241,240,255,0.38)]">
              This name will be displayed on your marketplace listings
            </p>
          </div>

          <div className="rounded-lg border border-[rgba(167,139,250,0.10)] bg-[rgba(167,139,250,0.05)] p-4">
            <h4 className="font-medium text-sm mb-2">How it works</h4>
            <ul className="text-sm text-[rgba(241,240,255,0.65)] space-y-1">
              <li>• When a buyer purchases your dataset, you receive 80% of the sale</li>
              <li>• Syntho keeps 20% as platform fee</li>
              <li>• Payouts are processed automatically to your connected bank account</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isVerified || !businessName || setupMutation.isPending}
              className="flex-1"
            >
              {setupMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Complete Setup'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}