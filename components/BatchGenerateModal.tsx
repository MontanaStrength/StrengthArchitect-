import React from 'react';
import { Zap, X, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

export interface BatchGenerateProgress {
  current: number;
  total: number;
  sessionLabel: string;
  status: 'generating' | 'done' | 'error';
  errorMessage?: string;
  completedSessions: string[];
}

interface Props {
  progress: BatchGenerateProgress;
  onClose: () => void;
  onCancel: () => void;
}

const BatchGenerateModal: React.FC<Props> = ({ progress, onClose, onCancel }) => {
  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const isDone = progress.status === 'done';
  const isError = progress.status === 'error';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isDone ? 'bg-green-500/15' : isError ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
              {isDone ? <CheckCircle size={20} className="text-green-400" /> :
               isError ? <AlertCircle size={20} className="text-red-400" /> :
               <Zap size={20} className="text-amber-400" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isDone ? 'Sessions Built' : isError ? 'Generation Error' : 'Building Sessions'}
              </h3>
              <p className="text-xs text-gray-400">
                {isDone ? `${progress.total} sessions ready` :
                 isError ? 'An error occurred' :
                 `Session ${progress.current} of ${progress.total}`}
              </p>
            </div>
          </div>
          {(isDone || isError) && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-neutral-800 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-2.5 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                isDone ? 'bg-green-500' : isError ? 'bg-red-500' : 'bg-amber-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {!isDone && !isError && (
            <p className="text-xs text-gray-400 truncate">
              <Loader2 size={12} className="inline animate-spin mr-1.5" />
              {progress.sessionLabel}
            </p>
          )}
        </div>

        {/* Completed sessions list */}
        {progress.completedSessions.length > 0 && (
          <div className="max-h-40 overflow-y-auto space-y-1 border-t border-neutral-800 pt-3">
            {progress.completedSessions.map((label, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                <span className="text-gray-300 truncate">{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Error message */}
        {isError && progress.errorMessage && (
          <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-3">
            <p className="text-xs text-red-300">{progress.errorMessage}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {isDone ? (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
            >
              Done
            </button>
          ) : isError ? (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white text-sm font-semibold transition-colors"
            >
              Close
            </button>
          ) : (
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-gray-300 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchGenerateModal;
