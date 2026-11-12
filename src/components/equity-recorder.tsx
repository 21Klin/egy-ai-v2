'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useWalletStore, computePositionPnl } from '@/lib/wallet-store';
import { useEquityStore } from '@/lib/equity-store';

/**
 * Mount this once near the root (inside DataProvider) so equity
 * gets recorded continuously regardless of which page the user
 * is viewing. It reads price from store.ts and balances/position
 * from wallet-store (the Firestore-backed source of truth) and
 * writes to the separate equity-store. It does not modify store.ts.
 */
export default function EquityRecorder() {
  const usdtBalance = useWalletStore((s) => s.usdtBalance);
  const btcBalance = useWalletStore((s) => s.btcBalance);
  const position = useWalletStore((s) => s.position);
  const loading = useWalletStore((s) => s.loading);
  const price = useStore((s) => s.price);
  const record = useEquityStore((s) => s.record);

  useEffect(() => {
    if (loading) return;
    const pnl = computePositionPnl(position, price);
    const total = usdtBalance + btcBalance * price + (position ? pnl : 0);
    if (total > 0) record(total);
  }, [usdtBalance, btcBalance, price, position, loading, record]);

  return null;
}
