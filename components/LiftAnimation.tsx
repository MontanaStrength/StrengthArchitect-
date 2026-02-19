import React from 'react';

interface Props {
  /** Display size (square). Default 160 */
  size?: number;
}

function repPeakPath(cx: number, width: number, peakY: number, baseline: number): string {
  const hw = width / 2;
  const x0 = cx - hw;
  const x1 = cx - hw * 0.4;
  const x2 = cx + hw * 0.4;
  const x3 = cx + hw;
  return `L${x0},${baseline} C${x1},${baseline} ${x1},${baseline - peakY} ${cx},${baseline - peakY} C${x2},${baseline - peakY} ${x2},${baseline} ${x3},${baseline}`;
}

const LiftAnimation: React.FC<Props> = ({ size = 280 }) => {
  const chartLeft = 18;
  const chartRight = 222;
  const chartBaseline = 210;
  const chartWidth = chartRight - chartLeft;
  const repCount = 8;
  const repSpacing = chartWidth / repCount;

  const peakHeights = [130, 140, 135, 126, 121, 112, 108, 117];
  const peakWidths = [22, 20, 21, 22, 23, 22, 21, 20];

  let forcePath = `M${chartLeft},${chartBaseline}`;
  for (let i = 0; i < repCount; i++) {
    const cx = chartLeft + repSpacing * (i + 0.5);
    forcePath += repPeakPath(cx, peakWidths[i], peakHeights[i], chartBaseline);
  }
  forcePath += `L${chartRight},${chartBaseline}`;

  const chartDuration = 18;
  const tickForces = [45, 90, 135];

  const repPct = 85 / repCount;
  let barbellKF = '';
  let shadowKF = '';
  for (let i = 0; i < repCount; i++) {
    const s = (i * repPct).toFixed(2);
    const b = (i * repPct + repPct * 0.38).toFixed(2);
    const md = (i * repPct + repPct * 0.58).toFixed(2);
    const ov = (i * repPct + repPct * 0.72).toFixed(2);
    barbellKF += `${s}% { transform: translateY(0); }\n          `;
    barbellKF += `${b}% { transform: translateY(48px); }\n          `;
    barbellKF += `${md}% { transform: translateY(5px); }\n          `;
    barbellKF += `${ov}% { transform: translateY(-21px); }\n          `;
    shadowKF += `${s}% { transform: scaleX(1); opacity: 0.08; }\n          `;
    shadowKF += `${b}% { transform: scaleX(0.62); opacity: 0.2; }\n          `;
    shadowKF += `${md}% { transform: scaleX(0.8); opacity: 0.12; }\n          `;
    shadowKF += `${ov}% { transform: scaleX(1.18); opacity: 0.05; }\n          `;
  }
  barbellKF += '85% { transform: translateY(0); }\n          100% { transform: translateY(0); }';
  shadowKF += '85% { transform: scaleX(1); opacity: 0.08; }\n          100% { transform: scaleX(1); opacity: 0.08; }';

  return (
    <div className="flex flex-col items-center">
      <div
        className="shrink-0"
        style={{ width: size, height: size, minWidth: size, minHeight: size, aspectRatio: '1' }}
      >
        <svg
          viewBox="0 0 240 240"
          width={size}
          height={size}
          preserveAspectRatio="xMidYMid meet"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="la-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#eef2f7" />
              <stop offset="35%" stopColor="#cdd5df" />
              <stop offset="70%" stopColor="#9aa5b2" />
              <stop offset="100%" stopColor="#6f7b89" />
            </linearGradient>

            <linearGradient id="la-plate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d8dee6" />
              <stop offset="45%" stopColor="#b2bcc8" />
              <stop offset="100%" stopColor="#818d9b" />
            </linearGradient>

            <radialGradient id="la-plate-core" cx="38%" cy="34%" r="70%">
              <stop offset="0%" stopColor="#cdd4dd" />
              <stop offset="55%" stopColor="#9ea9b7" />
              <stop offset="100%" stopColor="#5f6b79" />
            </radialGradient>

            <linearGradient id="la-force-fill" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0" />
              <stop offset="40%" stopColor="#94a3b8" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.12" />
            </linearGradient>

            <filter id="la-dot-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3.5" />
            </filter>

            <clipPath id="la-chart-reveal">
              <rect
                x={chartLeft}
                y="0"
                width={chartWidth}
                height="240"
                style={{ animation: `la-reveal ${chartDuration}s linear infinite` }}
              />
            </clipPath>

            <clipPath id="la-fill-reveal">
              <rect
                x={chartLeft}
                y="0"
                width={chartWidth}
                height="240"
                style={{ animation: `la-reveal ${chartDuration}s linear infinite` }}
              />
            </clipPath>
          </defs>

          {/* Side view. Olympic: 2200mm total, 1310mm shaft, 450mm 45 plate → shaft/plate 2.91, total/plate 4.89. 50 units = 450mm. */}
          <g style={{ animation: `la-rep ${chartDuration}s linear infinite` }}>
            {/* Shaft 1310mm → 146 units (50 * 1310/450). Ends 47 units each (240 - 146) / 2. */}
            <rect x="47" y="118.5" width="146" height="3" rx="1.5" fill="url(#la-bar)" />
            <rect x="47" y="118.45" width="146" height="0.5" rx="0.25" fill="#e2e8f0" opacity="0.5" />
            <rect x="47" y="121.05" width="146" height="0.5" rx="0.25" fill="#1e293b" opacity="0.25" />
            <rect x="117" y="117.8" width="6" height="4.4" rx="1" fill="none" stroke="#94a3b8" strokeWidth="0.5" opacity="0.5" />

            {/* Left: sleeve → 25 (outer) → 45 → 45 (inner) → collar → bar at 47 */}
            <rect x="0" y="116" width="31" height="8" rx="1.5" fill="#afb9c3" />
            <rect x="31" y="108" width="3" height="28" rx="0.6" fill="url(#la-plate)" />
            <rect x="31" y="108" width="3" height="28" rx="0.6" fill="none" stroke="#cbd5e1" strokeOpacity="0.5" strokeWidth="0.4" />
            <rect x="34" y="95" width="5" height="50" rx="1" fill="url(#la-plate)" />
            <rect x="34" y="95" width="5" height="50" rx="1" fill="none" stroke="#cbd5e1" strokeOpacity="0.5" strokeWidth="0.5" />
            <rect x="39" y="95" width="5" height="50" rx="1" fill="url(#la-plate)" />
            <rect x="39" y="95" width="5" height="50" rx="1" fill="none" stroke="#cbd5e1" strokeOpacity="0.5" strokeWidth="0.5" />
            <rect x="44" y="118.2" width="3" height="3.6" rx="0.8" fill="#94a3b8" />

            {/* Right: bar ends 193 → collar → 45 (inner) → 45 → 25 (outer) → sleeve */}
            <rect x="193" y="118.2" width="3" height="3.6" rx="0.8" fill="#94a3b8" />
            <rect x="196" y="95" width="5" height="50" rx="1" fill="url(#la-plate)" />
            <rect x="196" y="95" width="5" height="50" rx="1" fill="none" stroke="#cbd5e1" strokeOpacity="0.5" strokeWidth="0.5" />
            <rect x="201" y="95" width="5" height="50" rx="1" fill="url(#la-plate)" />
            <rect x="201" y="95" width="5" height="50" rx="1" fill="none" stroke="#cbd5e1" strokeOpacity="0.5" strokeWidth="0.5" />
            <rect x="206" y="108" width="3" height="28" rx="0.6" fill="url(#la-plate)" />
            <rect x="206" y="108" width="3" height="28" rx="0.6" fill="none" stroke="#cbd5e1" strokeOpacity="0.5" strokeWidth="0.4" />
            <rect x="209" y="116" width="31" height="8" rx="1.5" fill="#afb9c3" />
          </g>

          <g style={{ animation: `la-chart-cycle ${chartDuration}s linear infinite` }}>
            {tickForces.map((f, i) => (
              <line
                key={`grid-${i}`}
                x1={chartLeft}
                y1={chartBaseline - f}
                x2={chartRight}
                y2={chartBaseline - f}
                stroke="#94a3b8"
                strokeWidth="0.3"
                opacity="0.08"
                strokeDasharray="3 4"
              />
            ))}

            <line
              x1={chartLeft}
              y1={chartBaseline}
              x2={chartRight}
              y2={chartBaseline}
              stroke="#94a3b8"
              strokeWidth="0.5"
              opacity="0.1"
            />

            <line
              x1={chartLeft}
              y1={chartBaseline}
              x2={chartLeft}
              y2={chartBaseline - 145}
              stroke="#94a3b8"
              strokeWidth="0.5"
              opacity="0.1"
            />

            <text
              x={chartLeft - 2}
              y={chartBaseline - 43}
              textAnchor="end"
              fill="#94a3b8"
              opacity="0.12"
              fontSize="5"
              fontFamily="monospace"
            >
              1.1kN
            </text>
            <text
              x={chartLeft - 2}
              y={chartBaseline - 88}
              textAnchor="end"
              fill="#94a3b8"
              opacity="0.12"
              fontSize="5"
              fontFamily="monospace"
            >
              2.2kN
            </text>
            <text
              x={chartLeft - 2}
              y={chartBaseline - 133}
              textAnchor="end"
              fill="#94a3b8"
              opacity="0.12"
              fontSize="5"
              fontFamily="monospace"
            >
              3.4kN
            </text>

            {Array.from({ length: repCount }, (_, i) => (
              <text
                key={`rep-${i}`}
                x={chartLeft + repSpacing * (i + 0.5)}
                y={chartBaseline + 8}
                textAnchor="middle"
                fill="#94a3b8"
                opacity="0.1"
                fontSize="5"
                fontFamily="monospace"
              >
                R{i + 1}
              </text>
            ))}

            <text
              x={chartLeft + chartWidth / 2}
              y={chartBaseline + 16}
              textAnchor="middle"
              fill="#94a3b8"
              opacity="0.08"
              fontSize="5"
              fontFamily="monospace"
              letterSpacing="1"
            >
              PEAK FORCE · SET IN PROGRESS
            </text>

            <path
              d={forcePath + `L${chartRight},${chartBaseline} L${chartLeft},${chartBaseline} Z`}
              fill="url(#la-force-fill)"
              clipPath="url(#la-fill-reveal)"
            />

            <path
              d={forcePath}
              stroke="#cbd5e1"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.3"
              fill="none"
              clipPath="url(#la-chart-reveal)"
            />

            <circle r="3" fill="#cbd5e1" opacity="0.7" style={{ animation: `la-dot ${chartDuration}s linear infinite` }} />
            <circle r="5.5" fill="#cbd5e1" opacity="0.12" filter="url(#la-dot-glow)" style={{ animation: `la-dot ${chartDuration}s linear infinite` }} />

            {peakHeights.map((h, i) => {
              const cx = chartLeft + repSpacing * (i + 0.5);
              const cy = chartBaseline - h;
              const delay = (chartDuration * (i + 0.5)) / repCount;
              return (
                <circle
                  key={`pk-${i}`}
                  cx={cx}
                  cy={cy}
                  r="2"
                  fill="#cbd5e1"
                  opacity="0"
                  style={{
                    animation: `la-peak-appear ${chartDuration}s linear infinite`,
                    animationDelay: `${delay}s`,
                  }}
                />
              );
            })}
          </g>

          <ellipse
            cx="120"
            cy="218"
            rx="52"
            ry="4.5"
            fill="#64748b"
            opacity="0.12"
            style={{ transformOrigin: '120px 218px', animation: `la-shadow ${chartDuration}s linear infinite` }}
          />
        </svg>
      </div>

      <style>{`
        @keyframes la-rep {
          ${barbellKF}
        }

        @keyframes la-shadow {
          ${shadowKF}
        }

        @keyframes la-reveal {
          0%   { width: 0; }
          85%  { width: ${chartWidth}px; }
          100% { width: ${chartWidth}px; }
        }

        @keyframes la-chart-cycle {
          0%   { opacity: 0; }
          2%   { opacity: 1; }
          87%  { opacity: 1; }
          95%  { opacity: 0; }
          100% { opacity: 0; }
        }

        @keyframes la-dot {
          0%   { cx: ${chartLeft}; cy: ${chartBaseline}; opacity: 0.6; }
          ${peakHeights
            .map((h, i) => {
              const pct = ((i + 0.5) / repCount * 85).toFixed(1);
              const cx = (chartLeft + repSpacing * (i + 0.5)).toFixed(1);
              const cy = (chartBaseline - h).toFixed(1);
              const valPct = ((i + 1) / repCount * 85).toFixed(1);
              const valCx = (chartLeft + repSpacing * (i + 1)).toFixed(1);
              return `${pct}% { cx: ${cx}; cy: ${cy}; opacity: 0.72; }\n          ${
                i < repCount - 1 ? `${valPct}% { cx: ${valCx}; cy: ${chartBaseline}; opacity: 0.45; }` : ''
              }`;
            })
            .join('\n          ')}
          85%  { cx: ${chartRight}; cy: ${chartBaseline}; opacity: 0.4; }
          92%  { cx: ${chartRight}; cy: ${chartBaseline}; opacity: 0; }
          100% { cx: ${chartLeft}; cy: ${chartBaseline}; opacity: 0; }
        }

        @keyframes la-peak-appear {
          0%, 1%   { opacity: 0; r: 0; }
          2%       { opacity: 0.6; r: 3; }
          6%       { opacity: 0.35; r: 2; }
          88%      { opacity: 0.35; r: 2; }
          95%      { opacity: 0; r: 2; }
          100%     { opacity: 0; r: 0; }
        }
      `}</style>
    </div>
  );
};

export default LiftAnimation;
