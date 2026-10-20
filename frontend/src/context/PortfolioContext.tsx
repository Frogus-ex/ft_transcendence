import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { apiFetch } from "../api/client";
import { useAuth } from "./AuthContext";
import { useMarket } from "./MarketContext";

export type RawPosition = {
  symbol: string;
  quantity: number;
  entryPrice: number;
};

export type Position = RawPosition & {
  currentValue: number;
  unrealizedPnl: number;
};

export type Order = {
  id: number;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  realized_pnl: number | null;
  status: string;
  created_at: string;
};

type ApiPortfolio = {
  id: number;
  user_id: number;
  balance: number;
  positions: RawPosition[];
};

type PortfolioContextValue = {
  balance: number;
  equity: number;
  positions: Position[];
  orders: Order[];
  stats: {
    realizedPnl: number;
    unrealizedPnl: number;
    winRate: number;
    totalTrades: number;
  };
  isLoading: boolean;
  refresh: () => Promise<void>;
};

const PortfolioContext = createContext<PortfolioContextValue | undefined>(undefined);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const { watchlist } = useMarket();
  const [rawPortfolio, setRawPortfolio] = useState<ApiPortfolio | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
    if (!token) {
      setRawPortfolio(null);
      setOrders([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [portfolioData, ordersData] = await Promise.all([
        apiFetch<ApiPortfolio>("/portfolio", { headers: { Authorization: `Bearer ${token}` } }),
        apiFetch<Order[]>("/orders", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      // Les champs Decimal (balance, quantity, price, realized_pnl) arrivent en
      // string depuis le backend (Pydantic sérialise Decimal en texte pour
      // préserver la précision) : on les convertit explicitement en number ici.
      setRawPortfolio({ ...portfolioData, balance: Number(portfolioData.balance) });
      setOrders(
        ordersData.map((o) => ({
          ...o,
          quantity: Number(o.quantity),
          price: Number(o.price),
          realized_pnl: o.realized_pnl !== null ? Number(o.realized_pnl) : null,
        }))
      );
    } catch {
      setRawPortfolio(null);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const positions: Position[] = useMemo(() => {
    const rawPositions = rawPortfolio?.positions ?? [];
    return rawPositions.map((p) => {
      const livePrice = watchlist.find((a) => a.symbol === p.symbol)?.lastPrice ?? p.entryPrice;
      const currentValue = p.quantity * livePrice;
      const unrealizedPnl = (livePrice - p.entryPrice) * p.quantity;
      return { ...p, currentValue, unrealizedPnl };
    });
  }, [rawPortfolio, watchlist]);

  const balance = rawPortfolio?.balance ?? 0;
  const equity = balance + positions.reduce((sum, p) => sum + p.currentValue, 0);

  const stats = useMemo(() => {
    const sells = orders.filter((o) => o.side === "sell" && o.realized_pnl !== null);
    const realizedPnl = sells.reduce((sum, o) => sum + (o.realized_pnl ?? 0), 0);
    const unrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    const winRate = sells.length > 0 ? sells.filter((o) => (o.realized_pnl ?? 0) > 0).length / sells.length : 0;
    return { realizedPnl, unrealizedPnl, winRate, totalTrades: orders.length };
  }, [orders, positions]);

  return (
    <PortfolioContext.Provider value={{ balance, equity, positions, orders, stats, isLoading, refresh }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error("usePortfolio doit etre utilise a l'interieur d'un <PortfolioProvider>");
  }
  return context;
}