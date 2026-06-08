import React from 'react';
import type { BotLearningLog, BotLearningState } from '../types';

interface BotLearningCenterProps {
  logs: BotLearningLog[];
  botBrain: BotLearningState;
}

export const BotLearningCenter: React.FC<BotLearningCenterProps> = ({ logs, botBrain }) => {
  const winLogs = logs.filter(log => log.action === 'WIN');
  const lossLogs = logs.filter(log => log.action === 'LOSS');
  const winCount = winLogs.length;
  const lossCount = lossLogs.length;
  const aiCount = logs.filter(log => log.action === 'AI_ANALYSIS').length;
  const totalTrades = winCount + lossCount;

  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
  
  const avgWinPercent = winCount > 0 ? winLogs.reduce((sum, log) => sum + (log.pnlPercent || 0), 0) / winCount : 0;
  const avgLossPercent = lossCount > 0 ? lossLogs.reduce((sum, log) => sum + (log.pnlPercent || 0), 0) / lossCount : 0;

  // Calculate max consecutive wins/losses from chronological logs
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;
  
  const tradeLogsChronological = [...logs].filter(log => log.action === 'WIN' || log.action === 'LOSS').reverse();
  
  tradeLogsChronological.forEach(log => {
    if (log.action === 'WIN') {
      currentWins++;
      currentLosses = 0;
      if (currentWins > maxConsecutiveWins) maxConsecutiveWins = currentWins;
    } else {
      currentLosses++;
      currentWins = 0;
      if (currentLosses > maxConsecutiveLosses) maxConsecutiveLosses = currentLosses;
    }
  });

  // Calculate cumulative PnL for chart
  let cumulativePnL = 0;
  const pnlHistory = tradeLogsChronological.map(log => {
    cumulativePnL += log.realizedPnL || 0;
    return cumulativePnL;
  });

  const chartHeight = 60;
  let pathD = "";
  let minVal = 0;
  let maxVal = 0;
  if (pnlHistory.length > 0) {
    minVal = Math.min(0, ...pnlHistory);
    maxVal = Math.max(0, ...pnlHistory);
    const range = (maxVal - minVal) || 1; 
    
    pathD = pnlHistory.map((val, i) => {
      const x = pnlHistory.length === 1 ? 50 : (i / (pnlHistory.length - 1)) * 100;
      const y = chartHeight - ((val - minVal) / range) * chartHeight;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 📊 Advanced Stats Grid */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="glass-card stat-card" style={{ borderLeft: '3px solid var(--primary)' }}>
          <div className="stat-label">🎯 อัตราชนะ (Win Rate)</div>
          <div className="stat-value font-number text-primary-color">{winRate.toFixed(1)}%</div>
          <div className="stat-sub">
            <span style={{ color: '#94a3b8' }}>ชนะ {winCount} / แพ้ {lossCount} ครั้ง</span>
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '3px solid var(--warning)' }}>
          <div className="stat-label">⚖️ กำไร/ขาดทุนเฉลี่ย</div>
          <div className="stat-value font-number">
            <span className="text-success">+{avgWinPercent.toFixed(1)}%</span>
            <span style={{ fontSize: '18px', color: 'var(--text-secondary)', margin: '0 8px' }}>/</span>
            <span className="text-danger">{avgLossPercent.toFixed(1)}%</span>
          </div>
          <div className="stat-sub">
            <span style={{ color: '#94a3b8' }}>ความคุ้มค่า (Risk/Reward)</span>
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '3px solid var(--accent)' }}>
          <div className="stat-label">🔥 สถิติชนะ/แพ้ติดกันสูงสุด</div>
          <div className="stat-value font-number">
            <span className="text-success">{maxConsecutiveWins}</span>
            <span style={{ fontSize: '18px', color: 'var(--text-secondary)', margin: '0 8px' }}>/</span>
            <span className="text-danger">{maxConsecutiveLosses}</span>
          </div>
          <div className="stat-sub">
            <span style={{ color: '#94a3b8' }}>ความเสถียรของระบบ</span>
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '3px solid #8b5cf6' }}>
          <div className="stat-label">✨ การเรียนรู้และ AI</div>
          <div className="stat-value font-number" style={{ color: '#c084fc' }}>{logs.length}</div>
          <div className="stat-sub">
            <span style={{ color: '#94a3b8' }}>บอทเทรด {totalTrades} | AI แนะนำ {aiCount}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Current Brain Parameters */}
        <div className="glass-card">
           <div className="card-title">
             <span>🧠 สถานะสมองกลปัจจุบัน (Current Parameters)</span>
           </div>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
              <div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                   <span style={{ color: 'var(--text-secondary)' }}>เป้าทำกำไร (Take Profit Limit)</span>
                   <span className="text-success font-number" style={{ fontWeight: 600 }}>+{ (botBrain.takeProfitMargin * 100).toFixed(1) }%</span>
                 </div>
                 <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (botBrain.takeProfitMargin / 0.15) * 100)}%`, background: 'var(--success)', height: '100%', transition: 'width 0.5s ease' }}></div>
                 </div>
              </div>
              
              <div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                   <span style={{ color: 'var(--text-secondary)' }}>จุดตัดขาดทุน (Stop Loss Limit)</span>
                   <span className="text-danger font-number" style={{ fontWeight: 600 }}>-{ (botBrain.stopLossMargin * 100).toFixed(1) }%</span>
                 </div>
                 <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (botBrain.stopLossMargin / 0.1) * 100)}%`, background: 'var(--danger)', height: '100%', transition: 'width 0.5s ease' }}></div>
                 </div>
              </div>

              <div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                   <span style={{ color: 'var(--text-secondary)' }}>ระดับความระมัดระวัง (RSI Filter)</span>
                   <span className="text-warning font-number" style={{ fontWeight: 600 }}>{'<'} { Math.round(botBrain.rsiThreshold) }</span>
                 </div>
                 <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${(botBrain.rsiThreshold / 100) * 100}%`, background: 'var(--warning)', height: '100%', transition: 'width 0.5s ease' }}></div>
                 </div>
              </div>
           </div>
        </div>

        {/* PnL Curve Chart */}
        <div className="glass-card">
           <div className="card-title">
             <span>📈 พัฒนาการสะสม (Cumulative PnL Trend)</span>
           </div>
           <div style={{ width: '100%', height: '180px', position: 'relative', marginTop: '16px' }}>
              {pnlHistory.length < 2 ? (
                <div className="empty-state" style={{ height: '100%', minHeight: '180px' }}>
                  <span style={{ fontSize: '24px', opacity: 0.5, marginBottom: '8px' }}>📊</span>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>ต้องมีการเทรดอย่างน้อย 2 ครั้งเพื่อสร้างกราฟ</div>
                </div>
              ) : (
                <svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  {/* Zero Line */}
                  {minVal < 0 && maxVal > 0 && (
                    <line 
                      x1="0" 
                      y1={60 - ((0 - minVal) / (maxVal - minVal) * 60)} 
                      x2="100" 
                      y2={60 - ((0 - minVal) / (maxVal - minVal) * 60)} 
                      stroke="rgba(255,255,255,0.15)" strokeDasharray="2 2" strokeWidth="0.5" 
                    />
                  )}
                  {/* Fill Gradient */}
                  <path d={`${pathD} L 100 60 L 0 60 Z`} fill="url(#pnlGradient)" opacity="0.3" />
                  {/* Line */}
                  <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  
                  <defs>
                    <linearGradient id="pnlGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" />
                      <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                </svg>
              )}
           </div>
        </div>
      </div>

      {/* 📜 Learning Logs Timeline / Table */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="card-title">
          <span>ประวัติการวิเคราะห์และปรับตัวของ Bot</span>
          <span className="pulse-dot"></span>
        </div>

        <div className="custom-table-container" style={{ flexGrow: 1, maxHeight: '600px', overflowY: 'auto' }}>
          {logs.length === 0 ? (
            <div className="empty-state" style={{ height: '200px' }}>
              <span style={{ fontSize: '32px', marginBottom: '12px' }}>🌱</span>
              <div className="empty-state-title">ยังไม่มีประวัติการเรียนรู้</div>
              <p style={{ fontSize: '12px' }}>บอทจะเริ่มบันทึกบทเรียนเมื่อมีการเทรดและรู้ผลกำไร/ขาดทุน</p>
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>เวลา</th>
                  <th>เหตุการณ์ (Trade)</th>
                  <th style={{ textAlign: 'left' }}>บทเรียนและการปรับเปลี่ยนกลยุทธ์</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const date = new Date(log.timestamp);
                  const timeStr = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  
                  return (
                    <tr key={log.id}>
                      <td style={{ verticalAlign: 'top', width: '120px' }}>
                        <div className="font-number" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{date.toLocaleDateString('th-TH')}</div>
                        <div className="font-number" style={{ fontWeight: 600 }}>{timeStr}</div>
                      </td>
                      <td style={{ verticalAlign: 'top', width: '200px' }}>
                        <div className="stock-badge" style={{ display: 'inline-flex', marginBottom: '8px' }}>
                          <span className="stock-symbol">{log.symbol}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span className={`badge-signal ${log.action === 'WIN' ? 'buy' : log.action === 'LOSS' ? 'sell' : ''}`} style={{ padding: '2px 8px', background: log.action === 'AI_ANALYSIS' ? 'linear-gradient(90deg, #8b5cf6, #c084fc)' : undefined }}>
                            {log.action === 'AI_ANALYSIS' ? 'AI SUGGEST' : log.action}
                          </span>
                          {log.action !== 'AI_ANALYSIS' && (
                            <span className={`font-number ${log.realizedPnL >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontWeight: 'bold' }}>
                              {log.realizedPnL >= 0 ? '+' : ''}{log.realizedPnL.toFixed(2)} ({log.pnlPercent >= 0 ? '+' : ''}{log.pnlPercent.toFixed(2)}%)
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'top' }}>
                        {log.adjustments.length > 0 ? (
                          <ul style={{ margin: 0, paddingLeft: '16px', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                            {log.adjustments.map((adj, i) => (
                              <li key={i}>{adj}</li>
                            ))}
                          </ul>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '12px', fontStyle: 'italic' }}>
                            ผลลัพธ์เป็นไปตามคาด ไม่มีการปรับพารามิเตอร์เพิ่มเติม
                          </span>
                        )}
                      </td>
                    </tr>
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

