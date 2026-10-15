import { createContext, useContext, useState } from "react";
import { mockWatchlist } from "../data/mockMarket";

type MarketContextValue = {
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  watchlist: typeof mockWatchlist;
};

const MarketContext = createContext<MarketContextValue | undefined>(undefined);

/**
 * REMPLI LA BOITE ET DECIDE QUI A LE DROIT D'Y ACCEDER 
 * Contient le usestate et 'verse' ces donnee dans la boite MarketContext
 * Tout composant place a l'interieur de ses balisesa acces a la boite MarketContext (=children)
 */
export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [selectedSymbol, setSelectedSymbol] = useState(mockWatchlist[0].symbol);
  return (
    <MarketContext.Provider value={{selectedSymbol, setSelectedSymbol, watchlist: mockWatchlist}}>
        {children}
    </MarketContext.Provider>
  );
}

/**
 * Fonction utilitaire qui vient piocher dans la boite
 */
export function useMarket() {
  const context = useContext(MarketContext);
  if (context === undefined) {
    throw new Error("useMarket doit être utilisé à l'intérieur d'un <MarketProvider>");
  }
  return context;
}