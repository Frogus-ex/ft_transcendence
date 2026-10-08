//forme exacte de chaque donnee contrat API
export type Position = {
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentValue: number;
  unrealizedPnl: number;
};

export type Order = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  quantity: number;
  price: number;
  status: "filled" | "cancelled" | "pending";
  timestamp: string;
};

/**objet avec le solde == balance et le tableau de position */
export const mockPortfolio = {
  balance: 12500.0,
  equity: 13120.45,
  positions: [
    { symbol: "BTCUSDT", quantity: 0.18, entryPrice: 61200, currentValue: 11565, unrealizedPnl: 297.4 },
    { symbol: "ETHUSDT", quantity: 1.2, entryPrice: 3050, currentValue: 3816, unrealizedPnl: 156.2 },
  ] as Position[],
}; //le as Position sert a preciser que le tableau position contient des elements de type Positions

export const mockOrders: Order[] = [
  { id: "ord_1", symbol: "BTCUSDT", side: "buy", type: "market", quantity: 0.18, price: 61200, status: "filled", timestamp: "2026-10-01T14:22:00Z" },
  { id: "ord_2", symbol: "ETHUSDT", side: "sell", type: "limit", quantity: 0.5, price: 3200, status: "cancelled", timestamp: "2026-10-05T09:05:00Z" },
];

export const mockStats = {
  realizedPnl: 842.1,
  unrealizedPnl: 453.6,
  winRate: 0.63,
  totalTrades: 27,
};