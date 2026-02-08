import React from 'react';
import { BlockStepProps } from './types';
import { Calendar } from 'lucide-react';

const StepSchedule: React.FC<BlockStepProps> = ({ state, onChange }) => {
  return (
    <div className="space-y-8">
      {/* Block name */}
      <div>
        <label className="block text-sm font-semibold text-gray-300 mb-2">Block Name</label>
        <input
          value={state.name}
          onChange={e => onChange({ name: e.target.value })}
          placeholder="e.g., Spring Strength Block"
          className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-sm focus:border-amber-500 focus:outline-none transition-colors"
        />
      </div>

      {/* Start & goal dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Start Date</label>
          <input
            type="date"
            value={state.startDate}
            onChange={e => onChange({ startDate: e.target.value })}
            className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-sm focus:border-amber-500 focus:outline-none transition-colors [color-scheme:dark]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Goal Date <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            type="date"
            value={state.goalDate}
            onChange={e => onChange({ goalDate: e.target.value })}
            className="w-full p-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-sm focus:border-amber-500 focus:outline-none transition-colors [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Computed end date info */}
      {state.phases.length > 0 && (
        <div className="bg-neutral-800/50 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-gray-300 text-sm font-semibold">
            <Calendar size={16} className="text-amber-500" />
            Block Timeline
          </div>
          {(() => {
            const totalWeeks = state.phases.reduce((s, p) => s + p.weekCount, 0);
            const startMs = new Date(state.startDate).getTime();
            const endMs = startMs + totalWeeks * 7 * 24 * 60 * 60 * 1000;
            const endDate = new Date(endMs);
            const totalSessions = state.phases.reduce((s, p) => s + p.weekCount * p.sessionsPerWeek, 0);

            return (
              <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                <span className="text-gray-500">Duration</span>
                <span className="text-white font-medium">{totalWeeks} weeks</span>
                <span className="text-gray-500">End Date</span>
                <span className="text-white font-medium">{endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="text-gray-500">Total Sessions</span>
                <span className="text-white font-medium">~{totalSessions}</span>
                {state.goalDate && (
                  <>
                    <span className="text-gray-500">Goal Date</span>
                    <span className={`font-medium ${endMs <= new Date(state.goalDate).getTime() ? 'text-green-400' : 'text-amber-400'}`}>
                      {new Date(state.goalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {endMs <= new Date(state.goalDate).getTime() ? ' ✓' : ' — block extends past goal!'}
                    </span>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Calendar population toggle */}
      <div className="flex items-center justify-between bg-neutral-800/50 rounded-xl p-4">
        <div>
          <div className="text-sm font-semibold text-white">Auto-populate calendar</div>
          <div className="text-xs text-gray-400 mt-0.5">Schedule training days based on sessions/week per phase</div>
        </div>
        <button
          onClick={() => onChange({ populateCalendar: !state.populateCalendar })}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            state.populateCalendar ? 'bg-amber-500' : 'bg-neutral-700'
          }`}
        >
          <div
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              state.populateCalendar ? 'translate-x-6' : ''
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default StepSchedule;
