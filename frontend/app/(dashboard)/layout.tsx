import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { AuroraBackground } from '@/components/layout/AuroraBackground';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { OfflineBanner } from '@/components/shared/OfflineBanner';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <QueryProvider>
      <AuthProvider>
        <div className="relative min-h-screen bg-[#05030f]">
          <AuroraBackground />
          <div className="relative z-10 flex">
            <Sidebar />
            <div className="flex-1 ml-20 md:ml-56">
              <OfflineBanner />
              <Navbar />
              <main className="p-4 md:p-6 pt-16 md:pt-6">{children}</main>
            </div>
          </div>
        </div>
      </AuthProvider>
    </QueryProvider>
  );
}
