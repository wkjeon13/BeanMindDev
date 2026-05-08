import React from 'react';
import { useTranslation } from 'react-i18next';

interface TastingRadarChartProps {
  data: {
    acidity: number;
    sweetness: number;
    body: number;
    bitterness?: number;
    aroma?: number;
  };
  size?: number;
  color?: string;
  fillColor?: string;
}

export default function TastingRadarChart({ 
  data, 
  size = 140, 
  color = '#f59e0b', // amber-500
  fillColor = 'rgba(245, 158, 11, 0.2)' 
}: TastingRadarChartProps) {
  const { t } = useTranslation(['translation']);

  // Normalize data (0 to 5 scale)
  const stats = [
    { label: t('community_radar.lbl_acidity', '산미'), value: data.acidity || 0 },
    { label: t('community_radar.lbl_sweetness', '단맛'), value: data.sweetness || 0 },
    { label: t('community_radar.lbl_body', '바디'), value: data.body || 0 },
    { label: t('community_radar.lbl_bitterness', '쓴맛'), value: data.bitterness || 0 },
    { label: t('community_radar.lbl_aroma', '향'), value: data.aroma || 0 }
  ];

  const maxTicks = 5;
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) * 0.70; // 70% to prevent labels from flying out

  // Helper to get coordinates
  const getCoordinatesForAngle = (angle: number, value: number, max: number = maxTicks) => {
    const r = (value / max) * radius;
    const x = cx + r * Math.cos(angle - Math.PI / 2); // -90 deg to start top
    const y = cy + r * Math.sin(angle - Math.PI / 2);
    return { x, y };
  };

  const angleStep = (Math.PI * 2) / stats.length;

  return (
    <div className="flex flex-col items-center justify-center font-sans overflow-visible" style={{ width: size, height: size }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        {/* Draw background webs/polygons */}
        {[1, 2, 3, 4, 5].map((tick) => {
          const points = stats.map((_, i) => {
            const { x, y } = getCoordinatesForAngle(i * angleStep, tick);
            return `${x},${y}`;
          }).join(' ');

          return (
            <polygon 
              key={tick} 
              points={points} 
              fill="none" 
              stroke="#3f3f46" // zinc-700
              strokeWidth={tick === maxTicks ? 1.5 : 0.5} 
            />
          );
        })}

        {/* Draw axes lines */}
        {stats.map((_, i) => {
          const { x, y } = getCoordinatesForAngle(i * angleStep, maxTicks);
          return (
            <line 
              key={`axis-${i}`} 
              x1={cx} y1={cy} 
              x2={x} y2={y} 
              stroke="#3f3f46" 
              strokeWidth={0.5} 
            />
          );
        })}

        {/* Draw data polygon */}
        {(() => {
          const dataPoints = stats.map((s, i) => {
            const { x, y } = getCoordinatesForAngle(i * angleStep, s.value);
            return `${x},${y}`;
          }).join(' ');

          return (
            <polygon 
              points={dataPoints} 
              fill={fillColor} 
              stroke={color} 
              strokeWidth={2} 
              strokeLinejoin="round" 
            />
          );
        })()}

        {/* Draw data dots */}
        {stats.map((s, i) => {
          const { x, y } = getCoordinatesForAngle(i * angleStep, s.value);
          if (s.value === 0) return null; // Don't draw point if 0
          return (
            <circle 
              key={`dot-${i}`} 
              cx={x} cy={y} 
              r={3} 
              fill={color} 
              stroke="#18181b" 
              strokeWidth={1} 
            />
          );
        })}

        {/* Labels outside */}
        {stats.map((s, i) => {
          const labelPadding = 15;
          const { x, y } = getCoordinatesForAngle(i * angleStep, maxTicks);
          
          // Nudge labels outward
          const dx = (x - cx) / radius;
          const dy = (y - cy) / radius;
          
          const labelX = x + (dx * labelPadding);
          const labelY = y + (dy * labelPadding) + 4; // text-baseline adj

          return (
            <text 
              key={`label-${i}`} 
              x={labelX} 
              y={labelY} 
              fill="#a1a1aa" // zinc-400
              fontSize="10" 
              fontWeight="600"
              textAnchor="middle"
            >
              {s.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
