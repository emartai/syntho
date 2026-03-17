import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;
  const returnTo = requestUrl.searchParams.get('returnTo') || '/dashboard';

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
      }
    } catch (err) {
      return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
    }
  }

  // Redirect to the originally requested page, or dashboard by default
  return NextResponse.redirect(`${origin}${returnTo}`);
}
