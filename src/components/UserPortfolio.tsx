import React, { useState, useEffect } from 'react';
import type { Portfolio, Stock } from '../types';

interface UserPortfolioProps {
  userPortfolio: Portfolio;
  stocks: Stock[];
  onExecuteTrade: (symbol: string, quantity: number, price: number, type: 'BUY' | 'SELL') => void;
}

export const UserPortfolio: React.FC<UserPortfolioProps> = ({
  userPortfolio,
  stocks,
  onExecuteTrade
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [tradeQty, setTradeQty] = useState<number>(100);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const hasInitialized = React.useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      if (userPortfolio.positions.length > 0) {
        setSelectedSymbol(userPortfolio.positions[0].symbol);
        hasInitialized.current = true;
      } else if (stocks.length > 0) {
        setSelectedSymbol(stocks[0].symbol);
        hasInitialized.current = true;
      }
    }
  }, [stocks, userPortfolio.positions]);

  const selectedStock = stocks.find(s => s.symbol === selectedSymbol);
  const bidPrice = selectedStock ? selectedStock.bidPrice : 0;
  const offerPrice = selectedStock ? selectedStock.offerPrice : 0;
  const estimatedCost = tradeQty * offerPrice;
  const estimatedRevenue = tradeQty * bidPrice;

  const holdingsValue = userPortfolio.positions.reduce((sum, pos) => {
    const stock = stocks.find(s => s.symbol === pos.symbol);
    const price = stock ? stock.currentPrice : pos.currentPrice;
    return sum + pos.quantity * price;
  }, 0);
  const netWorth = userPortfolio.cash + holdingsValue;
  const totalPL = netWorth - userPortfolio.startingCapital;
  const totalPLPercent = (totalPL / userPortfolio.startingCapital) * 100;

  useEffect(() => {
    if (tradeQty < 100) {
      setErrorMsg('การสั่งซื้อขายหุ้นในตลาดหลักทรัพย์ SET ต้องซื้อขั้นต่ำ 100 หุ้น');
    } else if (tradeQty % 100 !== 0) {
      setErrorMsg('จำนวนหุ้นที่เทรดต้องเป็นทวีคูณของ 100 หุ้น (เช่น 100, 200, 300 หุ้น)');
    } else {
      setErrorMsg('');
    }
  }, [tradeQty]);

  const handleBuy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSymbol || offerPrice <= 0) return;
    
    if (tradeQty < 100 || tradeQty % 100 !== 0) {
      setErrorMsg('จำนวนหุ้นต้องเป็นทวีคูณของ 100 และขั้นต่ำ 100 หุ้น');
      return;
    }

    if (estimatedCost > userPortfolio.cash) {
      setErrorMsg(`เงินสดไม่เพียงพอ! คุณมีเงินสด ฿${userPortfolio.cash.toFixed(2)} แต่ยอดสั่งซื้อที่ราคา Offer ต้องใช้ ฿${estimatedCost.toFixed(2)}`);
      return;
    }

    onExecuteTrade(selectedSymbol, tradeQty, offerPrice, 'BUY');
    setErrorMsg('');
  };

  const handleSell = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSymbol || bidPrice <= 0) return;

    if (tradeQty < 100 || tradeQty % 100 !== 0) {
      setErrorMsg('จำนวนหุ้นต้องเป็นทวีคูณของ 100 และขั้นต่ำ 100 หุ้น');
      return;
    }

    const position = userPortfolio.positions.find(p => p.symbol === selectedSymbol);
    if (!position || position.quantity < tradeQty) {
      setErrorMsg(`คุณมีหุ้น ${selectedSymbol} ไม่เพียงพอในพอร์ต (มีอยู่ ${position ? position.quantity : 0} หุ้น)`);
      return;
    }

    onExecuteTrade(selectedSymbol, tradeQty, bidPrice, 'SELL');
    setErrorMsg('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="glass-card stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>เงินสดคงเหลือในบัญชี</span>
          <span className="font-number text-primary-color" style={{ fontSize: '22px', fontWeight: 700 }}>
            ฿{userPortfolio.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>มูลค่าหุ้นทั้งหมดของคุณ</span>
          <span className="font-number" style={{ fontSize: '22px', fontWeight: 700 }}>
            ฿{holdingsValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>มูลค่าพอร์ตสุทธิ (Net Worth)</span>
          <span className={`font-number ${totalPL >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '22px', fontWeight: 700 }}>
            ฿{netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            <span style={{ fontSize: '12px', fontWeight: 500, marginLeft: '6px' }}>
              ({totalPL >= 0 ? '+' : ''}{totalPLPercent.toFixed(2)}%)
            </span>
          </span>
        </div>
      </div>

      <div className="trade-panel-layout" style={{ gridTemplateColumns: '3fr 1fr' }}>
        
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-title">
            <span>หุ้นในพอร์ตของคุณ (My Active Portfolio)</span>
            <span className="days-tag text-warning">งบตั้งต้น 2,000 THB</span>
          </div>

          <div className="custom-table-container" style={{ flexGrow: 1 }}>
            {userPortfolio.positions.length === 0 ? (
              <div className="empty-state" style={{ height: '100%', minHeight: '200px' }}>
                <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 12h8" />
                </svg>
                <div className="empty-state-title">คุณยังไม่มีหุ้นในพอร์ตโฟลิโอ</div>
                <p>ไปที่เมนู "สัญญาณซื้อขาย" หรือใช้แบบฟอร์มด้านขวาเพื่อเริ่มลงทุนล็อตแรก</p>
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
                  {userPortfolio.positions.map((pos) => {
                    const stock = stocks.find(s => s.symbol === pos.symbol);
                    const currentPrice = stock ? stock.currentPrice : pos.currentPrice;
                    const sellBid = stock ? stock.bidPrice : currentPrice;
                    const diffPercent = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100;
                    const unrealizedPnL = pos.quantity * (currentPrice - pos.entryPrice);

                    // คำนวณช่วงเปอร์เซ็นต์ระหว่าง Stop Loss และ Take Profit เพื่อทำเกจวัด
                    const tp = pos.targetPrice || (pos.entryPrice * 1.05);
                    const sl = pos.stopLoss || (pos.entryPrice * 0.97);
                    
                    const totalRange = tp - sl;
                    const positionInInterval = currentPrice - sl;
                    const barPercent = totalRange > 0 ? Math.min(100, Math.max(0, (positionInInterval / totalRange) * 100)) : 50;

                    return (
                      <tr 
                        key={pos.symbol}
                        onClick={() => setSelectedSymbol(pos.symbol)}
                        style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td>
                          <div className="stock-badge">
                            <span className="stock-symbol">{pos.symbol}</span>
                            <span className="stock-name">{stock?.name || ''}</span>
                            <span className="days-tag" style={{ alignSelf: 'flex-start', marginTop: '2px', fontSize: '9px', padding: '1px 4px' }}>
                              ถือครอง {pos.holdingDays || 0}/3 วัน
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
                          {stock && (
                            <div className="font-number" style={{ fontSize: '10px', color: 'var(--danger)' }}>
                              ขายคืนได้ที่ Bid ฿{sellBid.toFixed(2)}
                            </div>
                          )}
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

        <div className="glass-card">
          <div className="card-title">
            <span>ส่งคำสั่งซื้อขายทันที (Market Order)</span>
          </div>

          <form style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="form-group">
              <label className="form-label">เลือกหุ้นที่ต้องการสั่งซื้อขาย</label>
              <input
                type="text"
                className="form-input"
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value.toUpperCase())}
                placeholder="พิมพ์ชื่อย่อหุ้น (เช่น PTT, AOT)..."
                style={{ appearance: 'none', backgroundImage: 'radial-gradient(circle, var(--text-secondary) 1px, transparent 1px)', cursor: 'text' }}
              />
            </div>

            {selectedSymbol && !selectedStock && (
              <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', color: 'var(--danger)', fontSize: '12px', marginBottom: '16px' }}>
                ⚠️ ไม่พบหุ้นที่ต้องการ
              </div>
            )}

            {selectedStock && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', marginBottom: '16px', fontSize: '12px' }}>
                <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>ซื้อทันที (Offer)</div>
                  <div className="font-number text-success" style={{ fontWeight: 700, fontSize: '16px' }}>฿{offerPrice.toFixed(2)}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>ขายทันที (Bid)</div>
                  <div className="font-number text-danger" style={{ fontWeight: 700, fontSize: '16px' }}>฿{bidPrice.toFixed(2)}</div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">จำนวนหุ้น (หุ้น)</label>
              <input
                type="number"
                className="form-input font-number"
                min="100"
                step="100"
                value={tradeQty}
                onChange={(e) => setTradeQty(parseInt(e.target.value) || 0)}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="form-input-info">* เทรดขั้นต่ำ 100 หุ้น บวกลบทีละ 100</span>
                <span style={{ cursor: 'pointer', color: 'var(--primary)', fontSize: '11px', textDecoration: 'underline' }} onClick={() => setTradeQty(100)}>
                  รีเซ็ตขั้นต่ำ
                </span>
              </div>
            </div>

            <div style={{ borderTop: '1px dashed var(--border-light)', paddingTop: '16px', margin: '8px 0 16px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>ซื้อต้องจ่าย (Offer):</span>
                <span className="font-number" style={{ fontWeight: 700, fontSize: '15px', color: estimatedCost > userPortfolio.cash ? 'var(--danger)' : 'var(--text-primary)' }}>
                  ฿{estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>ขายจะได้เงิน (Bid):</span>
                <span className="font-number" style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                  ฿{estimatedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span>วงเงินสดของคุณ:</span>
                <span className="font-number">฿{userPortfolio.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {errorMsg && (
              <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', color: 'var(--danger)', fontSize: '12px', marginBottom: '16px' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                className={`btn btn-success ${!selectedStock || estimatedCost > userPortfolio.cash || !!errorMsg ? 'btn-disabled' : ''}`}
                onClick={handleBuy}
                disabled={!selectedStock || estimatedCost > userPortfolio.cash || !!errorMsg}
                type="button"
              >
                ซื้อ (BUY Lot)
              </button>
              <button
                className={`btn btn-danger ${!selectedStock || !!errorMsg ? 'btn-disabled' : ''}`}
                onClick={handleSell}
                disabled={!selectedStock || !!errorMsg}
                type="button"
              >
                ขาย (SELL Lot)
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
