import React from 'react';
import { Dumbbell, Users, ChevronRight } from 'lucide-react';
import { AppMode } from '../../shared/types';

interface Props {
  onSelectMode: (mode: AppMode) => void;
}

const ModeSelectionView: React.FC<Props> = ({ onSelectMode }) => {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="max-w-lg w-full space-y-8 text-center">
        <div>
          <div className="flex items-center justify-center gap-3 mb-4">
            <Dumbbell size={32} className="text-amber-500" />
            <h1 className="text-2xl font-bold">
              <span className="text-white">Strength </span>
              <span className="text-amber-500">Architect</span>
            </h1>
          </div>
          <p className="text-gray-400 text-sm">How will you use the app?</p>
        </div>

        <div className="grid gap-4">
          {/* Lifter Card */}
          <button
            onClick={() => onSelectMode('lifter')}
            className="group relative bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 rounded-2xl p-6 text-left transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
                <Dumbbell size={24} className="text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">I'm a Lifter</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Track your own training, generate AI workouts, and monitor your progress.
                </p>
              </div>
              <ChevronRight size={20} className="text-gray-600 group-hover:text-amber-500 transition-colors mt-1 shrink-0" />
            </div>
          </button>

          {/* Coach Card */}
          <button
            onClick={() => onSelectMode('coach')}
            className="group relative bg-neutral-900 border border-neutral-800 hover:border-blue-500/50 rounded-2xl p-6 text-left transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 shrink-0">
                <Users size={24} className="text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">I'm a Coach</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Build workouts and track progress for multiple athletes from one account.
                </p>
              </div>
              <ChevronRight size={20} className="text-gray-600 group-hover:text-blue-400 transition-colors mt-1 shrink-0" />
            </div>
          </button>
        </div>

        <p className="text-xs text-gray-600">You can change this later in settings.</p>
      </div>
    </div>
  );
};

export default ModeSelectionView;
