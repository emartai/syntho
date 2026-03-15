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