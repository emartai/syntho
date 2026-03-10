import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { AuroraBackground } from '@/components/layout/AuroraBackground';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
    title: 'Syntho — Synthetic Data Marketplace',
    description:
        'Generate safe synthetic data at scale. Upload real datasets, generate privacy-safe synthetic versions, score privacy risk, and sell on the marketplace.',
    keywords: [
        'synthetic data',
        'data marketplace',
        'privacy',
        'GDPR',
        'HIPAA',
        'machine learning',
        'data generation',
    ],
    authors: [{ name: 'Syntho' }],
    openGraph: {
        title: 'Syntho — Synthetic Data Marketplace',
        description: 'Generate safe synthetic data at scale.',
        type: 'website',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
            <head>
                {/* Clash Display — Display headings */}
                <link
                    href="https://api.fontshare.com/v2/css?f[]=clash-display@600,700&display=swap"
                    rel="stylesheet"
                />
                {/* Satoshi — Body text */}
                <link
                    href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap"
                    rel="stylesheet"
                />
                {/* JetBrains Mono — Code / monospace */}
                <link
                    href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body className="font-body antialiased min-h-screen bg-bg text-text">
                <QueryProvider>
                    <AuthProvider>
                        <AuroraBackground />
                        <div className="relative z-10">{children}</div>
                        <Toaster
                            position="bottom-right"
                            toastOptions={{
                                style: {
                                    background: 'var(--bg-elevated)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text)',
                                    fontFamily: 'Satoshi, sans-serif',
                                },
                            }}
                            richColors
                            closeButton
                        />
                    </AuthProvider>
                </QueryProvider>
            </body>
        </html>
    );
}
