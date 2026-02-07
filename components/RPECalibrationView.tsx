import React, { useState } from 'react';
import { RPECalibration, DEFAULT_RPE_TO_PERCENT } from '../types';

const RPE_VALUES = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6];

const RPE_DESCRIPTIONS: Record<number, string> = {
  10: 'Maximum effort — could not do another rep',
  9.5: 'Could maybe do 1 more rep',
  9: 'Could definitely do 1 more rep',
  8.5: 'Could do 1-2 more reps',
  8: 'Could do 2 more reps',
  7.5: 'Could do 2-3 more reps',
  7: 'Could do 3 more reps',
  6.5: 'Could do 3-4 more reps',
  6: 'Could do 4+ more reps — warmup intensity',
};

const RPECalibrationView: React.FC = () => {
  const [calibration, setCalibration] = useState<RPECalibration>({
    calibrationMethod: 'self-assessment',
    rpeToPercentMap: { ...DEFAULT_RPE_TO_PERCENT },
  });
  const [saved, setSaved] = useState(false);

  const updatePercent = (rpe: number, pct: number) => {
    setCalibration(prev => ({
      ...prev,
      rpeToPercentMap: {
        ...prev.rpeToPercentMap,
        [rpe]: pct,
      },
    }));
  };

  const resetToDefaults = () => {
    setCalibration(prev => ({
      ...prev,
      rpeToPercentMap: { ...DEFAULT_RPE_TO_PERCENT },
    }));
  };

  const handleSave = () => {
    setCalibration(prev => ({
      ...prev,
      lastCalibrated: Date.now(),
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const currentMap = calibration.rpeToPercentMap || DEFAULT_RPE_TO_PERCENT;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <span className="text-3xl">🎯</span> RPE Calibration
      </h2>
      <p className="text-neutral-400 text-sm">
        Calibrate your personal RPE-to-percentage mapping. Everyone is different — some athletes can grind more reps at high percentages while others need lower loads for the same RPE.
      </p>

      {/* Method Selection */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <h3 className="text-lg font-semibold text-white mb-3">Calibration Method</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'self-assessment' as const, label: 'Self-Assessment', icon: '🧠', desc: 'Rate effort after each set' },
            { value: 'video-review' as const, label: 'Video Review', icon: '📹', desc: 'Review bar speed on video' },
            { value: 'bar-speed' as const, label: 'Bar Speed', icon: '⚡', desc: 'Use velocity-based tracking' },
          ].map(m => (
            <button
              key={m.value}
              onClick={() => setCalibration(prev => ({ ...prev, calibrationMethod: m.value }))}
              className={`p-3 rounded-lg border text-center transition-all ${
                calibration.calibrationMethod === m.value
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-neutral-700 bg-neutral-800 hover:border-neutral-600'
              }`}
            >
              <div className="text-2xl mb-1">{m.icon}</div>
              <div className="text-sm font-semibold text-white">{m.label}</div>
              <div className="text-xs text-neutral-400">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* RPE Scale Reference */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <h3 className="text-lg font-semibold text-white mb-4">RPE Scale Reference</h3>
        <div className="space-y-2">
          {RPE_VALUES.map(rpe => (
            <div key={rpe} className="flex items-center gap-3">
              <div className={`w-12 h-8 flex items-center justify-center rounded font-bold text-sm ${
                rpe >= 9.5 ? 'bg-red-500/20 text-red-400' :
                rpe >= 8 ? 'bg-orange-500/20 text-orange-400' :
                rpe >= 7 ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {rpe}
              </div>
              <div className="flex-1 text-sm text-neutral-300">{RPE_DESCRIPTIONS[rpe]}</div>
              <div className="text-sm text-neutral-500 font-mono">~{DEFAULT_RPE_TO_PERCENT[rpe]}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Personal Calibration */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Your RPE → %1RM Mapping</h3>
          <button
            onClick={resetToDefaults}
            className="text-xs px-3 py-1 bg-neutral-800 text-neutral-400 rounded-lg border border-neutral-700 hover:border-neutral-600"
          >
            Reset to Standard
          </button>
        </div>
        <p className="text-xs text-neutral-400 mb-4">
          Adjust these if your perceived effort doesn't match standard percentages. For example, if RPE 8 feels like 92% for you instead of 90%, update it here.
        </p>
        <div className="space-y-3">
          {RPE_VALUES.map(rpe => {
            const pct = currentMap[rpe] ?? DEFAULT_RPE_TO_PERCENT[rpe];
            const defaultPct = DEFAULT_RPE_TO_PERCENT[rpe];
            const diff = pct - defaultPct;
            return (
              <div key={rpe} className="flex items-center gap-4">
                <span className="text-sm font-bold text-white w-10">RPE {rpe}</span>
                <input
                  type="range"
                  min={rpe === 10 ? 95 : 60}
                  max={100}
                  step={0.5}
                  value={pct}
                  onChange={e => updatePercent(rpe, Number(e.target.value))}
                  className="flex-1 accent-red-500"
                />
                <span className="text-sm font-mono text-red-400 w-14 text-right">{pct}%</span>
                {diff !== 0 && (
                  <span className={`text-xs w-12 text-right ${diff > 0 ? 'text-green-400' : 'text-blue-400'}`}>
                    {diff > 0 ? '+' : ''}{diff}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Visual Bar Chart */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <h3 className="text-lg font-semibold text-white mb-4">Visual Comparison</h3>
        <div className="space-y-2">
          {RPE_VALUES.map(rpe => {
            const yourPct = currentMap[rpe] ?? DEFAULT_RPE_TO_PERCENT[rpe];
            const stdPct = DEFAULT_RPE_TO_PERCENT[rpe];
            return (
              <div key={rpe} className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 w-8">{rpe}</span>
                <div className="flex-1 relative h-4 bg-neutral-800 rounded overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-neutral-600/50 rounded" style={{ width: `${stdPct}%` }} />
                  <div className="absolute inset-y-0 left-0 bg-red-500/80 rounded" style={{ width: `${yourPct}%` }} />
                </div>
                <span className="text-xs text-neutral-500 font-mono w-8">{yourPct}%</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded inline-block" /> Your Calibration</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-neutral-600 rounded inline-block" /> Standard</span>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <h3 className="text-lg font-semibold text-white mb-2">Calibration Notes</h3>
        <textarea
          value={calibration.notes || ''}
          onChange={e => setCalibration(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Notes about your RPE tendencies (e.g., 'I tend to underrate RPE on squats')"
          rows={3}
          className="w-full bg-neutral-800 text-white p-3 rounded-lg border border-neutral-700 text-sm resize-none"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
      >
        {saved ? '✓ Calibration Saved!' : 'Save Calibration'}
      </button>
      {calibration.lastCalibrated && (
        <p className="text-xs text-neutral-500 text-center">
          Last calibrated: {new Date(calibration.lastCalibrated).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};

export default RPECalibrationView;
