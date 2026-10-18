import type { UTCTimestamp } from "lightweight-charts";

export type WatchlistAsset = {
  symbol: string;
  name: string;
  lastPrice: number;
  change24h: number;
};

export const mockWatchlist: WatchlistAsset[] = [
  { symbol: "BTCUSDT", name: "Bitcoin", lastPrice: 64250.32, change24h: 2.14 },
  { symbol: "ETHUSDT", name: "Ethereum", lastPrice: 3180.55, change24h: -0.87 },
  { symbol: "SOLUSDT", name: "Solana", lastPrice: 142.1, change24h: 4.02 },
];

export type Candle = {
  time: UTCTimestamp; // timestamp Unix, en secondes
  open: number;
  high: number;
  low: number;
  close: number;
};

// Génère une série de bougies factices en "marche aléatoire" à partir d'un prix de départ.
export function generateMockCandles(
  count: number,
  basePrice: number,
  stepSeconds: number
): Candle[] {
  const candles: Candle[] = [];
  let price = basePrice;
  const now = Math.floor(Date.now() / 1000);

  for (let i = count; i > 0; i--) {
    const open = price;
    const change = (Math.random() - 0.5) * basePrice * 0.01;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * basePrice * 0.003;
    const low = Math.min(open, close) - Math.random() * basePrice * 0.003;

    candles.push({ time: (now - i * stepSeconds) as UTCTimestamp, open, high, low, close });
    price = close;
  }

  return candles;
}

// Forme brute telle que renvoyée par GET /api/markets/{symbol}/candles
export type ApiCandle = {
  symbol: string;
  interval: string;
  time: string;   // ISO, ex: "2026-10-15T19:07:00+00:00"
  open: string;    // nombre en chaîne
  high: string;
  low: string;
  close: string;
  volume: string;
};

// Convertit une bougie brute de l'API vers le format attendu par lightweight-charts
export function mapApiCandleToCandle(raw: ApiCandle): Candle {
  return {
    time: Math.floor(new Date(raw.time).getTime() / 1000) as UTCTimestamp,
    open: parseFloat(raw.open),
    high: parseFloat(raw.high),
    low: parseFloat(raw.low),
    close: parseFloat(raw.close),
  };
}