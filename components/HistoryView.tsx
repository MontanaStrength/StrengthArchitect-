import React, { useState } from 'react';
import { SavedWorkout } from '../shared/types';
import { History, Trash2, ChevronDown, ChevronUp, Download } from 'lucide-react';

interface Props {
  history: SavedWorkout[];
  onDelete: (id: string) => void;
  onSelect: (workout: SavedWorkout) => void;
  /** When provided, empty state shows a CTA to go build a workout */
  onGoToLift?: () => void;
}

const handleExport = (history: SavedWorkout[], format: 'json' | 'csv') => {
  let content: string;
  let filename: string;
  let mimeType: string;

  if (format === 'json') {
    const data = history.map(w => ({
      id: w.id, title: w.title, focus: w.focus, timestamp: w.timestamp,
      date: new Date(w.timestamp).toISOString(),
      exercises: w.exercises.map(e => ({ name: e.exerciseName, sets: e.sets, reps: e.reps, weight: e.weightLbs, percentOf1RM: e.percentOf1RM, rest: e.restSeconds })),
      estimatedTonnage: w.estimatedTonnage, actualTonnage: w.actualTonnage, sessionRPE: w.sessionRPE,
      completedSets: w.completedSets, feedback: w.feedback,
    }));
    content = JSON.stringify(data, null, 2);
    filename = `strength-architect-export-${new Date().toISOString().split('T')[0]}.json`;
    mimeType = 'application/json';
  } else {
    const rows: string[] = [];
    rows.push(['Date', 'Title', 'Focus', 'Exercise', 'Sets', 'Reps', 'Weight (lbs)', '%1RM', 'Rest (s)', 'Est Tonnage', 'Actual Tonnage', 'Session RPE'].join(','));
    for (const w of history) {
      for (const e of w.exercises) {
        rows.push([new Date(w.timestamp).toISOString().split('T')[0], `"${w.title}"`, w.focus, `"${e.exerciseName}"`, e.sets, `"${e.reps}"`, e.weightLbs || '', e.percentOf1RM || '', e.restSeconds, w.estimatedTonnage || '', w.actualTonnage || '', w.sessionRPE || ''].join(','));
      }
    }
    content = rows.join('\n');
    filename = `strength-architect-export-${new Date().toISOString().split('T')[0]}.csv`;
    mimeType = 'text/csv';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const HistoryView: React.FC<Props> = ({ history, onDelete, onSelect, onGoToLift }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [showExport, setShowExport] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const focusOptions = ['all', 'Strength', 'Hypertrophy', 'Power', 'Endurance', 'Deload'];

  const filtered = filter === 'all' ? history : history.filter(w => w.focus.toLowerCase() === filter.toLowerCase());

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <History size={24} className="text-amber-500" /> Workout History
        </h2>
        {history.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowExport(!showExport)}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-gray-300 text-sm font-medium rounded-lg transition-all"
            >
              <Download size={14} /> Export
            </button>
            {showExport && (
              <div className="absolute right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-10 overflow-hidden">
                <button onClick={() => { handleExport(history, 'json'); setShowExport(false); }} className="block w-full px-4 py-2.5 text-sm text-gray-300 hover:bg-neutral-700 hover:text-white text-left">Export JSON</button>
                <button onClick={() => { handleExport(history, 'csv'); setShowExport(false); }} className="block w-full px-4 py-2.5 text-sm text-gray-300 hover:bg-neutral-700 hover:text-white text-left">Export CSV</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {focusOptions.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f ? 'bg-amber-500 text-black' : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'
            }`}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500">{filtered.length} workout{filtered.length !== 1 ? 's' : ''}</p>

      {filtered.length === 0 ? (
        <div className="sa-card text-center py-12 px-6 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-sa-surface2 flex items-center justify-center mx-auto">
            <History size={32} className="text-gray-500" />
          </div>
          <h3 className="text-lg font-bold text-white">No workouts yet</h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            Generate your first session from the Lift tab and it will show up here.
          </p>
          {onGoToLift && (
            <button
              onClick={onGoToLift}
              className="sa-btn sa-btn-primary"
            >
              Go to Lift
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(w => {
            const isExpanded = expandedId === w.id;
            return (
              <div key={w.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                <div
                  className="p-4 cursor-pointer flex justify-between items-center hover:bg-neutral-800/50 transition-all"
                  onClick={() => setExpandedId(isExpanded ? null : w.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white truncate">{w.title}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        w.focus === 'Strength' ? 'bg-amber-900/50 text-amber-300' :
                        w.focus === 'Hypertrophy' ? 'bg-purple-900/50 text-purple-300' :
                        w.focus === 'Power' ? 'bg-orange-900/50 text-orange-300' :
                        w.focus === 'Deload' ? 'bg-green-900/50 text-green-300' :
                        'bg-blue-900/50 text-blue-300'
                      }`}>
                        {w.focus}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(w.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} •{' '}
                      {w.exercises.length} exercises •{' '}
                      {w.actualTonnage ? `${w.actualTonnage.toLocaleString()} lbs` : `~${(w.estimatedTonnage || 0).toLocaleString()} lbs`}
                      {w.sessionRPE ? ` • RPE ${w.sessionRPE}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {w.feedback && (
                      <span className="text-sm">{w.feedback.rating === 'up' ? '👍' : '👎'}</span>
                    )}
                    {w.completedSets && w.completedSets.length > 0 && (
                      <span className="text-[10px] bg-green-900/50 text-green-300 px-1.5 py-0.5 rounded">logged</span>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-neutral-800 p-4 space-y-3">
                    {/* Exercise List */}
                    <div className="space-y-1">
                      {w.exercises.map((ex, i) => (
                        <div key={i} className="flex justify-between text-sm py-1">
                          <span className="text-gray-300">{ex.exerciseName}</span>
                          <span className="text-gray-500">
                            {ex.sets}×{ex.reps}
                            {ex.weightLbs ? ` @ ${ex.weightLbs} lbs` : ''}
                            {ex.percentOf1RM ? ` (${ex.percentOf1RM}%)` : ''}
                          </span>
                        </div>
                      ))}
                    </div>

                    {w.summary && (
                      <p className="text-xs text-gray-400 italic border-t border-neutral-800 pt-2">{w.summary}</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-neutral-800">
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelect(w); }}
                        className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-medium rounded-lg transition-all"
                      >
                        View / Repeat
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(w.id); }}
                        className="px-3 py-2 bg-neutral-800 hover:bg-amber-900/50 text-gray-400 hover:text-amber-400 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (() => {
        const w = history.find(h => h.id === deleteConfirmId);
        return (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-sm w-full space-y-4 text-center">
              <div className="text-3xl">🗑️</div>
              <h3 className="text-lg font-bold text-white">Delete Workout?</h3>
              <p className="text-sm text-gray-400">
                {w ? `"${w.title}" — ${w.exercises.length} exercises, ${(w.actualTonnage || w.estimatedTonnage || 0).toLocaleString()} lbs` : 'This workout'} will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-gray-300 font-medium rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { onDelete(deleteConfirmId); setDeleteConfirmId(null); setExpandedId(null); }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default HistoryView;
