import { useState } from "react";
import Button from "./Button";
import Input from "./Input";
import Label from "./Label";

// Reprend la forme du contrat d'API - permettra de brancher le backend.
//NE PAS CHANGER LES NOMS
type OrderSide = "buy" | "sell";
type OrderType = "market" | "limit";

type OrderFormState = {
  side: OrderSide; //"buy" | "sell"
  orderType: OrderType; // "market" | "limit"
  quantity: string;
  limitPrice: string;
  stopLoss: string;
  takeProfit: string;
};

/**
 * Formulaire de passage d'ordre (Buy/Sell, Market/Limits, SL/TP)
 * 
 * Pour le moment Phase2: Mock, ne fait que simuler l'envoi pour le moment
 * 
 * A BRANCHER sur AuthContext (pour le token) et le PortfolioContext
 * (pour ecrire un nouvel ordre) une fois aue ke Back Web exposera POST api/orders.
 * 
 */
function OrderTicket() {

  /**
   * UseState renvoie un epaire [valeur, fonction-pour-la-changer]
   * - form = objet actuel du formulaire (side, orderType, qunatity ...)
   * - setForm = la fonction fournie par React pour remplacer cet objet
   */
  const [form, setForm] = useState<OrderFormState>({
    side: "buy",
    orderType: "market",
    quantity: "",
    limitPrice: "",
    stopLoss: "",
    takeProfit: "",
  });

  /**
   * Appele quand l'utilisateur clique sur Buy ou Sell, change uniquement form.side
   * @param side 
   */
  function handleSideChange(side: OrderSide) {
    setForm({ ...form, side });
  }

  /**
   * Appel quand l'tiisateur clique sur Market ou Limit, change uniquement form.orderType
   * @param orderType
   */
  function handleTypeChange(orderType: OrderType) {
    setForm({ ...form, orderType });
  }

  // TODO : renvoie true seulement si le formulaire est valide (voir étape 5 du guide) :
  // - quantity > 0
  // - si orderType === "limit", limitPrice doit être rempli
  function isFormValid(): boolean {
    return false; // à remplacer
  }

  // TODO : construit l'objet au format du contrat d'API, génère un id/timestamp factices,
  // et (pour l'instant) logue-le dans la console — la vraie écriture dans PortfolioContext
  // viendra quand ce Context existera.
  function handleSubmit() {
    // ...
  }

  return (
    <div className="bg-[#050505] border border-[#1f1f1f] rounded-md p-5 flex flex-col gap-5">
      {/* ZONE 1 — En-tête : figé en dur pour l'instant, viendra de MarketContext */}
      <div className="flex items-baseline justify-between">
        <span className="text-gray-100 font-semibold">BTC / USDT</span>
        <span className="text-green-400 font-semibold">$64,250.32</span>
      </div>

      {/* ZONE 2 — Toggle Buy / Sell */}
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

      {/* ZONE 3 — Toggle Market / Limit */}
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

      {/* Zone 5 — Prix limite : TODO, n'afficher que si form.orderType === "limit" */}
      {/* {form.orderType === "limit" && ( ... )} */}

      {/* Zone 6 — Stop Loss / Take Profit */}
      {/* TODO : deux Input type="number", sur le même modèle que Quantité */}

      {/* Zone 7 — Résumé */}
      {/* TODO : calcule un coût estimé (quantity * prix courant ou limitPrice) */}

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