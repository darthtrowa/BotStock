import { useState, useEffect, useRef } from 'react';
import type { Stock, Portfolio, TradeSignal, Transaction, Position, BotLearningState, BotLearningLog } from './types';
import {
  INITIAL_STOCKS,
  INITIAL_BOT_PORTFOLIO,
  INITIAL_USER_PORTFOLIO,
  INITIAL_BOT_SIGNALS,
  INITIAL_TRANSACTIONS
} from './mockData';
import { SET_SYMBOLS } from './set_symbols';

import { Dashboard } from './components/Dashboard';
import { TradingSignals } from './components/TradingSignals';
import { UserPortfolio } from './components/UserPortfolio';
import { TransactionHistory } from './components/TransactionHistory';
import { AlertsPanel } from './components/AlertsPanel';
import { BotPortfolio } from './components/BotPortfolio';
import { BotLearningCenter } from './components/BotLearningCenter';
import type { AlertLogEntry } from './components/AlertsPanel';

// Helper คำนวณ Spread (Tick size) คร่าวๆ ตามตลาดหุ้นไทย
function getSpread(price: number): number {
  if (price < 2) return 0.01;
  if (price < 5) return 0.02;
  if (price < 10) return 0.05;
  if (price < 25) return 0.10;
  return 0.25;
}

// Helper หาความต่างของวัน (เป็นจำนวนวัน)
function getDaysDiff(entryIsoString: string): number {
  const entryDate = new Date(entryIsoString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - entryDate.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Helper หาวันที่ปัจจุบัน (YYYY-MM-DD) ตามเวลาจริง
function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

// 🧠 Helper: วิเคราะห์หุ้นทางเทคนิคเพื่อหาเป้าหมายและคำอธิบาย (Bot Technical Analysis)
function generateTechnicalAnalysis(stock: Stock, offerPrice: number, botBrain: BotLearningState): { targetPrice: number, stopLoss: number, reason: string } {
  // นำค่า Dynamic จากสมองกลมาคำนวณกำไร/ขาดทุน แทนค่าตายตัว 5%, 3%
  const tpMultiplier = 1 + botBrain.takeProfitMargin; // e.g. 1.05
  const slMultiplier = 1 - botBrain.stopLossMargin;   // e.g. 0.97
  
  const isVDU = stock.volume > 0 && stock.volume < 45000000;
  const isPPBP = stock.changePercent > 0.5 && stock.volume > 60000000;
  const isBGU = stock.changePercent > 1.2;
  const is52W = stock.currentPrice >= stock.highPrice * 0.95;

  const patterns = [];
  if (isVDU) patterns.push('Volume Dry-Up (VDU)');
  if (isPPBP) patterns.push('Pocket Pivot (PPBP)');
  if (isBGU) patterns.push('Buyable Gap-Up (BGU)');
  if (is52W) patterns.push('52-Week High (52W)');
  
  const confluenceStr = patterns.length > 0 ? ` (พบสัญญาณ Confluence: ${patterns.join(' + ')})` : '';

  // Setup 1: Breakout & Momentum (หุ้นกำลังวิ่งแรง)
  if (stock.changePercent >= 0.5) {
    const targetPrice = Math.round(offerPrice * tpMultiplier * 100) / 100;
    const stopLoss = Math.round(offerPrice * slMultiplier * 100) / 100;
    return {
      targetPrice,
      stopLoss,
      reason: `MACD ตัดขึ้น Signal (Breakout)${confluenceStr} เป้าทำกำไร +${(botBrain.takeProfitMargin*100).toFixed(1)}% (฿${targetPrice.toFixed(2)}) และตัดขาดทุนที่ -${(botBrain.stopLossMargin*100).toFixed(1)}%`
    };
  }
  
  // Setup 2: RSI Oversold & Rebound (ลงมาลึกตามค่า RSI ที่ตั้งไว้)
  if (stock.changePercent <= -0.5) {
    const targetPrice = Math.round(offerPrice * tpMultiplier * 100) / 100;
    const stopLoss = Math.round(offerPrice * slMultiplier * 100) / 100;
    return {
      targetPrice,
      stopLoss,
      reason: `รอเด้งโซนล่าง (RSI จำลอง < ${Math.round(botBrain.rsiThreshold)})${confluenceStr} หากไม่หลุด ฿${stopLoss.toFixed(2)} มีลุ้นเด้งทำกำไร +${(botBrain.takeProfitMargin*100).toFixed(1)}%`
    };
  }

  // Setup 3: Consolidation (แกว่งตัวแคบ พักตัว)
  const targetPrice = Math.round(offerPrice * tpMultiplier * 100) / 100;
  const stopLoss = Math.round(offerPrice * slMultiplier * 100) / 100;
  return {
    targetPrice,
    stopLoss,
    reason: `พักตัวสะสมพลังบน EMA${confluenceStr} โอกาสยกตัวไป ฿${targetPrice.toFixed(2)} หากหลุด ฿${stopLoss.toFixed(2)} ให้ตัดขาดทุนทันที`
  };
}

export default function App() {
  const [stocks, setStocks] = useState<Stock[]>(() => {
    const saved = localStorage.getItem('botstock_stocks');
    return saved ? JSON.parse(saved) : INITIAL_STOCKS;
  });

  const [botPortfolio, setBotPortfolio] = useState<Portfolio>(() => {
    const saved = localStorage.getItem('botstock_bot_portfolio');
    if (saved) {
      const parsed = JSON.parse(saved);
      const uniquePositions = [];
      const seen = new Set();
      for (const pos of parsed.positions || []) {
        if (!seen.has(pos.symbol)) {
          seen.add(pos.symbol);
          uniquePositions.push(pos);
        }
      }
      parsed.positions = uniquePositions;
      return parsed;
    }
    return INITIAL_BOT_PORTFOLIO;
  });

  const [userPortfolio, setUserPortfolio] = useState<Portfolio>(() => {
    const saved = localStorage.getItem('botstock_user_portfolio');
    return saved ? JSON.parse(saved) : INITIAL_USER_PORTFOLIO;
  });

  const [signals, setSignals] = useState<TradeSignal[]>(() => {
    const saved = localStorage.getItem('botstock_signals');
    if (saved) {
      const parsed = JSON.parse(saved);
      const uniqueSignals = [];
      const seenActive = new Set();
      for (const sig of parsed) {
        if (sig.status === 'ACTIVE') {
          if (!seenActive.has(sig.symbol)) {
            seenActive.add(sig.symbol);
            uniqueSignals.push(sig);
          }
        } else {
          uniqueSignals.push(sig);
        }
      }
      return uniqueSignals;
    }
    return INITIAL_BOT_SIGNALS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('botstock_transactions');
    if (saved) {
      const parsed = JSON.parse(saved);
      const uniqueTx = [];
      const seen = new Set();
      for (const tx of parsed) {
        const timeInSeconds = Math.floor(new Date(tx.timestamp).getTime() / 1000);
        const signature = `${tx.symbol}-${tx.type}-${timeInSeconds}`;
        if (!seen.has(signature)) {
          seen.add(signature);
          uniqueTx.push(tx);
        }
      }
      return uniqueTx;
    }
    return INITIAL_TRANSACTIONS;
  });

  const [alertLogs, setAlertLogs] = useState<AlertLogEntry[]>(() => {
    const saved = localStorage.getItem('botstock_alert_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [botLearningLogs, setBotLearningLogs] = useState<BotLearningLog[]>(() => {
    const saved = localStorage.getItem('botstock_learning_logs');
    if (saved) {
      const parsed = JSON.parse(saved);
      const uniqueLogs = [];
      const seen = new Set();
      for (const log of parsed) {
        // ใช้เวลาในระดับวินาที + หุ้น + action เป็นตัวกรอง เพื่อลบ log ที่เกิดจากการรันซ้ำซ้อนในเสี้ยววินาทีเดียวกัน
        const timeInSeconds = Math.floor(new Date(log.timestamp).getTime() / 1000);
        const signature = `${log.symbol}-${log.action}-${timeInSeconds}`;
        if (!seen.has(signature)) {
          seen.add(signature);
          uniqueLogs.push(log);
        }
      }
      return uniqueLogs;
    }
    return [];
  });

  // --- BACKFILL LOGIC FOR OLD TRANSACTIONS ---
  useEffect(() => {
    const isBackfilled = localStorage.getItem('botstock_brain_backfilled_v2');
    if (!isBackfilled) {
      const allTxStr = localStorage.getItem('botstock_transactions');
      if (allTxStr) {
        const allTx: Transaction[] = JSON.parse(allTxStr);
        const botSellTx = allTx.filter(tx => tx.owner === 'BOT' && tx.type === 'SELL').sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        let currentBrain: BotLearningState = {
          winCount: 0,
          lossCount: 0,
          consecutiveLosses: 0,
          takeProfitMargin: 0.05,
          stopLossMargin: 0.03,
          rsiThreshold: 35,
          macdThreshold: 0.2,
          maxHoldingDays: 3,
          sellOnlyOnTarget: false
        };

        const generatedLogs: BotLearningLog[] = [];

        for (const tx of botSellTx) {
          const realizedPnL = tx.realizedPnL || 0;
          const isWin = realizedPnL > 0;
          const cost = tx.amount - realizedPnL;
          const pnlPercent = cost > 0 ? (realizedPnL / cost) * 100 : 0;

          const adjustments: string[] = [];

          if (isWin) {
            currentBrain.winCount++;
            currentBrain.consecutiveLosses = 0;
            
            const newTP = Math.min(0.15, currentBrain.takeProfitMargin + 0.005);
            if (newTP !== currentBrain.takeProfitMargin) {
              adjustments.push(`เพิ่มเป้าทำกำไร (Take Profit) เป็น ${(newTP * 100).toFixed(1)}%`);
              currentBrain.takeProfitMargin = newTP;
            }
            
            if (currentBrain.rsiThreshold < 35) {
              const newRSI = Math.min(35, currentBrain.rsiThreshold + 1);
              adjustments.push(`ฟื้นฟูความกล้าหาญ ปรับ RSI เป็น ${newRSI}`);
              currentBrain.rsiThreshold = newRSI;
            }
          } else {
            currentBrain.lossCount++;
            currentBrain.consecutiveLosses++;
            
            if (currentBrain.consecutiveLosses >= 2) {
              const newRSI = Math.max(20, currentBrain.rsiThreshold - 2);
              if (newRSI !== currentBrain.rsiThreshold) {
                adjustments.push(`แพ้ติดต่อกัน ${currentBrain.consecutiveLosses} ครั้ง ปรับลด RSI เป็น ${newRSI} (ให้เข้าซื้อยากขึ้น)`);
                currentBrain.rsiThreshold = newRSI;
              }
              
              const newSL = Math.min(0.10, currentBrain.stopLossMargin + 0.005);
              if (newSL !== currentBrain.stopLossMargin) {
                adjustments.push(`ขยายจุดตัดขาดทุน (Stop Loss) เป็น ${(newSL * 100).toFixed(1)}% เผื่อตลาดผันผวน`);
                currentBrain.stopLossMargin = newSL;
              }
              
              const newTP = Math.max(0.03, currentBrain.takeProfitMargin - 0.005);
              if (newTP !== currentBrain.takeProfitMargin) {
                adjustments.push(`ลดเป้าทำกำไรลงเหลือ ${(newTP * 100).toFixed(1)}% เพื่อความปลอดภัย`);
                currentBrain.takeProfitMargin = newTP;
              }
            }
          }

          generatedLogs.push({
            id: `learn-backfill-${tx.id}`,
            timestamp: tx.timestamp,
            symbol: tx.symbol,
            action: isWin ? 'WIN' : 'LOSS',
            realizedPnL,
            pnlPercent,
            adjustments
          });
        }

        // Merge generated WIN/LOSS logs with existing AI_ANALYSIS logs
        setBotLearningLogs(prev => {
          const aiLogs = prev.filter(log => log.action === 'AI_ANALYSIS');
          const merged = [...aiLogs, ...generatedLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          
          // Deduplicate the merged logs again to ensure no exact duplicates from interval bugs in the past
          const uniqueMerged = [];
          const seenMerged = new Set();
          for (const log of merged) {
            const timeInSec = Math.floor(new Date(log.timestamp).getTime() / 1000);
            const sig = `${log.symbol}-${log.action}-${timeInSec}`;
            if (!seenMerged.has(sig)) {
              seenMerged.add(sig);
              uniqueMerged.push(log);
            }
          }

          localStorage.setItem('botstock_learning_logs', JSON.stringify(uniqueMerged));
          return uniqueMerged;
        });

        setBotBrain(currentBrain);
        localStorage.setItem('botstock_brain', JSON.stringify(currentBrain));
      }
      localStorage.setItem('botstock_brain_backfilled_v2', 'true');
    }
  }, []);
  // -------------------------------------------

  const stocksRef = useRef(stocks);
  useEffect(() => {
    stocksRef.current = stocks;
  }, [stocks]);

  const botPortfolioRef = useRef(botPortfolio);
  useEffect(() => {
    botPortfolioRef.current = botPortfolio;
  }, [botPortfolio]);

  const signalsRef = useRef(signals);
  useEffect(() => {
    signalsRef.current = signals;
  }, [signals]);

  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'SIGNALS' | 'USER_PORT' | 'BOT_PORT' | 'HISTORY' | 'ALERTS' | 'LEARNING'>('DASHBOARD');
  const [toasts, setToasts] = useState<Array<{ id: string; title: string; desc: string; type: 'buy' | 'sell' | 'warning' }>>([]);
  const [isScanning, setIsScanning] = useState(false);
  const tickCounter = useRef<number>(0);

  const [marketStatus, setMarketStatus] = useState<'OPEN' | 'CLOSED' | 'HOLIDAY'>('OPEN');
  const marketStatusRef = useRef(marketStatus);
  useEffect(() => { marketStatusRef.current = marketStatus; }, [marketStatus]);

  const [setIndexData, setSetIndexData] = useState<{ current: number, change: number, changePercent: number, basePrice: number } | null>(null);
  const setIndexAt10 = useRef<number | null>(null);

  useEffect(() => {
    const today = getTodayDateString();
    setBotPortfolio(prev => {
      if (prev.lastTradeDate !== today) {
        return { ...prev, lastTradeDate: today, tradesToday: 0 };
      }
      return prev;
    });
    setUserPortfolio(prev => {
      if (prev.lastTradeDate !== today) {
        return { ...prev, lastTradeDate: today, tradesToday: 0 };
      }
      return prev;
    });
  }, []);

  useEffect(() => localStorage.setItem('botstock_stocks', JSON.stringify(stocks)), [stocks]);
  useEffect(() => localStorage.setItem('botstock_bot_portfolio', JSON.stringify(botPortfolio)), [botPortfolio]);
  useEffect(() => localStorage.setItem('botstock_user_portfolio', JSON.stringify(userPortfolio)), [userPortfolio]);
  useEffect(() => localStorage.setItem('botstock_signals', JSON.stringify(signals)), [signals]);
  useEffect(() => localStorage.setItem('botstock_transactions', JSON.stringify(transactions)), [transactions]);
  useEffect(() => localStorage.setItem('botstock_alert_logs', JSON.stringify(alertLogs)), [alertLogs]);
  useEffect(() => localStorage.setItem('botstock_learning_logs', JSON.stringify(botLearningLogs)), [botLearningLogs]);

  const [performanceHistory, setPerformanceHistory] = useState<Array<{ day: string; botVal: number; setVal: number; timestamp?: number }>>(() => {
    const saved = localStorage.getItem('botstock_perf_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const now = Date.now();
          let hasMissingTimestamp = false;
          const mapped = parsed.map((item, index) => {
            if (!item.timestamp) {
              hasMissingTimestamp = true;
              return {
                ...item,
                timestamp: now - (parsed.length - 1 - index) * 30 * 60 * 1000
              };
            }
            return item;
          });
          if (hasMissingTimestamp) {
            localStorage.setItem('botstock_perf_history', JSON.stringify(mapped));
          }
          return mapped;
        }
      } catch (e) {
        // Fallback
      }
    }
    const now = new Date();
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    return [
      { day: `เริ่มเทรด (${timeStr})`, botVal: 2000, setVal: 2000, timestamp: now.getTime() }
    ];
  });

  const [botBrain, setBotBrain] = useState<BotLearningState>(() => {
    const saved = localStorage.getItem('botstock_brain');
    return saved ? JSON.parse(saved) : {
      winCount: 0,
      lossCount: 0,
      consecutiveLosses: 0,
      takeProfitMargin: 0.05,
      stopLossMargin: 0.03,
      rsiThreshold: 35,
      macdThreshold: 0.2,
      maxHoldingDays: 3,
      sellOnlyOnTarget: false
    };
  });
  useEffect(() => localStorage.setItem('botstock_brain', JSON.stringify(botBrain)), [botBrain]);

  const botBrainRef = useRef(botBrain);
  useEffect(() => {
    botBrainRef.current = botBrain;
  }, [botBrain]);

  const addToast = (title: string, desc: string, type: 'buy' | 'sell' | 'warning') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { id, title, desc, type }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const addAlertLog = (type: 'BUY' | 'SELL' | 'SYSTEM' | 'LIMIT', symbol: string, message: string) => {
    const newLog: AlertLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      type,
      message,
      timestamp: new Date().toISOString()
    };
    setAlertLogs(prev => [...prev, newLog]);
  };

  const [newSymbol, setNewSymbol] = useState('');

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    const symbol = newSymbol.trim().toUpperCase();
    if (!symbol) return;
    
    if (stocks.length >= 20) {
      alert("ไม่สามารถเพิ่มได้: ถึงขีดจำกัด 20 ตัวแล้ว เพื่อป้องกันการถูกบล็อกจากการดึงข้อมูล");
      return;
    }

    if (stocks.some(s => s.symbol === symbol)) {
      alert(`หุ้น ${symbol} มีอยู่ในพอร์ตแล้ว`);
      return;
    }

    // สร้างโปรไฟล์หุ้นเบื้องต้น (ราคาจะเป็น 0 ก่อนจนกว่าจะดึงจาก API)
    const newStock: Stock = {
      symbol,
      name: symbol,
      currentPrice: 0,
      openPrice: 0,
      highPrice: 0,
      lowPrice: 0,
      change: 0,
      changePercent: 0,
      bidPrice: 0,
      offerPrice: 0,
      volume: 0,
      history: Array(40).fill(0)
    };

    setStocks(prev => [...prev, newStock]);
    setNewSymbol('');
    
    // Trigger ให้ดึงข้อมูลใหม่ทันทีเพื่ออัปเดตราคา
    setTimeout(() => fetchPrices(), 100);
  };

  const handleBotScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    addToast('กำลังสแกนหุ้น SET INDEX', 'บอทกำลังโหลดข้อมูลและวิเคราะห์ทางเทคนิค กรุณารอสักครู่...', 'buy');
    
    try {
      // Chunking SET_SYMBOLS to avoid too long URL (e.g., 20 symbols per request)
      const chunkSize = 20;
      const promises = [];
      
      for (let i = 0; i < SET_SYMBOLS.length; i += chunkSize) {
        const chunk = SET_SYMBOLS.slice(i, i + chunkSize).join(',');
        promises.push(fetch(`/api/prices?symbols=${chunk}&force=true`).then(res => res.json()));
      }
      
      const results = await Promise.all(promises);
      
      let allPrices: Record<string, number> = {};
      results.forEach(json => {
        if (json.data) {
          allPrices = { ...allPrices, ...json.data };
        }
      });
      
      let tradableStocks: Array<{ symbol: string, price: number, analysis: any }> = [];
      
      for (const symbol of SET_SYMBOLS) {
        const price = allPrices[symbol] || 0;
        if (price > 0 && price < 100) { // Condition: has valid price and not too expensive
          // Create dummy stock for analysis
          const dummyStock: Stock = {
            symbol, name: symbol, currentPrice: price, openPrice: price * 0.99, highPrice: price * 1.02, lowPrice: price * 0.98,
            change: price * 0.01, changePercent: 1.0, bidPrice: price - 0.25, offerPrice: price + 0.25, volume: 10000, history: []
          };
          
          // Only pick if changePercent is good (e.g. >= 0.5) to find breakout
          if (dummyStock.changePercent >= 0.5 || dummyStock.changePercent <= -0.5) {
            const analysis = generateTechnicalAnalysis(dummyStock, dummyStock.offerPrice, botBrainRef.current);
            tradableStocks.push({ symbol, price, analysis });
          }
        }
      }
      
      // Select top 5
      tradableStocks = tradableStocks.slice(0, 5);
      
      if (tradableStocks.length > 0) {
        setStocks(prev => {
          let updatedStocks = [...prev];
          tradableStocks.forEach(ts => {
            if (!updatedStocks.some(s => s.symbol === ts.symbol)) {
              if (updatedStocks.length < 20) {
                updatedStocks.push({
                  symbol: ts.symbol, name: ts.symbol, currentPrice: ts.price, openPrice: ts.price, highPrice: ts.price, lowPrice: ts.price,
                  change: 0, changePercent: 0, bidPrice: ts.price, offerPrice: ts.price, volume: 0, history: Array(40).fill(ts.price)
                });
              }
            }
          });
          return updatedStocks;
        });

        setSignals(prev => {
          let newSignals = [...prev];
          tradableStocks.forEach(ts => {
            if (!newSignals.some(s => s.symbol === ts.symbol && s.status === 'ACTIVE')) {
              newSignals.unshift({
                id: `sig-scan-${Date.now()}-${ts.symbol}`, symbol: ts.symbol, type: 'BUY', entryPrice: ts.price,
                targetPrice: ts.analysis.targetPrice, stopLoss: ts.analysis.stopLoss, timestamp: new Date().toISOString(), holdingDays: 0, status: 'ACTIVE',
                analysisReason: `[SET SCAN] ${ts.analysis.reason}`
              });
            }
          });
          return newSignals;
        });
        
        addToast('สแกนสำเร็จ', `พบหุ้นน่าเทรด ${tradableStocks.length} ตัว และถูกเพิ่มในหน้าสัญญาณซื้อขายแล้ว`, 'buy');
        setActiveTab('SIGNALS');
      } else {
        addToast('สแกนเสร็จสิ้น', 'ยังไม่พบหุ้นที่มีสัญญาณชัดเจนในขณะนี้', 'warning');
      }
      
    } catch (err) {
      console.error(err);
      addToast('ข้อผิดพลาด', 'ไม่สามารถสแกนข้อมูลตลาดได้', 'warning');
    } finally {
      setIsScanning(false);
    }
  };

  const handleGeminiScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    addToast('กำลังให้ Gemini วิเคราะห์...', 'AI กำลังประมวลผลข้อมูลตลาดสด กรุณารอสักครู่', 'buy');
    
    try {
      const chunkSize = 20;
      const promises = [];
      
      for (let i = 0; i < SET_SYMBOLS.length; i += chunkSize) {
        const chunk = SET_SYMBOLS.slice(i, i + chunkSize).join(',');
        promises.push(fetch(`/api/prices?symbols=${chunk}&force=true`).then(res => res.json()));
      }
      
      const results = await Promise.all(promises);
      
      let allPrices: Record<string, number> = {};
      results.forEach(json => {
        if (json.data) {
          allPrices = { ...allPrices, ...json.data };
        }
      });

      const stocksData = SET_SYMBOLS.map(symbol => {
        const price = allPrices[symbol] || 0;
        return { symbol, price };
      }).filter(s => s.price > 0 && s.price < 100);

      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stocksData })
      });
      const analyzeJson = await analyzeRes.json();

      if (analyzeJson.success && analyzeJson.data && analyzeJson.data.length > 0) {
        const aiSignals = analyzeJson.data;
        
        setStocks(prev => {
          let updatedStocks = [...prev];
          aiSignals.forEach((ts: any) => {
            if (!updatedStocks.some(s => s.symbol === ts.symbol)) {
              if (updatedStocks.length < 20) {
                const price = allPrices[ts.symbol] || ts.targetPrice;
                updatedStocks.push({
                  symbol: ts.symbol, name: ts.symbol, currentPrice: price, openPrice: price, highPrice: price, lowPrice: price,
                  change: 0, changePercent: 0, bidPrice: price, offerPrice: price, volume: 0, history: Array(40).fill(price)
                });
              }
            }
          });
          return updatedStocks;
        });

        setSignals(prev => {
          let newSignals = [...prev];
          aiSignals.forEach((ts: any) => {
            if (!newSignals.some(s => s.symbol === ts.symbol && s.status === 'ACTIVE')) {
              newSignals.unshift({
                id: `sig-gemini-${Date.now()}-${ts.symbol}`, symbol: ts.symbol, type: 'BUY', entryPrice: allPrices[ts.symbol] || ts.targetPrice,
                targetPrice: ts.targetPrice, stopLoss: ts.stopLoss, timestamp: new Date().toISOString(), holdingDays: 0, status: 'ACTIVE',
                analysisReason: `[✨ Gemini AI] ${ts.reason}`
              });
            }
          });
          return newSignals;
        });

        setBotLearningLogs(prev => {
          const newLogs = aiSignals.map((ts: any, index: number) => ({
            id: `learn-ai-${Date.now()}-${index}`,
            timestamp: new Date().toISOString(),
            symbol: ts.symbol,
            action: 'AI_ANALYSIS' as const,
            realizedPnL: 0,
            pnlPercent: 0,
            adjustments: [
              `ตั้งเป้าหมายทำกำไร (TP) ที่ ฿${ts.targetPrice.toFixed(2)}`,
              `จุดตัดขาดทุน (SL) ที่ ฿${ts.stopLoss.toFixed(2)}`,
              `มุมมอง AI: ${ts.reason}`
            ]
          }));
          return [...newLogs, ...prev];
        });
        
        addToast('Gemini วิเคราะห์เสร็จสิ้น', `พบหุ้นน่าเทรด ${aiSignals.length} ตัว ตรวจสอบได้ที่หน้าสัญญาณ`, 'buy');
        setActiveTab('SIGNALS');
      } else {
        addToast('วิเคราะห์ล้มเหลว', analyzeJson.error || 'ไม่สามารถวิเคราะห์ข้อมูลได้', 'warning');
      }
      
    } catch (err) {
      console.error(err);
      addToast('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อระบบ AI ได้', 'warning');
    } finally {
      setIsScanning(false);
    }
  };

  const updatePerfHistory = (currentStocksList: Stock[], currentSetPrice: number) => {
    let aboveMA = 0;
    let validCount = 0;
    currentStocksList.forEach(stock => {
      if (stock.history && stock.history.length > 0) {
        const avg = stock.history.reduce((a, b) => a + b, 0) / stock.history.length;
        if (stock.currentPrice > avg) {
          aboveMA++;
        }
        validCount++;
      }
    });
    const breadth = validCount > 0 ? Math.round((aboveMA / validCount) * 100) : 50;

    setBotBrain(prevBrain => {
      const nextBrain = { ...prevBrain, marketBreadth: breadth };
      localStorage.setItem('botstock_brain', JSON.stringify(nextBrain));
      return nextBrain;
    });

    setBotPortfolio(prevBotPort => {
      const holdingsValue = prevBotPort.positions.reduce((sum, pos) => {
        const stock = currentStocksList.find(s => s.symbol === pos.symbol);
        const price = stock ? stock.currentPrice : pos.currentPrice;
        return sum + (pos.quantity * price);
      }, 0);
      
      const currentBotEquity = prevBotPort.cash + holdingsValue;

      let baseSet = localStorage.getItem('botstock_base_set_index');
      if (!baseSet) {
        localStorage.setItem('botstock_base_set_index', currentSetPrice.toString());
        baseSet = currentSetPrice.toString();
      }
      const baseSetNum = parseFloat(baseSet);
      const currentScaledSet = 2000 * (currentSetPrice / baseSetNum);

      setPerformanceHistory(prevHistory => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        const currentTimestamp = now.getTime();
        
        const newPoint = {
          day: timeStr,
          botVal: Math.round(currentBotEquity * 100) / 100,
          setVal: Math.round(currentScaledSet * 100) / 100,
          timestamp: currentTimestamp
        };

        if (prevHistory.length > 0) {
          if (prevHistory.length === 1) {
            const updated = [...prevHistory, newPoint].slice(-100);
            localStorage.setItem('botstock_perf_history', JSON.stringify(updated));
            return updated;
          } else {
            const secondToLastPoint = prevHistory[prevHistory.length - 2];
            const secondToLastTimestamp = secondToLastPoint.timestamp || currentTimestamp;
            const thirtyMinutesInMs = 30 * 60 * 1000;
            
            if (currentTimestamp - secondToLastTimestamp >= thirtyMinutesInMs) {
              const updated = [...prevHistory, newPoint].slice(-100);
              localStorage.setItem('botstock_perf_history', JSON.stringify(updated));
              return updated;
            } else {
              const updated = [...prevHistory];
              updated[updated.length - 1] = newPoint;
              localStorage.setItem('botstock_perf_history', JSON.stringify(updated));
              return updated;
            }
          }
        }

        const updated = [...prevHistory, newPoint].slice(-100);
        localStorage.setItem('botstock_perf_history', JSON.stringify(updated));
        return updated;
      });

      return prevBotPort;
    });
  };

  // ENGINE: Market Simulator
  const fetchPrices = async (force: boolean = false) => {
    try {
      // ดึงรายชื่อหุ้นที่ต้องการดึงทั้งหมด พร้อมพ่วง SET Index (^SET.BK)
      const currentSymbols = stocksRef.current.map(s => s.symbol).join(',') + ',^SET.BK';
      if (!stocksRef.current.length) return;

      const url = force ? `/api/prices?symbols=${currentSymbols}&force=true` : `/api/prices?symbols=${currentSymbols}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.data) {
        // --- จัดการ SET Index ---
        const setPrice = json.data['^SET.BK'];
        if (setPrice) {
          setSetIndexData(prev => {
            const basePrice = prev ? prev.basePrice : setPrice;
            const change = setPrice - basePrice;
            const changePercent = (change / basePrice) * 100;
            return { current: setPrice, change, changePercent, basePrice };
          });

          // Holiday Detection Logic
          const now = new Date();
          const hours = now.getHours();
          const minutes = now.getMinutes();

          // 10:00 - 10:30 เซฟค่าไว้
          if (hours === 10 && minutes <= 30) {
            if (setIndexAt10.current === null) {
              setIndexAt10.current = setPrice;
            }
          }
          
          // ตรวจสอบหลัง 10:30 เป็นต้นไป
          if ((hours === 10 && minutes > 30) || hours > 10) {
            if (setIndexAt10.current !== null && setIndexAt10.current === setPrice) {
              // ตลาดไม่ขยับเลยตั้งแต่ 10:00 ถือว่าเป็นวันหยุด
              setMarketStatus('HOLIDAY');
              return; // หยุดทำงานถัดไป
            }
          }
        }
        // -----------------------

        setStocks(prevStocks => {
          const nextStocks = prevStocks.map(stock => {
            const historyCopy = [...stock.history];
            historyCopy.shift();

            const newPrice = json.data[stock.symbol] || stock.currentPrice;
            historyCopy.push(newPrice);
            
            // ตั้งค่า Open Price ถ้ายอดเก่าเป็น 0 (เพิ่งถูกแอดเข้ามาใหม่)
            const openPrice = stock.openPrice === 0 && newPrice > 0 ? newPrice : stock.openPrice;

            const change = openPrice > 0 ? Math.round((newPrice - openPrice) * 100) / 100 : 0;
            const changePercent = openPrice > 0 ? (change / openPrice) * 100 : 0;

            const highPrice = newPrice > stock.highPrice ? newPrice : stock.highPrice;
            const lowPrice = stock.lowPrice === 0 || newPrice < stock.lowPrice ? newPrice : stock.lowPrice;

            const spread = getSpread(newPrice);
            const bidPrice = Math.max(0.01, Math.round((newPrice - spread) * 100) / 100);
            const offerPrice = Math.round((newPrice + spread) * 100) / 100;

            return { ...stock, currentPrice: newPrice, openPrice, bidPrice, offerPrice, change, changePercent, highPrice, lowPrice, history: historyCopy };
          });

          if (setPrice) {
            setTimeout(() => {
              updatePerfHistory(nextStocks, setPrice);
            }, 0);
          }

          return nextStocks;
        });
      }
    } catch (err) {
      console.error("Failed to fetch market data", err);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      // --- MARKET HOURS LOGIC (Bypassed for Testing) ---
      if (marketStatusRef.current !== 'OPEN') {
        setMarketStatus('OPEN');
      }
      // --------------------------

      tickCounter.current += 1;
      // 1. ดึงราคาจาก API หรือ Fallback
      fetchPrices();

      // 2. บอทประเมินสถานะ (ขาย)
      setBotPortfolio(prevBotPort => {
        let updatedPositions = [...prevBotPort.positions];
        let updatedCash = prevBotPort.cash;
        let newTransactions: Transaction[] = [];
        const remainingPositions: Position[] = [];

        let currentTradesToday = prevBotPort.tradesToday;
        let currentLastTradeDate = prevBotPort.lastTradeDate;
        const todayStr = getTodayDateString();

        if (currentLastTradeDate !== todayStr) {
          currentLastTradeDate = todayStr;
          currentTradesToday = 0; 
        }

        updatedPositions.forEach(pos => {
          const stock = stocks.find(s => s.symbol === pos.symbol);
          const latestPrice = stock?.currentPrice || pos.currentPrice;
          const sellingBid = stock?.bidPrice || latestPrice;

          const isTakeProfit = pos.targetPrice && latestPrice >= pos.targetPrice;
          const isStopLoss = pos.stopLoss && latestPrice <= pos.stopLoss;
          const currentHoldingDays = getDaysDiff(pos.entryDate);
          const isTimeLimit = currentHoldingDays >= botBrainRef.current.maxHoldingDays;

          let shouldSell = false;
          let exitReason = '';

          if (isTakeProfit) {
            shouldSell = true;
            exitReason = `Take Profit`;
          } else if (isStopLoss) {
            shouldSell = true;
            exitReason = `Stop Loss`;
          } else if (isTimeLimit && !botBrainRef.current.sellOnlyOnTarget) {
            shouldSell = true;
            exitReason = `Time Limit ${botBrainRef.current.maxHoldingDays} Days`;
          }

          if (shouldSell) {
            const sellAmount = pos.quantity * sellingBid;
            updatedCash += sellAmount;

            const cost = pos.quantity * pos.entryPrice;
            const realizedPnL = sellAmount - cost;
            const pnlPercent = (realizedPnL / cost) * 100;

            newTransactions.push({
              id: `tx-bot-sell-${Date.now()}`, symbol: pos.symbol, type: 'SELL', quantity: pos.quantity,
              price: sellingBid, amount: sellAmount, timestamp: new Date().toISOString(), realizedPnL, owner: 'BOT'
            });

            addToast(`บอทตัดขาย ${pos.symbol}`, `ขายที่ Bid: ฿${sellingBid.toFixed(2)} (${exitReason}) | PnL: ${realizedPnL >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`, realizedPnL >= 0 ? 'buy' : 'sell');
            addAlertLog('SELL', pos.symbol, `บอทขาย ${pos.quantity} หุ้น ที่ Bid ฿${sellingBid.toFixed(2)} [${exitReason}] กำไรจริง ${realizedPnL >= 0 ? '+' : ''}฿${realizedPnL.toFixed(2)}`);

            // --- SELF-LEARNING LOGIC ---
            setBotBrain((prevBrain: BotLearningState) => {
              const isWin = realizedPnL > 0;
              let { winCount, lossCount, consecutiveLosses, takeProfitMargin, stopLossMargin, rsiThreshold, maxHoldingDays, sellOnlyOnTarget } = prevBrain;
              
              const adjustments: string[] = [];

              if (isWin) {
                winCount++;
                consecutiveLosses = 0;
                
                const newTP = Math.min(0.15, takeProfitMargin + 0.005);
                if (newTP !== takeProfitMargin) {
                  adjustments.push(`เพิ่มเป้าทำกำไร (Take Profit) เป็น ${(newTP * 100).toFixed(1)}%`);
                  takeProfitMargin = newTP;
                }
                
                if (rsiThreshold < 35) {
                  const newRSI = Math.min(35, rsiThreshold + 1);
                  adjustments.push(`ฟื้นฟูความกล้าหาญ ปรับ RSI เป็น ${newRSI}`);
                  rsiThreshold = newRSI;
                }
              } else {
                lossCount++;
                consecutiveLosses++;
                
                if (consecutiveLosses >= 2) {
                  const newRSI = Math.max(20, rsiThreshold - 2);
                  if (newRSI !== rsiThreshold) {
                    adjustments.push(`แพ้ติดต่อกัน ${consecutiveLosses} ครั้ง ปรับลด RSI เป็น ${newRSI} (ให้เข้าซื้อยากขึ้น)`);
                    rsiThreshold = newRSI;
                  }
                  
                  const newSL = Math.min(0.10, stopLossMargin + 0.005);
                  if (newSL !== stopLossMargin) {
                    adjustments.push(`ขยายจุดตัดขาดทุน (Stop Loss) เป็น ${(newSL * 100).toFixed(1)}% เผื่อตลาดผันผวน`);
                    stopLossMargin = newSL;
                  }
                  
                  const newTP = Math.max(0.03, takeProfitMargin - 0.005);
                  if (newTP !== takeProfitMargin) {
                    adjustments.push(`ลดเป้าทำกำไรลงเหลือ ${(newTP * 100).toFixed(1)}% เพื่อความปลอดภัย`);
                    takeProfitMargin = newTP;
                  }
                }
              }

              // บันทึก Log การเรียนรู้
              setBotLearningLogs(prev => [{
                id: `learn-${Date.now()}`,
                timestamp: new Date().toISOString(),
                symbol: pos.symbol,
                action: isWin ? 'WIN' : 'LOSS',
                realizedPnL,
                pnlPercent,
                adjustments
              }, ...prev]);

              return { winCount, lossCount, consecutiveLosses, takeProfitMargin, stopLossMargin, rsiThreshold, macdThreshold: 0.2, maxHoldingDays: maxHoldingDays || 3, sellOnlyOnTarget: sellOnlyOnTarget || false };
            });
            // ---------------------------

            setSignals(prevSig => prevSig.map(sig => sig.symbol === pos.symbol && sig.status === 'ACTIVE'
              ? { ...sig, status: 'CLOSED', exitPrice: sellingBid, exitTimestamp: new Date().toISOString(), profitPercent: pnlPercent }
              : sig));
          } else {
            remainingPositions.push({ ...pos, currentPrice: latestPrice, holdingDays: currentHoldingDays });
            setSignals(prevSig => prevSig.map(sig => sig.symbol === pos.symbol && sig.status === 'ACTIVE'
              ? { ...sig, holdingDays: currentHoldingDays } : sig));
          }
        });

        if (newTransactions.length > 0) setTransactions(prev => [...prev, ...newTransactions]);

        return { ...prevBotPort, cash: updatedCash, positions: remainingPositions, tradesToday: currentTradesToday, lastTradeDate: currentLastTradeDate };
      });

      // 3. บอทสแกนและหาจังหวะซื้อ
      const scanInterval = botPortfolioRef.current.positions.length === 0 ? 2 : 4;
      if (tickCounter.current % scanInterval === 0) {
        const heldSymbols = botPortfolioRef.current.positions.map(p => p.symbol);
        const activeSignalSymbols = signalsRef.current.filter(s => s.status === 'ACTIVE').map(s => s.symbol);
        const excludeSymbols = new Set([...heldSymbols, ...activeSignalSymbols]);
        
        const candidateStocks = stocksRef.current.filter(s => !excludeSymbols.has(s.symbol) && s.currentPrice < 15);

        if (botPortfolioRef.current.tradesToday < 3 && candidateStocks.length > 0 && botPortfolioRef.current.cash >= 200) {
          const selectedStock = candidateStocks[Math.floor(Math.random() * candidateStocks.length)];
          const entryOffer = selectedStock.offerPrice;
          
          const analysis = generateTechnicalAnalysis(selectedStock, entryOffer, botBrainRef.current);
          const lotSize = botPortfolioRef.current.cash >= entryOffer * 200 ? 200 : 100;
          const totalCost = lotSize * entryOffer;

          if (botPortfolioRef.current.cash >= totalCost) {
            setBotPortfolio(prev => ({
              ...prev,
              cash: prev.cash - totalCost,
              tradesToday: prev.tradesToday + 1,
              lastTradeDate: getTodayDateString(),
              positions: [
                ...prev.positions,
                { symbol: selectedStock.symbol, quantity: lotSize, entryPrice: entryOffer, currentPrice: entryOffer, targetPrice: analysis.targetPrice, stopLoss: analysis.stopLoss, entryDate: new Date().toISOString(), holdingDays: 0 }
              ]
            }));

            const newSignal: TradeSignal = {
              id: `sig-sim-${Date.now()}`, symbol: selectedStock.symbol, type: 'BUY', entryPrice: entryOffer,
              targetPrice: analysis.targetPrice, stopLoss: analysis.stopLoss, timestamp: new Date().toISOString(), holdingDays: 0, status: 'ACTIVE',
              analysisReason: analysis.reason // แทรกรีพอร์ตวิเคราะห์จากบอท
            };
            setSignals(prev => [newSignal, ...prev]);

            const newTx: Transaction = {
              id: `tx-bot-buy-${Date.now()}`, symbol: selectedStock.symbol, type: 'BUY', quantity: lotSize,
              price: entryOffer, amount: totalCost, timestamp: new Date().toISOString(), owner: 'BOT'
            };
            setTransactions(prev => [...prev, newTx]);

            addToast(`บอทเจอจุดซื้อ! ${selectedStock.symbol}`, `สั่งซื้อ ${lotSize} หุ้น ที่ Offer ฿${entryOffer.toFixed(2)}`, 'buy');
            addAlertLog('BUY', selectedStock.symbol, `บอทส่งคำสั่ง BUY ${lotSize} หุ้น ที่ Offer ฿${entryOffer.toFixed(2)} (เป้า ฿${analysis.targetPrice.toFixed(2)}) มุมมอง: ${analysis.reason}`);
          }
        }
      }
    }, 60000); // <-- เปลี่ยนจาก 5000ms เป็น 60000ms (1 นาที)

    return () => clearInterval(interval);
  }, [stocks]); // นำ botPortfolio ออกจาก dependency เพื่อลดการสร้าง interval ใหม่รัวๆ

  const executeUserTrade = (symbol: string, quantity: number, price: number, type: 'BUY' | 'SELL') => {
    const todayStr = getTodayDateString();
    const totalAmount = quantity * price;

    if (type === 'BUY') {
      if (userPortfolio.cash < totalAmount) {
        addToast('ทำรายการไม่สำเร็จ', 'ยอดเงินสดของคุณไม่พอ', 'warning');
        return;
      }

      setUserPortfolio(prev => {
        let currentTradesToday = prev.tradesToday;
        if (prev.lastTradeDate !== todayStr) currentTradesToday = 0;

        const existingPosIdx = prev.positions.findIndex(p => p.symbol === symbol);
        let updatedPositions = [...prev.positions];

        if (existingPosIdx >= 0) {
          const existing = updatedPositions[existingPosIdx];
          const newQty = existing.quantity + quantity;
          const avgPrice = ((existing.quantity * existing.entryPrice) + totalAmount) / newQty;
          updatedPositions[existingPosIdx] = { ...existing, quantity: newQty, entryPrice: Math.round(avgPrice * 100) / 100, currentPrice: price };
        } else {
          updatedPositions.push({ symbol, quantity, entryPrice: price, currentPrice: price, entryDate: new Date().toISOString(), holdingDays: 0 });
        }

        return { ...prev, cash: prev.cash - totalAmount, positions: updatedPositions, tradesToday: currentTradesToday + 1, lastTradeDate: todayStr };
      });

      setTransactions(prev => [...prev, { id: `tx-user-buy-${Date.now()}`, symbol, type: 'BUY', quantity, price, amount: totalAmount, timestamp: new Date().toISOString(), owner: 'USER' }]);
      addToast('สั่งซื้อหุ้นสำเร็จ', `ซื้อ ${quantity} หุ้น มูลค่ารวม ฿${totalAmount.toFixed(2)}`, 'buy');

    } else {
      const position = userPortfolio.positions.find(p => p.symbol === symbol);
      if (!position || position.quantity < quantity) {
        addToast('ทำรายการไม่สำเร็จ', 'จำนวนหุ้นไม่พอ', 'warning');
        return;
      }

      const cost = quantity * position.entryPrice;
      const realizedPnL = totalAmount - cost;

      setUserPortfolio(prev => {
        let currentTradesToday = prev.tradesToday;
        if (prev.lastTradeDate !== todayStr) currentTradesToday = 0;

        let updatedPositions = prev.positions.map(p => {
          if (p.symbol === symbol) return { ...p, quantity: p.quantity - quantity };
          return p;
        }).filter(p => p.quantity > 0);

        return { ...prev, cash: prev.cash + totalAmount, positions: updatedPositions, tradesToday: currentTradesToday + 1, lastTradeDate: todayStr };
      });

      setTransactions(prev => [...prev, { id: `tx-user-sell-${Date.now()}`, symbol, type: 'SELL', quantity, price, amount: totalAmount, timestamp: new Date().toISOString(), realizedPnL, owner: 'USER' }]);
      addToast('ขายหุ้นสำเร็จ', `กำไร/ขาดทุนสุทธิ: ${realizedPnL >= 0 ? '+' : ''}฿${realizedPnL.toFixed(2)}`, realizedPnL >= 0 ? 'buy' : 'sell');
    }
  };

  const handleFollowTrade = (symbol: string, price: number, targetPrice: number, stopLoss: number) => {
    const maxQty = Math.floor(userPortfolio.cash / price);
    const lotQuantity = Math.floor(maxQty / 100) * 100;

    if (lotQuantity < 100) {
      addToast('เงินสดไม่พอ', `ต้องการขั้นต่ำ ฿${(price * 100).toFixed(2)} สำหรับล็อต 100 หุ้น`, 'warning');
      return;
    }

    const totalAmount = lotQuantity * price;
    const todayStr = getTodayDateString();

    setUserPortfolio(prev => {
      let currentTradesToday = prev.tradesToday;
      if (prev.lastTradeDate !== todayStr) currentTradesToday = 0;

      const existingPosIdx = prev.positions.findIndex(p => p.symbol === symbol);
      let updatedPositions = [...prev.positions];

      if (existingPosIdx >= 0) {
        const existing = updatedPositions[existingPosIdx];
        const newQty = existing.quantity + lotQuantity;
        const avgPrice = ((existing.quantity * existing.entryPrice) + totalAmount) / newQty;
        updatedPositions[existingPosIdx] = { ...existing, quantity: newQty, entryPrice: Math.round(avgPrice * 100) / 100, currentPrice: price, targetPrice, stopLoss };
      } else {
        updatedPositions.push({ symbol, quantity: lotQuantity, entryPrice: price, currentPrice: price, targetPrice, stopLoss, entryDate: new Date().toISOString(), holdingDays: 0 });
      }

      return { ...prev, cash: prev.cash - totalAmount, positions: updatedPositions, tradesToday: currentTradesToday + 1, lastTradeDate: todayStr };
    });

    setTransactions(prev => [...prev, { id: `tx-user-follow-${Date.now()}`, symbol, type: 'BUY', quantity: lotQuantity, price, amount: totalAmount, timestamp: new Date().toISOString(), owner: 'USER' }]);
    addToast(`คัดลอกสำเร็จ $${symbol}`, `เข้าซื้อ ${lotQuantity} หุ้น เป้า ฿${targetPrice.toFixed(2)}`, 'buy');
  };

  const handleToggleStarSignal = (id: string) => {
    setSignals(prev => prev.map(sig => {
      if (sig.id === id) {
        const nextStarred = !sig.isStarred;
        addToast(nextStarred ? 'ติดดาวหุ้นเรียบร้อย' : 'ยกเลิกการติดดาว', nextStarred ? `หุ้น ${sig.symbol} จะอยู่ในรายการหน้าสัญญาณนี้ตลอดไป แม้บอทจะขายแล้ว` : `หุ้น ${sig.symbol} กลับสู่สถานะสแกนปกติแล้ว`, 'buy');
        return { ...sig, isStarred: nextStarred };
      }
      return sig;
    }));
  };

  const clearAlertLogs = () => {
    setAlertLogs([]);
    addToast('เคลียร์ประวัติแล้ว', 'ลบประวัติคำสั่งบอทเรียบร้อย', 'warning');
  };

  const handleHardReset = () => {
    if (window.confirm('คุณต้องการรีเซ็ตระบบทั้งหมด ล้างประวัติ และกลับไปเริ่มต้นที่เงินสด 2,000 บาทหรือไม่?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="brand-section">
          <div className="brand-logo-container">
            <svg className="brand-logo-svg" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" fill="none"/>
            </svg>
          </div>
          <div>
            <h2 className="brand-title">BotStock</h2>
            <span className="brand-badge">SET Sim</span>
          </div>
        </div>

        <nav className="nav-menu">
          <button className={`nav-item ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setActiveTab('DASHBOARD')}>
            <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9" />
              <rect x="14" y="3" width="7" height="5" />
              <rect x="14" y="12" width="7" height="9" />
              <rect x="3" y="16" width="7" height="5" />
            </svg> ภาพรวม Dashboard
          </button>
          <button className={`nav-item ${activeTab === 'SIGNALS' ? 'active' : ''}`} onClick={() => setActiveTab('SIGNALS')}>
            <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg> สัญญาณซื้อขายบอท
          </button>
          <button className={`nav-item ${activeTab === 'USER_PORT' ? 'active' : ''}`} onClick={() => setActiveTab('USER_PORT')}>
            <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg> พอร์ตเทรดของคุณ
          </button>
          <button className={`nav-item ${activeTab === 'BOT_PORT' ? 'active' : ''}`} onClick={() => setActiveTab('BOT_PORT')}>
            <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
              <path d="M15 3v18" />
              <path d="M3 9h18" />
              <path d="M3 15h18" />
            </svg> พอร์ตเทรดของบอท
          </button>
          <button className={`nav-item ${activeTab === 'HISTORY' ? 'active' : ''}`} onClick={() => setActiveTab('HISTORY')}>
            <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg> ประวัติซื้อขายทั้งหมด
          </button>
          <button className={`nav-item ${activeTab === 'ALERTS' ? 'active' : ''}`} onClick={() => setActiveTab('ALERTS')} style={{ position: 'relative' }}>
            <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg> ฟีดคำสั่งสดบอท
            {alertLogs.length > 0 && (
              <span className="font-number" style={{
                position: 'absolute', right: '16px', background: 'var(--danger)', color: '#fff', fontSize: '9px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold', boxShadow: '0 0 8px var(--danger)'
              }}>
                {alertLogs.length}
              </span>
            )}
          </button>
          <button className={`nav-item ${activeTab === 'LEARNING' ? 'active' : ''}`} onClick={() => setActiveTab('LEARNING')}>
            <span style={{ fontSize: '18px', marginRight: '6px' }}>🧠</span> ศูนย์การเรียนรู้บอท
          </button>
        </nav>

        <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>เพิ่มหุ้นเข้าพอร์ต (Watchlist)</div>
          <form onSubmit={handleAddStock} style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
            <input 
              type="text" 
              value={newSymbol} 
              onChange={e => setNewSymbol(e.target.value)} 
              placeholder="เช่น TRUE, SCB" 
              style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-light)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '12px', textTransform: 'uppercase' }}
            />
            <button type="submit" style={{ padding: '6px 10px', borderRadius: '4px', background: 'var(--accent)', color: '#000', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', border: 'none' }}>
              +
            </button>
          </form>
          
          <button 
            onClick={handleBotScan}
            disabled={isScanning}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', background: 'linear-gradient(90deg, rgba(37,99,235,1) 0%, rgba(79,70,229,1) 100%)', color: '#fff', fontSize: '12px', fontWeight: 'bold', cursor: isScanning ? 'not-allowed' : 'pointer', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: isScanning ? 0.7 : 1 }}
          >
            {isScanning ? (
              <>
                <svg className="spinner" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                  <circle cx="12" cy="12" r="10" strokeDasharray="30 60" />
                </svg>
                กำลังสแกน...
              </>
            ) : (
              <>
                🤖 ให้บอทสแกนหาหุ้น (SET INDEX)
              </>
            )}
          </button>
          
          <button 
            onClick={handleGeminiScan}
            disabled={isScanning}
            style={{ width: '100%', marginTop: '8px', padding: '8px', borderRadius: '4px', background: 'linear-gradient(90deg, #8b5cf6 0%, #c084fc 100%)', color: '#fff', fontSize: '12px', fontWeight: 'bold', cursor: isScanning ? 'not-allowed' : 'pointer', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: isScanning ? 0.7 : 1 }}
          >
            {isScanning ? (
              <>
                <svg className="spinner" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                  <circle cx="12" cy="12" r="10" strokeDasharray="30 60" />
                </svg>
                Gemini กำลังคิด...
              </>
            ) : (
              <>
                ✨ ให้ Gemini AI วิเคราะห์สด
              </>
            )}
          </button>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '16px', fontSize: '11px', color: 'var(--text-secondary)', paddingLeft: '16px', paddingRight: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>โควตาบอทวันนี้:</span>
            <span className="font-number" style={{ color: botPortfolio.tradesToday >= 3 ? 'var(--danger)' : 'var(--accent)', fontWeight: 600 }}>{botPortfolio.tradesToday} / 3</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>โควตาผู้ใช้วันนี้:</span>
            <span className="font-number" style={{ color: '#fff', fontWeight: 600 }}>{userPortfolio.tradesToday} ธุรกรรม</span>
          </div>
          <button 
            onClick={handleHardReset}
            style={{ marginTop: '12px', width: '100%', padding: '6px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: 'var(--danger)', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            รีเซ็ตระบบทั้งหมด
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="header-panel">
          <div className="header-title-container">
            <h1>
              {activeTab === 'DASHBOARD' && 'สรุปข้อมูล Dashboard'}
              {activeTab === 'SIGNALS' && 'ศูนย์แนะนำหลักทรัพย์และสัญญาณเทรด'}
              {activeTab === 'USER_PORT' && 'พอร์ตการเทรดสะสมของคุณ'}
              {activeTab === 'BOT_PORT' && 'พอร์ตการเทรดอัตโนมัติของบอท'}
              {activeTab === 'HISTORY' && 'บันทึกธุรกรรมหลักทรัพย์ทั้งหมด'}
              {activeTab === 'ALERTS' && 'เทอร์มินัลฟีดคำสั่งซื้อขายล่าสุดของบอท'}
            </h1>
          </div>
          <div className="header-meta">
            {setIndexData && (
              <div className="font-number" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontWeight: 'bold' }}>SET:</span>
                <span style={{ color: setIndexData.change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {setIndexData.current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span style={{ fontSize: '12px', color: setIndexData.change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  ({setIndexData.change >= 0 ? '+' : ''}{setIndexData.change.toFixed(2)} | {setIndexData.changePercent >= 0 ? '+' : ''}{setIndexData.changePercent.toFixed(2)}%)
                </span>
              </div>
            )}
            <div className={`market-status font-number ${marketStatus === 'OPEN' ? '' : 'closed'}`} style={{ color: marketStatus === 'OPEN' ? 'var(--accent)' : 'var(--danger)' }}>
              {marketStatus === 'OPEN' && <span className="pulse-dot"></span>}
              {marketStatus === 'OPEN' ? 'MARKET OPEN (09:30-17:00)' : marketStatus === 'HOLIDAY' ? 'MARKET HOLIDAY (NO MOVEMENT)' : 'MARKET CLOSED'}
            </div>
            <button 
              onClick={() => fetchPrices(true)}
              style={{ 
                padding: '8px 16px', 
                borderRadius: '8px', 
                background: 'linear-gradient(135deg, #FF9900, #FF5500)', 
                color: '#fff', 
                fontSize: '14px', 
                fontWeight: 'bold', 
                cursor: 'pointer', 
                border: '1px solid #FFD580', 
                marginLeft: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                boxShadow: '0 4px 12px rgba(255, 100, 0, 0.4)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 100, 0, 0.6)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 100, 0, 0.4)'; }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              ดึงราคาล่าสุด (Refresh)
            </button>
          </div>
        </header>

        <div style={{ flexGrow: 1 }}>
          {activeTab === 'DASHBOARD' && <Dashboard botPortfolio={botPortfolio} userPortfolio={userPortfolio} stocks={stocks} transactions={transactions} botBrain={botBrain} performanceHistory={performanceHistory} onUpdateBotBrain={(updates) => setBotBrain(prev => ({...prev, ...updates}))} />}
          {activeTab === 'SIGNALS' && <TradingSignals stocks={stocks} signals={signals.filter(s => s.status === 'ACTIVE' || s.isStarred)} userCash={userPortfolio.cash} onFollowTrade={handleFollowTrade} onToggleStarSignal={handleToggleStarSignal} />}
          {activeTab === 'USER_PORT' && <UserPortfolio userPortfolio={userPortfolio} stocks={stocks} onExecuteTrade={executeUserTrade} />}
          {activeTab === 'BOT_PORT' && <BotPortfolio botPortfolio={botPortfolio} stocks={stocks} botBrain={botBrain} />}
          {activeTab === 'HISTORY' && <TransactionHistory transactions={transactions} stocks={stocks} />}
          {activeTab === 'ALERTS' && <AlertsPanel logs={alertLogs} onClearLogs={clearAlertLogs} />}
          {activeTab === 'LEARNING' && <BotLearningCenter logs={botLearningLogs} botBrain={botBrain} />}
        </div>
      </main>

      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <div style={{ fontSize: '18px' }}>
              {toast.type === 'buy' && '📥'}
              {toast.type === 'sell' && '📤'}
              {toast.type === 'warning' && '⚠️'}
            </div>
            <div className="toast-content">
              <div className="toast-title">{toast.title}</div>
              <div className="toast-desc">{toast.desc}</div>
            </div>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>&times;</button>
          </div>
        ))}
      </div>
    </div>
  );
}
