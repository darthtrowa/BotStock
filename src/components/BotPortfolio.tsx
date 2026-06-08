import React from 'react';
import type { Portfolio, Stock, BotLearningState } from '../types';

interface BotPortfolioProps {
  botPortfolio: Portfolio;
  stocks: Stock[];
  botBrain: BotLearningState;
}

export const BotPortfolio: React.FC<BotPortfolioProps> = ({
  botPortfolio,
  stocks,
  botBrain
}) => {
  // คำนวณมูลค่าหุ้นปัจจุบันของบอท
  const holdingsValue = botPortfolio.positions.reduce((sum, pos) => {
    const stock = stocks.find(s => s.symbol === pos.symbol);
    const price = stock ? stock.currentPrice : pos.currentPrice;
    return sum + pos.quantity * price;
  }, 0);

  // คำนวณต้นทุนหุ้นของบอท
  const costBasis = botPortfolio.positions.reduce((sum, pos) => {
    return sum + pos.quantity * pos.entryPrice;
  }, 0);

  const netWorth = botPortfolio.cash + holdingsValue;
  const totalPL = netWorth - botPortfolio.startingCapital;
  const totalPLPercent = (totalPL / botPortfolio.startingCapital) * 100;

  // เปอร์เซ็นต์การถือครองหุ้นในพอร์ต (Asset Allocation)
  const cashPercent = netWorth > 0 ? (botPortfolio.cash / netWorth) * 100 : 100;
  const stockPercent = netWorth > 0 ? (holdingsValue / netWorth) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 📊 Stat Grid */}
      <div className="glass-card stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>เงินสดคงเหลือบอท (Available Cash)</span>
          <span className="font-number text-primary-color" style={{ fontSize: '22px', fontWeight: 700 }}>
            ฿{botPortfolio.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            สัดส่วนเงินสด: {cashPercent.toFixed(1)}%
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>มูลค่าหุ้นทั้งหมดในมือบอท</span>
          <span className="font-number" style={{ fontSize: '22px', fontWeight: 700 }}>
            ฿{holdingsValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            ต้นทุนหุ้นรวม: ฿{costBasis.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({stockPercent.toFixed(1)}%)
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>มูลค่าพอร์ตสุทธิบอท (Net Worth)</span>
          <span className={`font-number ${totalPL >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '22px', fontWeight: 700 }}>
            ฿{netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            <span style={{ fontSize: '12px', fontWeight: 500, marginLeft: '6px' }}>
              ({totalPL >= 0 ? '+' : ''}{totalPLPercent.toFixed(2)}%)
            </span>
          </span>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            ทุนเริ่มต้น: ฿{botPortfolio.startingCapital.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="trade-panel-layout" style={{ gridTemplateColumns: '1fr 320px' }}>
        
        {/* หุ้นในพอร์ตของบอท */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-title">
            <span>รายการหุ้นที่บอทถือครองในพอร์ตจำลอง (Bot Active Positions)</span>
            <span className="days-tag text-success">บอทวิเคราะห์แบบเรียลไทม์</span>
          </div>

          <div className="custom-table-container" style={{ flexGrow: 1 }}>
            {botPortfolio.positions.length === 0 ? (
              <div className="empty-state" style={{ height: '100%', minHeight: '260px' }}>
                <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 12h8" />
                </svg>
                <div className="empty-state-title">บอทยังไม่มีหุ้นคงเหลือในพอร์ต</div>
                <p>ขณะนี้บอทกำลังสแกนหาจังหวะทางเทคนิค (EMA/RSI) เพื่อทะยอยเข้าซื้อหุ้นล็อตถัดไป</p>
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>หุ้น</th>
                    <th style={{ textAlign: 'right' }}>จำนวน/ทุน</th>
                    <th style={{ textAlign: 'right' }}>ราคาปัจจุบัน</th>
                    <th style={{ textAlign: 'right' }}>ขอบเขต Take Profit / Stop Loss</th>
                    <th style={{ textAlign: 'right' }}>กำไร/ขาดทุนสะสม</th>
                  </tr>
                </thead>
                <tbody>
                  {botPortfolio.positions.map((pos) => {
                    const stock = stocks.find(s => s.symbol === pos.symbol);
                    const currentPrice = stock ? stock.currentPrice : pos.currentPrice;
                    const diffPercent = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100;
                    const unrealizedPnL = pos.quantity * (currentPrice - pos.entryPrice);

                    // คำนวณช่วงเปอร์เซ็นต์ระหว่าง Stop Loss และ Take Profit เพื่อทำเกจวัด
                    const tp = pos.targetPrice || (pos.entryPrice * (1 + botBrain.takeProfitMargin));
                    const sl = pos.stopLoss || (pos.entryPrice * (1 - botBrain.stopLossMargin));
                    
                    const totalRange = tp - sl;
                    const positionInInterval = currentPrice - sl;
                    const barPercent = totalRange > 0 ? Math.min(100, Math.max(0, (positionInInterval / totalRange) * 100)) : 50;

                    return (
                      <tr key={pos.symbol}>
                        <td>
                          <div className="stock-badge">
                            <span className="stock-symbol">{pos.symbol}</span>
                            <span className="stock-name">{stock?.name || ''}</span>
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
                          <div className="font-number" style={{ fontWeight: 600 }}>฿{currentPrice.toFixed(2)}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                            สูงสุด: ฿{stock?.highPrice.toFixed(2) || '0.00'}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', minWidth: '180px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
                            <span style={{ color: 'var(--danger)' }}>SL: ฿{sl.toFixed(2)}</span>
                            <span style={{ color: 'var(--success)' }}>TP: ฿{tp.toFixed(2)}</span>
                          </div>
                          
                          {/* Visual Progress Bar */}
                          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                            {/* กึ่งกลาง (ทุน) */}
                            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.2)' }} />
                            {/* ตำแหน่งราคาปัจจุบัน */}
                            <div 
                              style={{ 
                                position: 'absolute', 
                                left: 0, 
                                top: 0, 
                                bottom: 0, 
                                width: `${barPercent}%`, 
                                background: barPercent >= 50 
                                  ? 'linear-gradient(to right, var(--warning), var(--success))'
                                  : 'linear-gradient(to right, var(--danger), var(--warning))',
                                borderRadius: '3px',
                                transition: 'width 0.3s ease'
                              }} 
                            />
                          </div>
                          <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px', textAlign: 'center' }}>
                            ราคาห่างจากเป้ากำไร: {(((tp - currentPrice)/currentPrice)*100).toFixed(1)}%
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
        </div>

        {/* บล็อกแผงสมองกลการเรียนรู้ของบอท */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="glass-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
            <div className="card-title">
              <span>สถานะสมองกล (Bot Learning)</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>อัตราชนะรวม (Win Rate):</span>
                <span className="font-number" style={{ color: 'var(--accent)', fontWeight: 'bold' }}>
                  {botBrain.winCount + botBrain.lossCount > 0 
                    ? ((botBrain.winCount / (botBrain.winCount + botBrain.lossCount)) * 100).toFixed(1) 
                    : '0.0'}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>ผลรวมแพ้/ชนะ:</span>
                <span className="font-number" style={{ color: '#fff' }}>
                  ชนะ {botBrain.winCount} / แพ้ {botBrain.lossCount} ครั้ง
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>แพ้ต่อเนื่อง (Consecutive Losses):</span>
                <span className="font-number" style={{ color: botBrain.consecutiveLosses > 0 ? 'var(--danger)' : '#fff' }}>
                  {botBrain.consecutiveLosses} ครั้ง
                </span>
              </div>
              
              <div style={{ marginTop: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>พารามิเตอร์ประเมินสัญญาตลาด</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span>Take Profit Limit:</span>
                      <span className="text-success font-number">+{ (botBrain.takeProfitMargin * 100).toFixed(1) }%</span>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span>Stop Loss Limit:</span>
                      <span className="text-danger font-number">-{ (botBrain.stopLossMargin * 100).toFixed(1) }%</span>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span>RSI Filter Threshold:</span>
                      <span className="font-number" style={{ color: 'var(--warning)' }}>RSI {'<'} { Math.round(botBrain.rsiThreshold) }</span>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>

          <div className="glass-card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff', display: 'block', marginBottom: '6px' }}>🤖 วิธีการทำงานของบอท</span>
              บอทจะคำนวณและปรับเปลี่ยนพารามิเตอร์การเข้าเทรดโดยอัตโนมัติ 
              หากบอททำกำไรได้สำเร็จ (Take Profit) บอทจะเพิ่มเป้าทำกำไร TP ขึ้นเพื่อสร้างกำไรให้สูงขึ้น 
              แต่หากบอทตัดขาดทุน (Stop Loss) ต่อเนื่องกัน บอทจะปรับตัวด้วยการลดความคาดหวัง TP ลง และลดเกณฑ์ RSI ลง เพื่อเลือกซื้อเฉพาะหุ้นที่ราคาลงลึกและปลอดภัยที่สุดเท่านั้น (Self-Learning Algorithm)
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
