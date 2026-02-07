import React, { useMemo } from 'react';
import { SavedWorkout, SleepEntry, RecoveryAssessment, RecoveryScore, RecoveryProtocol } from '../types';
import { Heart } from 'lucide-react';

interface Props {
  history: SavedWorkout[];
  sleepEntries: SleepEntry[];
}

const RecoveryAdvisorView: React.FC<Props> = ({ history, sleepEntries }) => {
  const assessment = useMemo<RecoveryAssessment>(() => {
    const now = Date.now();
    const ms3d = 3 * 24 * 60 * 60 * 1000;
    const ms7d = 7 * 24 * 60 * 60 * 1000;

    const last3d = history.filter(w => now - w.timestamp < ms3d);
    const last7d = history.filter(w => now - w.timestamp < ms7d);

    const tonnage3d = last3d.reduce((s, w) => s + (w.actualTonnage || w.estimatedTonnage || 0), 0);
    const tonnage7d = last7d.reduce((s, w) => s + (w.actualTonnage || w.estimatedTonnage || 0), 0);

    const hardSessions3d = last3d.filter(w => (w.sessionRPE || 7) >= 8).length;
    const hardSessions7d = last7d.filter(w => (w.sessionRPE || 7) >= 8).length;

    const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp);
    const daysSinceLast = sorted.length > 0 ? Math.floor((now - sorted[0].timestamp) / (24 * 60 * 60 * 1000)) : 99;

    // Score calculation
    let numericScore = 80; // baseline
    numericScore -= hardSessions3d * 15;
    numericScore -= hardSessions7d * 5;
    numericScore -= Math.min(30, tonnage7d / 2000);
    numericScore += daysSinceLast * 10;

    // Sleep factor
    const recentSleep = sleepEntries.slice(0, 3);
    if (recentSleep.length > 0) {
      const avgHours = recentSleep.reduce((s, e) => s + e.hoursSlept, 0) / recentSleep.length;
      if (avgHours < 6) numericScore -= 20;
      else if (avgHours < 7) numericScore -= 10;
      else if (avgHours >= 8) numericScore += 10;
    }

    numericScore = Math.max(0, Math.min(100, numericScore));

    let score: RecoveryScore;
    let recommendation: string;
    let suggestedActivity: RecoveryAssessment['suggestedActivity'];

    if (numericScore >= 80) {
      score = 'fully-recovered'; recommendation = 'You\'re well rested. Great day for a heavy session!'; suggestedActivity = 'hard-training';
    } else if (numericScore >= 60) {
      score = 'mostly-recovered'; recommendation = 'Good recovery. Normal training is appropriate.'; suggestedActivity = 'normal-training';
    } else if (numericScore >= 40) {
      score = 'moderate-fatigue'; recommendation = 'Some fatigue accumulated. Consider lighter loads or reduced volume.'; suggestedActivity = 'light-training';
    } else if (numericScore >= 20) {
      score = 'high-fatigue'; recommendation = 'Significant fatigue. Active recovery or light mobility work recommended.'; suggestedActivity = 'active-recovery';
    } else {
      score = 'overtrained'; recommendation = 'You need rest. Take a full rest day and focus on sleep and nutrition.'; suggestedActivity = 'rest';
    }

    const protocols: RecoveryProtocol[] = [];
    if (numericScore < 60) {
      protocols.push({ name: 'Foam Rolling', duration: '10-15 min', description: 'Target major muscle groups worked in recent sessions.', category: 'mobility' });
      protocols.push({ name: 'Box Breathing', duration: '5 min', description: '4 sec inhale, 4 sec hold, 4 sec exhale, 4 sec hold. Activates parasympathetic.', category: 'breathing' });
    }
    if (numericScore < 40) {
      protocols.push({ name: 'Light Walking', duration: '20-30 min', description: 'Low-intensity movement to promote blood flow without adding training stress.', category: 'active-recovery' });
      protocols.push({ name: 'Extra Sleep', duration: '1-2 hrs', description: 'Aim for 9+ hours tonight. Sleep is the #1 recovery tool.', category: 'sleep' });
    }
    protocols.push({ name: 'Protein Intake', duration: 'Throughout day', description: 'Ensure 0.8-1g per lb bodyweight. Prioritize post-workout window.', category: 'nutrition' });

    return {
      score, numericScore, trainingLoadLast3Days: tonnage3d, trainingLoadLast7Days: tonnage7d,
      hardSessionsLast3Days: hardSessions3d, hardSessionsLast7Days: hardSessions7d,
      daysSinceLastWorkout: daysSinceLast, totalTonnageLast7Days: tonnage7d,
      recommendation, suggestedActivity, protocols,
    };
  }, [history, sleepEntries]);

  const scoreColor = assessment.numericScore >= 80 ? 'text-green-400' : assessment.numericScore >= 60 ? 'text-blue-400' : assessment.numericScore >= 40 ? 'text-yellow-400' : assessment.numericScore >= 20 ? 'text-orange-400' : 'text-amber-400';
  const scoreBg = assessment.numericScore >= 80 ? 'bg-green-900/30 border-green-700' : assessment.numericScore >= 60 ? 'bg-blue-900/30 border-blue-700' : assessment.numericScore >= 40 ? 'bg-yellow-900/30 border-yellow-700' : assessment.numericScore >= 20 ? 'bg-orange-900/30 border-orange-700' : 'bg-amber-900/30 border-amber-700';

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Heart size={24} className="text-amber-500" /> Recovery Advisor</h2>

      {/* Main Score */}
      <div className={`${scoreBg} border rounded-xl p-6 text-center`}>
        <p className={`text-5xl font-bold ${scoreColor}`}>{assessment.numericScore}</p>
        <p className="text-sm text-gray-300 mt-1 capitalize">{assessment.score.replace('-', ' ')}</p>
        <p className="text-sm text-gray-400 mt-2">{assessment.recommendation}</p>
        <p className="text-xs text-gray-500 mt-1">Suggested: <span className="capitalize font-medium">{assessment.suggestedActivity.replace('-', ' ')}</span></p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">Tonnage (7d)</p>
          <p className="text-lg font-bold text-white">{assessment.totalTonnageLast7Days.toLocaleString()}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">Hard Sessions (7d)</p>
          <p className="text-lg font-bold text-white">{assessment.hardSessionsLast7Days}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">Sessions (3d)</p>
          <p className="text-lg font-bold text-white">{assessment.hardSessionsLast3Days + history.filter(w => Date.now() - w.timestamp < 3 * 24 * 60 * 60 * 1000).length - assessment.hardSessionsLast3Days}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">Days Since Last</p>
          <p className="text-lg font-bold text-white">{assessment.daysSinceLastWorkout}</p>
        </div>
      </div>

      {/* Recovery Protocols */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Recovery Protocols</h3>
        <div className="space-y-2">
          {assessment.protocols.map((p, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-neutral-800 last:border-0">
              <span className="text-lg">
                {p.category === 'mobility' ? '🧘' : p.category === 'breathing' ? '💨' : p.category === 'nutrition' ? '🥩' : p.category === 'sleep' ? '😴' : '🚶'}
              </span>
              <div>
                <p className="text-sm text-white font-medium">{p.name} <span className="text-xs text-gray-500">({p.duration})</span></p>
                <p className="text-xs text-gray-400">{p.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecoveryAdvisorView;
