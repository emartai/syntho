export function generateTxRef(userId: string, listingId: string): string {
  return `SYNTHO-${userId}-${listingId}-${Date.now()}`;
}

export function parseTxRef(txRef: string): {
  userId: string;
  listingId: string;
  timestamp: number;
} | null {
  const parts = txRef.split('-');
  if (parts.length !== 5 || parts[0] !== 'SYNTHO') {
    return null;
  }
  return {
    userId: parts[1],
    listingId: parts[2],
    timestamp: parseInt(parts[3], 10),
  };
}

export function isValidTxRef(txRef: string): boolean {
  return parseTxRef(txRef) !== null;
}

declare global {
  interface Window {
    FlutterwaveCheckout?: (options: FlutterwaveCheckoutOptions) => void;
  }
}

interface FlutterwaveCheckoutCustomer {
  email: string;
  name?: string;
}

interface FlutterwaveCheckoutOptions {
  public_key: string;
  tx_ref: string;
  amount: number;
  currency: string;
  payment_options?: string;
  customer: FlutterwaveCheckoutCustomer;
  customizations?: {
    title?: string;
    description?: string;
    logo?: string;
  };
  callback: (response: Record<string, any>) => void;
  onclose?: () => void;
  split?: {
    subaccounts: Array<{
      id: string;
      transaction_charge_type: 'flat' | 'percentage';
      transaction_charge: number;
    }>;
  };
}

const FLUTTERWAVE_SCRIPT_SRC = 'https://checkout.flutterwave.com/v3.js';

function loadFlutterwaveScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Flutterwave checkout is only available in the browser.'));
  }

  if (window.FlutterwaveCheckout) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${FLUTTERWAVE_SCRIPT_SRC}"]`
    );

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Flutterwave checkout script.')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = FLUTTERWAVE_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Flutterwave checkout script.'));
    document.body.appendChild(script);
  });
}

export async function openFlutterwaveCheckout(options: FlutterwaveCheckoutOptions): Promise<void> {
  await loadFlutterwaveScript();

  if (!window.FlutterwaveCheckout) {
    throw new Error('Flutterwave checkout is unavailable.');
  }

  window.FlutterwaveCheckout(options);
}
