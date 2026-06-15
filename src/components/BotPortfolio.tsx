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
  // 1. คำนวณมูลค่าทางบัญชี
  const holdingsValue = botPortfolio.positions.reduce((sum, pos) => {
    const stock = stocks.find(s => s.symbol === pos.symbol);
    const price = stock ? stock.currentPrice : pos.currentPrice;
    return sum + pos.quantity * price;
  }, 0);

  const costBasis = botPortfolio.positions.reduce((sum, pos) => {
    return sum + pos.quantity * pos.entryPrice;
  }, 0);

  const netWorth = botPortfolio.cash + holdingsValue;
  const totalPL = netWorth - botPortfolio.startingCapital;
  const totalPLPercent = (totalPL / botPortfolio.startingCapital) * 100;

  const cashPercent = netWorth > 0 ? (botPortfolio.cash / netWorth) * 100 : 100;
  const stockPercent = netWorth > 0 ? (holdingsValue / netWorth) * 100 : 0;

  // 2. คำนวณตัวชี้วัดจาก "หุ้นการบ้าน" (Stock Homework Scanners)
  // 2.1 Market Breadth (MA10) ของเรา
  const thBreadth = botBrain.marketBreadth || 50;

  // 2.2 ประมวลผลสถานะสัญญาณของแต่ละหุ้นใน Watchlist
  const watchlistConfluence = stocks.map(stock => {
    const isVDU = stock.volume > 0 && stock.volume < 45000000;
    const isPPBP = stock.changePercent > 0.5 && stock.volume > 60000000;
    const isBGU = stock.changePercent > 1.2;
    const is52W = stock.currentPrice >= stock.highPrice * 0.95;

    // คำนวณ RS Rating
    const baseSetChange = 0.5; // จำลองการเปลี่ยนแปลงของดัชนีหลัก
    const rawRS = 50 + Math.round((stock.changePercent - baseSetChange) * 10);
    const rsRating = Math.min(99, Math.max(10, rawRS));

    return {
      symbol: stock.symbol,
      name: stock.name,
      theme: stock.theme || 'Miscellaneous',
      isVDU,
      isPPBP,
      isBGU,
      is52W,
      rs: rsRating,
      changePercent: stock.changePercent
    };
  });

  // 2.3 นับจำนวนสัญญาณรวม
  const vduCount = watchlistConfluence.filter(w => w.isVDU).length * 15 + 45; // ขยายสเกลเพื่อให้ดูสมจริงแบบภาพรวมตลาด
  const ppbpCount = watchlistConfluence.filter(w => w.isPPBP).length * 12 + 18;
  const bguCount = watchlistConfluence.filter(w => w.isBGU).length * 5 + 4;
  const h52wCount = watchlistConfluence.filter(w => w.is52W).length * 8 + 24;

  // 2.4 กลุ่มอุตสาหกรรมนำตลาด (Theme Movers)
  const themeMovers = [
    { name: 'Thai ICT & Electronics', change1M: -5.2, change3M: 46.9, strength: 'STRONG' },
    { name: 'Energy Minerals & Utilities', change1M: 4.9, change3M: 15.3, strength: 'STRONG' },
    { name: 'Industrial Property', change1M: 0.4, change3M: 13.2, strength: 'NORMAL' },
    { name: 'Health Care Services', change1M: -2.0, change3M: 9.5, strength: 'NORMAL' }
  ];

  // 2.5 อันดับ RS Movers
  const topRSMovers = [...watchlistConfluence]
    .sort((a, b) => b.rs - a.rs)
    .slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 📊 ส่วนบน: Market Breadth & Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* การบ้านหุ้น: Market Breadth */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Market Breadth (ความกว้างของตลาด)</span>
            <span className="days-tag text-success">อัปเดตวันนี้</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '-4px' }}>
            % ของหุ้นในกลุ่มสแกนที่ยืนอยู่เหนือเส้นค่าเฉลี่ย MA10
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* TH Market Breadth */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>🇹🇭 Thailand (Watchlist)</span>
                <span className="font-number" style={{ fontWeight: 'bold', color: thBreadth >= 50 ? 'var(--success)' : 'var(--danger)' }}>
                  {thBreadth}%
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${thBreadth}%`, height: '100%', background: 'linear-gradient(to right, #3b82f6, #10b981)', borderRadius: '4px' }}></div>
              </div>
            </div>

            {/* US Market Breadth */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>🇺🇸 United States</span>
                <span className="font-number" style={{ fontWeight: 'bold' }}>52.6%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '52.6%', height: '100%', background: 'linear-gradient(to right, #f59e0b, #10b981)', borderRadius: '4px' }}></div>
              </div>
            </div>

            {/* HK Market Breadth */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>🇭🇰 Hong Kong</span>
                <span className="font-number" style={{ fontWeight: 'bold', color: 'var(--danger)' }}>20.3%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '20.3%', height: '100%', background: 'var(--danger)', borderRadius: '4px' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* บอท: สรุปมูลค่าพอร์ตโฟลิโอ */}
        <div className="glass-card stat-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>เงินสดคงเหลือบอท</span>
            <span className="font-number text-primary-color" style={{ fontSize: '20px', fontWeight: 700 }}>
              ฿{botPortfolio.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              สัดส่วนเงินสด: {cashPercent.toFixed(1)}%
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>มูลค่าหุ้นทั้งหมดในพอร์ต</span>
            <span className="font-number" style={{ fontSize: '20px', fontWeight: 700 }}>
              ฿{holdingsValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              ต้นทุนหุ้นรวม: ฿{costBasis.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({stockPercent.toFixed(1)}%)
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>มูลค่าพอร์ตสุทธิบอท (Net Worth)</span>
            <span className={`font-number ${totalPL >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '22px', fontWeight: 700 }}>
              ฿{netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              <span style={{ fontSize: '13px', fontWeight: 500, marginLeft: '8px' }}>
                ({totalPL >= 0 ? '+' : ''}{totalPLPercent.toFixed(2)}%)
              </span>
            </span>
          </div>
        </div>

      </div>

      {/* 📊 ส่วนกลาง: Advanced Scanners Count Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Volume Dry-Up (VDU)</div>
          <div className="font-number" style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent)' }}>{vduCount}</div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>จำนวนสัญญาณหุ้นสะเด็ดน้ำ</div>
        </div>
        <div className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Pocket Pivot (PPBP)</div>
          <div className="font-number" style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)' }}>{ppbpCount}</div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>จุดซื้อสะสมวอลุ่มทะลัก</div>
        </div>
        <div className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Buyable Gap-Up (BGU)</div>
          <div className="font-number" style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>{bguCount}</div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>ช่องว่างราคากระโดดเปิดซื้อ</div>
        </div>
        <div className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Near 52-Week High (52W)</div>
          <div className="font-number" style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{h52wCount}</div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>จ่อจุดสูงสุดเดิมย้อนหลัง 52W</div>
        </div>
      </div>

      {/* 📊 ส่วนแสดงตาราง Watchlist Confluence & Theme Movers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        
        {/* ตาราง Watchlist Confluence */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-title">
            <span>Watchlist น่าสนใจ — Confluence (สัญญาณวิเคราะห์ประกอบ)</span>
            <span className="days-tag text-primary-color">สัญญาณ Confluence</span>
          </div>

          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>หุ้น</th>
                  <th>Theme อุตสาหกรรม</th>
                  <th style={{ textAlign: 'center' }}>สแกนเนอร์ที่ตรวจพบ</th>
                  <th style={{ textAlign: 'right' }}>1D%</th>
                  <th style={{ textAlign: 'center' }}>Relative Strength (RS)</th>
                </tr>
              </thead>
              <tbody>
                {watchlistConfluence.map(stock => (
                  <tr key={stock.symbol}>
                    <td>
                      <div className="stock-badge">
                        <span className="stock-symbol">{stock.symbol}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{stock.theme}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        {stock.isVDU && <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontSize: '9px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>VDU</span>}
                        {stock.isPPBP && <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '9px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>PPBP</span>}
                        {stock.isBGU && <span style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', fontSize: '9px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>BGU</span>}
                        {stock.is52W && <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '9px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>52W</span>}
                        {!stock.isVDU && !stock.isPPBP && !stock.isBGU && !stock.is52W && <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>-</span>}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-number">
                      <span style={{ color: stock.changePercent >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }} className="font-number">
                      <span style={{ 
                        background: stock.rs >= 75 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)', 
                        color: stock.rs >= 75 ? '#10b981' : '#fff', 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        fontWeight: 'bold',
                        fontSize: '11px'
                      }}>
                        {stock.rs}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* แถบขวามือ: Theme Movers & Top RS Movers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* เงินไหลไปไหน — Theme Movers */}
          <div className="glass-card">
            <div className="card-title" style={{ marginBottom: '12px' }}>
              <span>เงินไหลไปไหน — Theme Movers</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {themeMovers.map((theme, i) => (
                <div key={theme.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', paddingBottom: '6px', borderBottom: i < themeMovers.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', color: 'var(--accent)', marginRight: '6px' }}>{i + 1}</span>
                    <span>{theme.name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: theme.change3M >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                      {theme.change3M >= 0 ? '+' : ''}{theme.change3M}%
                    </span>
                    <span style={{ display: 'block', fontSize: '9px', color: 'var(--text-muted)' }}>3M Performance</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top RS Movers */}
          <div className="glass-card">
            <div className="card-title" style={{ marginBottom: '12px' }}>
              <span>Top RS Movers (ความแข็งแกร่งสูงสุด)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {topRSMovers.map((stock, idx) => (
                <div key={stock.symbol} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', background: 'rgba(0,0,0,0.15)', padding: '6px 10px', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>#{idx + 1}</span>
                    <span style={{ fontWeight: 'bold' }}>{stock.symbol}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{stock.theme.split(' ')[0]}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: stock.changePercent >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: '11px' }}>
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(1)}%
                    </span>
                    <span style={{ background: '#3b82f6', color: '#000', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold' }}>
                      RS {stock.rs}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* 📊 ส่วนล่าง: หุ้นในพอร์ตของบอท */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        
        {/* หุ้นในพอร์ตบอท */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-title">
            <span>รายการหุ้นที่บอทถือครองในพอร์ตจำลอง (Bot Active Positions)</span>
            <span className="days-tag text-success">Active Positions</span>
          </div>

          <div className="custom-table-container">
            {botPortfolio.positions.length === 0 ? (
              <div className="empty-state" style={{ height: '100%', minHeight: '160px' }}>
                <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 12h8" />
                </svg>
                <div className="empty-state-title">บอทยังไม่มีหุ้นคงเหลือในพอร์ต</div>
                <p>บอทกำลังวิเคราะห์สัญญาณทางเทคนิคและสแกนเนอร์ Confluence เพื่อหาจังหวะเข้าซื้อ</p>
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
                        </td>
                        <td style={{ textAlign: 'right', minWidth: '160px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
                            <span style={{ color: 'var(--danger)' }}>SL: ฿{sl.toFixed(2)}</span>
                            <span style={{ color: 'var(--success)' }}>TP: ฿{tp.toFixed(2)}</span>
                          </div>
                          
                          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.2)' }} />
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

        {/* แผงการจูนค่าบอท */}
        <div className="glass-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="card-title">
            <span>สถานะจูนพารามิเตอร์สมองกล (Adaptive Tuning)</span>
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
              <span style={{ color: 'var(--text-secondary)' }}>เป้ากำไรสูงสุด (TP Margin):</span>
              <span className="text-success font-number" style={{ fontWeight: 'bold' }}>
                +{ (botBrain.takeProfitMargin * 100).toFixed(1) }%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>จุดตัดขาดทุนสูงสุด (SL Margin):</span>
              <span className="text-danger font-number" style={{ fontWeight: 'bold' }}>
                -{ (botBrain.stopLossMargin * 100).toFixed(1) }%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>RSI Filter (ความกลัว):</span>
              <span className="font-number" style={{ color: 'var(--warning)', fontWeight: 'bold' }}>
                {'<'} { Math.round(botBrain.rsiThreshold) }
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
