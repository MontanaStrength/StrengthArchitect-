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

const LiftAnimation: React.FC<Props> = ({ size = 160 }) => {
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
      <div style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 240 240"
          width={size}
          height={size}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="la-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f6f8fb" />
              <stop offset="20%" stopColor="#e8edf3" />
              <stop offset="48%" stopColor="#c1c9d2" />
              <stop offset="72%" stopColor="#a3adb8" />
              <stop offset="100%" stopColor="#768290" />
            </linearGradient>

            <linearGradient id="la-bar-sheen" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="48%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="52%" stopColor="#ffffff" stopOpacity="0.32" />
              <stop offset="56%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="la-plate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="22%" stopColor="#fcd34d" />
              <stop offset="60%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>

            <radialGradient id="la-plate-core" cx="38%" cy="34%" r="70%">
              <stop offset="0%" stopColor="#ffd978" />
              <stop offset="55%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#7c2d12" />
            </linearGradient>

            <linearGradient id="la-force-fill" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.12" />
            </linearGradient>

            <filter id="la-dot-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3.5" />
            </filter>

            <filter id="la-soft-shadow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="1.5" />
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

          <g style={{ animation: `la-chart-cycle ${chartDuration}s linear infinite` }}>
            {tickForces.map((f, i) => (
              <line
                key={`grid-${i}`}
                x1={chartLeft}
                y1={chartBaseline - f}
                x2={chartRight}
                y2={chartBaseline - f}
                stroke="#f59e0b"
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
              stroke="#f59e0b"
              strokeWidth="0.5"
              opacity="0.1"
            />

            <line
              x1={chartLeft}
              y1={chartBaseline}
              x2={chartLeft}
              y2={chartBaseline - 145}
              stroke="#f59e0b"
              strokeWidth="0.5"
              opacity="0.1"
            />

            <text
              x={chartLeft - 2}
              y={chartBaseline - 43}
              textAnchor="end"
              fill="#f59e0b"
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
              fill="#f59e0b"
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
              fill="#f59e0b"
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
                fill="#f59e0b"
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
              fill="#f59e0b"
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
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.3"
              fill="none"
              clipPath="url(#la-chart-reveal)"
            />

            <circle r="3" fill="#f59e0b" opacity="0.55" style={{ animation: `la-dot ${chartDuration}s linear infinite` }} />
            <circle r="5.5" fill="#f59e0b" opacity="0.12" filter="url(#la-dot-glow)" style={{ animation: `la-dot ${chartDuration}s linear infinite` }} />

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
                  fill="#f59e0b"
                  opacity="0"
                  style={{
                    animation: `la-peak-appear ${chartDuration}s linear infinite`,
                    animationDelay: `${delay}s`,
                  }}
                />
              );
            })}
          </g>

          <g style={{ animation: `la-rep ${chartDuration}s linear infinite` }}>
            {/* subtle cinematic backlight */}
            <ellipse cx="120" cy="120" rx="104" ry="54" fill="#f59e0b" opacity="0.04" filter="url(#la-soft-shadow)" />

            {/* shaft */}
            <rect x="34" y="117" width="172" height="6" rx="3" fill="url(#la-bar)" />
            <rect x="34" y="116.9" width="172" height="1.1" rx="0.55" fill="#ffffff" opacity="0.42" />
            <rect x="34" y="122.2" width="172" height="1.2" rx="0.6" fill="#0f1115" opacity="0.32" />
            <rect x="-40" y="114.6" width="320" height="10.2" rx="5.1" fill="url(#la-bar-sheen)" style={{ animation: 'la-sheen 6.8s ease-in-out infinite' }} />

            {/* sleeves */}
            <rect x="27" y="115.8" width="8" height="8.4" rx="2" fill="#afb9c3" />
            <rect x="205" y="115.8" width="8" height="8.4" rx="2" fill="#afb9c3" />
            <rect x="27" y="115.8" width="8" height="1.2" rx="0.6" fill="#ffffff" opacity="0.35" />
            <rect x="205" y="115.8" width="8" height="1.2" rx="0.6" fill="#ffffff" opacity="0.35" />

            {/* collars */}
            <rect x="42" y="113.5" width="4.5" height="13" rx="1.5" fill="#c9d0d8" />
            <rect x="193.5" y="113.5" width="4.5" height="13" rx="1.5" fill="#c9d0d8" />
            <rect x="42" y="113.6" width="4.5" height="1.1" rx="0.55" fill="#ffffff" opacity="0.35" />
            <rect x="193.5" y="113.6" width="4.5" height="1.1" rx="0.55" fill="#ffffff" opacity="0.35" />

            {/* center mark */}
            <rect x="118.4" y="114" width="3.2" height="12" rx="1.2" fill="none" stroke="#d5dbe1" strokeWidth="0.7" opacity="0.4" />

            {/* left plates */}
            <circle cx="22" cy="120" r="12.5" fill="url(#la-plate)" />
            <circle cx="22" cy="120" r="12.5" fill="none" stroke="#fef3c7" strokeOpacity="0.25" strokeWidth="0.9" />
            <circle cx="22" cy="120" r="8.9" fill="url(#la-plate-core)" />
            <circle cx="22" cy="120" r="3.1" fill="#6b3b12" />
            <circle cx="12.5" cy="120" r="9.2" fill="url(#la-plate-core)" />
            <circle cx="12.5" cy="120" r="9.2" fill="none" stroke="#fcd34d" strokeOpacity="0.2" strokeWidth="0.8" />
            <circle cx="12.5" cy="120" r="2.3" fill="#5b3111" />

            {/* right plates */}
            <circle cx="218" cy="120" r="12.5" fill="url(#la-plate)" />
            <circle cx="218" cy="120" r="12.5" fill="none" stroke="#fef3c7" strokeOpacity="0.25" strokeWidth="0.9" />
            <circle cx="218" cy="120" r="8.9" fill="url(#la-plate-core)" />
            <circle cx="218" cy="120" r="3.1" fill="#6b3b12" />
            <circle cx="227.5" cy="120" r="9.2" fill="url(#la-plate-core)" />
            <circle cx="227.5" cy="120" r="9.2" fill="none" stroke="#fcd34d" strokeOpacity="0.2" strokeWidth="0.8" />
            <circle cx="227.5" cy="120" r="2.3" fill="#5b3111" />
          </g>

          <ellipse
            cx="120"
            cy="218"
            rx="52"
            ry="4.5"
            fill="#5b6470"
            opacity="0.08"
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

        @keyframes la-sheen {
          0%, 25% {
            transform: translateX(-250px) skewX(-14deg);
            opacity: 0;
          }
          36% {
            opacity: 0.85;
          }
          58% {
            transform: translateX(250px) skewX(-14deg);
            opacity: 0;
          }
          100% {
            transform: translateX(250px) skewX(-14deg);
            opacity: 0;
          }
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
