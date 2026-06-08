import React, { useState } from 'react';
import type { Transaction, Stock } from '../types';

interface TransactionHistoryProps {
  transactions: Transaction[];
  stocks: Stock[];
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  stocks
}) => {
  const [filter, setFilter] = useState<'ALL' | 'BOT' | 'USER'>('ALL');

  const filteredTx = transactions.filter((tx) => {
    if (filter === 'ALL') return true;
    return tx.owner === filter;
  });

  // ฟังก์ชันจัดฟอร์แมตวันที่ให้อ่านง่าย
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น. - ' + date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="glass-card">
      <div className="card-title" style={{ marginBottom: '8px' }}>
        <span>ประวัติการซื้อขายหลักทรัพย์ทั้งหมด (Transaction Log)</span>
        
        {/* แถบตัวกรองข้อมูล */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className={`btn btn-outline ${filter === 'ALL' ? 'btn-primary' : ''}`}
            style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}
            onClick={() => setFilter('ALL')}
          >
            ทั้งหมด
          </button>
          <button
            className={`btn btn-outline ${filter === 'BOT' ? 'btn-primary' : ''}`}
            style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}
            onClick={() => setFilter('BOT')}
          >
            บอทอัจฉริยะ
          </button>
          <button
            className={`btn btn-outline ${filter === 'USER' ? 'btn-primary' : ''}`}
            style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}
            onClick={() => setFilter('USER')}
          >
            คุณเทรดจำลอง
          </button>
        </div>
      </div>
      
      <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px' }}>
        บันทึกรายการคำสั่งซื้อและขายหุ้นไทยกลุ่มเด่นรายวันทั้งหมดในระบบจำลองเพื่อใช้ตรวจสอบผลดำเนินงานย้อนหลัง
      </p>

      <div className="custom-table-container">
        {filteredTx.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <div className="empty-state-title">ไม่พบประวัติรายการธุรกรรม</div>
            <p>ยังไม่มีรายการเข้าซื้อหรือขายในตัวกรองนี้</p>
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>เวลาทำรายการ</th>
                <th>หุ้น</th>
                <th>ประเภท</th>
                <th style={{ textAlign: 'right' }}>จำนวน (หุ้น)</th>
                <th style={{ textAlign: 'right' }}>ราคาต่อหุ้น</th>
                <th style={{ textAlign: 'right' }}>ราคารวมสุทธิ</th>
                <th style={{ textAlign: 'right' }}>ผลกำไรขาดทุนที่เกิดขึ้นจริง</th>
                <th>ผู้ดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.slice().reverse().map((tx) => {
                const stock = stocks.find(s => s.symbol === tx.symbol);
                const isBuy = tx.type === 'BUY';

                return (
                  <tr key={tx.id}>
                    <td className="font-number" style={{ color: 'var(--text-secondary)' }}>
                      {formatTime(tx.timestamp)}
                    </td>
                    <td>
                      <div className="stock-badge">
                        <span className="stock-symbol">{tx.symbol}</span>
                        <span className="stock-name" style={{ fontSize: '10px' }}>{stock?.name || ''}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge-signal ${isBuy ? 'buy' : 'sell'}`}>
                        {isBuy ? 'BUY' : 'SELL'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-number">
                      {tx.quantity.toLocaleString()} หุ้น
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-number">
                      ฿{tx.price.toFixed(2)}
                    </td>
                    <td className="font-number" style={{ textAlign: 'right', fontWeight: 600 }}>
                      ฿{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {tx.realizedPnL !== undefined ? (
                        <span className={`font-number ${tx.realizedPnL >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontWeight: 600 }}>
                          {tx.realizedPnL >= 0 ? '+' : ''}{tx.realizedPnL.toFixed(2)}
                          <span style={{ fontSize: '10px', marginLeft: '4px', fontWeight: 500 }}>
                            ({((tx.realizedPnL / (tx.amount - tx.realizedPnL)) * 100).toFixed(2)}%)
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td>
                      <span className="days-tag" style={{ background: tx.owner === 'BOT' ? 'var(--primary-glow)' : 'var(--warning-glow)', color: tx.owner === 'BOT' ? 'var(--primary)' : 'var(--warning)', borderColor: tx.owner === 'BOT' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)' }}>
                        {tx.owner === 'BOT' ? 'บอทอัจฉริยะ' : 'ผู้ใช้งาน'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
