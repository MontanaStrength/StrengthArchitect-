import React from 'react';

/**
 * LiftAnimation — A barbell that floats gently up and down while
 * doing a smooth full 360° rotation in the plane facing the viewer.
 */

interface Props {
  /** Size of the SVG (square). Default 160 */
  size?: number;
}

const LiftAnimation: React.FC<Props> = ({ size = 160 }) => {
  return (
    <div className="flex flex-col items-center">
      <div style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 160 160"
          width={size}
          height={size}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ambient glow */}
          <circle cx="80" cy="80" r="55" fill="#f59e0b" opacity="0.03" />
          <circle cx="80" cy="80" r="38" fill="#f59e0b" opacity="0.05" />

          {/* Barbell: float + full 360° spin */}
          <g style={{
            transformOrigin: '80px 80px',
            animation: 'bb-spin 4s linear infinite, bb-float 3s ease-in-out infinite',
          }}>
            {/* Bar */}
            <rect x="16" y="77" width="128" height="6" rx="3" fill="#6b7280" />

            {/* Left outer plate */}
            <rect x="9" y="58" width="12" height="44" rx="4" fill="#f59e0b" opacity="0.9" />
            {/* Left inner plate */}
            <rect x="1" y="63" width="8" height="34" rx="3" fill="#f59e0b" opacity="0.55" />
            {/* Left collar */}
            <rect x="21" y="73" width="5" height="14" rx="2.5" fill="#9ca3af" opacity="0.7" />

            {/* Right outer plate */}
            <rect x="139" y="58" width="12" height="44" rx="4" fill="#f59e0b" opacity="0.9" />
            {/* Right inner plate */}
            <rect x="151" y="63" width="8" height="34" rx="3" fill="#f59e0b" opacity="0.55" />
            {/* Right collar */}
            <rect x="134" y="73" width="5" height="14" rx="2.5" fill="#9ca3af" opacity="0.7" />

            {/* Knurling */}
            <circle cx="54" cy="80" r="1.2" fill="#9ca3af" opacity="0.3" />
            <circle cx="62" cy="80" r="1.2" fill="#9ca3af" opacity="0.3" />
            <circle cx="70" cy="80" r="1.2" fill="#9ca3af" opacity="0.3" />
            <circle cx="78" cy="80" r="1.2" fill="#9ca3af" opacity="0.3" />
            <circle cx="86" cy="80" r="1.2" fill="#9ca3af" opacity="0.3" />
            <circle cx="94" cy="80" r="1.2" fill="#9ca3af" opacity="0.3" />
            <circle cx="102" cy="80" r="1.2" fill="#9ca3af" opacity="0.3" />

            {/* Center ring */}
            <rect x="76" y="75" width="8" height="10" rx="2" fill="none" stroke="#9ca3af" strokeWidth="0.8" opacity="0.25" />
          </g>

          {/* Ground shadow */}
          <ellipse cx="80" cy="142" rx="38" ry="4"
            fill="#f59e0b" opacity="0.06"
            style={{ animation: 'bb-shadow 3s ease-in-out infinite' }}
          />
        </svg>
      </div>

      <style>{`
        @keyframes bb-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes bb-float {
          0%, 100% { transform: translateY(6px); }
          50% { transform: translateY(-6px); }
        }

        @keyframes bb-shadow {
          0%, 100% { opacity: 0.08; }
          50% { opacity: 0.03; }
        }
      `}</style>
    </div>
  );
};

export default LiftAnimation;
