import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, plan } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Upsert into waitlist table
    const { error } = await supabase
      .from('waitlist')
      .upsert(
        {
          email,
          plan: plan || 'Pro',
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'email',
        }
      );

    if (error) {
      return NextResponse.json(
        { error: 'Failed to join waitlist' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
