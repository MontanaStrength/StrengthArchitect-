import React, { useState, useMemo } from 'react';
import { GymSetup } from '../types';
import { calculatePlateLoading, roundToNearestLoadable } from '../utils/plateCalculator';

interface Props {
  gymSetup: GymSetup;
}

const PlateCalculatorView: React.FC<Props> = ({ gymSetup }) => {
  const [targetWeight, setTargetWeight] = useState<string>('135');
  const [showPerSide, setShowPerSide] = useState(true);

  const target = parseFloat(targetWeight) || 0;
  const rounded = roundToNearestLoadable(target, gymSetup.barbellWeightLbs, gymSetup.availablePlatesLbs);

  const loading = useMemo(() => {
    if (rounded <= gymSetup.barbellWeightLbs) return null;
    return calculatePlateLoading(rounded, gymSetup.barbellWeightLbs, gymSetup.availablePlatesLbs);
  }, [rounded, gymSetup]);

  const quickWeights = [95, 135, 185, 225, 275, 315, 365, 405, 455, 495, 545];

  const getPlateColor = (plate: number): string => {
    if (plate >= 45) return 'bg-red-600 text-white';
    if (plate >= 35) return 'bg-yellow-600 text-white';
    if (plate >= 25) return 'bg-green-600 text-white';
    if (plate >= 10) return 'bg-blue-600 text-white';
    if (plate >= 5) return 'bg-purple-600 text-white';
    return 'bg-neutral-500 text-white';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <span className="text-3xl">🔢</span> Plate Calculator
      </h2>

      {/* Weight Input */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <label className="block text-sm text-neutral-400 mb-2">Target Weight (lbs)</label>
        <input
          type="number"
          value={targetWeight}
          onChange={e => setTargetWeight(e.target.value)}
          step={5}
          min={0}
          className="w-full text-4xl font-bold text-center bg-neutral-800 text-white p-4 rounded-xl border border-neutral-700 focus:border-red-500 outline-none"
        />
        {rounded !== target && target > 0 && (
          <p className="text-xs text-yellow-400 mt-2 text-center">
            Rounded to nearest loadable weight: <span className="font-bold">{rounded} lbs</span>
          </p>
        )}
      </div>

      {/* Quick Select */}
      <div className="flex flex-wrap gap-2">
        {quickWeights.map(w => (
          <button
            key={w}
            onClick={() => setTargetWeight(String(w))}
            className={`px-3 py-2 rounded-lg text-sm font-mono transition-all ${
              rounded === w
                ? 'bg-red-600 text-white'
                : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-red-500/50'
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      {/* Plate Visualization */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Plate Loading</h3>
          <label className="flex items-center gap-2 text-sm text-neutral-400">
            <input
              type="checkbox"
              checked={showPerSide}
              onChange={e => setShowPerSide(e.target.checked)}
              className="accent-red-500"
            />
            Show per side
          </label>
        </div>

        {target <= 0 ? (
          <div className="text-center py-8 text-neutral-500">Enter a target weight above</div>
        ) : rounded <= gymSetup.barbellWeightLbs ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">🏋️</div>
            <p className="text-neutral-300">Empty bar: <span className="text-red-400 font-bold">{gymSetup.barbellWeightLbs} lbs</span></p>
          </div>
        ) : loading ? (
          <>
            {/* Visual bar representation */}
            <div className="flex items-center justify-center gap-1 mb-6 py-4">
              {/* Left plates */}
              <div className="flex items-center gap-0.5 flex-row-reverse">
                {loading.platesPerSide.map((plate, i) => (
                  <div
                    key={`l-${i}`}
                    className={`${getPlateColor(plate)} rounded flex items-center justify-center font-bold text-xs`}
                    style={{
                      width: Math.max(plate * 0.6, 18),
                      height: Math.min(40 + plate * 0.8, 80),
                    }}
                  >
                    {plate}
                  </div>
                ))}
              </div>
              {/* Bar */}
              <div className="w-20 h-3 bg-neutral-500 rounded-full" />
              {/* Collar */}
              <div className="w-2 h-5 bg-neutral-400 rounded" />
              {/* Right plates */}
              <div className="flex items-center gap-0.5">
                {loading.platesPerSide.map((plate, i) => (
                  <div
                    key={`r-${i}`}
                    className={`${getPlateColor(plate)} rounded flex items-center justify-center font-bold text-xs`}
                    style={{
                      width: Math.max(plate * 0.6, 18),
                      height: Math.min(40 + plate * 0.8, 80),
                    }}
                  >
                    {plate}
                  </div>
                ))}
              </div>
            </div>

            {/* Plate List */}
            <div className="bg-neutral-800 rounded-lg p-4">
              <div className="text-center mb-3">
                <span className="text-2xl font-bold text-white">{rounded}</span>
                <span className="text-neutral-400 text-sm ml-1">lbs total</span>
              </div>
              <div className="text-sm text-neutral-300 space-y-1">
                <div className="flex justify-between">
                  <span>Bar:</span>
                  <span className="font-mono text-white">{gymSetup.barbellWeightLbs} lbs</span>
                </div>
                {showPerSide ? (
                  <div className="flex justify-between">
                    <span>Per side:</span>
                    <span className="font-mono text-red-400">
                      {loading.platesPerSide.join(' + ')} lbs
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span>Total plates:</span>
                    <span className="font-mono text-red-400">
                      {loading.platesPerSide.map(p => `2×${p}`).join(' + ')} lbs
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-neutral-700 pt-1 mt-1">
                  <span>Weight per side:</span>
                  <span className="font-mono text-white">{loading.weightPerSide} lbs</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-neutral-500">Cannot load this weight with available plates</div>
        )}
      </div>

      {/* Percentage Table */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <h3 className="text-lg font-semibold text-white mb-4">Percentage Reference</h3>
        <p className="text-xs text-neutral-400 mb-3">Based on {rounded > 0 ? rounded : '---'} lbs</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 40].map(pct => {
            const w = rounded > 0 ? roundToNearestLoadable(rounded * pct / 100, gymSetup.barbellWeightLbs, gymSetup.availablePlatesLbs) : 0;
            return (
              <button
                key={pct}
                onClick={() => setTargetWeight(String(w))}
                className="bg-neutral-800 p-2 rounded-lg text-center hover:bg-neutral-750 transition-colors border border-neutral-700"
              >
                <div className="text-xs text-neutral-400">{pct}%</div>
                <div className="text-sm font-bold text-white font-mono">{w || '—'}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Gym Setup Info */}
      <div className="bg-neutral-900 rounded-xl p-4 border border-neutral-800">
        <div className="text-xs text-neutral-500">
          Bar: {gymSetup.barbellWeightLbs} lbs · Plates: {gymSetup.availablePlatesLbs.join(', ')} lbs
        </div>
      </div>
    </div>
  );
};

export default PlateCalculatorView;
