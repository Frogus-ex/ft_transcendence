import Watchlist from "../components/Watchlist";
import PriceChart from "../components/PriceChart";
import OrderTicket from "../components/OrderTicket";
import PositionsPanel from "../components/PositionsPanel";
import AnalyticsPanel from "../components/AnalyticsPanel";
import ExportPanel from "../components/ExportPanel";
import ImportPanel from "../components/ImportPanel";
import { MarketProvider } from "../context/MarketContext";
import { PortfolioProvider } from "../context/PortfolioContext";
import { useAuth } from "../context/AuthContext";

function MarketsPage() {
  const { user, isLoading } = useAuth();
  const isAuthenticated = !isLoading && !!user;

  if (!isAuthenticated) {
    return (
      <MarketProvider>
        <div className="p-3 sm:p-4 xl:p-6 flex-1 grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] gap-4">
          <div>
            <Watchlist />
          </div>
          <div className="h-full min-w-0">
            <PriceChart />
          </div>
        </div>
      </MarketProvider>
    );
  }

  return (
    <MarketProvider>
      <PortfolioProvider>
        {/* 1 column (< 768px), 2 columns (768-1279px), 3 columns (>= 1280px) */}
        <div className="p-3 sm:p-4 xl:p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[240px_minmax(0,1fr)_340px] gap-4">
          <div className="md:col-span-2 xl:col-span-1 xl:col-start-1 xl:row-start-1 xl:row-span-2">
            <Watchlist />
          </div>

          <div className="min-w-0 md:col-span-2 xl:col-span-1 xl:col-start-2 xl:row-start-1">
            <PriceChart />
          </div>

          <div className="xl:col-start-3 xl:row-start-1 xl:row-span-2">
            <OrderTicket />
          </div>

          <div className="xl:col-start-2 xl:row-start-2">
            <PositionsPanel />
          </div>

          <div className="md:col-span-2 xl:col-start-1 xl:col-span-2 xl:row-start-3">
            <AnalyticsPanel />
          </div>

          <div className="grid gap-4 md:col-span-2 md:grid-cols-2 xl:col-span-1 xl:col-start-3 xl:row-start-3 xl:grid-cols-1">
            <ExportPanel />
            <ImportPanel />
          </div>
        </div>
      </PortfolioProvider>
    </MarketProvider>
  );
}

export default MarketsPage;