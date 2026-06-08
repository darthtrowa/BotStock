import React from 'react';
import type { Portfolio, Stock, Transaction, BotLearningState } from '../types';
import { PerformanceChart } from './PerformanceChart';

interface DashboardProps {
  botPortfolio: Portfolio;
  userPortfolio: Portfolio;
  stocks: Stock[];
  transactions: Transaction[];
  botBrain: BotLearningState;
  performanceHistory: Array<{ day: string; botVal: number; setVal: number }>;
  onUpdateBotBrain: (updates: Partial<BotLearningState>) => void;
}
export const Dashboard: React.FC<DashboardProps> = ({
  botPortfolio,
  userPortfolio,
  stocks,
  transactions,
  botBrain,
  performanceHistory,
  onUpdateBotBrain
}) => {
  // คำนวณต้นทุนสะสมของบอท (เพื่อไม่ให้ Net Worth แกว่ง)
  const botCostBasis = botPortfolio.positions.reduce((sum, pos) => sum + (pos.quantity * pos.entryPrice), 0);
  
  // 1. มูลค่าพอร์ตบอท (Net Worth) = เงินสด + ต้นทุนหุ้น (ไม่ผันผวนตามราคาตลาด จนกว่าจะขาย)
  const botNetWorth = botPortfolio.cash + botCostBasis;

  // คำนวณมูลค่าหุ้นปัจจุบันของบอท
  const botHoldingsValue = botPortfolio.positions.reduce((sum, pos) => {
    const stock = stocks.find(s => s.symbol === pos.symbol);
    const price = stock ? stock.currentPrice : pos.currentPrice;
    return sum + pos.quantity * price;
  }, 0);

  // 2. กำไรสะสมบอท = กำไรรับรู้แล้ว (Realized) + กำไรแฝง (Unrealized ที่ผันผวนตามตลาด)
  const botUnrealizedPnL = botHoldingsValue - botCostBasis;
  const botRealizedPnL = botNetWorth - botPortfolio.startingCapital;
  const botPL = botRealizedPnL + botUnrealizedPnL;
  const botPLPercent = (botPL / botPortfolio.startingCapital) * 100;

  // ทำเช่นเดียวกันกับพอร์ตผู้ใช้เพื่อความสอดคล้อง
  const userCostBasis = userPortfolio.positions.reduce((sum, pos) => sum + (pos.quantity * pos.entryPrice), 0);
  const userNetWorth = userPortfolio.cash + userCostBasis;
  const userHoldingsValue = userPortfolio.positions.reduce((sum, pos) => {
    const stock = stocks.find(s => s.symbol === pos.symbol);
    const price = stock ? stock.currentPrice : pos.currentPrice;
    return sum + pos.quantity * price;
  }, 0);
  const userUnrealizedPnL = userHoldingsValue - userCostBasis;
  const userRealizedPnL = userNetWorth - userPortfolio.startingCapital;
  const userPL = userRealizedPnL + userUnrealizedPnL;
  const userPLPercent = (userPL / userPortfolio.startingCapital) * 100;

  // คำนวณ Win Rate ของบอทจากประวัติทำรายการย้อนหลัง
  const botSales = transactions.filter(t => t.owner === 'BOT' && t.type === 'SELL');
  const botWins = botSales.filter(s => (s.realizedPnL || 0) > 0).length;
  const botWinRate = botSales.length > 0 ? (botWins / botSales.length) * 100 : 75; // ค่า Default หากเริ่มแรกไม่มีประวัติ

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 📊 Stat Cards (KPI Grid) */}
      {/* Bot Brain Widget */}
      <div className="glass-card" style={{ marginBottom: '16px', borderLeft: '4px solid #8b5cf6', background: 'linear-gradient(to right, rgba(139, 92, 246, 0.1), rgba(0,0,0,0))' }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '20px' }}>🧠</span> 
          <span>Bot Brain (AI Learning State)</span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'normal', marginLeft: 'auto' }}>ปรับจูนพารามิเตอร์อัตโนมัติตามสภาวะตลาด</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', flex: 1, minWidth: '150px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>อัตราชนะ (Win Rate)</div>
            <div className="font-number" style={{ fontSize: '20px', color: 'var(--accent)', fontWeight: 'bold' }}>
              {botBrain.winCount + botBrain.lossCount > 0 
                ? ((botBrain.winCount / (botBrain.winCount + botBrain.lossCount)) * 100).toFixed(1) 
                : '0.0'}%
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>ชนะ {botBrain.winCount} | แพ้ {botBrain.lossCount}</div>
          </div>
          
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', flex: 1, minWidth: '150px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>เป้าทำกำไร (Take Profit)</div>
            <div className="font-number" style={{ fontSize: '20px', color: '#10b981', fontWeight: 'bold' }}>
              +{(botBrain.takeProfitMargin * 100).toFixed(1)}%
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>ปรับเป้าขึ้นเมื่อชนะติดกัน</div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', flex: 1, minWidth: '150px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>จุดตัดขาดทุน (Stop Loss)</div>
            <div className="font-number" style={{ fontSize: '20px', color: '#ef4444', fontWeight: 'bold' }}>
              -{(botBrain.stopLossMargin * 100).toFixed(1)}%
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>ขยายออกเมื่อพอร์ตโดนสะบัด</div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', flex: 1, minWidth: '150px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>เงื่อนไข RSI (ความกลัว)</div>
            <div className="font-number" style={{ fontSize: '20px', color: '#f59e0b', fontWeight: 'bold' }}>
              {'<'} {Math.round(botBrain.rsiThreshold)}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>กดต่ำลงให้เข้ายากขึ้นเมื่อเพิ่งแพ้มา</div>
          </div>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>วันถือครองสูงสุด (Max Holding Days)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="number" 
                min="1" 
                max="30"
                value={botBrain.maxHoldingDays} 
                onChange={(e) => onUpdateBotBrain({ maxHoldingDays: Number(e.target.value) || 3 })}
                style={{ width: '60px', padding: '6px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '14px' }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>วัน (ขายเมื่อครบกำหนด)</span>
            </div>
          </div>
          
          <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={botBrain.sellOnlyOnTarget} 
                onChange={(e) => onUpdateBotBrain({ sellOnlyOnTarget: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#8b5cf6' }}
              />
              <div>
                <div style={{ fontSize: '12px', color: '#fff' }}>ไม่ขายถ้าไม่กำไรหรือขาดทุนตามที่ตั้งไว้</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>เมื่อครบกำหนดวัน บอทจะรอให้ถึง TP หรือ SL เท่านั้น</div>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="stat-grid">
        
        {/* บอท: มูลค่าสินทรัพย์สุทธิ */}
        <div className="glass-card stat-card" style={{ borderLeft: '3px solid var(--primary)' }}>
          <div className="stat-label">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            เงินสดคงเหลือบอท (Available Cash)
          </div>
          <div className="stat-value font-number text-primary-color">
            ฿{botPortfolio.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="stat-sub">
            <span className="font-number" style={{ color: '#94a3b8' }}>ทุนเริ่มต้น: ฿{botPortfolio.startingCapital}</span>
          </div>
        </div>

        {/* บอท: ผลกำไรขาดทุนสะสม */}
        <div className="glass-card stat-card" style={{ borderLeft: `3px solid ${botPL >= 0 ? 'var(--success)' : 'var(--danger)'}` }}>
          <div className="stat-label">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            กำไรสะสมบอท (Total Profit)
          </div>
          <div className={`stat-value font-number ${botPL >= 0 ? 'text-success' : 'text-danger'}`}>
            {botPL >= 0 ? '+' : ''}{botPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="stat-sub">
            <span className={`badge-signal font-number ${botPL >= 0 ? 'buy' : 'sell'}`} style={{ padding: '1px 6px', fontSize: '10px' }}>
              {botPL >= 0 ? '▲' : '▼'} {botPLPercent.toFixed(2)}%
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: '4px' }}>Win Rate: {botWinRate.toFixed(0)}%</span>
          </div>
        </div>

        {/* ผู้ใช้: มูลค่าพอร์ตจำลอง */}
        <div className="glass-card stat-card" style={{ borderLeft: '3px solid var(--warning)' }}>
          <div className="stat-label">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            เงินสดของคุณ (Available Cash)
          </div>
          <div className="stat-value font-number text-warning">
            ฿{userPortfolio.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="stat-sub">
            <span className="font-number" style={{ color: '#94a3b8' }}>ทุนเริ่มต้น: ฿{userPortfolio.startingCapital}</span>
          </div>
        </div>

        {/* ผู้ใช้: กำไรของคุณ */}
        <div className="glass-card stat-card" style={{ borderLeft: `3px solid ${userPL >= 0 ? 'var(--success)' : 'var(--danger)'}` }}>
          <div className="stat-label">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            กำไรของคุณ (User Profit)
          </div>
          <div className={`stat-value font-number ${userPL >= 0 ? 'text-success' : 'text-danger'}`}>
            {userPL >= 0 ? '+' : ''}{userPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="stat-sub">
            <span className={`badge-signal font-number ${userPL >= 0 ? 'buy' : 'sell'}`} style={{ padding: '1px 6px', fontSize: '10px' }}>
              {userPL >= 0 ? '▲' : '▼'} {userPLPercent.toFixed(2)}%
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: '4px' }}>งบหลัก: ฿2,000</span>
          </div>
        </div>

      </div>

      {/* 📈 กราฟผลงานบอทกับตลาด และ สินทรัพย์ปัจจุบันบอท */}
      <div className="dashboard-row">
        
        {/* คอมโพเนนต์กราฟแสดงผลผลงานบอทจำลอง */}
        <PerformanceChart performanceHistory={performanceHistory} />

        {/* แถบสินทรัพย์คงค้างของบอท */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-title">
            <span>หุ้นในพอร์ตของบอท</span>
            <span className="pulse-dot"></span>
          </div>

          <div className="custom-table-container" style={{ flexGrow: 1 }}>
            {botPortfolio.positions.length === 0 ? (
              <div className="empty-state" style={{ height: '100%' }}>
                <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                <div className="empty-state-title">บอทไม่มีหุ้นในพอร์ตโฟลิโอ</div>
                <p style={{ fontSize: '11px' }}>บอทกำลังมองหาจังหวะที่เหมาะสมสำหรับการเปิดสถานะ</p>
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>หุ้น</th>
                    <th style={{ textAlign: 'right' }}>จำนวน/ทุน</th>
                    <th style={{ textAlign: 'right' }}>กำไร/ขาดทุน</th>
                  </tr>
                </thead>
                <tbody>
                  {botPortfolio.positions.map((pos) => {
                    const stock = stocks.find(s => s.symbol === pos.symbol);
                    const currentPrice = stock ? stock.currentPrice : pos.currentPrice;
                    const diffPrice = currentPrice - pos.entryPrice;
                    const diffPercent = (diffPrice / pos.entryPrice) * 100;
                    const unrealizedPnL = pos.quantity * diffPrice;
                    
                    return (
                      <tr key={pos.symbol}>
                        <td>
                          <div className="stock-badge">
                            <span className="stock-symbol">{pos.symbol}</span>
                            <span className="days-tag" style={{ alignSelf: 'flex-start', marginTop: '2px', fontSize: '9px', padding: '1px 4px' }}>
                              ถือครอง {pos.holdingDays}/3 วัน
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="font-number" style={{ fontWeight: 600 }}>{pos.quantity} หุ้น</div>
                          <div className="font-number" style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                            avg ฿{pos.entryPrice.toFixed(2)}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className={`font-number ${unrealizedPnL >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontWeight: 600 }}>
                            {unrealizedPnL >= 0 ? '+' : ''}{unrealizedPnL.toFixed(2)}
                          </div>
                          <div className={`font-number ${diffPercent >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '11px' }}>
                            {diffPercent >= 0 ? '▲' : '▼'} {diffPercent.toFixed(2)}%
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span>เงินสดสำรองบอท:</span>
            <span className="font-number" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              ฿{botPortfolio.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
