import { useEffect, useRef, useState } from "react";
import { createChart, type IChartApi, type ISeriesApi } from "lightweight-charts";
import TimeframeSelector, { type Timeframe } from "./TimeframeSelector";
import { apiFetch } from "../api/client";
import { mapApiCandleToCandle, type ApiCandle } from "../data/mockMarket";
import { useMarket } from "../context/MarketContext";

function PriceChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("1m");

  const { selectedSymbol, watchlist } = useMarket();
  const selectedAsset = watchlist.find((asset) => asset.symbol === selectedSymbol);

  // Crée le graphique UNE SEULE FOIS, au montage du composant.
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#050505" }, textColor: "#9ca3af" },
      grid: { vertLines: { color: "#1f1f1f" }, horzLines: { color: "#1f1f1f" } },
      width: containerRef.current.clientWidth,
      height: 300,
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

  // Récupère les vraies bougies depuis l'API à chaque changement de symbole/timeframe.
  useEffect(() => {
    if (!seriesRef.current || !selectedSymbol) return;

    async function loadCandles() {
      const rawCandles = await apiFetch<ApiCandle[]>(
        `/markets/${selectedSymbol}/candles?interval=${timeframe}&limit=120`
      );
      const candles = rawCandles.map(mapApiCandleToCandle);
      seriesRef.current!.setData(candles);
    }

    loadCandles();
  }, [timeframe, selectedSymbol]);

  return (
    <div className="bg-[#050505] border border-[#1f1f1f] rounded-md p-4 flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <span className="text-gray-100 font-semibold">{selectedAsset?.name}</span>
        <TimeframeSelector value={timeframe} onChange={setTimeframe} />
      </div>
      <div ref={containerRef} className="flex-1" />
    </div>
  );
}

export default PriceChart;