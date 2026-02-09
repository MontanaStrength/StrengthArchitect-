import type { StrengthWorkoutPlan, ExerciseBlock } from '../types';

// ─── Colour Palette (professional dark-on-light for Sheets) ───
const COLORS = {
  titleBg: '#1a1a2e',       // deep navy
  titleText: '#f5f5f5',
  accentGold: '#d4a017',    // rich gold
  accentGoldLight: '#fef3c7', // cream gold tint
  headerBg: '#2d2d44',      // slate
  headerText: '#ffffff',
  rowEven: '#ffffff',
  rowOdd: '#f8f8fc',        // barely-there lavender
  supersetBorder: '#7c3aed', // purple accent for superset grouping
  notesText: '#6b7280',     // muted gray
  metaLabel: '#9ca3af',
  metaValue: '#1f2937',
  divider: '#e5e7eb',
  warmupBg: '#ecfdf5',
  warmupText: '#065f46',
  footerBg: '#f0f0f5',
  footerText: '#374151',
};

const FONT = "'Inter', 'Segoe UI', Arial, sans-serif";

// ─── Helpers ─────────────────────────────────────────────────

const esc = (v: string | number | undefined | null): string =>
  v == null ? '' : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeCsv = (val: string | number): string => {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const fmtDate = () => {
  const d = new Date();
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

const setsXReps = (e: ExerciseBlock): string => {
  return `${e.sets} × ${e.reps}`;
};

const rpeLabel = (rpe: number | undefined): string => {
  if (rpe == null) return '';
  if (rpe >= 9.5) return `${rpe} 🔴`;
  if (rpe >= 8) return `${rpe} 🟠`;
  if (rpe >= 6) return `${rpe} 🟡`;
  return `${rpe} 🟢`;
};

const restLabel = (sec: number): string => {
  if (sec >= 120) return `${(sec / 60).toFixed(sec % 60 ? 1 : 0)} min`;
  return `${sec}s`;
};

// ─── Rich HTML table (paste into Google Sheets) ─────────────

/**
 * Generates a beautifully-formatted HTML table + plain-text fallback
 * for pasting into Google Sheets via the Clipboard API.
 */
export function workoutToClipboardData(plan: StrengthWorkoutPlan, clientName?: string): { html: string; text: string } {
  const warmups = plan.exercises.filter(e => e.isWarmupSet);
  const working = plan.exercises.filter(e => !e.isWarmupSet);

  // Detect if there are supersets
  const hasSupersets = working.some(e => e.supersetGroup);
  const hasTempo = working.some(e => e.tempo);

  // --- Determine columns ---
  const cols: { key: string; label: string; align: string; width: string }[] = [
    { key: 'order',    label: '#',              align: 'center', width: '36' },
    { key: 'exercise', label: 'Exercise',       align: 'left',   width: '220' },
    { key: 'scheme',   label: 'Sets × Reps',   align: 'center', width: '100' },
    { key: 'weight',   label: 'Weight (lbs)',   align: 'center', width: '95' },
    { key: 'pct',      label: '%1RM',           align: 'center', width: '65' },
    { key: 'rpe',      label: 'RPE',            align: 'center', width: '70' },
    { key: 'rest',     label: 'Rest',           align: 'center', width: '65' },
  ];
  if (hasTempo)     cols.push({ key: 'tempo',   label: 'Tempo',   align: 'center', width: '80' });
  if (hasSupersets) cols.push({ key: 'group',   label: 'Group',   align: 'center', width: '55' });
  cols.push(        { key: 'notes',   label: 'Coaching Notes',    align: 'left',   width: '320' });

  const colCount = cols.length;

  // --- HTML construction ---
  let html = `<meta charset="utf-8"><table style="border-collapse:collapse;font-family:${FONT};font-size:11px;width:100%;">`;

  // === Row 1: Title banner ===
  html += `<tr><td colspan="${colCount}" style="background:${COLORS.titleBg};color:${COLORS.titleText};padding:14px 16px 6px;font-size:16px;font-weight:700;letter-spacing:0.3px;">`;
  html += `🏋️ ${esc(plan.title)}</td></tr>`;

  // === Row 2: Focus / Difficulty / Date ===
  html += `<tr><td colspan="${colCount}" style="background:${COLORS.titleBg};color:${COLORS.accentGold};padding:2px 16px 12px;font-size:11px;font-weight:500;">`;
  const metaParts = [plan.focus, plan.difficulty, `${plan.totalDurationMin} min`];
  if (plan.estimatedTonnage) metaParts.push(`~${plan.estimatedTonnage.toLocaleString()} lbs tonnage`);
  if (clientName) metaParts.push(`Client: ${clientName}`);
  html += `${esc(metaParts.join('  ·  '))}`;
  html += `<span style="float:right;color:${COLORS.metaLabel};font-size:10px;">${esc(fmtDate())}</span>`;
  html += `</td></tr>`;

  // === Row 3: Spacer ===
  html += `<tr><td colspan="${colCount}" style="height:4px;background:${COLORS.accentGold};padding:0;"></td></tr>`;

  // === Warmup section (if any) ===
  if (warmups.length > 0) {
    html += `<tr><td colspan="${colCount}" style="background:${COLORS.warmupBg};color:${COLORS.warmupText};padding:8px 16px;font-size:11px;font-weight:600;">🔥 Warm-Up</td></tr>`;
    for (const e of warmups) {
      html += `<tr>`;
      html += `<td style="background:${COLORS.warmupBg};padding:4px 8px;text-align:center;color:${COLORS.warmupText};font-size:10px;">—</td>`;
      html += `<td style="background:${COLORS.warmupBg};padding:4px 8px;color:${COLORS.warmupText};font-size:10px;">${esc(e.exerciseName)}</td>`;
      html += `<td style="background:${COLORS.warmupBg};padding:4px 8px;text-align:center;color:${COLORS.warmupText};font-size:10px;">${esc(setsXReps(e))}</td>`;
      html += `<td style="background:${COLORS.warmupBg};padding:4px 8px;text-align:center;color:${COLORS.warmupText};font-size:10px;">${e.weightLbs != null ? esc(e.weightLbs) : ''}</td>`;
      // Fill remaining cols
      for (let i = 4; i < colCount; i++) {
        html += `<td style="background:${COLORS.warmupBg};padding:4px 8px;font-size:10px;"></td>`;
      }
      html += `</tr>`;
    }
    html += `<tr><td colspan="${colCount}" style="height:2px;background:${COLORS.divider};padding:0;"></td></tr>`;
  }

  // === Column headers ===
  html += `<tr>`;
  for (const col of cols) {
    html += `<td style="background:${COLORS.headerBg};color:${COLORS.headerText};padding:10px 8px;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.8px;text-align:${col.align};border-bottom:2px solid ${COLORS.accentGold};width:${col.width}px;">${esc(col.label)}</td>`;
  }
  html += `</tr>`;

  // === Working exercise rows ===
  let prevSupersetGroup: string | undefined;
  for (let i = 0; i < working.length; i++) {
    const e = working[i];
    const isEven = i % 2 === 0;
    const rowBg = isEven ? COLORS.rowEven : COLORS.rowOdd;

    // Superset divider
    const newSupersetGroup = e.supersetGroup && e.supersetGroup !== prevSupersetGroup;
    if (hasSupersets && newSupersetGroup && i > 0) {
      html += `<tr><td colspan="${colCount}" style="height:3px;background:${COLORS.supersetBorder};padding:0;"></td></tr>`;
    }
    prevSupersetGroup = e.supersetGroup;

    // Superset left-border
    const supersetBorderStyle = e.supersetGroup
      ? `border-left:4px solid ${COLORS.supersetBorder};`
      : '';

    const notes = [e.notes, e.coachingCue].filter(Boolean).join('. ').trim();
    const orderNum = i + 1;

    html += `<tr>`;
    for (const col of cols) {
      let val = '';
      let extraStyle = '';
      switch (col.key) {
        case 'order':
          val = String(orderNum);
          extraStyle = 'font-weight:600;color:#9ca3af;';
          break;
        case 'exercise':
          val = esc(e.exerciseName);
          extraStyle = `font-weight:600;color:#111827;${supersetBorderStyle}`;
          break;
        case 'scheme':
          val = esc(setsXReps(e));
          extraStyle = 'font-weight:500;';
          break;
        case 'weight':
          val = e.weightLbs != null ? esc(e.weightLbs) : '—';
          extraStyle = 'font-weight:600;color:#111827;';
          break;
        case 'pct':
          val = e.percentOf1RM != null ? `${esc(e.percentOf1RM)}%` : '';
          break;
        case 'rpe':
          val = rpeLabel(e.rpeTarget);
          break;
        case 'rest':
          val = esc(restLabel(e.restSeconds));
          break;
        case 'tempo':
          val = e.tempo ? esc(e.tempo) : '';
          break;
        case 'group':
          val = e.supersetGroup ? `<span style="background:${COLORS.supersetBorder};color:#fff;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:700;">${esc(e.supersetGroup)}</span>` : '';
          break;
        case 'notes':
          val = esc(notes);
          extraStyle = `color:${COLORS.notesText};font-size:10px;font-style:italic;`;
          break;
      }
      html += `<td style="background:${rowBg};padding:8px 8px;text-align:${col.align};font-size:11px;border-bottom:1px solid ${COLORS.divider};${extraStyle}">${val}</td>`;
    }
    html += `</tr>`;
  }

  // === Summary footer ===
  html += `<tr><td colspan="${colCount}" style="height:3px;background:${COLORS.accentGold};padding:0;"></td></tr>`;

  const summaryParts: string[] = [];
  if (plan.estimatedTonnage) summaryParts.push(`📊 Est. Tonnage: ${plan.estimatedTonnage.toLocaleString()} lbs`);
  summaryParts.push(`⏱ Duration: ${plan.totalDurationMin} min`);
  summaryParts.push(`🎯 ${working.length} exercises · ${working.reduce((s, e) => s + e.sets, 0)} total sets`);
  if (plan.muscleGroupsCovered?.length) summaryParts.push(`💪 ${plan.muscleGroupsCovered.join(', ')}`);

  html += `<tr><td colspan="${colCount}" style="background:${COLORS.footerBg};padding:10px 16px;font-size:10px;color:${COLORS.footerText};">`;
  html += summaryParts.join('&emsp;·&emsp;');
  html += `</td></tr>`;

  // Summary / "why this workout"
  if (plan.summary) {
    html += `<tr><td colspan="${colCount}" style="background:${COLORS.footerBg};padding:4px 16px 10px;font-size:10px;color:${COLORS.notesText};font-style:italic;">`;
    html += `"${esc(plan.summary)}"`;
    html += `</td></tr>`;
  }

  // Branding
  html += `<tr><td colspan="${colCount}" style="padding:8px 16px;font-size:9px;color:#c0c0c0;text-align:right;">Generated by Strength Architect · ${fmtDate()}</td></tr>`;

  html += `</table>`;

  // ─── Plain-text TSV fallback ──────────────────────

  const tsvHeader = ['#', 'Exercise', 'Sets × Reps', 'Weight (lbs)', '%1RM', 'RPE', 'Rest', ...(hasTempo ? ['Tempo'] : []), ...(hasSupersets ? ['Group'] : []), 'Notes'];
  const tsvRows: string[] = [];

  // Title line
  tsvRows.push(`${plan.title}\t${plan.focus}\t${plan.difficulty}\t${plan.totalDurationMin} min\t${fmtDate()}`);
  tsvRows.push('');
  tsvRows.push(tsvHeader.join('\t'));

  for (let i = 0; i < working.length; i++) {
    const e = working[i];
    const notes = [e.notes, e.coachingCue].filter(Boolean).join('. ').trim();
    const row = [
      String(i + 1),
      e.exerciseName,
      setsXReps(e),
      e.weightLbs != null ? String(e.weightLbs) : '',
      e.percentOf1RM != null ? `${e.percentOf1RM}%` : '',
      e.rpeTarget != null ? String(e.rpeTarget) : '',
      restLabel(e.restSeconds),
      ...(hasTempo ? [e.tempo || ''] : []),
      ...(hasSupersets ? [e.supersetGroup || ''] : []),
      notes,
    ];
    tsvRows.push(row.join('\t'));
  }

  tsvRows.push('');
  tsvRows.push(summaryParts.map(s => s.replace(/[📊⏱🎯💪]/g, '').trim()).join('  |  '));

  return { html, text: tsvRows.join('\n') };
}

// ─── CSV (file download) ───────────────────────────

/**
 * Build CSV rows for a single workout, suitable for import into Google Sheets.
 * Now includes a title row and summary footer for a polished look.
 */
export function workoutToCsv(plan: StrengthWorkoutPlan, clientName?: string): string {
  const rows: string[] = [];
  const working = plan.exercises.filter(e => !e.isWarmupSet);

  // Title & metadata
  rows.push([escapeCsv(plan.title), plan.focus, plan.difficulty, `${plan.totalDurationMin} min`, fmtDate()].join(','));
  if (clientName) rows.push([`Client: ${escapeCsv(clientName)}`].join(','));
  rows.push(''); // blank spacer

  // Header
  const header = ['#', 'Exercise', 'Sets × Reps', 'Weight (lbs)', '%1RM', 'RPE', 'Rest', 'Tempo', 'Group', 'Coaching Notes'];
  rows.push(header.map(escapeCsv).join(','));

  for (let i = 0; i < working.length; i++) {
    const e = working[i];
    const notes = [e.notes, e.coachingCue].filter(Boolean).join('. ').trim();
    rows.push([
      escapeCsv(i + 1),
      escapeCsv(e.exerciseName),
      escapeCsv(setsXReps(e)),
      e.weightLbs != null ? escapeCsv(e.weightLbs) : '',
      e.percentOf1RM != null ? escapeCsv(`${e.percentOf1RM}%`) : '',
      e.rpeTarget != null ? escapeCsv(e.rpeTarget) : '',
      escapeCsv(restLabel(e.restSeconds)),
      e.tempo ? escapeCsv(e.tempo) : '',
      e.supersetGroup ? escapeCsv(e.supersetGroup) : '',
      notes ? escapeCsv(notes) : '',
    ].join(','));
  }

  // Summary
  rows.push('');
  const totalSets = working.reduce((s, e) => s + e.sets, 0);
  rows.push(`Summary,${working.length} exercises,${totalSets} total sets,${plan.estimatedTonnage ? `${plan.estimatedTonnage.toLocaleString()} lbs tonnage` : ''}`);
  if (plan.muscleGroupsCovered?.length) rows.push(`Muscles,"${plan.muscleGroupsCovered.join(', ')}"`);
  if (plan.summary) rows.push(`Notes,"${escapeCsv(plan.summary)}"`);

  return rows.join('\n');
}

/**
 * Build tab-separated table for pasting into Google Sheets (legacy plain-text).
 */
export function workoutToTsv(plan: StrengthWorkoutPlan): string {
  const { text } = workoutToClipboardData(plan);
  return text;
}

/**
 * Suggested filename for CSV download (safe for client name).
 */
export function workoutExportFilename(plan: StrengthWorkoutPlan, clientName?: string): string {
  const safeTitle = plan.title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').slice(0, 40);
  const date = new Date().toISOString().split('T')[0];
  const suffix = clientName
    ? `${clientName.replace(/[^a-zA-Z0-9-_]/g, '')}-${date}`
    : date;
  return `Workout-${safeTitle}-${suffix}.csv`;
}
