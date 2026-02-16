import React, { useState } from 'react';
import { SavedWorkout } from '../shared/types';
import { FileText, Download } from 'lucide-react';

interface Props {
  history: SavedWorkout[];
}

const ExportView: React.FC<Props> = ({ history }) => {
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [includeSets, setIncludeSets] = useState(true);

  const handleExport = () => {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      const data = history.map(w => ({
        id: w.id,
        title: w.title,
        focus: w.focus,
        timestamp: w.timestamp,
        date: new Date(w.timestamp).toISOString(),
        exercises: w.exercises.map(e => ({
          name: e.exerciseName,
          sets: e.sets,
          reps: e.reps,
          weight: e.weightLbs,
          percentOf1RM: e.percentOf1RM,
          rest: e.restSeconds,
        })),
        estimatedTonnage: w.estimatedTonnage,
        actualTonnage: w.actualTonnage,
        sessionRPE: w.sessionRPE,
        completedSets: includeSets ? w.completedSets : undefined,
        feedback: w.feedback,
      }));
      content = JSON.stringify(data, null, 2);
      filename = `strength-architect-export-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    } else {
      // CSV
      const rows: string[] = [];
      rows.push(['Date', 'Title', 'Focus', 'Exercise', 'Sets', 'Reps', 'Weight (lbs)', '%1RM', 'Rest (s)', 'Est Tonnage', 'Actual Tonnage', 'Session RPE'].join(','));
      for (const w of history) {
        for (const e of w.exercises) {
          rows.push([
            new Date(w.timestamp).toISOString().split('T')[0],
            `"${w.title}"`,
            w.focus,
            `"${e.exerciseName}"`,
            e.sets,
            `"${e.reps}"`,
            e.weightLbs || '',
            e.percentOf1RM || '',
            e.restSeconds,
            w.estimatedTonnage || '',
            w.actualTonnage || '',
            w.sessionRPE || '',
          ].join(','));
        }
      }
      if (includeSets) {
        rows.push('');
        rows.push('--- Completed Sets ---');
        rows.push(['Date', 'Exercise', 'Set#', 'Reps', 'Weight', 'RPE'].join(','));
        for (const w of history) {
          if (w.completedSets) {
            for (const s of w.completedSets) {
              rows.push([
                new Date(s.timestamp).toISOString().split('T')[0],
                `"${s.exerciseName}"`,
                s.setNumber,
                s.reps,
                s.weightLbs,
                s.rpe || '',
              ].join(','));
            }
          }
        }
      }
      content = rows.join('\n');
      filename = `strength-architect-export-${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2"><FileText size={24} className="text-amber-500" /> Export Data</h2>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Format</label>
          <div className="flex gap-2">
            {(['json', 'csv'] as const).map(f => (
              <button key={f} onClick={() => setFormat(f)} className={`px-4 py-2 rounded-lg text-sm font-medium uppercase transition-all ${format === f ? 'bg-amber-500 text-black' : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={includeSets} onChange={e => setIncludeSets(e.target.checked)} className="rounded" />
          Include completed set data
        </label>

        <div className="bg-neutral-800/50 rounded-lg p-3 text-sm text-gray-400">
          <p>📊 {history.length} workouts will be exported</p>
          <p>📝 {history.filter(w => w.completedSets && w.completedSets.length > 0).length} workouts have logged set data</p>
        </div>

        <button onClick={handleExport} disabled={history.length === 0} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50">
          <Download size={18} /> Export {format.toUpperCase()}
        </button>
      </div>
    </div>
  );
};

export default ExportView;
