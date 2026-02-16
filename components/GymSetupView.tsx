import React, { useState } from 'react';
import { GymSetup, AvailableEquipment, DEFAULT_GYM_SETUP } from '../shared/types';

interface Props {
  gymSetup: GymSetup;
  onSave: (setup: GymSetup) => void;
}

const EQUIPMENT_OPTIONS: { value: AvailableEquipment; label: string; icon: string }[] = [
  { value: AvailableEquipment.BARBELL, label: 'Barbell', icon: '🏋️' },
  { value: AvailableEquipment.DUMBBELL, label: 'Dumbbells', icon: '💪' },
  { value: AvailableEquipment.KETTLEBELL, label: 'Kettlebells', icon: '🔔' },
  { value: AvailableEquipment.CABLE, label: 'Cable Machine', icon: '🔗' },
  { value: AvailableEquipment.MACHINE, label: 'Machines', icon: '⚙️' },
  { value: AvailableEquipment.BODYWEIGHT, label: 'Bodyweight', icon: '🤸' },
  { value: AvailableEquipment.BAND, label: 'Bands', icon: '〰️' },
  { value: AvailableEquipment.SPECIALTY_BAR, label: 'Specialty Bars', icon: '🔧' },
];

const COMMON_PLATE_SETS: { label: string; plates: number[] }[] = [
  { label: 'Full Commercial Gym', plates: [2.5, 5, 10, 25, 35, 45] },
  { label: 'Home Gym Standard', plates: [2.5, 5, 10, 25, 45] },
  { label: 'Minimal Set', plates: [5, 10, 25, 45] },
  { label: 'Competition Set', plates: [0.5, 1.25, 2.5, 5, 10, 15, 20, 25] },
];

const GymSetupView: React.FC<Props> = ({ gymSetup, onSave }) => {
  const [setup, setSetup] = useState<GymSetup>({ ...gymSetup });
  const [customPlate, setCustomPlate] = useState<string>('');
  const [saved, setSaved] = useState(false);

  const toggleEquipment = (eq: AvailableEquipment) => {
    setSetup(prev => ({
      ...prev,
      availableEquipment: prev.availableEquipment.includes(eq)
        ? prev.availableEquipment.filter(e => e !== eq)
        : [...prev.availableEquipment, eq],
    }));
  };

  const addCustomPlate = () => {
    const val = parseFloat(customPlate);
    if (!isNaN(val) && val > 0 && !setup.availablePlatesLbs.includes(val)) {
      setSetup(prev => ({
        ...prev,
        availablePlatesLbs: [...prev.availablePlatesLbs, val].sort((a, b) => a - b),
      }));
      setCustomPlate('');
    }
  };

  const removePlate = (plate: number) => {
    setSetup(prev => ({
      ...prev,
      availablePlatesLbs: prev.availablePlatesLbs.filter(p => p !== plate),
    }));
  };

  const applyPlatePreset = (plates: number[]) => {
    setSetup(prev => ({ ...prev, availablePlatesLbs: [...plates] }));
  };

  const handleSave = () => {
    onSave(setup);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setSetup({ ...DEFAULT_GYM_SETUP });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <span className="text-3xl">🏠</span> Gym Setup
      </h2>

      {/* Available Equipment */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <h3 className="text-lg font-semibold text-white mb-4">Available Equipment</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {EQUIPMENT_OPTIONS.map(opt => {
            const active = setup.availableEquipment.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggleEquipment(opt.value)}
                className={`p-3 rounded-lg border text-center transition-all ${
                  active
                    ? 'border-amber-500 bg-amber-500/10 text-white'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-600'
                }`}
              >
                <div className="text-2xl mb-1">{opt.icon}</div>
                <div className="text-sm font-medium">{opt.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Barbell Configuration */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <h3 className="text-lg font-semibold text-white mb-4">Barbell Configuration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Barbell Weight (lbs)</label>
            <select
              value={setup.barbellWeightLbs}
              onChange={e => setSetup(prev => ({ ...prev, barbellWeightLbs: Number(e.target.value) }))}
              className="w-full bg-neutral-800 text-white p-2 rounded-lg border border-neutral-700"
            >
              <option value={45}>45 lbs (Standard)</option>
              <option value={35}>35 lbs (Women's / Training)</option>
              <option value={33}>33 lbs (Technique Bar)</option>
              <option value={25}>25 lbs (Short Bar)</option>
              <option value={15}>15 lbs (Youth Bar)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-neutral-300">
              <input
                type="checkbox"
                checked={setup.hasRack}
                onChange={e => setSetup(prev => ({ ...prev, hasRack: e.target.checked }))}
                className="accent-amber-500"
              />
              Squat Rack / Power Rack
            </label>
            <label className="flex items-center gap-2 text-neutral-300">
              <input
                type="checkbox"
                checked={setup.hasPullUpBar}
                onChange={e => setSetup(prev => ({ ...prev, hasPullUpBar: e.target.checked }))}
                className="accent-amber-500"
              />
              Pull-Up Bar
            </label>
            <label className="flex items-center gap-2 text-neutral-300">
              <input
                type="checkbox"
                checked={setup.hasCableStack}
                onChange={e => setSetup(prev => ({ ...prev, hasCableStack: e.target.checked }))}
                className="accent-amber-500"
              />
              Cable Stack
            </label>
          </div>
        </div>
      </div>

      {/* Available Plates */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <h3 className="text-lg font-semibold text-white mb-4">Available Plates (lbs, per side)</h3>
        
        {/* Presets */}
        <div className="mb-4">
          <label className="block text-sm text-neutral-400 mb-2">Quick Presets</label>
          <div className="flex flex-wrap gap-2">
            {COMMON_PLATE_SETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => applyPlatePreset(preset.plates)}
                className="px-3 py-1 text-sm bg-neutral-800 text-neutral-300 rounded-lg border border-neutral-700 hover:border-amber-500/50 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Current Plates */}
        <div className="flex flex-wrap gap-2 mb-4">
          {setup.availablePlatesLbs.map(plate => (
            <span key={plate} className="flex items-center gap-1 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-sm">
              {plate} lbs
              <button onClick={() => removePlate(plate)} className="ml-1 text-amber-400 hover:text-amber-300">✕</button>
            </span>
          ))}
        </div>

        {/* Add Custom */}
        <div className="flex gap-2">
          <input
            type="number"
            value={customPlate}
            onChange={e => setCustomPlate(e.target.value)}
            placeholder="Custom plate weight"
            step="0.5"
            min="0.5"
            className="flex-1 bg-neutral-800 text-white p-2 rounded-lg border border-neutral-700 text-sm"
          />
          <button
            onClick={addCustomPlate}
            className="px-4 py-2 bg-amber-500 text-black rounded-lg text-sm hover:bg-amber-600 transition-colors"
          >
            Add Plate
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
        <h3 className="text-lg font-semibold text-white mb-2">Notes</h3>
        <textarea
          value={setup.notes || ''}
          onChange={e => setSetup(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Any special equipment notes (e.g., hex bar available, specialty plates, etc.)"
          rows={3}
          className="w-full bg-neutral-800 text-white p-3 rounded-lg border border-neutral-700 text-sm resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 py-3 bg-amber-500 text-black font-semibold rounded-xl hover:bg-amber-600 transition-colors"
        >
          {saved ? '✓ Saved!' : 'Save Gym Setup'}
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-3 bg-neutral-800 text-neutral-300 font-semibold rounded-xl border border-neutral-700 hover:border-neutral-600 transition-colors"
        >
          Reset to Default
        </button>
      </div>
    </div>
  );
};

export default GymSetupView;
