import { useState } from "react";
import Button from "./Button";
import Input from "./Input";
import Label from "./Label";
import Alert from "./Alert";
import { useMarket } from "../context/MarketContext";
import { usePortfolio } from "../context/PortfolioContext";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../api/client";

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
type NumericField = "quantity" | "limitPrice" | "stopLoss" | "takeProfit";

// Keys that make a number input accept signs or exponents: refused while typing.
function blockInvalidKeys(event: React.KeyboardEvent<HTMLInputElement>) {
  if (["-", "+", "e", "E"].includes(event.key)) event.preventDefault();
}

function OrderTicket() {
  const { selectedSymbol, watchlist } = useMarket();
  const selectAsset = watchlist.find((asset) => asset.symbol === selectedSymbol);
  const { balance, refresh } = usePortfolio();
  const { token } = useAuth();
  const [form, setForm] = useState<OrderFormState>({
    side: "buy",
    orderType: "market",
    quantity: "",
    limitPrice: "",
    stopLoss: "",
    takeProfit: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  function handleSideChange(side: OrderSide) {
    setForm({ ...form, side });
  }

  function handleTypeChange(orderType: OrderType) {
    setForm({ ...form, orderType });
  }

  // Refuses negative values, including pasted ones ("-8"), which the keyboard filter cannot see.
  function handleNumberChange(field: NumericField) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      if (value.startsWith("-")) return;
      setForm({ ...form, [field]: value });
    };
  }

  function isFormValid(): boolean {
    const quantityNumber = parseFloat(form.quantity);
    if (!Number.isFinite(quantityNumber) || quantityNumber <= 0) return false;
    if (form.orderType === "limit") {
      const limitPriceNumber = parseFloat(form.limitPrice);
      if (!Number.isFinite(limitPriceNumber) || limitPriceNumber <= 0) return false;
    }
    const price =
      form.orderType === "limit" && form.limitPrice
        ? parseFloat(form.limitPrice)
        : selectAsset?.lastPrice ?? 0;
    if (form.side === "buy" && quantityNumber * price > balance) return false;
    return true;
  }

  async function handleSubmit() {
    if (!isFormValid() || !token) return;

    if (form.orderType === "limit") {
      setConfirmation(null);
      setError("Les ordres Limit ne sont pas encore exécutés, seul Market fonctionne pour l'instant.");
      return;
    }

    setError(null);
    setConfirmation(null);
    setIsSubmitting(true);
    try {
      const filledOrder = await apiFetch<{ price: number }>("/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          symbol: selectedSymbol,
          side: form.side,
          type: "market",
          quantity: parseFloat(form.quantity),
        }),
      });
      await refresh();
      setConfirmation(
        `${form.side === "buy" ? "Achat" : "Vente"} exécuté(e) : ${form.quantity} ${selectedSymbol} à $${Number(
          filledOrder.price
        ).toLocaleString()}`
      );
      setForm({ ...form, quantity: "" });
      window.setTimeout(() => setConfirmation(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'ordre.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const quantityNumber = parseFloat(form.quantity) || 0;
  const priceForCost =
    form.orderType === "limit" && form.limitPrice
      ? parseFloat(form.limitPrice)
      : selectAsset?.lastPrice ?? 0;
  const estimatedCost = quantityNumber * priceForCost;

  return (
    <div className="bg-[#050505] border border-[#1f1f1f] rounded-md p-5 flex flex-col gap-5">
      {/* Zone 1 — En-tête */}
      <div className="flex items-baseline justify-between">
        <span className="text-gray-100 font-semibold">{selectAsset?.name}</span>
        <span className="text-green-400 font-semibold">
            ${(selectAsset?.lastPrice ?? 0).toLocaleString("fr-FR")}
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
        <Label htmlFor="qty">Quantité ({selectedSymbol})</Label>
        <Input
          id="qty"
          type="number"
          size="medium"
          min="0"
          step="any"
          value={form.quantity}
          onKeyDown={blockInvalidKeys}
          onChange={handleNumberChange("quantity")}
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
            min="0"
            step="any"
            value={form.limitPrice}
            onKeyDown={blockInvalidKeys}
            onChange={handleNumberChange("limitPrice")}
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
            min="0"
            step="any"
            value={form.stopLoss}
            onKeyDown={blockInvalidKeys}
            onChange={handleNumberChange("stopLoss")}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="takeProfit">Take Profit</Label>
          <Input
            id="takeProfit"
            type="number"
            size="medium"
            min="0"
            step="any"
            value={form.takeProfit}
            onKeyDown={blockInvalidKeys}
            onChange={handleNumberChange("takeProfit")}
          />
        </div>
      </div>

      {/* Zone 7 — Résumé */}
      <div className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between text-gray-400">
          <span>Coût estimé</span>
          <span className="text-gray-100">${estimatedCost.toFixed(2)}</span>
        </div>
        {form.side === "buy" && estimatedCost > balance && (
          <p className="text-red-400 text-sm">Solde insuffisant</p>
        )}
        <div className="flex justify-between text-gray-400">
          <span>Solde disponible</span>
          <span className="text-gray-100">${balance.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Zone 8 — Soumission */}
      <Button
        variant={form.side === "buy" ? "primary" : "danger"}
        size="large"
        type="button"
        icon={false}
        shape="square"
        disabled={isSubmitting || !token || !isFormValid()}
        onClick={handleSubmit}
      >
        {isSubmitting ? "..." : form.side === "buy" ? `Buy ${selectedSymbol}` : `Sell ${selectedSymbol}`}
      </Button>
    </div>
  );
}

export default OrderTicket;