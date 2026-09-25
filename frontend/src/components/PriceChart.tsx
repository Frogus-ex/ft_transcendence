import { useEffect, useRef, useState } from "react";
import { createChart, type IChartApi, type ISeriesApi } from "lightweight-charts";
import TimeframeSelector from "./TimeframeSelector";
import { generateMockCandles } from "../data/mockMarket";

type Timeframe = "1m" | "5m" | "1h" | "1D" | "7D";

const stepSecondsByTimeframe: Record<Timeframe, number> = {
  "1m": 60,
  "5m": 300,
  "1h": 3600,
  "1D": 86400,
  "7D": 604800,
};

/**
 * PriceChart — graphique en chandelier (lightweight-charts) + timeframe.
 * Phase 2 : bougies générées en mock. Le vrai flux viendra de MarketContext
 * (WebSocket + GET /candles) en Phase 3.
 */
function PriceChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");

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

  // Régénère les bougies mock à chaque changement de timeframe.
  useEffect(() => {
    if (!seriesRef.current) return;
    const candles = generateMockCandles(120, 64250, stepSecondsByTimeframe[timeframe]);
    seriesRef.current.setData(candles);
  }, [timeframe]);

  return (
    <div className="bg-[#050505] border border-[#1f1f1f] rounded-md p-4 flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <span className="text-gray-100 font-semibold">BTC / USDT</span>
        <TimeframeSelector value={timeframe} onChange={setTimeframe} />
      </div>
      <div ref={containerRef} className="flex-1" />
    </div>
  );
}

export default PriceChart;