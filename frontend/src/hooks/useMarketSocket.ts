import { useEffect, useRef } from "react";

export type MarketTick = {
  symbol: string;
  price: number;
  quantity: number;
  timestamp: string;
};

const THROTTLE_MS = 250;

// Ouvre un WebSocket vers /ws/markets/{symbol} et appelle onTick à chaque message,
// throttlé à au plus 1 appel par THROTTLE_MS (garde toujours la dernière valeur reçue,
// pour ne pas perdre le prix final même si plusieurs ticks arrivent entre deux appels).
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
        // message non-JSON ignoré
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
      ws.close();
    };
  }, [symbol]);
}