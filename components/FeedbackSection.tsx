import React, { useState } from 'react';
import { FeedbackData } from '../types';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface Props {
  workoutId: string;
  existingFeedback?: FeedbackData;
  onSaveFeedback: (workoutId: string, feedback: FeedbackData) => void;
}

const FeedbackSection: React.FC<Props> = ({ workoutId, existingFeedback, onSaveFeedback }) => {
  const [rating, setRating] = useState<'up' | 'down' | null>(existingFeedback?.rating || null);
  const [comment, setComment] = useState(existingFeedback?.comment || '');

  const handleSave = (r: 'up' | 'down') => {
    setRating(r);
    onSaveFeedback(workoutId, { rating: r, comment });
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-300">How was this workout?</h3>
      <div className="flex gap-3">
        <button
          onClick={() => handleSave('up')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
            rating === 'up' ? 'bg-green-600 border-green-500 text-white' : 'bg-neutral-800 border-neutral-700 text-gray-400 hover:border-green-500'
          }`}
        >
          <ThumbsUp size={16} /> Good
        </button>
        <button
          onClick={() => handleSave('down')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
            rating === 'down' ? 'bg-red-600 border-red-500 text-white' : 'bg-neutral-800 border-neutral-700 text-gray-400 hover:border-red-500'
          }`}
        >
          <ThumbsDown size={16} /> Too Hard/Easy
        </button>
      </div>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        onBlur={() => rating && onSaveFeedback(workoutId, { rating, comment })}
        placeholder="Optional notes..."
        className="w-full p-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm resize-none"
        rows={2}
      />
    </div>
  );
};

export default FeedbackSection;
