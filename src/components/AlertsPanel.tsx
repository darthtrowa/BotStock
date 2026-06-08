import React from 'react';

export interface AlertLogEntry {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL' | 'SYSTEM' | 'LIMIT';
  message: string;
  timestamp: string;
  profitPercent?: number;
}

interface AlertsPanelProps {
  logs: AlertLogEntry[];
  onClearLogs: () => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  logs,
  onClearLogs
}) => {
  // ตัวช่วยแสดงสัญลักษณ์สีตามชนิดของ Log
  const getLogStyle = (type: string) => {
    switch (type) {
      case 'BUY':
        return { icon: '📥', colorClass: 'buy', label: 'สัญญาณซื้อ' };
      case 'SELL':
        return { icon: '📤', colorClass: 'sell', label: 'สัญญาณขาย' };
      case 'LIMIT':
        return { icon: '⚠️', colorClass: 'warning', label: 'คำเตือนล็อต' };
      default:
        return { icon: '⚙️', colorClass: 'primary', label: 'ระบบบอท' };
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' น.';
    } catch {
      return isoString;
    }
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '380px' }}>
      <div className="card-title" style={{ marginBottom: '8px' }}>
        <span>ศูนย์รวมสัญญาณแจ้งเตือนบอทสด (Live Signals Ticker)</span>
        
        {logs.length > 0 && (
          <button
            className="btn btn-outline"
            style={{ padding: '2px 8px', fontSize: '10px', borderRadius: '4px' }}
            onClick={onClearLogs}
          >
            ล้างบันทึก
          </button>
        )}
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px' }}>
        ฟีดจำลองการออกสัญญาณเทรดแบบนาทีต่อนนาที (Real-time updates) สะท้อนวินัยการตัดทำกำไร/ตัดขาดทุนระยะสั้นอย่างเด็ดขาด
      </p>

      {/* บล็อกเทอร์มินัลแสดงผลแจ้งเตือน */}
      <div
        className="alert-feed-list"
        style={{
          flexGrow: 1,
          padding: '12px',
          background: 'rgba(5, 7, 16, 0.9)',
          border: '1px solid var(--border-light)',
          borderRadius: '12px',
          fontFamily: 'Consolas, Monaco, monospace',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.8)'
        }}
      >
        {logs.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-th)', padding: '20px 0' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🛰️</div>
            <p style={{ fontSize: '12px' }}>เครื่องรับสัญญาณกำลังเชื่อมต่อ... รอรับข่าวสารคำสั่งซื้อขายบอทตัวแรก</p>
          </div>
        ) : (
          logs.slice().reverse().map((log) => {
            const style = getLogStyle(log.type);
            
            return (
              <div
                key={log.id}
                className="alert-feed-item"
                style={{
                  background: 'rgba(255,255,255,0.01)',
                  border: 'none',
                  padding: '8px',
                  borderRadius: '6px',
                  lineHeight: '1.4',
                  fontSize: '11.5px',
                  borderLeft: `2.5px solid var(--${style.colorClass})`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="font-number" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                    [{formatTime(log.timestamp)}]
                  </span>
                  <span
                    className={`badge-signal ${style.colorClass}`}
                    style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '4px', letterSpacing: '0' }}
                  >
                    {style.label}
                  </span>
                  {log.symbol && (
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>
                      ${log.symbol}
                    </span>
                  )}
                </div>
                <div style={{ color: '#e2e8f0', fontFamily: 'var(--font-th)' }}>
                  {log.message}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '11px', color: 'var(--text-secondary)' }}>
        <span className="pulse-dot"></span>
        <span>ระบบจำลองสแกนเนอร์ทำงานแบบมัลติเธรด (Simulated Background Scanning)</span>
      </div>
    </div>
  );
};
