import { useState } from "react";
import { mockWatchlist } from "../data/mockMarket";
import { priceColors } from "../styles/tokens";

/**
 * Watchlist — liste des actifs disponibles, avec sélection.
 * Phase 2 : données mock (mockMarket.ts). Le prix/variation viendront
 * de MarketContext plus tard.
 */
function Watchlist() {
  const [selectedSymbol, setSelectedSymbol] = useState(mockWatchlist[0].symbol);

  return (
    <div className="bg-[#050505] border border-[#1f1f1f] rounded-md p-4 flex flex-col gap-2">
      <span className="text-gray-500 text-xs uppercase tracking-wide mb-1">
        Watchlist
      </span>
      {mockWatchlist.map((asset) => (
        <button
          key={asset.symbol}
          type="button"
          onClick={() => setSelectedSymbol(asset.symbol)}
          className={
            "flex justify-between items-center px-3 py-2 rounded-md text-sm " +
            (asset.symbol === selectedSymbol
              ? "bg-gray-800 text-gray-100"
              : "text-gray-400")
          }
        >
          <span>{asset.name}</span>
          <span className={asset.change24h >= 0 ? priceColors.up : priceColors.down}>
            {asset.lastPrice.toLocaleString()}
          </span>
        </button>
      ))}
    </div>
  );
}

export default Watchlist;