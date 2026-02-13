import React from 'react';

/**
 * LiftAnimation — Premium barbell animation featuring:
 *   • Smooth bench-press rep motion
 *   • Metallic gradient bar & amber gradient plates with edge highlights
 *   • Diagonal chrome light sweep on every press
 *   • LIVE FORCE CURVE CHART behind the barbell — draws 8 rep peaks
 *     in real time like a force plate readout, then loops
 *   • Ember spark particles scattering off plates
 *   • Orbital processing dots circling the barbell
 *   • Breathing plate glow aura
 *   • Dynamic ground shadow
 *
 * Pure SVG + CSS keyframes — zero dependencies, smooth 60 fps.
 */

interface Props {
  /** Display size (square). Default 160 */
  size?: number;
}

/*
 * Generate an SVG path for a single rep's force peak.
 * Each peak is a smooth bell curve at a given X center.
 * width = how wide the peak spans, peakY = how high it goes (from baseline).
 */
function repPeakPath(cx: number, width: number, peakY: number, baseline: number): string {
  const hw = width / 2;
  const x0 = cx - hw;
  const x1 = cx - hw * 0.4;
  const x2 = cx + hw * 0.4;
  const x3 = cx + hw;
  return `L${x0},${baseline} C${x1},${baseline} ${x1},${baseline - peakY} ${cx},${baseline - peakY} C${x2},${baseline - peakY} ${x2},${baseline} ${x3},${baseline}`;
}

const LiftAnimation: React.FC<Props> = ({ size = 160 }) => {
  // Chart config
  const chartLeft = 18;
  const chartRight = 222;
  const chartBaseline = 210;
  const chartWidth = chartRight - chartLeft;
  const repCount = 8;
  const repSpacing = chartWidth / repCount;

  // Generate 8 rep peaks with slight variation in height (force output)
  // Simulates fatigue: first few reps strong, later reps slightly lower
  // Scaled +125% total to match 2.25x increased ROM (more distance = more force production)
  const peakHeights = [130, 140, 135, 126, 121, 112, 108, 117]; // Newtons (scaled)
  const peakWidths =  [22, 20, 21, 22, 23, 22, 21, 20];

  // Build the full force curve path
  let forcePath = `M${chartLeft},${chartBaseline}`;
  for (let i = 0; i < repCount; i++) {
    const cx = chartLeft + repSpacing * (i + 0.5);
    forcePath += repPeakPath(cx, peakWidths[i], peakHeights[i], chartBaseline);
  }
  forcePath += `L${chartRight},${chartBaseline}`;

  // Total animation duration for the chart to fully draw
  const chartDuration = 18; // seconds — slow, appreciable reveal

  // Axis tick Y positions (force levels) — scaled for higher peaks
  const tickForces = [45, 90, 135];

  // ── Build synced barbell + shadow keyframes: 8 reps in first 85% of chart cycle ──
  const repPct = 85 / repCount; // ~10.625% per rep
  let barbellKF = '';
  let shadowKF = '';
  for (let i = 0; i < repCount; i++) {
    const s  = (i * repPct).toFixed(2);                // start — bar at top
    const b  = (i * repPct + repPct * 0.38).toFixed(2); // bottom of eccentric
    const md = (i * repPct + repPct * 0.58).toFixed(2); // mid-drive (concentric)
    const ov = (i * repPct + repPct * 0.72).toFixed(2); // lockout overshoot
    barbellKF += `${s}% { transform: translateY(0); }\n          `;
    barbellKF += `${b}% { transform: translateY(48px); }\n          `;
    barbellKF += `${md}% { transform: translateY(5px); }\n          `;
    barbellKF += `${ov}% { transform: translateY(-21px); }\n          `;
    shadowKF += `${s}% { transform: scaleX(1); opacity: 0.04; }\n          `;
    shadowKF += `${b}% { transform: scaleX(0.56); opacity: 0.18; }\n          `;
    shadowKF += `${md}% { transform: scaleX(0.78); opacity: 0.09; }\n          `;
    shadowKF += `${ov}% { transform: scaleX(1.26); opacity: 0.02; }\n          `;
  }
  barbellKF += '85% { transform: translateY(0); }\n          100% { transform: translateY(0); }';
  shadowKF  += '85% { transform: scaleX(1); opacity: 0.04; }\n          100% { transform: scaleX(1); opacity: 0.04; }';

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
            {/* Bar metallic gradient */}
            <linearGradient id="la-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c4c9d2" />
              <stop offset="30%" stopColor="#dfe2e6" />
              <stop offset="50%" stopColor="#eef0f2" />
              <stop offset="70%" stopColor="#b8bdc7" />
              <stop offset="100%" stopColor="#858b95" />
            </linearGradient>

            {/* Outer plate gradient */}
            <linearGradient id="la-plate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="30%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>

            {/* Inner plate gradient (deeper) */}
            <linearGradient id="la-plate-d" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            {/* Collar gradient */}
            <linearGradient id="la-collar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d1d5db" />
              <stop offset="50%" stopColor="#9ca3af" />
              <stop offset="100%" stopColor="#6b7280" />
            </linearGradient>

            {/* Shine sweep gradient */}
            <linearGradient id="la-shine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="40%" stopColor="white" stopOpacity="0" />
              <stop offset="50%" stopColor="white" stopOpacity="0.14" />
              <stop offset="60%" stopColor="white" stopOpacity="0" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>

            {/* Soft glow filter for plate halos */}
            <filter id="la-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="7" />
            </filter>

            {/* Force curve fill gradient (fades upward) */}
            <linearGradient id="la-force-fill" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.12" />
            </linearGradient>

            {/* Clip path that reveals the chart left-to-right */}
            <clipPath id="la-chart-reveal">
              <rect x={chartLeft} y="0" width={chartWidth} height="240"
                style={{ animation: `la-reveal ${chartDuration}s linear infinite` }}
              />
            </clipPath>

            {/* Clip for the filled area */}
            <clipPath id="la-fill-reveal">
              <rect x={chartLeft} y="0" width={chartWidth} height="240"
                style={{ animation: `la-reveal ${chartDuration}s linear infinite` }}
              />
            </clipPath>
          </defs>

          {/* ══════════ BACKGROUND FORCE CHART ══════════ */}
          {/* Entire chart group fades in/out per cycle */}
          <g style={{ animation: `la-chart-cycle ${chartDuration}s linear infinite` }}>

            {/* Chart grid — subtle horizontal lines for force levels */}
            {tickForces.map((f, i) => (
              <line
                key={`grid-${i}`}
                x1={chartLeft} y1={chartBaseline - f}
                x2={chartRight} y2={chartBaseline - f}
                stroke="#f59e0b" strokeWidth="0.3" opacity="0.08"
                strokeDasharray="3 4"
              />
            ))}

            {/* Baseline axis */}
            <line x1={chartLeft} y1={chartBaseline} x2={chartRight} y2={chartBaseline}
              stroke="#f59e0b" strokeWidth="0.5" opacity="0.1"
            />

            {/* Y-axis */}
            <line x1={chartLeft} y1={chartBaseline} x2={chartLeft} y2={chartBaseline - 145}
              stroke="#f59e0b" strokeWidth="0.5" opacity="0.1"
            />

            {/* Tiny axis labels */}
            <text x={chartLeft - 2} y={chartBaseline - 43} textAnchor="end"
              fill="#f59e0b" opacity="0.12" fontSize="5" fontFamily="monospace">1.1kN</text>
            <text x={chartLeft - 2} y={chartBaseline - 88} textAnchor="end"
              fill="#f59e0b" opacity="0.12" fontSize="5" fontFamily="monospace">2.2kN</text>
            <text x={chartLeft - 2} y={chartBaseline - 133} textAnchor="end"
              fill="#f59e0b" opacity="0.12" fontSize="5" fontFamily="monospace">3.4kN</text>

            {/* Rep number labels along baseline */}
            {Array.from({ length: repCount }, (_, i) => (
              <text
                key={`rep-${i}`}
                x={chartLeft + repSpacing * (i + 0.5)}
                y={chartBaseline + 8}
                textAnchor="middle"
                fill="#f59e0b" opacity="0.1" fontSize="5" fontFamily="monospace"
              >
                R{i + 1}
              </text>
            ))}

            {/* Label */}
            <text x={chartLeft + chartWidth / 2} y={chartBaseline + 16}
              textAnchor="middle" fill="#f59e0b" opacity="0.08" fontSize="5"
              fontFamily="monospace" letterSpacing="1">
              PEAK FORCE · SET IN PROGRESS
            </text>

            {/* Filled area under the curve (revealed left-to-right) */}
            <path
              d={forcePath + `L${chartRight},${chartBaseline} L${chartLeft},${chartBaseline} Z`}
              fill="url(#la-force-fill)"
              clipPath="url(#la-fill-reveal)"
            />

            {/* The force curve line itself (revealed left-to-right) */}
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

            {/* Glowing dot that traces along the curve */}
            <circle r="3" fill="#f59e0b" opacity="0.5"
              style={{ animation: `la-dot ${chartDuration}s linear infinite` }}
            />
            <circle r="6" fill="#f59e0b" opacity="0.12" filter="url(#la-glow)"
              style={{ animation: `la-dot ${chartDuration}s linear infinite` }}
            />

            {/* Rep peak markers — small dots at each peak, appear when reached */}
            {peakHeights.map((h, i) => {
              const cx = chartLeft + repSpacing * (i + 0.5);
              const cy = chartBaseline - h;
              const delay = (chartDuration * (i + 0.5)) / repCount;
              return (
                <circle
                  key={`pk-${i}`}
                  cx={cx} cy={cy} r="2"
                  fill="#f59e0b" opacity="0"
                  style={{
                    animation: `la-peak-appear ${chartDuration}s linear infinite`,
                    animationDelay: `${delay}s`,
                  }}
                />
              );
            })}
          </g>

          {/* ══════════ AMBIENT + EFFECTS ══════════ */}

          {/* Ambient background aura */}
          <circle cx="120" cy="120" r="95" fill="#f59e0b" opacity="0.012" />
          <circle cx="120" cy="120" r="60" fill="#f59e0b" opacity="0.025"
            style={{ transformOrigin: '120px 120px', animation: 'la-aura 6s ease-in-out infinite' }}
          />

          {/* Orbital processing dots */}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <g key={`orb-${i}`} style={{
              transformOrigin: '120px 120px',
              animation: 'la-orbit 14s linear infinite',
              animationDelay: `${i * -2.33}s`,
            }}>
              <circle
                cx={192} cy="120"
                r={1.6 + (i % 2) * 0.5}
                fill="#f59e0b"
                opacity={0.12 + (i % 3) * 0.06}
              />
            </g>
          ))}

          {/* ══════════ BARBELL ══════════ */}
          <g style={{ animation: `la-rep ${chartDuration}s linear infinite` }}>

            {/* Plate glow halos (behind plates) */}
            <rect x="8" y="84" width="28" height="72" rx="10"
              fill="#f59e0b" filter="url(#la-glow)"
              style={{ animation: 'la-pglow 4.5s ease-in-out infinite' }}
            />
            <rect x="204" y="84" width="28" height="72" rx="10"
              fill="#f59e0b" filter="url(#la-glow)"
              style={{ animation: 'la-pglow 4.5s ease-in-out infinite' }}
            />

            {/* Bar shaft */}
            <rect x="28" y="116" width="184" height="8" rx="4" fill="url(#la-bar)" />
            <rect x="28" y="122" width="184" height="2" rx="1" fill="black" opacity="0.08" />

            {/* Knurling texture */}
            {[58, 66, 74, 82, 90, 98, 142, 150, 158, 166, 174, 182].map((x, i) => (
              <circle key={`kn-${i}`} cx={x} cy="120" r="0.9" fill="#9ca3af" opacity="0.18" />
            ))}

            {/* Center ring */}
            <rect x="116" y="114" width="8" height="12" rx="2"
              fill="none" stroke="#b0b5bf" strokeWidth="0.9" opacity="0.25"
            />

            {/* Left side — 4 plates (45-45-25-10) */}
            <rect x="40" y="112" width="7" height="16" rx="3" fill="url(#la-collar)" />
            {/* Plate 1: 45lb outer */}
            <rect x="24" y="90" width="16" height="60" rx="5" fill="url(#la-plate)" />
            <rect x="24" y="90" width="3.5" height="60" rx="1.5" fill="white" opacity="0.09" />
            <rect x="36.5" y="90" width="2" height="60" rx="1" fill="black" opacity="0.06" />
            {/* Plate 2: 45lb second */}
            <rect x="8" y="90" width="16" height="60" rx="5" fill="url(#la-plate)" />
            <rect x="8" y="90" width="3.5" height="60" rx="1.5" fill="white" opacity="0.09" />
            <rect x="20.5" y="90" width="2" height="60" rx="1" fill="black" opacity="0.06" />
            {/* Plate 3: 25lb */}
            <rect x="-6" y="98" width="14" height="44" rx="4" fill="url(#la-plate-d)" />
            <rect x="-6" y="98" width="3" height="44" rx="1" fill="white" opacity="0.06" />
            {/* Plate 4: 10lb smallest */}
            <rect x="-16" y="105" width="10" height="30" rx="3" fill="url(#la-plate-d)" />
            <rect x="-16" y="105" width="2.5" height="30" rx="1" fill="white" opacity="0.05" />

            {/* Right side — 4 plates (45-45-25-10) */}
            <rect x="193" y="112" width="7" height="16" rx="3" fill="url(#la-collar)" />
            {/* Plate 1: 45lb outer */}
            <rect x="200" y="90" width="16" height="60" rx="5" fill="url(#la-plate)" />
            <rect x="212.5" y="90" width="3.5" height="60" rx="1.5" fill="white" opacity="0.09" />
            <rect x="200" y="90" width="2" height="60" rx="1" fill="black" opacity="0.06" />
            {/* Plate 2: 45lb second */}
            <rect x="216" y="90" width="16" height="60" rx="5" fill="url(#la-plate)" />
            <rect x="216" y="90" width="3.5" height="60" rx="1.5" fill="white" opacity="0.09" />
            <rect x="228.5" y="90" width="2" height="60" rx="1" fill="black" opacity="0.06" />
            {/* Plate 3: 25lb */}
            <rect x="232" y="98" width="14" height="44" rx="4" fill="url(#la-plate-d)" />
            <rect x="243" y="98" width="3" height="44" rx="1" fill="white" opacity="0.06" />
            {/* Plate 4: 10lb smallest */}
            <rect x="246" y="105" width="10" height="30" rx="3" fill="url(#la-plate-d)" />
            <rect x="253.5" y="105" width="2.5" height="30" rx="1" fill="white" opacity="0.05" />

            {/* Diagonal chrome light sweep */}
            <rect x="0" y="86" width="240" height="68" rx="6"
              fill="url(#la-shine)" opacity="0.9"
              style={{ animation: 'la-sweep 4.5s ease-in-out infinite' }}
            />

            {/* Spark particles — left plate */}
            <circle cx="16" cy="108" r="1.5" fill="#fcd34d" style={{ animation: 'la-spl0 4.5s ease-out infinite' }} />
            <circle cx="18" cy="116" r="1.3" fill="#fbbf24" style={{ animation: 'la-spl1 4.5s ease-out infinite' }} />
            <circle cx="16" cy="124" r="1.4" fill="#fcd34d" style={{ animation: 'la-spl2 4.5s ease-out infinite' }} />
            <circle cx="18" cy="132" r="1.1" fill="#fbbf24" style={{ animation: 'la-spl3 4.5s ease-out infinite' }} />
            <circle cx="14" cy="100" r="1.2" fill="#fcd34d" style={{ animation: 'la-spl4 4.5s ease-out infinite' }} />

            {/* Spark particles — right plate */}
            <circle cx="224" cy="108" r="1.5" fill="#fcd34d" style={{ animation: 'la-spr0 4.5s ease-out infinite' }} />
            <circle cx="222" cy="116" r="1.3" fill="#fbbf24" style={{ animation: 'la-spr1 4.5s ease-out infinite' }} />
            <circle cx="224" cy="124" r="1.4" fill="#fcd34d" style={{ animation: 'la-spr2 4.5s ease-out infinite' }} />
            <circle cx="222" cy="132" r="1.1" fill="#fbbf24" style={{ animation: 'la-spr3 4.5s ease-out infinite' }} />
            <circle cx="226" cy="100" r="1.2" fill="#fcd34d" style={{ animation: 'la-spr4 4.5s ease-out infinite' }} />
          </g>

          {/* Dynamic ground shadow */}
          <ellipse cx="120" cy="218" rx="52" ry="4.5"
            fill="#f59e0b" opacity="0.04"
            style={{ transformOrigin: '120px 218px', animation: `la-shadow ${chartDuration}s linear infinite` }}
          />
        </svg>
      </div>

      <style>{`
        /* ── Rep motion: 8 reps synced to force chart ── */
        @keyframes la-rep {
          ${barbellKF}
        }

        /* ── Orbital dots ── */
        @keyframes la-orbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* ── Plate glow breathing ── */
        @keyframes la-pglow {
          0%, 100% { opacity: 0.06; }
          55%      { opacity: 0.22; }
        }

        /* ── Background aura ── */
        @keyframes la-aura {
          0%, 100% { transform: scale(1); opacity: 0.025; }
          50%      { transform: scale(1.12); opacity: 0.05; }
        }

        /* ── Chrome shine sweep ── */
        @keyframes la-sweep {
          0%, 42%  { transform: translateX(-280px) skewX(-14deg); }
          72%      { transform: translateX(280px) skewX(-14deg); }
          100%     { transform: translateX(280px) skewX(-14deg); }
        }

        /* ── Dynamic ground shadow: synced to barbell ── */
        @keyframes la-shadow {
          ${shadowKF}
        }

        /* ── Chart reveal: clip rect expands from width=0 to full ── */
        @keyframes la-reveal {
          0%   { width: 0; }
          85%  { width: ${chartWidth}px; }
          100% { width: ${chartWidth}px; }
        }

        /* ── Whole chart group: visible during draw, fades at cycle end ── */
        @keyframes la-chart-cycle {
          0%   { opacity: 0; }
          2%   { opacity: 1; }
          87%  { opacity: 1; }
          95%  { opacity: 0; }
          100% { opacity: 0; }
        }

        /* ── Tracing dot follows the chart reveal ── */
        @keyframes la-dot {
          0%   { cx: ${chartLeft}; cy: ${chartBaseline}; opacity: 0.6; }
          ${/* Generate keyframes for each rep peak */''}
          ${peakHeights.map((h, i) => {
            const pct = ((i + 0.5) / repCount * 85).toFixed(1);
            const cx = (chartLeft + repSpacing * (i + 0.5)).toFixed(1);
            const cy = (chartBaseline - h).toFixed(1);
            // Between peaks (valleys)
            const valPct = ((i + 1) / repCount * 85).toFixed(1);
            const valCx = (chartLeft + repSpacing * (i + 1)).toFixed(1);
            return `${pct}% { cx: ${cx}; cy: ${cy}; opacity: 0.7; }\n          ${i < repCount - 1 ? `${valPct}% { cx: ${valCx}; cy: ${chartBaseline}; opacity: 0.4; }` : ''}`;
          }).join('\n          ')}
          85%  { cx: ${chartRight}; cy: ${chartBaseline}; opacity: 0.4; }
          92%  { cx: ${chartRight}; cy: ${chartBaseline}; opacity: 0; }
          100% { cx: ${chartLeft}; cy: ${chartBaseline}; opacity: 0; }
        }

        /* ── Peak markers appear when the trace reaches them ── */
        @keyframes la-peak-appear {
          0%, 1%   { opacity: 0; r: 0; }
          2%       { opacity: 0.6; r: 3; }
          6%       { opacity: 0.35; r: 2; }
          88%      { opacity: 0.35; r: 2; }
          95%      { opacity: 0; r: 2; }
          100%     { opacity: 0; r: 0; }
        }

        /* ── Left spark particles ── */
        @keyframes la-spl0 {
          0%,56% { transform: translate(0,0); opacity: 0; }
          60%    { opacity: 0.9; }
          82%    { transform: translate(-20px,-18px); opacity: 0; }
          100%   { opacity: 0; }
        }
        @keyframes la-spl1 {
          0%,58% { transform: translate(0,0); opacity: 0; }
          62%    { opacity: 0.85; }
          84%    { transform: translate(-24px,-6px); opacity: 0; }
          100%   { opacity: 0; }
        }
        @keyframes la-spl2 {
          0%,57% { transform: translate(0,0); opacity: 0; }
          61%    { opacity: 0.9; }
          83%    { transform: translate(-22px,10px); opacity: 0; }
          100%   { opacity: 0; }
        }
        @keyframes la-spl3 {
          0%,59% { transform: translate(0,0); opacity: 0; }
          63%    { opacity: 0.8; }
          85%    { transform: translate(-16px,18px); opacity: 0; }
          100%   { opacity: 0; }
        }
        @keyframes la-spl4 {
          0%,55% { transform: translate(0,0); opacity: 0; }
          59%    { opacity: 0.85; }
          81%    { transform: translate(-26px,-22px); opacity: 0; }
          100%   { opacity: 0; }
        }

        /* ── Right spark particles ── */
        @keyframes la-spr0 {
          0%,56% { transform: translate(0,0); opacity: 0; }
          60%    { opacity: 0.9; }
          82%    { transform: translate(20px,-18px); opacity: 0; }
          100%   { opacity: 0; }
        }
        @keyframes la-spr1 {
          0%,58% { transform: translate(0,0); opacity: 0; }
          62%    { opacity: 0.85; }
          84%    { transform: translate(24px,-6px); opacity: 0; }
          100%   { opacity: 0; }
        }
        @keyframes la-spr2 {
          0%,57% { transform: translate(0,0); opacity: 0; }
          61%    { opacity: 0.9; }
          83%    { transform: translate(22px,10px); opacity: 0; }
          100%   { opacity: 0; }
        }
        @keyframes la-spr3 {
          0%,59% { transform: translate(0,0); opacity: 0; }
          63%    { opacity: 0.8; }
          85%    { transform: translate(16px,18px); opacity: 0; }
          100%   { opacity: 0; }
        }
        @keyframes la-spr4 {
          0%,55% { transform: translate(0,0); opacity: 0; }
          59%    { opacity: 0.85; }
          81%    { transform: translate(26px,-22px); opacity: 0; }
          100%   { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default LiftAnimation;
