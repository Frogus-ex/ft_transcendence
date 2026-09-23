import OrderTicket from "../components/OrderTicket";
import Watchlist from "../components/Watchlist";
import PriceChart from "../components/PriceChart";

function MarketsPage() {
  return (
    <div className="p-6 grid grid-cols-[240px_1fr_340px] gap-4">
      {/* Watchlist — occupe les lignes 1 et 2, colonne 1 */}
	  {/* ✅ seulement le positionnement dans la grille */}
	  <div className="col-start-1 row-start-1 row-span-2">
  		<Watchlist />
	  </div>

      {/* Chart + Timeframe — ligne 1, colonne 2 */}
      <div className="col-start-2 row-start-1">
        <PriceChart />
      </div>


      {/* Order Ticket — occupe les lignes 1 et 2, colonne 3 */}
      <div className="col-start-3 row-start-1 row-span-2">
        <OrderTicket />
      </div>

      {/* Positions / Portefeuille — ligne 2, colonne 2 */}
      <div className="col-start-2 row-start-2 flex items-center justify-center min-h-[120px] border border-dashed border-gray-700 rounded-md text-gray-500 text-sm">
        Positions / Portefeuille
      </div>

      {/* Analytics / PnL — ligne 3, colonnes 1-2 */}
      <div className="col-start-1 col-span-2 row-start-3 flex items-center justify-center min-h-[120px] border border-dashed border-gray-700 rounded-md text-gray-500 text-sm">
        Analytics / PnL
      </div>

      {/* Export & GDPR — ligne 3, colonne 3 */}
      <div className="col-start-3 row-start-3 flex items-center justify-center min-h-[120px] border border-dashed border-gray-700 rounded-md text-gray-500 text-sm">
        Export & GDPR
      </div>
    </div>
  );
}

export default MarketsPage;