import { useEffect, useRef, useState } from "react";
import { createChart, type IChartApi, type ISeriesApi } from "lightweight-charts";
import TimeframeSelector, { type Timeframe } from "./TimeframeSelector";
import DateRangeFilter from "./DateRangeFilter";
import { apiFetch } from "../api/client";
import { mapApiCandleToCandle, type ApiCandle, type Candle } from "../data/mockMarket";
import { useMarket } from "../context/MarketContext";
import { useMarketSocket } from "../hooks/useMarketSocket";

// Chrome sends intermediate values while the year is being typed (0002-.., 20201-..):
// only complete dates from 2000 onwards are sent to the API.
const DATE_RE = /^20\d{2}-\d{2}-\d{2}$/;
const validDate = (value: string) =>
  DATE_RE.test(value) && !Number.isNaN(Date.parse(value)) ? value : "";

function PriceChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lastCandleRef = useRef<Candle | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("1m");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const { selectedSymbol, watchlist } = useMarket();
  const selectedAsset = watchlist.find((asset) => asset.symbol === selectedSymbol);

  const start = validDate(startDate);
  const end = validDate(endDate);
  const isLiveRange = !start && !end;

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#050505" }, textColor: "#9ca3af" },
      grid: { vertLines: { color: "#1f1f1f" }, horzLines: { color: "#1f1f1f" } },
      autoSize: true,
    });

    const series = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !selectedSymbol) return;
    if (start && end && start > end) return;

    async function loadCandles() {
      const params = new URLSearchParams({ interval: timeframe, limit: "120" });
      if (start) params.set("start", start);
      if (end) params.set("end", end);

      try {
        const rawCandles = await apiFetch<ApiCandle[]>(
          `/markets/${selectedSymbol}/candles?${params.toString()}`
        );
        const candles = rawCandles.map(mapApiCandleToCandle);
        seriesRef.current!.setData(candles);
        lastCandleRef.current = candles.length > 0 ? candles[candles.length - 1] : null;
        setLoadError(null);
      } catch {
        setLoadError("Impossible de charger les bougies.");
      }
    }

    loadCandles();
  }, [timeframe, selectedSymbol, start, end]);

  useMarketSocket(isLiveRange ? selectedSymbol : undefined, (tick) => {
    if (!seriesRef.current || !lastCandleRef.current) return;
    if (tick.symbol !== selectedSymbol) return;

    const updated: Candle = {
      ...lastCandleRef.current,
      close: tick.price,
      high: Math.max(lastCandleRef.current.high, tick.price),
      low: Math.min(lastCandleRef.current.low, tick.price),
    };
    lastCandleRef.current = updated;
    seriesRef.current.update(updated);
  });

  return (
    <div className="bg-[#050505] border border-[#1f1f1f] rounded-md p-4 flex flex-col gap-3 h-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-gray-100 font-semibold">{selectedAsset?.name}</span>
        <div className="flex flex-wrap items-center gap-3">
          <DateRangeFilter start={startDate} end={endDate} onChangeStart={setStartDate} onChangeEnd={setEndDate} />
          <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        </div>
      </div>
      <div ref={containerRef} className="flex-1 min-w-0 min-h-[280px] sm:min-h-[340px]" />
      {loadError && <p className="text-red-400 text-sm">{loadError}</p>}
    </div>
  );
}

export default PriceChart;