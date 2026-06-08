import React, { useState } from 'react';

interface ChartPoint {
  day: string;
  botVal: number;
  setVal: number;
  timestamp?: number;
}

interface PerformanceChartProps {
  performanceHistory: ChartPoint[];
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ performanceHistory }) => {
  // If history has only 1 point or empty, structure a fallback to render correctly
  const chartData: ChartPoint[] = performanceHistory.length === 0
    ? [{ day: 'เริ่มต้น', botVal: 2000, setVal: 2000 }, { day: 'วันนี้', botVal: 2000, setVal: 2000 }]
    : performanceHistory.length === 1
      ? [{ day: 'เริ่มต้น', botVal: 2000, setVal: 2000 }, performanceHistory[0]]
      : performanceHistory;

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const width = 600;
  const height = 180;
  const padding = 35;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // หาค่าสูงสุดและต่ำสุดจากข้อมูลจริงเพื่อสเกลกราฟตามจริง
  const allValues = chartData.flatMap(d => [d.botVal, d.setVal]);
  const minObserved = allValues.length > 0 ? Math.min(...allValues) : 2000;
  const maxObserved = allValues.length > 0 ? Math.max(...allValues) : 2000;
  
  const valRangeObserved = maxObserved - minObserved;
  const margin = valRangeObserved === 0 ? 50 : valRangeObserved * 0.15;
  
  const minVal = Math.max(0, Math.floor((minObserved - margin) / 10) * 10);
  const maxVal = Math.ceil((maxObserved + margin) / 10) * 10;
  const valRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  // แปลงพิกัดข้อมูลเป็นพิกัดภาพบน SVG
  const getX = (index: number) => padding + (index / (chartData.length - 1)) * chartWidth;
  const getY = (value: number) => padding + chartHeight - ((value - minVal) / valRange) * chartHeight;

  // สร้าง String สำหรับวาดเส้น Line
  const botPath = chartData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.botVal)}`).join(' ');
  const setPath = chartData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.setVal)}`).join(' ');

  // สร้าง Area ปิดของพอร์ตบอทเพื่อไล่เฉดสี (Gradient)
  const botAreaPath = `${botPath} L ${getX(chartData.length - 1)} ${getY(minVal)} L ${getX(0)} ${getY(minVal)} Z`;

  // สร้างกริด 5 เส้นแชร์ค่าระหว่าง minVal และ maxVal
  const gridValues = Array.from({ length: 5 }, (_, i) => minVal + (i * (maxVal - minVal)) / 4);

  return (
    <div className="glass-card" style={{ flexGrow: 1 }}>
      <div className="card-title">
        <span>กราฟผลดำเนินงานสะสมจริง (บอท VS ตลาดหลักทรัพย์ SET)</span>
        <span className="days-tag text-success">Real-time Performance</span>
      </div>
      <div className="chart-legend">
        <div className="chart-legend-item">
          <div className="chart-legend-color bot"></div>
          <span>บอทเทรดสั้น (เริ่มต้น 2,000 THB)</span>
        </div>
        <div className="chart-legend-item">
          <div className="chart-legend-color set"></div>
          <span>ดัชนีตลาด SET Index (ปรับฐานเริ่มต้น 2,000 THB)</span>
        </div>
      </div>

      <div className="chart-container-svg" style={{ position: 'relative' }}>
        <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="bot-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* เส้นตาราง Grid แนวนอน */}
          {gridValues.map((val) => (
            <g key={val}>
              <line
                className="chart-grid-line"
                x1={padding}
                y1={getY(val)}
                x2={width - padding}
                y2={getY(val)}
              />
              <text className="chart-axis-text" x={padding - 8} y={getY(val) + 4} textAnchor="end">
                {Math.round(val).toLocaleString()}
              </text>
            </g>
          ))}

          {/* วาดพื้นที่และเส้นกราฟ */}
          <path className="chart-area-bot" d={botAreaPath} fill="url(#bot-gradient)" />
          <path className="chart-line-set" d={setPath} />
          <path className="chart-line-bot" d={botPath} />

          {/* วาดจุดวงกลมสำหรับโฮเวอร์ */}
          {chartData.map((d, i) => (
            <g key={i}>
              {/* เส้นแนวตั้งเมื่อโฮเวอร์จุดนั้น */}
              {hoveredIndex === i && (
                <line
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  x1={getX(i)}
                  y1={padding}
                  x2={getX(i)}
                  y2={height - padding}
                />
              )}

              {/* จุดบอท */}
              <circle
                cx={getX(i)}
                cy={getY(d.botVal)}
                r={hoveredIndex === i ? 6 : 3.5}
                fill="#3b82f6"
                stroke="#060913"
                strokeWidth={hoveredIndex === i ? 2 : 1}
                style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />

              {/* จุดดัชนี SET */}
              <circle
                cx={getX(i)}
                cy={getY(d.setVal)}
                r={hoveredIndex === i ? 5 : 2.5}
                fill="#64748b"
                stroke="#060913"
                strokeWidth={1}
                style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />

              {/* แถบแกน X */}
              {chartData.length > 5 ? (
                // กรองฉลากแกน X ในกรณีที่มีจุดจำนวนมาก
                (i === 0 || i === chartData.length - 1 || (chartData.length > 10 && i === Math.floor(chartData.length / 2))) && (
                  <text className="chart-axis-text" x={getX(i)} y={height - padding + 15} textAnchor="middle">
                    {d.day}
                  </text>
                )
              ) : (
                <text className="chart-axis-text" x={getX(i)} y={height - padding + 15} textAnchor="middle">
                  {d.day}
                </text>
              )}
            </g>
          ))}
        </svg>

        {/* แผงข้อมูล Tooltip เมื่อนำเมาส์มาวางบนพิกัด */}
        {hoveredIndex !== null && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: hoveredIndex > chartData.length / 2 ? '40px' : 'auto',
              right: hoveredIndex <= chartData.length / 2 ? '40px' : 'auto',
              background: 'rgba(8, 12, 27, 0.95)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '11px',
              zIndex: 10,
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(10px)',
              pointerEvents: 'none'
            }}
          >
            <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
              เวลา {chartData[hoveredIndex].day}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', margin: '2px 0' }}>
              <span style={{ color: '#94a3b8' }}>พอร์ตบอท:</span>
              <span className="font-number" style={{ color: '#3b82f6', fontWeight: 600 }}>
                {chartData[hoveredIndex].botVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', margin: '2px 0' }}>
              <span style={{ color: '#94a3b8' }}>พอร์ตดัชนี SET:</span>
              <span className="font-number" style={{ color: '#94a3b8', fontWeight: 600 }}>
                {chartData[hoveredIndex].setVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', marginTop: '6px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: '#94a3b8' }}>ผลงานส่วนต่าง:</span>
              <span className={`font-number ${chartData[hoveredIndex].botVal - chartData[hoveredIndex].setVal >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontWeight: 600 }}>
                {chartData[hoveredIndex].botVal - chartData[hoveredIndex].setVal >= 0 ? '+' : ''}
                {((chartData[hoveredIndex].botVal - chartData[hoveredIndex].setVal) / 20).toFixed(2)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
