import { mockStats } from "../data/mockPortfolio";

function AnalyticsPanel() {
  return (
    <div className="bg-[#050505] border border-[#1f1f1f] rounded-md p-4 flex flex-col gap-3 h-full">
      <span className="text-gray-500 text-xs uppercase tracking-wide">Analytics / PnL</span>
      <div className="grid grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-gray-500 text-xs">Realized PnL</div>
          <div className="text-green-400 font-semibold">${mockStats.realizedPnl.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">Unrealized PnL</div>
          <div className="text-green-400 font-semibold">${mockStats.unrealizedPnl.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">Win rate</div>
          <div className="text-gray-100 font-semibold">{(mockStats.winRate * 100).toFixed(0)}%</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">Total trades</div>
          <div className="text-gray-100 font-semibold">{mockStats.totalTrades}</div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPanel;	