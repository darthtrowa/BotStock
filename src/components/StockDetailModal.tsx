import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import type { Stock, TradeSignal } from '../types';

interface StockDetailModalProps {
  stock: Stock;
  signal?: TradeSignal;
  onClose: () => void;
}

export const StockDetailModal: React.FC<StockDetailModalProps> = ({ stock, signal, onClose }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  
  // Indicator Refs
  const smaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbUpperRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbMiddleRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Toggle states
  const [showSMA20, setShowSMA20] = useState(false);
  const [showEMA50, setShowEMA50] = useState(false);
  const [showBB, setShowBB] = useState(false);

  // Visibility effects
  useEffect(() => {
    if (smaSeriesRef.current) smaSeriesRef.current.applyOptions({ visible: showSMA20 });
  }, [showSMA20]);

  useEffect(() => {
    if (emaSeriesRef.current) emaSeriesRef.current.applyOptions({ visible: showEMA50 });
  }, [showEMA50]);

  useEffect(() => {
    if (bbUpperRef.current) bbUpperRef.current.applyOptions({ visible: showBB });
    if (bbMiddleRef.current) bbMiddleRef.current.applyOptions({ visible: showBB });
    if (bbLowerRef.current) bbLowerRef.current.applyOptions({ visible: showBB });
  }, [showBB]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
    });
    
    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    seriesRef.current = candlestickSeries;

    // Add indicator series
    const smaSeries = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 2, visible: showSMA20, crosshairMarkerVisible: false });
    smaSeriesRef.current = smaSeries;

    const emaSeries = chart.addSeries(LineSeries, { color: '#ec4899', lineWidth: 2, visible: showEMA50, crosshairMarkerVisible: false });
    emaSeriesRef.current = emaSeries;

    const bbUpper = chart.addSeries(LineSeries, { color: 'rgba(16, 185, 129, 0.5)', lineWidth: 1, visible: showBB, crosshairMarkerVisible: false });
    const bbMiddle = chart.addSeries(LineSeries, { color: 'rgba(156, 163, 175, 0.5)', lineWidth: 1, lineStyle: 2, visible: showBB, crosshairMarkerVisible: false });
    const bbLower = chart.addSeries(LineSeries, { color: 'rgba(16, 185, 129, 0.5)', lineWidth: 1, visible: showBB, crosshairMarkerVisible: false });
    bbUpperRef.current = bbUpper;
    bbMiddleRef.current = bbMiddle;
    bbLowerRef.current = bbLower;

    // Math functions
    const calculateSMA = (data: any[], period: number) => {
      const result: { time: Time; value: number }[] = [];
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) continue;
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += data[i - j].close;
        }
        result.push({ time: data[i].time, value: sum / period });
      }
      return result;
    };

    const calculateEMA = (data: any[], period: number) => {
      const result: { time: Time; value: number }[] = [];
      if (data.length === 0) return result;
      const k = 2 / (period + 1);
      let ema = data[0].close;
      for (let i = 0; i < data.length; i++) {
        ema = data[i].close * k + ema * (1 - k);
        if (i >= period - 1) {
          result.push({ time: data[i].time, value: ema });
        }
      }
      return result;
    };

    const calculateBollingerBands = (data: any[], period: number, multiplier: number) => {
      const upper: { time: Time; value: number }[] = [];
      const middle: { time: Time; value: number }[] = [];
      const lower: { time: Time; value: number }[] = [];
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) continue;
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += data[i - j].close;
        }
        const sma = sum / period;
        
        let sumSq = 0;
        for (let j = 0; j < period; j++) {
          sumSq += Math.pow(data[i - j].close - sma, 2);
        }
        const sd = Math.sqrt(sumSq / period);
        
        middle.push({ time: data[i].time, value: sma });
        upper.push({ time: data[i].time, value: sma + (multiplier * sd) });
        lower.push({ time: data[i].time, value: sma - (multiplier * sd) });
      }
      return { upper, middle, lower };
    };

    // Helper to draw markers and projection
    const drawMarkersAndProjection = (chartApi: IChartApi, candleSeriesApi: ISeriesApi<"Candlestick">, chartData: any[]) => {
      if (!signal || chartData.length === 0) return;

      candleSeriesApi.createPriceLine({
        price: signal.targetPrice,
        color: '#10b981',
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'TP',
      });

      candleSeriesApi.createPriceLine({
        price: signal.stopLoss,
        color: '#ef4444',
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'SL',
      });

      candleSeriesApi.createPriceLine({
        price: signal.entryPrice,
        color: '#3b82f6',
        lineWidth: 1,
        lineStyle: 1,
        axisLabelVisible: true,
        title: 'Entry',
      });

      const projectionSeries = chartApi.addSeries(LineSeries, {
        color: 'rgba(59, 130, 246, 0.8)',
        lineWidth: 2,
        lineStyle: 3,
        crosshairMarkerVisible: false,
      });
      lineSeriesRef.current = projectionSeries;

      const lastDataPoint = chartData[chartData.length - 1];
      const lastDate = new Date(lastDataPoint.time);
      const futureDate = new Date(lastDate);
      futureDate.setDate(lastDate.getDate() + 3);
      
      projectionSeries.setData([
        { time: lastDataPoint.time, value: lastDataPoint.close },
        { time: futureDate.toISOString().split('T')[0] as Time, value: signal.targetPrice }
      ]);
    };

    // Synthesize OHLC data fallback
    const getFallbackData = () => {
      const history = stock.history && stock.history.length > 0 ? stock.history : [stock.currentPrice];
      const data = [];
      const now = new Date();
      for (let i = 0; i < history.length; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() - (history.length - 1 - i));
        const price = history[i];
        const prevPrice = i > 0 ? history[i-1] : price * 0.99;
        let open = prevPrice;
        let close = price;
        const high = Math.max(open, close) + (Math.abs(open - close) * 0.5) + (price * 0.005);
        const low = Math.min(open, close) - (Math.abs(open - close) * 0.5) - (price * 0.005);
        data.push({ time: date.toISOString().split('T')[0] as Time, open, high, low, close });
      }
      return data;
    };

    // Fetch historical data
    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const res = await fetch(`/api/history?symbol=${stock.symbol}&range=3mo`);
        const json = await res.json();
        
        let finalData = [];
        if (json.success && json.data && json.data.length > 0) {
          finalData = json.data;
        } else {
          finalData = getFallbackData();
        }
        candlestickSeries.setData(finalData);
        drawMarkersAndProjection(chart, candlestickSeries, finalData);

        smaSeries.setData(calculateSMA(finalData, 20));
        emaSeries.setData(calculateEMA(finalData, 50));
        const bb = calculateBollingerBands(finalData, 20, 2);
        bbUpper.setData(bb.upper);
        bbMiddle.setData(bb.middle);
        bbLower.setData(bb.lower);
        
      } catch (e) {
        console.error(e);
        const fb = getFallbackData();
        candlestickSeries.setData(fb);
        drawMarkersAndProjection(chart, candlestickSeries, fb);
        
        smaSeries.setData(calculateSMA(fb, 20));
        emaSeries.setData(calculateEMA(fb, 50));
        const bb = calculateBollingerBands(fb, 20, 2);
        bbUpper.setData(bb.upper);
        bbMiddle.setData(bb.middle);
        bbLower.setData(bb.lower);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();

    // Handled in drawMarkersAndProjection

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [stock, signal]); // Intentionally omitting toggle states so we don't recreate the chart

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
      backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999,
      display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)'
    }}>
      <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{
        width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
        padding: '24px', position: 'relative'
      }}>
        <button className="modal-close-btn" onClick={onClose} style={{
          position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none',
          color: 'var(--text-secondary)', fontSize: '24px', cursor: 'pointer'
        }}>×</button>
        
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="stock-symbol" style={{ fontSize: '24px' }}>{stock.symbol}</span>
            <span className="stock-name">{stock.name}</span>
          </h2>
          <div className="font-number" style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>
            ฿{stock.currentPrice.toFixed(2)} 
            <span style={{ fontSize: '16px', color: stock.changePercent >= 0 ? 'var(--success)' : 'var(--danger)', marginLeft: '12px' }}>
              {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>

        {signal ? (
          <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '24px' }}>🤖</span>
              <div>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent)' }}>การวิเคราะห์จากระบบ (AI Analysis)</h4>
                <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: '1.6' }}>
                  {signal.analysisReason || 'ไม่มีคำอธิบายเพิ่มเติม'}
                </p>
                
                <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>แนะนำเข้าซื้อที่ (Entry)</span>
                    <div className="font-number text-primary-color" style={{ fontSize: '18px', fontWeight: 'bold' }}>฿{signal.entryPrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>เป้าทำกำไร (TP)</span>
                    <div className="font-number text-success" style={{ fontSize: '18px', fontWeight: 'bold' }}>฿{signal.targetPrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>จุดตัดขาดทุน (SL)</span>
                    <div className="font-number text-danger" style={{ fontSize: '18px', fontWeight: 'bold' }}>฿{signal.stopLoss.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginBottom: '24px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            ยังไม่มีสัญญาณซื้อขายแนะนำสำหรับหุ้นตัวนี้ในขณะนี้
          </div>
        )}

        <h4 style={{ marginBottom: '12px' }}>
          กราฟราคาแท่งเทียน (Candlestick) 
          {isLoadingHistory && <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '12px', fontWeight: 'normal' }}>กำลังโหลดข้อมูลย้อนหลัง...</span>}
        </h4>
        
        <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '14px' }}>
            <input type="checkbox" checked={showSMA20} onChange={(e) => setShowSMA20(e.target.checked)} />
            <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>SMA 20</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '14px' }}>
            <input type="checkbox" checked={showEMA50} onChange={(e) => setShowEMA50(e.target.checked)} />
            <span style={{ color: '#ec4899', fontWeight: 'bold' }}>EMA 50</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '14px' }}>
            <input type="checkbox" checked={showBB} onChange={(e) => setShowBB(e.target.checked)} />
            <span style={{ color: '#10b981', fontWeight: 'bold' }}>Bollinger Bands (20,2)</span>
          </label>
        </div>

        <div 
          ref={chartContainerRef} 
          style={{ width: '100%', height: '400px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', overflow: 'hidden', opacity: isLoadingHistory ? 0.5 : 1, transition: 'opacity 0.3s' }}
        />
        
        <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
          * ข้อมูลกราฟแท่งเทียนใช้เพื่อประกอบการวิเคราะห์และการจำลองเท่านั้น การขีดเส้นประแสดงทิศทางคาดการณ์ ไม่ใช่การการันตีราคาในอนาคต
        </div>
      </div>
    </div>
  );
};
