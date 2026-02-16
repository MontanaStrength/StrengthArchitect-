import React, { useState } from 'react';
import { CoachClient, TrainingExperience, AvailableEquipment, SessionStructure, SESSION_STRUCTURE_PRESETS, DEFAULT_SESSION_STRUCTURE } from '../../shared/types';
import { X, UserPlus, Save } from 'lucide-react';

interface Props {
  client?: CoachClient | null;
  onSave: (client: CoachClient) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

const EQUIPMENT_OPTIONS: { id: AvailableEquipment; label: string }[] = [
  { id: AvailableEquipment.BARBELL, label: 'Barbell' },
  { id: AvailableEquipment.DUMBBELL, label: 'Dumbbells' },
  { id: AvailableEquipment.KETTLEBELL, label: 'Kettlebell' },
  { id: AvailableEquipment.CABLE, label: 'Cables' },
  { id: AvailableEquipment.BANDS, label: 'Bands' },
  { id: AvailableEquipment.SPECIALTY_BAR, label: 'Specialty Bars' },
  { id: AvailableEquipment.BODYWEIGHT, label: 'Bodyweight' },
];

const AVATAR_COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];

const ClientFormModal: React.FC<Props> = ({ client, onSave, onClose, onDelete }) => {
  const [name, setName] = useState(client?.name || '');
  const [email, setEmail] = useState(client?.email || '');
  const [weightLbs, setWeightLbs] = useState(String(client?.weightLbs || 180));
  const [age, setAge] = useState(String(client?.age || 25));
  const [gender, setGender] = useState<'male' | 'female'>(client?.gender || 'male');
  const [experience, setExperience] = useState<TrainingExperience>(client?.experience || TrainingExperience.INTERMEDIATE);
  const [equipment, setEquipment] = useState<AvailableEquipment[]>(
    client?.equipment || [AvailableEquipment.BARBELL, AvailableEquipment.DUMBBELL]
  );
  const [notes, setNotes] = useState(client?.notes || '');
  const [sessionStructure, setSessionStructure] = useState<SessionStructure>(client?.sessionStructure || DEFAULT_SESSION_STRUCTURE);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const toggleEquipment = (eq: AvailableEquipment) => {
    setEquipment(prev => prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq]);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: client?.id || crypto.randomUUID(),
      name: name.trim(),
      email: email.trim() || undefined,
      weightLbs: Number(weightLbs) || 0,
      age: Number(age) || 0,
      gender,
      experience,
      equipment,
      sessionStructure,
      notes: notes.trim() || undefined,
      avatarColor: client?.avatarColor || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      createdAt: client?.createdAt || Date.now(),
    });
  };

  const isEditing = !!client;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <UserPlus size={18} className="text-amber-500" />
            {isEditing ? 'Edit Athlete' : 'Add Athlete'}
          </h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 outline-none"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email (optional)</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 outline-none"
            />
          </div>

          {/* Weight / Age / Gender */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Weight (lbs)</label>
              <input
                type="number"
                value={weightLbs}
                onChange={e => setWeightLbs(e.target.value.replace(/^0+(?=\d)/, ''))}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Age</label>
              <input
                type="number"
                value={age}
                onChange={e => setAge(e.target.value.replace(/^0+(?=\d)/, ''))}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Gender</label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value as 'male' | 'female')}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 outline-none"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          {/* Experience Level */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Experience Level</label>
            <div className="grid grid-cols-3 gap-2">
              {([TrainingExperience.BEGINNER, TrainingExperience.INTERMEDIATE, TrainingExperience.ADVANCED] as const).map(exp => (
                <button
                  key={exp}
                  onClick={() => setExperience(exp)}
                  className={`p-2.5 rounded-lg border text-xs font-medium transition-all ${
                    experience === exp
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                      : 'border-neutral-700 text-gray-500 hover:border-neutral-600'
                  }`}
                >
                  {exp}
                </button>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Available Equipment</label>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => toggleEquipment(opt.id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    equipment.includes(opt.id)
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                      : 'border-neutral-700 text-gray-500 hover:border-neutral-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Session Structure */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Session Structure</label>
            <div className="grid grid-cols-2 gap-2">
              {SESSION_STRUCTURE_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setSessionStructure(preset.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    sessionStructure === preset.id
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-neutral-700 hover:border-neutral-600'
                  }`}
                >
                  <div className={`text-xs font-semibold ${sessionStructure === preset.id ? 'text-amber-400' : 'text-gray-400'}`}>
                    {preset.label}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Injury history, preferences, goals..."
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 outline-none resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-between">
          <div>
            {isEditing && onDelete && (
              showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-400">Delete athlete & data?</span>
                  <button onClick={() => onDelete(client!.id)} className="text-xs text-red-400 font-bold hover:text-red-300">Yes</button>
                  <button onClick={() => setShowDeleteConfirm(false)} className="text-xs text-gray-500 hover:text-gray-400">No</button>
                </div>
              ) : (
                <button onClick={() => setShowDeleteConfirm(true)} className="text-xs text-red-400/60 hover:text-red-400 transition-colors">
                  Delete
                </button>
              )
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold rounded-lg disabled:opacity-50 transition-all"
            >
              <Save size={14} /> {isEditing ? 'Save' : 'Add Athlete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientFormModal;
