import React, { useState } from 'react';

// Line / Area Chart for trend over time
export interface TrendDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

export interface AreaLineChartProps {
  data: TrendDataPoint[];
  title?: string;
  height?: number;
  primaryColor?: string;
  secondaryColor?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  showSecondary?: boolean;
}

export const AreaLineChart: React.FC<AreaLineChartProps> = ({
  data,
  title,
  height = 220,
  primaryColor = '#2563eb',
  secondaryColor = '#7c3aed',
  primaryLabel = 'Questions',
  secondaryLabel = 'Conversations',
  showSecondary = true,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const width = 600;
  const padding = { top: 20, right: 30, bottom: 35, left: 45 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(
    ...data.map(d => Math.max(d.value, showSecondary && d.secondaryValue ? d.secondaryValue : 0)),
    10
  );
  // Round up to nice number
  const yMax = Math.ceil(maxVal * 1.15);

  const getX = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;
  const getY = (val: number) => padding.top + chartHeight - (val / yMax) * chartHeight;

  // Build SVG path
  const primaryPoints = data.map((d, i) => `${getX(i)},${getY(d.value)}`);
  const primaryLinePath = `M ${primaryPoints.join(' L ')}`;
  const primaryAreaPath = `${primaryLinePath} L ${getX(data.length - 1)},${padding.top + chartHeight} L ${getX(0)},${padding.top + chartHeight} Z`;

  let secondaryLinePath = '';
  let secondaryAreaPath = '';
  if (showSecondary) {
    const secPoints = data.map((d, i) => `${getX(i)},${getY(d.secondaryValue || 0)}`);
    secondaryLinePath = `M ${secPoints.join(' L ')}`;
    secondaryAreaPath = `${secondaryLinePath} L ${getX(data.length - 1)},${padding.top + chartHeight} L ${getX(0)},${padding.top + chartHeight} Z`;
  }

  // Y-axis grid ticks (4 steps)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(r => Math.round(r * yMax));

  return (
    <div className="w-full flex flex-col">
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">{title}</h4>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
              <span className="text-slate-600 font-medium">{primaryLabel}</span>
            </div>
            {showSecondary && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: secondaryColor }} />
                <span className="text-slate-600 font-medium">{secondaryLabel}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="primaryGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primaryColor} stopOpacity="0.28" />
              <stop offset="100%" stopColor={primaryColor} stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="secondaryGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={secondaryColor} stopOpacity="0.18" />
              <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map(tickVal => {
            const y = getY(tickVal);
            return (
              <g key={tickVal}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 10}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-sans"
                >
                  {tickVal}
                </text>
              </g>
            );
          })}

          {/* Secondary Area & Line */}
          {showSecondary && (
            <>
              <path d={secondaryAreaPath} fill="url(#secondaryGrad)" />
              <path
                d={secondaryLinePath}
                fill="none"
                stroke={secondaryColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Primary Area & Line */}
          <path d={primaryAreaPath} fill="url(#primaryGrad)" />
          <path
            d={primaryLinePath}
            fill="none"
            stroke={primaryColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* X axis labels & hover dots */}
          {data.map((d, i) => {
            const x = getX(i);
            const yPri = getY(d.value);
            const isHovered = hoveredIndex === i;

            return (
              <g key={d.label}>
                <text
                  x={x}
                  y={height - 10}
                  textAnchor="middle"
                  className={`text-[11px] font-medium transition-colors ${
                    isHovered ? 'fill-slate-900 font-semibold' : 'fill-slate-400'
                  }`}
                >
                  {d.label}
                </text>

                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + chartHeight}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Primary Data Dot */}
                <circle
                  cx={x}
                  cy={yPri}
                  r={isHovered ? 5 : 3.5}
                  fill="#ffffff"
                  stroke={primaryColor}
                  strokeWidth={isHovered ? 2.5 : 2}
                  className="transition-all cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Card */}
        {hoveredIndex !== null && (
          <div
            className="absolute -top-3 z-20 pointer-events-none transform -translate-x-1/2 bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs flex flex-col gap-1 border border-slate-700"
            style={{
              left: `${(getX(hoveredIndex) / width) * 100}%`,
            }}
          >
            <span className="font-semibold text-slate-200 border-b border-slate-700 pb-0.5">
              {data[hoveredIndex].label}
            </span>
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-blue-300">{primaryLabel}:</span>
              <span className="font-bold">{data[hoveredIndex].value}</span>
            </div>
            {showSecondary && data[hoveredIndex].secondaryValue !== undefined && (
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-purple-300">{secondaryLabel}:</span>
                <span className="font-bold">{data[hoveredIndex].secondaryValue}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Donut Chart for Feedback distribution
export interface DonutChartProps {
  positive: number;
  negative: number;
  title?: string;
  size?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  positive,
  negative,
  title,
  size = 180,
}) => {
  const total = positive + negative || 1;
  const positivePct = Math.round((positive / total) * 100);
  const negativePct = 100 - positivePct;

  const radius = 60;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (positivePct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      {title && (
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3 w-full text-left">
          {title}
        </h4>
      )}

      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
          {/* Background circle (Negative segment) */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="#f43f5e"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="transition-all duration-500 opacity-90"
          />
          {/* Positive segment */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="#10b981"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-slate-900 tracking-tight">{positivePct}%</span>
          <span className="text-[10px] uppercase font-semibold text-slate-400">Positive</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-600 font-medium">Thumbs Up ({positive})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span className="text-slate-600 font-medium">Thumbs Down ({negative})</span>
        </div>
      </div>
    </div>
  );
};

// Generic export wrapper
export const Chart = {
  AreaLine: AreaLineChart,
  Donut: DonutChart,
};
