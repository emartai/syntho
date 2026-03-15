'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ClearAuthPage() {
  const router = useRouter();
  const [cleared, setCleared] = useState(false);

  const clearAuth = () => {
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    setCleared(true);
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Clear Authentication State</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[rgba(241,240,255,0.65)]">
            This will clear all authentication data, including:
          </p>
          <ul className="list-disc list-inside text-sm text-[rgba(241,240,255,0.65)] space-y-1">
            <li>Local storage</li>
            <li>Session storage</li>
            <li>Cookies</li>
            <li>Auth locks</li>
          </ul>
          
          {!cleared ? (
            <Button onClick={clearAuth} className="w-full">
              Clear Auth State
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-green-400">✅ Auth state cleared successfully!</p>
              <Button onClick={() => router.push('/login')} className="w-full">
                Go to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
