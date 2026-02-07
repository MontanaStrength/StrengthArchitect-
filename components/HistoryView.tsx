import React, { useState } from 'react';
import { SavedWorkout } from '../types';
import { History, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  history: SavedWorkout[];
  onDelete: (id: string) => void;
  onSelect: (workout: SavedWorkout) => void;
}

const HistoryView: React.FC<Props> = ({ history, onDelete, onSelect }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const focusOptions = ['all', 'Strength', 'Hypertrophy', 'Power', 'Endurance', 'Deload'];

  const filtered = filter === 'all' ? history : history.filter(w => w.focus.toLowerCase() === filter.toLowerCase());

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <History size={24} className="text-amber-500" /> Workout History
      </h2>

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
        <div className="text-center py-12 text-gray-500">
          <History size={48} className="mx-auto mb-3 opacity-30" />
          <p>No workouts yet. Generate your first session!</p>
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
                        onClick={(e) => { e.stopPropagation(); if (confirm('Delete this workout?')) onDelete(w.id); }}
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
    </div>
  );
};

export default HistoryView;
