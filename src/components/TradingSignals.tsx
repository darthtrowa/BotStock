import React from 'react';
import type { Stock, TradeSignal } from '../types';

interface TradingSignalsProps {
  stocks: Stock[];
  signals: TradeSignal[];
  userCash: number;
  onFollowTrade: (symbol: string, price: number, targetPrice: number, stopLoss: number) => void;
  onToggleStarSignal: (id: string) => void;
  onStockClick: (symbol: string) => void;
}

export const TradingSignals: React.FC<TradingSignalsProps> = ({
  stocks,
  signals,
  userCash,
  onFollowTrade,
  onToggleStarSignal,
  onStockClick
}) => {
  const renderSparkline = (prices: number[], isPositive: boolean) => {
    if (!prices || prices.length < 2) return null;
    const width = 120;
    const height = 30;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min === 0 ? 1 : max - min;

    const points = prices.map((price, index) => {
      const x = (index / (prices.length - 1)) * width;
      const y = height - ((price - min) / range) * height * 0.8 - height * 0.1;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <polyline
          fill="none"
          stroke={isPositive ? 'var(--success)' : 'var(--danger)'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="glass-card">
        <div className="card-title">
          <span>สแกนหุ้นเด่นราคาประหยัด (SET Index - ทุน 2,000 THB ก็เทรดได้)</span>
          <span className="days-tag text-success">สัญญาณหนุนขาขึ้น</span>
        </div>
        <div className="screener-grid">
          {stocks.map((stock) => {
            const isPositive = stock.changePercent >= 0;
            
            // ใช้ราคา Offer ในการประเมินกำลังซื้อ
            const minTradeCost = stock.offerPrice * 100;
            const canAfford = userCash >= minTradeCost;

            return (
              <div 
                className="glass-card screener-card" 
                key={stock.symbol}
                onClick={() => onStockClick(stock.symbol)}
                style={{ cursor: 'pointer', transition: 'transform 0.2s, background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div className="screener-header">
                  <div className="stock-badge">
                    <span className="stock-symbol">{stock.symbol}</span>
                    <span className="stock-name" style={{ maxWidth: '120px' }}>{stock.name}</span>
                  </div>
                  <span className={`badge-signal font-number ${isPositive ? 'buy' : 'sell'}`}>
                    {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </span>
                </div>
                <div className="screener-price font-number">
                  ฿{stock.currentPrice.toFixed(2)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  <span>Offer เสนอขาย:</span>
                  <span className="font-number" style={{ color: 'var(--danger)' }}>
                    ฿{stock.offerPrice.toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <span>Bid รับซื้อ:</span>
                  <span className="font-number" style={{ color: 'var(--success)' }}>
                    ฿{stock.bidPrice.toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span>ซื้อขั้นต่ำ (100 หุ้น):</span>
                  <span className="font-number" style={{ color: canAfford ? 'var(--text-primary)' : 'var(--danger)', fontWeight: 600 }}>
                    ฿{minTradeCost.toFixed(2)}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '8px' }}>
                  {renderSparkline(stock.history, isPositive)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card">
        <div className="card-title">
          <span>ตารางสัญญาณเข้าเทรดของบอทล่าสุด (Active Signals)</span>
          <span className="days-tag text-primary-color">ปิดงานใน 1-3 วัน</span>
        </div>

        <div className="custom-table-container">
          {signals.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <div className="empty-state-title">ขณะนี้ยังไม่มีสัญญาณ Active ใหม่</div>
              <p>บอทกำลังวิเคราะห์แนวโน้มเพื่อออกสัญญาณซื้อรอบถัดไป</p>
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>หุ้น</th>
                  <th>สัญญาณ</th>
                  <th style={{ textAlign: 'right' }}>ราคาแนะนำเข้า</th>
                  <th style={{ textAlign: 'right' }}>ราคาปัจจุบัน</th>
                  <th style={{ textAlign: 'right' }}>เป้าทำกำไร</th>
                  <th style={{ textAlign: 'right' }}>จุดตัดขาดทุน</th>
                  <th style={{ textAlign: 'center' }}>ระยะเวลาถือครอง</th>
                  <th style={{ textAlign: 'center' }}>เทรดตามบอท</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((sig) => {
                  const stock = stocks.find(s => s.symbol === sig.symbol);
                  const currentPrice = stock ? stock.currentPrice : sig.entryPrice;
                  const offerPrice = stock ? stock.offerPrice : currentPrice;
                  
                  const diffPercent = ((currentPrice - sig.entryPrice) / sig.entryPrice) * 100;
                  
                  // คำนวณราคาขั้นต่ำที่จะซื้อตามบอท (ใช้ offerPrice)
                  const minCost = offerPrice * 100;
                  const canAfford = userCash >= minCost;

                  return (
                    <React.Fragment key={sig.id}>
                      <tr 
                        onClick={() => onStockClick(sig.symbol)}
                        style={{ cursor: 'pointer' }}
                        className="clickable-row"
                      >
                        <td>
                          <div className="stock-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); onToggleStarSignal(sig.id); }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '18px',
                                padding: 0,
                                color: sig.isStarred ? '#fbbf24' : '#4b5563',
                                transition: 'transform 0.1s ease',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                              title={sig.isStarred ? 'เอาดาวออก (ปลดล็อกหุ้นนี้ให้ออกจากรายการเมื่อไม่มีสถานะ)' : 'ติดดาว (เก็บหุ้นนี้ไว้ในรายการตลอดไป แม้บอทจะปิดสถานะแล้ว)'}
                            >
                              {sig.isStarred ? '★' : '☆'}
                            </button>
                            <span className="stock-symbol">{sig.symbol}</span>
                            <span className="stock-name">{stock?.name || ''}</span>
                          </div>
                        </td>
                        <td>
                          {sig.status === 'ACTIVE' ? (
                            <span className="badge-signal buy">BUY</span>
                          ) : (
                            <span className="badge-signal sell" style={{ background: 'var(--text-secondary)', color: '#fff', boxShadow: 'none' }}>CLOSED</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }} className="font-number">
                          ฿{sig.entryPrice.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="font-number" style={{ fontWeight: 600 }}>฿{currentPrice.toFixed(2)}</div>
                          <div className={`font-number ${diffPercent >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '11px' }}>
                            {diffPercent >= 0 ? '▲' : '▼'} {diffPercent.toFixed(2)}%
                          </div>
                          {stock && sig.status === 'ACTIVE' && (
                            <div className="font-number" style={{ fontSize: '10px', color: 'var(--success)', marginTop: '2px' }}>
                              เข้าซื้อได้ที่ Offer ฿{offerPrice.toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }} className="font-number text-success">
                          ฿{sig.targetPrice.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right' }} className="font-number text-danger">
                          ฿{sig.stopLoss.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`days-tag ${sig.holdingDays >= 3 ? 'warning-alert' : ''}`}>
                            {sig.holdingDays}/3 วัน
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {sig.status === 'ACTIVE' ? (
                            <button
                              className={`copy-badge-btn ${!canAfford ? 'btn-disabled' : ''}`}
                              onClick={(e) => { e.stopPropagation(); canAfford && onFollowTrade(sig.symbol, offerPrice, sig.targetPrice, sig.stopLoss); }}
                              disabled={!canAfford}
                              title={canAfford ? 'คัดลอกคำสั่งซื้อตามบอทลงพอร์ตจำลองของคุณในคลิกเดียว (ซื้อที่ราคา Offer)' : 'เงินสดของคุณไม่พอซื้อขั้นต่ำ 100 หุ้นที่ราคา Offer ปัจจุบัน'}
                            >
                              {canAfford ? 'Follow Bot' : 'เงินไม่พอ'}
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ปิดดีลแล้ว</span>
                          )}
                        </td>
                      </tr>
                      {/* บรรทัดแสดงเหตุผลจากบอท */}
                      {sig.analysisReason && (
                        <tr>
                          <td colSpan={8} style={{ padding: '8px 16px', background: 'rgba(59, 130, 246, 0.05)', borderBottom: '1px solid var(--border-light)' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                              <span style={{ fontSize: '16px' }}>🤖</span>
                              <div>
                                <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '12px' }}>มุมมองทางเทคนิค (Bot Analysis): </span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontStyle: 'italic' }}>{sig.analysisReason}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
};
