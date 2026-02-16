import React, { useState, useMemo } from 'react';
import { Exercise, MovementPattern, MuscleGroup, AvailableEquipment } from '../shared/types';
import { EXERCISE_LIBRARY, filterByMovementPattern, filterByMuscleGroup, filterByEquipment } from '../shared/services/exerciseLibrary';

const ExerciseLibraryView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterPattern, setFilterPattern] = useState<MovementPattern | 'all'>('all');
  const [filterMuscle, setFilterMuscle] = useState<MuscleGroup | 'all'>('all');
  const [filterEquipment, setFilterEquipment] = useState<AvailableEquipment | 'all'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filteredExercises = useMemo(() => {
    let exercises = [...EXERCISE_LIBRARY];
    if (filterPattern !== 'all') exercises = filterByMovementPattern(filterPattern);
    if (filterMuscle !== 'all') exercises = exercises.filter(e => filterByMuscleGroup(filterMuscle).some(f => f.id === e.id));
    if (filterEquipment !== 'all') exercises = exercises.filter(e => filterByEquipment(filterEquipment).some(f => f.id === e.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      exercises = exercises.filter(e => e.name.toLowerCase().includes(q) || e.primaryMuscles.some(m => m.toLowerCase().includes(q)));
    }
    return exercises;
  }, [search, filterPattern, filterMuscle, filterEquipment]);

  const difficultyColor = (d: Exercise['difficulty']): string => {
    switch (d) {
      case 'beginner': return 'text-green-400 bg-green-500/10';
      case 'intermediate': return 'text-yellow-400 bg-yellow-500/10';
      case 'advanced': return 'text-amber-400 bg-amber-500/10';
      default: return 'text-neutral-400 bg-neutral-800';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <span className="text-3xl">📚</span> Exercise Library
        <span className="text-sm font-normal text-neutral-400 ml-2">{EXERCISE_LIBRARY.length} exercises</span>
      </h2>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search exercises..."
        className="w-full bg-neutral-900 text-white p-3 rounded-xl border border-neutral-800 focus:border-amber-500 outline-none"
      />

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Movement Pattern</label>
          <select
            value={filterPattern}
            onChange={e => setFilterPattern(e.target.value as MovementPattern | 'all')}
            className="w-full bg-neutral-800 text-white p-2 rounded-lg border border-neutral-700 text-sm"
          >
            <option value="all">All Patterns</option>
            {Object.values(MovementPattern).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Muscle Group</label>
          <select
            value={filterMuscle}
            onChange={e => setFilterMuscle(e.target.value as MuscleGroup | 'all')}
            className="w-full bg-neutral-800 text-white p-2 rounded-lg border border-neutral-700 text-sm"
          >
            <option value="all">All Muscles</option>
            {Object.values(MuscleGroup).map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Equipment</label>
          <select
            value={filterEquipment}
            onChange={e => setFilterEquipment(e.target.value as AvailableEquipment | 'all')}
            className="w-full bg-neutral-800 text-white p-2 rounded-lg border border-neutral-700 text-sm"
          >
            <option value="all">All Equipment</option>
            {Object.values(AvailableEquipment).map(eq => (
              <option key={eq} value={eq}>{eq}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-neutral-400">
        Showing {filteredExercises.length} of {EXERCISE_LIBRARY.length} exercises
      </div>

      {/* Exercise List */}
      <div className="space-y-2">
        {filteredExercises.map(exercise => (
          <div key={exercise.id} className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === exercise.id ? null : exercise.id)}
              className="w-full p-4 flex items-center gap-3 text-left hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">{exercise.name}</div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  {exercise.movementPattern} · {exercise.primaryMuscles.join(', ')}
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${difficultyColor(exercise.difficulty)}`}>
                {exercise.difficulty}
              </span>
              <span className="text-neutral-500 text-sm">{expanded === exercise.id ? '▲' : '▼'}</span>
            </button>

            {expanded === exercise.id && (
              <div className="px-4 pb-4 border-t border-neutral-800 pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-neutral-400 mb-1">Primary Muscles</div>
                    <div className="flex flex-wrap gap-1">
                      {exercise.primaryMuscles.map(m => (
                        <span key={m} className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">{m}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-400 mb-1">Secondary Muscles</div>
                    <div className="flex flex-wrap gap-1">
                      {exercise.secondaryMuscles.map(m => (
                        <span key={m} className="text-xs px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded border border-neutral-700">{m}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-neutral-400 mb-1">Equipment</div>
                  <div className="flex flex-wrap gap-1">
                    {exercise.equipment.map(eq => (
                      <span key={eq} className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">{eq}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-neutral-400 mb-1">Movement Pattern</div>
                  <span className="text-xs px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded border border-purple-500/20">
                    {exercise.movementPattern}
                  </span>
                </div>

                {exercise.cues && exercise.cues.length > 0 && (
                  <div>
                    <div className="text-xs text-neutral-400 mb-1">Coaching Cues</div>
                    <ul className="space-y-1">
                      {exercise.cues.map((cue, i) => (
                        <li key={i} className="text-xs text-neutral-300 flex items-start gap-1">
                          <span className="text-amber-400 mt-0.5">•</span> {cue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {filteredExercises.length === 0 && (
          <div className="text-center py-12 text-neutral-500">
            <div className="text-3xl mb-2">🔍</div>
            <p>No exercises match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExerciseLibraryView;
