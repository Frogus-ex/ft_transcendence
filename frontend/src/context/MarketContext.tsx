import { createContext, useContext, useState, useEffect } from "react";
import { apiFetch } from "../api/client";
import { symbolNames } from "../data/symbolNames";

export type WatchlistAsset = {
	symbol: string;
	name: string;
	lastPrice: number;
	change24h: number;
};

// Forme brute renvoyée par GET /api/markets (pas de "name")
type ApiWatchlistAsset = {
	symbol: string;
	lastPrice: number;
	change24h: number;
};

type MarketContextValue = {
	selectedSymbol: string;
	setSelectedSymbol: (symbol: string) => void;
	watchlist: WatchlistAsset[];
	isLoading: boolean;
};

const MarketContext = createContext<MarketContextValue | undefined>(undefined);

export function MarketProvider({ children }: { children: React.ReactNode }) {
	const [watchlist, setWatchlist] = useState<WatchlistAsset[]>([]);
	const [selectedSymbol, setSelectedSymbol] = useState<string>("");
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		async function loadWatchlist() {
			const data = await apiFetch<ApiWatchlistAsset[]>("/markets");
			const enrichedWatchlist: WatchlistAsset[] = data.map((asset) => ({
			...asset,
			name: symbolNames[asset.symbol] ?? asset.symbol,
		}));
		setWatchlist(enrichedWatchlist);
		if (enrichedWatchlist.length > 0){
			setSelectedSymbol(enrichedWatchlist[0].symbol);
		}
		setIsLoading(false);
		}
		loadWatchlist();
	}, []);

	return (
	<MarketContext.Provider value={{ selectedSymbol, setSelectedSymbol, watchlist, isLoading }}>
		{children}
	</MarketContext.Provider>
	);
}

export function useMarket() {
	const context = useContext(MarketContext);
	if (context === undefined) {
		throw new Error("useMarket doit être utilisé à l'intérieur d'un <MarketProvider>");
	}
	return context;
}