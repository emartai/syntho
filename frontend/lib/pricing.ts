export type Currency = 'NGN' | 'USD';

export const PRICING = {
  NGN: {
    symbol: '₦',
    pro_monthly: 5000,
    pro_display: '₦5,000/month',
    payg: 500,
    payg_display: '₦500/job',
  },
  USD: {
    symbol: '$',
    pro_monthly: 5,
    pro_display: '$5/month',
    payg: 0.50,
    payg_display: '$0.50/job',
  },
};

export function detectCurrency(): Currency {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return tz === 'Africa/Lagos' ? 'NGN' : 'USD';
}