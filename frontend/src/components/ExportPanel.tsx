import { useState } from "react";
import Button from "./Button";
import DateRangeFilter from "./DateRangeFilter";
import { apiDownload } from "../api/client";
import { useMarket } from "../context/MarketContext";

type ExportFormat = "csv" | "json" | "xml";
type ExportInterval = "1m" | "5m" | "1h" | "1d" | "1w";

const intervals: ExportInterval[] = ["1m", "5m", "1h", "1d", "1w"];

function ExportPanel() {
  const { selectedSymbol, watchlist } = useMarket();
  const [symbol, setSymbol] = useState(selectedSymbol);
  const [interval, setInterval] = useState<ExportInterval>("1h");
  const [limit, setLimit] = useState(100);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeSymbol = symbol || selectedSymbol;

  async function handleExport(format: ExportFormat) {
    if (!activeSymbol) return;

    setError(null);
    setIsExporting(format);
    try {
      const params = new URLSearchParams({
        symbol: activeSymbol,
        format,
        interval,
        limit: String(limit),
      });
      if (startDate) params.set("start", startDate);
      if (endDate) params.set("end", endDate);

      await apiDownload(`/export?${params.toString()}`, `${activeSymbol}.${format}`);
    } catch {
      setError("Échec de l'export, réessaie.");
    } finally {
      setIsExporting(null);
    }
  }

  return (
    <div className="bg-[#050505] border border-[#1f1f1f] rounded-md p-4 flex flex-col gap-2 h-full">
      <span className="text-gray-500 text-xs uppercase tracking-wide mb-1">Export</span>

      <select
        value={activeSymbol}
        onChange={(e) => setSymbol(e.target.value)}
        className="bg-black border border-gray-700 rounded-md text-sm text-gray-200 px-2 py-1"
      >
        {watchlist.map((asset) => (
          <option key={asset.symbol} value={asset.symbol}>
            {asset.symbol}
          </option>
        ))}
      </select>

      <select
        value={interval}
        onChange={(e) => setInterval(e.target.value as ExportInterval)}
        className="bg-black border border-gray-700 rounded-md text-sm text-gray-200 px-2 py-1"
      >
        {intervals.map((tf) => (
          <option key={tf} value={tf}>
            {tf}
          </option>
        ))}
      </select>

      <input
        type="number"
        min={1}
        max={1000}
        value={limit}
        onChange={(e) => setLimit(Number(e.target.value))}
        className="bg-black border border-gray-700 rounded-md text-sm text-gray-200 px-2 py-1"
      />

      <DateRangeFilter start={startDate} end={endDate} onChangeStart={setStartDate} onChangeEnd={setEndDate} />

      <Button variant="secondary" size="small" type="button" icon={false} shape="square" disabled={!activeSymbol || isExporting === "csv"} onClick={() => handleExport("csv")}>
        {isExporting === "csv" ? "Export..." : "Export CSV"}
      </Button>
      <Button variant="secondary" size="small" type="button" icon={false} shape="square" disabled={!activeSymbol || isExporting === "json"} onClick={() => handleExport("json")}>
        {isExporting === "json" ? "Export..." : "Export JSON"}
      </Button>
      <Button variant="secondary" size="small" type="button" icon={false} shape="square" disabled={!activeSymbol || isExporting === "xml"} onClick={() => handleExport("xml")}>
        {isExporting === "xml" ? "Export..." : "Export XML"}
      </Button>

      {error && <span className="text-red-500 text-xs">{error}</span>}
    </div>
  );
}

export default ExportPanel;