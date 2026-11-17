/** Shared Binance public REST client for the experiment scripts. */

const SYMBOL = "BTCUSDT";
const INTERVAL = "5m";
const ENDPOINTS = ["https://api.binance.com/api/v3/klines", "https://data-api.binance.vision/api/v3/klines"];

export type Candle = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
};

async function fetchPage(base: string, startTime: number, limit: number): Promise<any[][]> {
  const url = `${base}?symbol=${SYMBOL}&interval=${INTERVAL}&limit=${limit}&startTime=${startTime}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`klines request failed (${res.status}) at ${url}`);
  return res.json();
}

/**
 * Fetches 5-minute BTC/USDT candles from `startTime` forward (inclusive)
 * up to (and not including) `endTime`, paginating 1000/request with a
 * gentle delay between pages, falling back to data-api.binance.vision if
 * api.binance.com is unreachable.
 */
export async function fetchKlines(startTime: number, endTime: number, onPage?: (totalSoFar: number) => void): Promise<Candle[]> {
  const candles: Candle[] = [];
  let cursor = startTime;

  while (cursor < endTime) {
    let data: any[][] | null = null;
    let lastErr: Error | null = null;
    for (const ep of ENDPOINTS) {
      try {
        data = await fetchPage(ep, cursor, 1000);
        break;
      } catch (e) {
        lastErr = e as Error;
      }
    }
    if (!data) throw lastErr ?? new Error("All Binance endpoints failed.");
    if (data.length === 0) break;

    for (const k of data) {
      if (k[0] >= endTime) break;
      candles.push({
        openTime: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        closeTime: k[6],
      });
    }

    const last = data[data.length - 1];
    cursor = last[6] + 1;
    onPage?.(candles.length);

    if (data.length < 1000) break; // Binance had no more data
    await new Promise((r) => setTimeout(r, 200)); // gentle pacing
  }

  return candles;
}
