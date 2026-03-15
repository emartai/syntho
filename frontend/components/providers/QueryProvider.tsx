'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000,
                        refetchOnWindowFocus: false,
                        retry: (failureCount, error: any) => {
                            // Retry 2 times for 5xx errors, 0 for 4xx
                            const status = error?.response?.status;
                            if (status && status >= 500) {
                                return failureCount < 2;
                            }
                            if (status && status >= 400) {
                                return false;
                            }
                            // Retry network errors up to 2 times
                            return failureCount < 2;
                        },
                        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
                    },
                    mutations: {
                        onError: (error: any) => {
                            const message = error?.response?.data?.detail || 
                                           error?.message || 
                                           'An error occurred';
                            toast.error('Operation failed', { description: message });
                        },
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
