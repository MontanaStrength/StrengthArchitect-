import React from 'react';
import { Dumbbell } from 'lucide-react';

const LoadingView: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-24 space-y-6">
    <div className="relative">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-500"></div>
      <Dumbbell size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-500" />
    </div>
    <div className="text-center space-y-2">
      <p className="text-lg font-semibold text-white">Building Your Workout</p>
      <p className="text-sm text-gray-400">AI is designing your session based on training history, recovery, and goals...</p>
    </div>
  </div>
);

export default LoadingView;
