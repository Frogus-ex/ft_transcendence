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
  time: number; // timestamp Unix, en secondes
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

    candles.push({ time: now - i * stepSeconds, open, high, low, close });
    price = close;
  }

  return candles;
}