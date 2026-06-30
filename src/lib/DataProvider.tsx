'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useStore } from '@/lib/store';

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';
const BINANCE_HTTP_URL = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=500';

export default function DataProvider({ children }: { children: ReactNode }) {
  const setPrice = useStore((s) => s.setPrice);
  const setDepthData = useStore((s) => s.setDepthData);
  const setSparklineData = useStore((s) => s.setSparklineData);
  const addTrade = useStore((s) => s.addTrade);
  const setVolume24h = useStore((s) => s.setVolume24h);
  const setPriceChangePercent = useStore((s) => s.setPriceChangePercent);
  const setLatency = useStore((s) => s.setLatency);
  const setInitialKlines = useStore((s) => s.setInitialKlines);
  const addKline = useStore((s) => s.addKline);

  const lastPingTime = useRef<number>(Date.now());

  useEffect(() => {
    const seedKlines = async () => {
      try {
        const res = await fetch(BINANCE_HTTP_URL);
        if (!res.ok) return;
        const data = await res.json();
        const mapped = data.map((k: any[]) => ({
          time: k[0] / 1000,
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
          isFinal: true,
        }));
        setInitialKlines(mapped);
        mapped.forEach((c: any) => setSparklineData({ time: c.time, value: c.close }));
      } catch (err) {
        console.error('Error seeding klines from Binance:', err);
      }
    };
    seedKlines();

    const tradeSocket = new WebSocket(`${BINANCE_WS_URL}/btcusdt@trade`);
    tradeSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data && data.p) {
        const price = parseFloat(data.p);
        setPrice(price);
        addTrade({ price, quantity: parseFloat(data.q), time: data.T, isMaker: data.m });
        const now = Date.now();
        setLatency(now - lastPingTime.current);
        lastPingTime.current = now;
      }
    };

    const depthSocket = new WebSocket(`${BINANCE_WS_URL}/btcusdt@depth20@100ms`);
    depthSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setDepthData({ bids: data.bids || [], asks: data.asks || [] });
    };

    const statsSocket = new WebSocket(`${BINANCE_WS_URL}/btcusdt@ticker`);
    statsSocket.onmessage = (event) => {
      const d = JSON.parse(event.data);
      setVolume24h(Number(d.v));
      setPriceChangePercent(Number(d.P));
    };

    const klineSocket = new WebSocket(`${BINANCE_WS_URL}/btcusdt@kline_1m`);
    klineSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data && data.k) {
        const k = data.k;
        const timeSec = k.t / 1000;
        const close = parseFloat(k.c);
        setSparklineData({ time: timeSec, value: close });
        addKline({
          time: timeSec,
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close,
          volume: parseFloat(k.v),
          isFinal: k.x,
        });
      }
    };

    return () => {
      tradeSocket.close();
      depthSocket.close();
      statsSocket.close();
      klineSocket.close();
    };
  }, [setPrice, setDepthData, setSparklineData, addTrade, setVolume24h, setPriceChangePercent, setLatency, setInitialKlines, addKline]);

  return <>{children}</>;
}
