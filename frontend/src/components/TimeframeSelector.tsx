type Timeframe = "1m" | "5m" | "1h" | "1D";

type TimeframeSelectorProps = {
  value: Timeframe;
  onChange: (value: Timeframe) => void;
};

const timeframes: Timeframe[] = ["1m", "5m", "1h", "1D"];

/**
 * TimeframeSelector — "composant contrôlé" : il ne gère aucun state à lui,
 * il affiche `value` et prévient le parent via `onChange` quand ça change.
 * Nécessaire ici parce que c'est PriceChart (le parent) qui doit savoir
 * quel timeframe est actif pour régénérer les bonnes bougies.
 */
function TimeframeSelector({ value, onChange }: TimeframeSelectorProps) {
  return (
    <div className="flex border border-gray-700 rounded-md w-fit">
      {timeframes.map((tf) => (
        <button
          key={tf}
          type="button"
          onClick={() => onChange(tf)}
          className={
            "px-3 py-1 text-sm rounded-md " +
            (tf === value ? "bg-gray-800 text-gray-100" : "text-gray-500")
          }
        >
          {tf}
        </button>
      ))}
    </div>
  );
}

export default TimeframeSelector;