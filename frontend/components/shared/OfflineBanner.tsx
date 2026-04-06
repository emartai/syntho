'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const sync = () => setIsOnline(window.navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="border-b border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.12)] px-4 py-2 text-sm text-amber-200">
      <div className="mx-auto flex max-w-7xl items-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>You appear to be offline. Live updates and billing actions may be delayed until your connection returns.</span>
      </div>
    </div>
  );
}
