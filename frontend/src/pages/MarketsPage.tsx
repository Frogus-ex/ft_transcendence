import Watchlist from "../components/Watchlist";
import PriceChart from "../components/PriceChart";
import OrderTicket from "../components/OrderTicket";
import PositionsPanel from "../components/PositionsPanel";
import AnalyticsPanel from "../components/AnalyticsPanel";
import ExportPanel from "../components/ExportPanel";

function MarketsPage() {
  return (
    <div className="p-6 grid grid-cols-[240px_1fr_340px] gap-4">
      <div className="col-start-1 row-start-1 row-span-2">
        <Watchlist />
      </div>

      <div className="col-start-2 row-start-1">
        <PriceChart />
      </div>

      <div className="col-start-3 row-start-1 row-span-2">
        <OrderTicket />
      </div>

      <div className="col-start-2 row-start-2">
        <PositionsPanel />
      </div>

      <div className="col-start-1 col-span-2 row-start-3">
        <AnalyticsPanel />
      </div>

      <div className="col-start-3 row-start-3">
        <ExportPanel />
      </div>
    </div>
  );
}

export default MarketsPage;