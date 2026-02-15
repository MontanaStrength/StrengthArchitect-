import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * LiftAnimationGeometric — Architectural/blueprint aesthetic for workout generation.
 * 
 * Features:
 * - Deconstructed barbell components that assemble/disassemble
 * - Clean geometric primitives (no gradients, minimal color)
 * - Tension/load vector lines showing force distribution
 * - Blueprint-style dimension markers
 * - Technical, professional, data-driven aesthetic
 * 
 * No sparks, glows, or cartoonish elements — pure engineering visualization.
 */

interface Props {
  size?: number;
}

const LiftAnimationGeometric: React.FC<Props> = ({ size = 160 }) => {
  const [phase, setPhase] = useState<'disassemble' | 'assemble' | 'load'>('disassemble');

  useEffect(() => {
    const cycle = setInterval(() => {
      setPhase(prev => {
        if (prev === 'disassemble') return 'assemble';
        if (prev === 'assemble') return 'load';
        return 'disassemble';
      });
    }, 3500);
    return () => clearInterval(cycle);
  }, []);

  const viewBox = "0 0 240 240";
  const centerX = 120;
  const centerY = 120;

  // Barbell component positions (assembled state)
  const barY = centerY;
  const plateLeftX = 30;
  const plateRightX = 210;
  const collarLeftX = 54;
  const collarRightX = 186;

  // Animation variants for each component
  const shaftVariants = {
    disassemble: { scaleX: 0.3, opacity: 0.2 },
    assemble: { scaleX: 1, opacity: 1 },
    load: { scaleX: 1, opacity: 1, y: [0, 2, 0] },
  };

  const plateVariants = (side: 'left' | 'right') => ({
    disassemble: {
      x: side === 'left' ? -80 : 80,
      y: -40,
      opacity: 0,
      rotate: side === 'left' ? -180 : 180,
    },
    assemble: {
      x: 0,
      y: 0,
      opacity: 1,
      rotate: 0,
    },
    load: {
      x: 0,
      y: [0, 1, 0],
      opacity: 1,
      rotate: 0,
    },
  });

  const collarVariants = (side: 'left' | 'right') => ({
    disassemble: {
      x: side === 'left' ? -30 : 30,
      opacity: 0,
    },
    assemble: {
      x: 0,
      opacity: 1,
    },
    load: {
      x: 0,
      opacity: 1,
    },
  });

  const vectorVariants = {
    disassemble: { opacity: 0, pathLength: 0 },
    assemble: { opacity: 0, pathLength: 0 },
    load: { opacity: 0.25, pathLength: 1 },
  };

  const dimensionVariants = {
    disassemble: { opacity: 0 },
    assemble: { opacity: 0.4 },
    load: { opacity: 0.4 },
  };

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Subtle grid pattern for blueprint aesthetic */}
          <pattern id="geom-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#334155" strokeWidth="0.3" opacity="0.1" />
          </pattern>
        </defs>

        {/* Background grid */}
        <rect width="240" height="240" fill="url(#geom-grid)" />

        {/* Center crosshair */}
        <line x1={centerX} y1="0" x2={centerX} y2="240" stroke="#475569" strokeWidth="0.5" opacity="0.08" strokeDasharray="2 4" />
        <line x1="0" y1={centerY} x2="240" y2={centerY} stroke="#475569" strokeWidth="0.5" opacity="0.08" strokeDasharray="2 4" />

        {/* Load vector arrows (appear in 'load' phase) */}
        <motion.g
          variants={vectorVariants}
          initial="disassemble"
          animate={phase}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {/* Downward force vectors on plates */}
          <motion.path
            d={`M ${plateLeftX + 14} ${barY - 35} L ${plateLeftX + 14} ${barY - 10}`}
            stroke="#f59e0b"
            strokeWidth="1.5"
            markerEnd="url(#arrow-down)"
            initial={{ pathLength: 0 }}
          />
          <motion.path
            d={`M ${plateRightX + 14} ${barY - 35} L ${plateRightX + 14} ${barY - 10}`}
            stroke="#f59e0b"
            strokeWidth="1.5"
            markerEnd="url(#arrow-down)"
            initial={{ pathLength: 0 }}
          />
          {/* Upward reaction force at center */}
          <motion.path
            d={`M ${centerX} ${barY + 45} L ${centerX} ${barY + 15}`}
            stroke="#10b981"
            strokeWidth="1.5"
            markerEnd="url(#arrow-up)"
            initial={{ pathLength: 0 }}
          />
          {/* Tension lines on bar shaft */}
          <line x1="60" y1={barY - 8} x2="180" y2={barY - 8} stroke="#60a5fa" strokeWidth="0.5" opacity="0.3" strokeDasharray="2 2" />
          <line x1="60" y1={barY + 8} x2="180" y2={barY + 8} stroke="#60a5fa" strokeWidth="0.5" opacity="0.3" strokeDasharray="2 2" />
        </motion.g>

        {/* Dimension lines (appear in assemble phase) */}
        <motion.g
          variants={dimensionVariants}
          initial="disassemble"
          animate={phase}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* Total length dimension */}
          <line x1="10" y1="200" x2="230" y2="200" stroke="#64748b" strokeWidth="0.5" />
          <line x1="10" y1="195" x2="10" y2="205" stroke="#64748b" strokeWidth="0.5" />
          <line x1="230" y1="195" x2="230" y2="205" stroke="#64748b" strokeWidth="0.5" />
          <text x="120" y="215" fill="#64748b" fontSize="6" textAnchor="middle" fontFamily="monospace">
            L = 2200mm
          </text>
        </motion.g>

        {/* Arrow markers for vectors */}
        <defs>
          <marker id="arrow-down" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <polygon points="0,0 6,0 3,6" fill="#f59e0b" />
          </marker>
          <marker id="arrow-up" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <polygon points="0,0 6,0 3,6" fill="#10b981" />
          </marker>
        </defs>

        {/* BARBELL COMPONENTS */}

        {/* Bar shaft (center) */}
        <motion.g
          variants={shaftVariants}
          initial="disassemble"
          animate={phase}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ originX: `${centerX}px`, originY: `${barY}px` }}
        >
          <rect x="60" y={barY - 4} width="120" height="8" rx="4" fill="#94a3b8" />
          <rect x="60" y={barY - 4} width="120" height="2" fill="#cbd5e1" opacity="0.3" />
          <rect x="60" y={barY + 2} width="120" height="2" fill="#1e293b" opacity="0.2" />
          {/* Center knurling mark */}
          <rect x="118" y={barY - 6} width="4" height="12" fill="none" stroke="#64748b" strokeWidth="0.8" />
        </motion.g>

        {/* Left collar */}
        <motion.g
          variants={collarVariants('left')}
          initial="disassemble"
          animate={phase}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <rect x={collarLeftX} y={barY - 6} width="6" height="12" rx="1" fill="#64748b" />
          <line x1={collarLeftX} y1={barY - 6} x2={collarLeftX} y2={barY + 6} stroke="#94a3b8" strokeWidth="0.5" />
        </motion.g>

        {/* Right collar */}
        <motion.g
          variants={collarVariants('right')}
          initial="disassemble"
          animate={phase}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <rect x={collarRightX} y={barY - 6} width="6" height="12" rx="1" fill="#64748b" />
          <line x1={collarRightX + 6} y1={barY - 6} x2={collarRightX + 6} y2={barY + 6} stroke="#94a3b8" strokeWidth="0.5" />
        </motion.g>

        {/* Left plates (45lb outer + 25lb inner) */}
        <motion.g
          variants={plateVariants('left')}
          initial="disassemble"
          animate={phase}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Outer 45lb plate */}
          <rect x={plateLeftX} y={barY - 30} width="24" height="60" rx="3" fill="none" stroke="#f59e0b" strokeWidth="2" />
          <rect x={plateLeftX + 2} y={barY - 28} width="20" height="56" rx="2" fill="#0a0a0a" />
          <circle cx={plateLeftX + 12} cy={barY} r="6" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
          <text x={plateLeftX + 12} y={barY + 2} fill="#f59e0b" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="monospace">45</text>
          
          {/* Inner 25lb plate */}
          <rect x={plateLeftX + 24} y={barY - 22} width="18" height="44" rx="2" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
          <rect x={plateLeftX + 26} y={barY - 20} width="14" height="40" rx="1" fill="#0a0a0a" />
          <text x={plateLeftX + 33} y={barY + 2} fill="#f59e0b" fontSize="5" fontWeight="600" textAnchor="middle" fontFamily="monospace">25</text>
        </motion.g>

        {/* Right plates (45lb outer + 25lb inner) */}
        <motion.g
          variants={plateVariants('right')}
          initial="disassemble"
          animate={phase}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Outer 45lb plate */}
          <rect x={plateRightX - 24} y={barY - 30} width="24" height="60" rx="3" fill="none" stroke="#f59e0b" strokeWidth="2" />
          <rect x={plateRightX - 22} y={barY - 28} width="20" height="56" rx="2" fill="#0a0a0a" />
          <circle cx={plateRightX - 12} cy={barY} r="6" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
          <text x={plateRightX - 12} y={barY + 2} fill="#f59e0b" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="monospace">45</text>
          
          {/* Inner 25lb plate */}
          <rect x={plateRightX - 42} y={barY - 22} width="18" height="44" rx="2" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
          <rect x={plateRightX - 40} y={barY - 20} width="14" height="40" rx="1" fill="#0a0a0a" />
          <text x={plateRightX - 33} y={barY + 2} fill="#f59e0b" fontSize="5" fontWeight="600" textAnchor="middle" fontFamily="monospace">25</text>
        </motion.g>

        {/* Force analysis data overlay (load phase) */}
        {phase === 'load' && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Analysis readout box */}
            <rect x="8" y="8" width="75" height="48" rx="2" fill="#0a0a0a" stroke="#334155" strokeWidth="1" opacity="0.8" />
            <text x="12" y="18" fill="#64748b" fontSize="6" fontFamily="monospace">LOAD ANALYSIS</text>
            <text x="12" y="28" fill="#f59e0b" fontSize="7" fontWeight="600" fontFamily="monospace">140 lbs</text>
            <text x="12" y="36" fill="#64748b" fontSize="5" fontFamily="monospace">Moment: 45 Nm</text>
            <text x="12" y="43" fill="#64748b" fontSize="5" fontFamily="monospace">Stress: 220 MPa</text>
            <text x="12" y="50" fill="#10b981" fontSize="5" fontFamily="monospace">Status: NOMINAL</text>

            {/* Processing indicator */}
            <motion.circle
              cx="78"
              cy="15"
              r="2"
              fill="#f59e0b"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.g>
        )}

        {/* Assembly progress indicator */}
        {phase === 'assemble' && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <text x="120" y="30" fill="#64748b" fontSize="6" textAnchor="middle" fontFamily="monospace">
              ASSEMBLING COMPONENTS
            </text>
            {/* Progress dots */}
            {[0, 1, 2, 3].map(i => (
              <motion.circle
                key={i}
                cx={105 + i * 10}
                cy="38"
                r="1.5"
                fill="#f59e0b"
                initial={{ opacity: 0.2 }}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </motion.g>
        )}

        {/* Technical annotations (always visible, subtle) */}
        <g opacity="0.15">
          <text x="120" y="230" fill="#64748b" fontSize="5" textAnchor="middle" fontFamily="monospace" letterSpacing="1">
            STRENGTH ARCHITECT · SESSION BUILD PROCESS
          </text>
        </g>
      </svg>

      {/* Phase label below animation */}
      <motion.div
        className="mt-3 text-center"
        key={phase}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-xs font-mono text-gray-500 tracking-wider uppercase">
          {phase === 'disassemble' && 'Deconstructing parameters'}
          {phase === 'assemble' && 'Building session structure'}
          {phase === 'load' && 'Calculating force distribution'}
        </p>
      </motion.div>
    </div>
  );
};

export default LiftAnimationGeometric;
