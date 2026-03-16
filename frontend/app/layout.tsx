import './fonts.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { AuroraBackground } from '@/components/layout/AuroraBackground';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://syntho.vercel.app'),
    title: {
        default: 'Syntho — Synthetic Data Marketplace',
        template: '%s | Syntho',
    },
    description:
        'Generate safe synthetic data, score privacy risk, and monetize your datasets. Upload real data, create privacy-safe synthetic versions, and sell on the marketplace.',
    keywords: [
        'synthetic data',
        'data marketplace',
        'privacy',
        'GDPR',
        'HIPAA',
        'machine learning',
        'data generation',
        'CTGAN',
        'SDV',
        'data privacy',
    ],
    authors: [{ name: 'Syntho' }],
    creator: 'Syntho',
    publisher: 'Syntho',
    robots: {
        index: true,
        follow: true,
    },
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://syntho.app',
        siteName: 'Syntho',
        title: 'Syntho — Synthetic Data Marketplace',
        description: 'Generate safe synthetic data, score privacy risk, and monetize your datasets.',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'Syntho — Synthetic Data Marketplace',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Syntho — Synthetic Data Marketplace',
        description: 'Generate safe synthetic data, score privacy risk, and monetize your datasets.',
        images: ['/og-image.png'],
        creator: '@syntho',
    },
    icons: {
        icon: '/favicon.ico',
        shortcut: '/favicon-16x16.png',
        apple: '/apple-touch-icon.png',
    },
    manifest: '/site.webmanifest',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark scroll-smooth" suppressHydrationWarning>
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
