import { useEffect, useRef } from "react";

export type MarketTick = {
  symbol: string;
  price: number;
  quantity: number;
  timestamp: string;
};

const THROTTLE_MS = 250;

// Opens a WebSocket on /ws/markets/{symbol} and calls onTick for each message,
// throttled to one call per THROTTLE_MS (the latest value is always delivered).
export function useMarketSocket(symbol: string | undefined, onTick: (tick: MarketTick) => void) {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!symbol) return;

    let lastCallTime = 0;
    let pendingTick: MarketTick | null = null;
    let pendingTimeout: ReturnType<typeof setTimeout> | null = null;

    function flush() {
      if (!pendingTick) return;
      lastCallTime = Date.now();
      onTickRef.current(pendingTick);
      pendingTick = null;
      pendingTimeout = null;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/markets/${symbol}`);

    ws.onmessage = (event) => {
      let data: MarketTick;
      try {
        data = JSON.parse(event.data) as MarketTick;
      } catch {
        return;
      }

      pendingTick = data;
      const elapsed = Date.now() - lastCallTime;

      if (elapsed >= THROTTLE_MS) {
        flush();
      } else if (!pendingTimeout) {
        pendingTimeout = setTimeout(flush, THROTTLE_MS - elapsed);
      }
    };

    return () => {
      if (pendingTimeout) clearTimeout(pendingTimeout);
      ws.onmessage = null;
      // Closing a socket that is still connecting makes the browser log a warning,
      // so wait for it to open before closing it.
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => ws.close();
      } else {
        ws.close();
      }
    };
  }, [symbol]);
}