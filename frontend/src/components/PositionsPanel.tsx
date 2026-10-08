import { mockPortfolio } from "../data/mockPortfolio";
import { priceColors } from "../styles/tokens";

/**Affiche le Portefeuil
 * on parcourt le tableau de positions et on génère un bloc par position, avec key={position.symbol}
 */
function PositionsPanel() {
  return (
    <div className="bg-[#050505] border border-[#1f1f1f] rounded-md p-4 flex flex-col gap-3 h-full">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">Solde disponible</span>
        <span className="text-gray-100 font-semibold">
          ${mockPortfolio.balance.toLocaleString()}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {mockPortfolio.positions.map((position) => (
          <div
            key={position.symbol}
            className="flex justify-between items-center text-sm border-t border-[#1f1f1f] pt-2"
          >
            <div>
              <div className="text-gray-100">{position.symbol}</div>
              <div className="text-gray-500 text-xs">
                {position.quantity} @ ${position.entryPrice.toLocaleString()}
              </div>
            </div>
            <span className={position.unrealizedPnl >= 0 ? priceColors.up : priceColors.down}>
              {position.unrealizedPnl >= 0 ? "+" : ""}${position.unrealizedPnl.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PositionsPanel;