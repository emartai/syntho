import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const FLUTTERWAVE_WEBHOOK_HASH = process.env.FLUTTERWAVE_WEBHOOK_HASH || '';
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.text();
    const signature = request.headers.get('verif-hash') || '';

    if (!FLUTTERWAVE_WEBHOOK_HASH) {
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const expectedHash = crypto
      .createHmac('sha256', FLUTTERWAVE_WEBHOOK_HASH)
      .update(body)
      .digest('hex');

    if (signature !== expectedHash) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(body) as { event: string; data?: { tx_ref?: string; transaction_reference?: string } };
    const event = payload.event;

    if (event === 'charge.completed' || event === 'payment.success') {
      const txRef = payload.data?.tx_ref || payload.data?.transaction_reference;

      if (txRef) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/v1/webhooks/flutterwave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event, tx_ref: txRef, data: payload.data }),
          });

          if (!response.ok) {
            // Backend forwarding failed — non-critical, return 200 to Flutterwave
          }
        } catch {
          // Network error — non-critical
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
