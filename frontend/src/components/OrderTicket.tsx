import { useState } from "react";
import Button from "./Button";
import Input from "./Input";
import Label from "./Label";

type OrderSide = "buy" | "sell";
type OrderType = "market" | "limit";

type OrderFormState = {
  side: OrderSide;
  orderType: OrderType;
  quantity: string;
  limitPrice: string;
  stopLoss: string;
  takeProfit: string;
};

// Mock : le vrai prix viendra de MarketContext (Phase 3). Une seule constante
// réutilisée en Zone 1 (affichage) et Zone 7 (calcul), pour ne pas avoir deux
// valeurs qui pourraient un jour se désynchroniser.
const currentPrice = 64250.32;

/**
 * OrderTicket — formulaire de passage d'ordre (Buy/Sell, Market/Limit, SL/TP).
 * Phase 2 : tout est en mock, form géré en local (Option A : un seul useState).
 */
function OrderTicket() {
  const [form, setForm] = useState<OrderFormState>({
    side: "buy",
    orderType: "market",
    quantity: "",
    limitPrice: "",
    stopLoss: "",
    takeProfit: "",
  });

  function handleSideChange(side: OrderSide) {
    setForm({ ...form, side });
  }

  function handleTypeChange(orderType: OrderType) {
    setForm({ ...form, orderType });
  }

  function isFormValid(): boolean {
    const quantityNumber = parseFloat(form.quantity);
    if (!quantityNumber || quantityNumber <= 0) return false;
    if (form.orderType === "limit" && !form.limitPrice) return false;
    return true;
  }

  function handleSubmit() {
    if (!isFormValid()) return;

    const order = {
      id: `mock_${Date.now()}`,
      symbol: "BTCUSDT",
      side: form.side,
      type: form.orderType,
      quantity: parseFloat(form.quantity),
      limitPrice: form.orderType === "limit" ? parseFloat(form.limitPrice) : undefined,
      stopLoss: form.stopLoss ? parseFloat(form.stopLoss) : undefined,
      takeProfit: form.takeProfit ? parseFloat(form.takeProfit) : undefined,
      status: "filled",
      timestamp: new Date().toISOString(),
    };

    console.log("Mock order submitted:", order);
  }

  const quantityNumber = parseFloat(form.quantity) || 0;
  const priceForCost =
    form.orderType === "limit" && form.limitPrice
      ? parseFloat(form.limitPrice)
      : currentPrice;
  const estimatedCost = quantityNumber * priceForCost;

  return (
    <div className="bg-[#050505] border border-[#1f1f1f] rounded-md p-5 flex flex-col gap-5">
      {/* Zone 1 — En-tête */}
      <div className="flex items-baseline justify-between">
        <span className="text-gray-100 font-semibold">BTC / USDT</span>
        <span className="text-green-400 font-semibold">
          ${currentPrice.toLocaleString()}
        </span>
      </div>

      {/* Zone 2 — Buy / Sell */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="primary"
          size="medium"
          type="button"
          icon={false}
          shape="square"
          onClick={() => handleSideChange("buy")}
        >
          Buy
        </Button>
        <Button
          variant={form.side === "sell" ? "danger" : "secondary"}
          size="medium"
          type="button"
          icon={false}
          shape="square"
          onClick={() => handleSideChange("sell")}
        >
          Sell
        </Button>
      </div>

      {/* Zone 3 — Market / Limit */}
      <div className="flex border border-gray-700 rounded-md w-fit">
        <button
          type="button"
          onClick={() => handleTypeChange("market")}
          className={
            "px-3 py-1 text-sm rounded-md " +
            (form.orderType === "market" ? "bg-gray-800 text-gray-100" : "text-gray-500")
          }
        >
          Market
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange("limit")}
          className={
            "px-3 py-1 text-sm rounded-md " +
            (form.orderType === "limit" ? "bg-gray-800 text-gray-100" : "text-gray-500")
          }
        >
          Limit
        </button>
      </div>

      {/* Zone 4 — Quantité */}
      <div className="flex flex-col gap-1">
        <Label htmlFor="qty">Quantité (BTC)</Label>
        <Input
          id="qty"
          type="number"
          size="medium"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
        />
      </div>

      {/* Zone 5 — Prix limite : uniquement si Limit est sélectionné */}
      {form.orderType === "limit" && (
        <div className="flex flex-col gap-1">
          <Label htmlFor="limitPrice">Prix limite</Label>
          <Input
            id="limitPrice"
            type="number"
            size="medium"
            value={form.limitPrice}
            onChange={(e) => setForm({ ...form, limitPrice: e.target.value })}
          />
        </div>
      )}

      {/* Zone 6 — Stop Loss / Take Profit */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="stopLoss">Stop Loss</Label>
          <Input
            id="stopLoss"
            type="number"
            size="medium"
            value={form.stopLoss}
            onChange={(e) => setForm({ ...form, stopLoss: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="takeProfit">Take Profit</Label>
          <Input
            id="takeProfit"
            type="number"
            size="medium"
            value={form.takeProfit}
            onChange={(e) => setForm({ ...form, takeProfit: e.target.value })}
          />
        </div>
      </div>

      {/* Zone 7 — Résumé */}
      <div className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between text-gray-400">
          <span>Coût estimé</span>
          <span className="text-gray-100">${estimatedCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>Solde disponible</span>
          <span className="text-gray-100">$12,500.00</span>
        </div>
      </div>

      {/* Zone 8 — Soumission */}
      <Button
        variant={form.side === "buy" ? "primary" : "danger"}
        size="large"
        type="button"
        icon={false}
        shape="square"
        onClick={handleSubmit}
      >
        {form.side === "buy" ? "Buy BTC" : "Sell BTC"}
      </Button>
    </div>
  );
}

export default OrderTicket;