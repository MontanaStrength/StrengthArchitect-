import React from 'react';

/**
 * LiftAnimation — Premium barbell animation featuring:
 *   • Bench-press rep motion (eccentric → pause → explosive concentric)
 *   • Metallic gradient bar & amber gradient plates with edge highlights
 *   • Diagonal chrome light sweep on every press
 *   • Energy pulse rings radiating on the concentric lockout
 *   • Ember spark particles scattering off plates at lockout
 *   • Orbital processing dots circling the barbell
 *   • Breathing plate glow aura
 *   • Dynamic ground shadow that responds to bar height
 *   • Brief flash burst at peak power
 *
 * Pure SVG + CSS keyframes — zero dependencies, smooth 60 fps.
 */

interface Props {
  /** Display size (square). Default 160 */
  size?: number;
}

const LiftAnimation: React.FC<Props> = ({ size = 160 }) => {
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
          </defs>

          {/* ── Ambient background aura ── */}
          <circle cx="120" cy="120" r="95" fill="#f59e0b" opacity="0.012" />
          <circle cx="120" cy="120" r="60" fill="#f59e0b" opacity="0.025"
            style={{ transformOrigin: '120px 120px', animation: 'la-aura 4s ease-in-out infinite' }}
          />

          {/* ── Energy pulse rings (fire on concentric lockout) ── */}
          {[0, 0.18, 0.36].map((d, i) => (
            <circle
              key={`ring-${i}`}
              cx="120" cy="120" r="16"
              stroke="#f59e0b" strokeWidth={1.4 - i * 0.35} fill="none"
              style={{
                transformOrigin: '120px 120px',
                animation: 'la-ring 3s ease-out infinite',
                animationDelay: `${1.5 + d}s`,
              }}
            />
          ))}

          {/* ── Lockout flash burst ── */}
          <circle cx="120" cy="120" r="45" fill="white"
            style={{ animation: 'la-flash 3s ease-out infinite' }}
          />

          {/* ── Orbital processing dots ── */}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <g key={`orb-${i}`} style={{
              transformOrigin: '120px 120px',
              animation: 'la-orbit 9s linear infinite',
              animationDelay: `${i * -1.5}s`,
            }}>
              <circle
                cx={192} cy="120"
                r={1.6 + (i % 2) * 0.5}
                fill="#f59e0b"
                opacity={0.12 + (i % 3) * 0.06}
              />
            </g>
          ))}

          {/* ── Main barbell group — bench-press rep motion ── */}
          <g style={{ animation: 'la-rep 3s ease-in-out infinite' }}>

            {/* Plate glow halos (behind plates) */}
            <rect x="18" y="84" width="28" height="72" rx="10"
              fill="#f59e0b" filter="url(#la-glow)"
              style={{ animation: 'la-pglow 3s ease-in-out infinite' }}
            />
            <rect x="194" y="84" width="28" height="72" rx="10"
              fill="#f59e0b" filter="url(#la-glow)"
              style={{ animation: 'la-pglow 3s ease-in-out infinite' }}
            />

            {/* ─ Bar shaft ─ */}
            <rect x="28" y="116" width="184" height="8" rx="4" fill="url(#la-bar)" />
            {/* Subtle bar bottom shadow for depth */}
            <rect x="28" y="122" width="184" height="2" rx="1" fill="black" opacity="0.08" />

            {/* Knurling texture */}
            {[58, 66, 74, 82, 90, 98, 142, 150, 158, 166, 174, 182].map((x, i) => (
              <circle key={`kn-${i}`} cx={x} cy="120" r="0.9" fill="#9ca3af" opacity="0.18" />
            ))}

            {/* Center ring */}
            <rect x="116" y="114" width="8" height="12" rx="2"
              fill="none" stroke="#b0b5bf" strokeWidth="0.9" opacity="0.25"
            />

            {/* ─ Left side ─ */}
            <rect x="40" y="112" width="7" height="16" rx="3" fill="url(#la-collar)" />
            <rect x="24" y="90" width="16" height="60" rx="5" fill="url(#la-plate)" />
            <rect x="24" y="90" width="3.5" height="60" rx="1.5" fill="white" opacity="0.09" />
            <rect x="36.5" y="90" width="2" height="60" rx="1" fill="black" opacity="0.06" />
            <rect x="10" y="98" width="14" height="44" rx="4" fill="url(#la-plate-d)" />
            <rect x="10" y="98" width="3" height="44" rx="1" fill="white" opacity="0.06" />

            {/* ─ Right side ─ */}
            <rect x="193" y="112" width="7" height="16" rx="3" fill="url(#la-collar)" />
            <rect x="200" y="90" width="16" height="60" rx="5" fill="url(#la-plate)" />
            <rect x="212.5" y="90" width="3.5" height="60" rx="1.5" fill="white" opacity="0.09" />
            <rect x="200" y="90" width="2" height="60" rx="1" fill="black" opacity="0.06" />
            <rect x="216" y="98" width="14" height="44" rx="4" fill="url(#la-plate-d)" />
            <rect x="227" y="98" width="3" height="44" rx="1" fill="white" opacity="0.06" />

            {/* ─ Diagonal chrome light sweep ─ */}
            <rect x="0" y="86" width="240" height="68" rx="6"
              fill="url(#la-shine)" opacity="0.9"
              style={{ animation: 'la-sweep 3s ease-in-out infinite' }}
            />

            {/* ─ Spark particles — left plate ─ */}
            <circle cx="16" cy="108" r="1.5" fill="#fcd34d" style={{ animation: 'la-spl0 3s ease-out infinite' }} />
            <circle cx="18" cy="116" r="1.3" fill="#fbbf24" style={{ animation: 'la-spl1 3s ease-out infinite' }} />
            <circle cx="16" cy="124" r="1.4" fill="#fcd34d" style={{ animation: 'la-spl2 3s ease-out infinite' }} />
            <circle cx="18" cy="132" r="1.1" fill="#fbbf24" style={{ animation: 'la-spl3 3s ease-out infinite' }} />
            <circle cx="14" cy="100" r="1.2" fill="#fcd34d" style={{ animation: 'la-spl4 3s ease-out infinite' }} />

            {/* ─ Spark particles — right plate ─ */}
            <circle cx="224" cy="108" r="1.5" fill="#fcd34d" style={{ animation: 'la-spr0 3s ease-out infinite' }} />
            <circle cx="222" cy="116" r="1.3" fill="#fbbf24" style={{ animation: 'la-spr1 3s ease-out infinite' }} />
            <circle cx="224" cy="124" r="1.4" fill="#fcd34d" style={{ animation: 'la-spr2 3s ease-out infinite' }} />
            <circle cx="222" cy="132" r="1.1" fill="#fbbf24" style={{ animation: 'la-spr3 3s ease-out infinite' }} />
            <circle cx="226" cy="100" r="1.2" fill="#fcd34d" style={{ animation: 'la-spr4 3s ease-out infinite' }} />
          </g>

          {/* ── Dynamic ground shadow ── */}
          <ellipse cx="120" cy="218" rx="52" ry="4.5"
            fill="#f59e0b" opacity="0.04"
            style={{ transformOrigin: '120px 218px', animation: 'la-shadow 3s cubic-bezier(0.33, 0, 0.2, 1) infinite' }}
          />
        </svg>
      </div>

      <style>{`
        /* ── Rep motion: smooth continuous press cycle ── */
        @keyframes la-rep {
          0%, 100% { transform: translateY(0); }
          35%      { transform: translateY(21px); }
          65%      { transform: translateY(-9px); }
        }

        /* ── Energy pulse rings ── */
        @keyframes la-ring {
          0%   { transform: scale(1); opacity: 0; }
          8%   { opacity: 0.5; }
          100% { transform: scale(5.5); opacity: 0; }
        }

        /* ── Brief flash at lockout ── */
        @keyframes la-flash {
          0%, 56%  { opacity: 0; }
          62%      { opacity: 0.035; }
          70%      { opacity: 0; }
          100%     { opacity: 0; }
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

        /* ── Chrome shine sweep (diagonal, timed to press) ── */
        @keyframes la-sweep {
          0%, 42%  { transform: translateX(-280px) skewX(-14deg); }
          72%      { transform: translateX(280px) skewX(-14deg); }
          100%     { transform: translateX(280px) skewX(-14deg); }
        }

        /* ── Dynamic ground shadow ── */
        @keyframes la-shadow {
          0%, 100% { transform: scaleX(1); opacity: 0.04; }
          35%      { transform: scaleX(0.68); opacity: 0.12; }
          65%      { transform: scaleX(1.18); opacity: 0.02; }
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
