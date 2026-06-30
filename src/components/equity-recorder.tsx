'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useEquityStore } from '@/lib/equity-store';

/**
 * Mount this once near the root (inside DataProvider) so equity
 * gets recorded continuously regardless of which page the user
 * is viewing. It only reads from the existing store — usdtBalance,
 * btcBalance, price, position pnl — and writes to the separate
 * equity-store. It does not modify store.ts.
 */
export default function EquityRecorder() {
  const usdtBalance = useStore((s) => s.usdtBalance);
  const btcBalance = useStore((s) => s.btcBalance);
  const price = useStore((s) => s.price);
  const pnl = useStore((s) => s.pnl);
  const position = useStore((s) => s.position);
  const record = useEquityStore((s) => s.record);

  useEffect(() => {
    const total = usdtBalance + btcBalance * price + (position ? pnl : 0);
    if (total > 0) record(total);
  }, [usdtBalance, btcBalance, price, pnl, position, record]);

  return null;
}
