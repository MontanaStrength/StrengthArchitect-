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
  logColumnBg: '#fffbeb',   // warm cream for "log these" columns
  logColumnHeader: '#92400e', // amber-800
  checkboxBg: '#f3f4f6',    // light gray for checkable cells
};

const FONT = "'Inter', 'Segoe UI', Arial, sans-serif";

/** Max characters shown in the Coaching Notes column; full text is in the "Full coaching notes" section below. */
const COACHING_NOTE_PREVIEW_LEN = 72;

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

const shortDate = () => {
  const d = new Date();
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

const rpeText = (rpe: number | undefined): string => {
  if (rpe == null) return '';
  return String(rpe);
};

const restLabel = (sec: number): string => {
  if (sec >= 120) return `${(sec / 60).toFixed(sec % 60 ? 1 : 0)} min`;
  return `${sec}s`;
};

/** One-line preview for the table; full note goes in the expandable section below. */
const coachingNotePreview = (full: string): string => {
  const t = full.trim();
  if (!t) return '';
  if (t.length <= COACHING_NOTE_PREVIEW_LEN) return t;
  return t.slice(0, COACHING_NOTE_PREVIEW_LEN).trim() + '…';
};

// ─── Rich HTML table (paste into Google Sheets) ─────────────

/**
 * Generates a beautifully-formatted HTML table + plain-text fallback
 * for pasting into Google Sheets via the Clipboard API.
 *
 * The design philosophy: produce a complete, usable training log —
 * not just a data dump. Includes "Actual" columns for the athlete
 * to fill in during their session.
 */
export function workoutToClipboardData(plan: StrengthWorkoutPlan, clientName?: string): { html: string; text: string } {
  const warmups = plan.exercises.filter(e => e.isWarmupSet);
  const working = plan.exercises.filter(e => !e.isWarmupSet);

  // Detect optional columns
  const hasSupersets = working.some(e => e.supersetGroup);
  const hasTempo = working.some(e => e.tempo);

  // --- Determine columns ---
  type Col = { key: string; label: string; align: string; width: string; isLog?: boolean };
  const cols: Col[] = [
    { key: 'order',    label: '#',            align: 'center', width: '30' },
    { key: 'exercise', label: 'Exercise',     align: 'left',   width: '200' },
    { key: 'scheme',   label: 'Sets × Reps',  align: 'center', width: '90' },
    { key: 'weight',   label: 'Rx Weight',    align: 'center', width: '85' },
    { key: 'pct',      label: '%1RM',         align: 'center', width: '55' },
    { key: 'rpe',      label: 'RPE',          align: 'center', width: '50' },
    { key: 'rest',     label: 'Rest',         align: 'center', width: '55' },
  ];
  if (hasTempo)     cols.push({ key: 'tempo', label: 'Tempo', align: 'center', width: '70' });
  if (hasSupersets) cols.push({ key: 'group', label: 'Group', align: 'center', width: '50' });

  // Logging columns for the athlete (visible on main screen)
  cols.push({ key: 'log_weight', label: 'Actual Weight', align: 'center', width: '90', isLog: true });
  cols.push({ key: 'log_reps',   label: 'Actual Reps',   align: 'center', width: '80', isLog: true });
  cols.push({ key: 'log_rpe',    label: 'Actual RPE',    align: 'center', width: '75', isLog: true });
  cols.push({ key: 'log_done',   label: '✓',             align: 'center', width: '35', isLog: true });

  // Coaching notes last — off-screen by default, scroll right to read
  cols.push({ key: 'notes', label: 'Coaching Notes', align: 'left', width: '320' });

  const colCount = cols.length;

  // --- HTML construction ---
  let html = `<meta charset="utf-8"><table style="border-collapse:collapse;font-family:${FONT};font-size:11px;width:100%;">`;

  // === Row 1: Title banner ===
  html += `<tr><td colspan="${colCount}" style="background:${COLORS.titleBg};color:${COLORS.titleText};padding:14px 16px 6px;font-size:16px;font-weight:700;letter-spacing:0.3px;">`;
  html += `🏋️ ${esc(plan.title)}</td></tr>`;

  // === Row 2: Focus / Difficulty / Date / Client ===
  html += `<tr><td colspan="${colCount}" style="background:${COLORS.titleBg};color:${COLORS.accentGold};padding:2px 16px 12px;font-size:11px;font-weight:500;">`;
  const metaParts = [plan.focus, plan.difficulty, `${plan.totalDurationMin} min`];
  if (plan.estimatedTonnage) metaParts.push(`~${plan.estimatedTonnage.toLocaleString()} lbs tonnage`);
  if (clientName) metaParts.push(`Athlete: ${clientName}`);
  html += `${esc(metaParts.join('  ·  '))}`;
  html += `<span style="float:right;color:${COLORS.metaLabel};font-size:10px;">${esc(fmtDate())}</span>`;
  html += `</td></tr>`;

  // === Row 3: Gold accent bar ===
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
    const bg = col.isLog ? COLORS.logColumnHeader : COLORS.headerBg;
    const fg = COLORS.headerText;
    const borderBottom = col.isLog ? `2px solid ${COLORS.accentGold}` : `2px solid ${COLORS.accentGold}`;
    html += `<td style="background:${bg};color:${fg};padding:10px 8px;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.8px;text-align:${col.align};border-bottom:${borderBottom};width:${col.width}px;">${esc(col.label)}</td>`;
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

    const supersetBorderStyle = e.supersetGroup
      ? `border-left:4px solid ${COLORS.supersetBorder};`
      : '';

    const notes = [e.notes, e.coachingCue].filter(Boolean).join('. ').trim();
    const orderNum = i + 1;

    html += `<tr>`;
    for (const col of cols) {
      let val = '';
      let extraStyle = '';
      const cellBg = col.isLog ? COLORS.logColumnBg : rowBg;

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
          val = notes ? esc(coachingNotePreview(notes)) : '';
          extraStyle = `color:${COLORS.notesText};font-size:10px;font-style:italic;max-width:${cols.find(c => c.key === 'notes')?.width ?? 320}px;`;
          break;
        // Logging columns — intentionally empty for athlete to fill
        case 'log_weight':
        case 'log_reps':
        case 'log_rpe':
        case 'log_done':
          val = '';
          extraStyle = `color:#6b7280;`;
          break;
      }
      html += `<td style="background:${cellBg};padding:8px 8px;text-align:${col.align};font-size:11px;border-bottom:1px solid ${COLORS.divider};${extraStyle}">${val}</td>`;
    }
    html += `</tr>`;
  }

  // === Gold accent bar ===
  html += `<tr><td colspan="${colCount}" style="height:3px;background:${COLORS.accentGold};padding:0;"></td></tr>`;

  // === Summary footer ===
  const summaryParts: string[] = [];
  if (plan.estimatedTonnage) summaryParts.push(`📊 Est. Tonnage: ${plan.estimatedTonnage.toLocaleString()} lbs`);
  summaryParts.push(`⏱ Duration: ${plan.totalDurationMin} min`);
  summaryParts.push(`🎯 ${working.length} exercises · ${working.reduce((s, e) => s + e.sets, 0)} total sets`);
  if (plan.muscleGroupsCovered?.length) summaryParts.push(`💪 ${plan.muscleGroupsCovered.join(', ')}`);

  html += `<tr><td colspan="${colCount}" style="background:${COLORS.footerBg};padding:10px 16px;font-size:10px;color:${COLORS.footerText};">`;
  html += summaryParts.join('&emsp;·&emsp;');
  html += `</td></tr>`;

  if (plan.summary) {
    html += `<tr><td colspan="${colCount}" style="background:${COLORS.footerBg};padding:4px 16px 10px;font-size:10px;color:${COLORS.notesText};font-style:italic;">`;
    html += `"${esc(plan.summary)}"`;
    html += `</td></tr>`;
  }

  // Full coaching notes (expandable reference — keeps main table rows compact)
  const exercisesWithNotes = working.filter(e => {
    const n = [e.notes, e.coachingCue].filter(Boolean).join('. ').trim();
    return n.length > COACHING_NOTE_PREVIEW_LEN || n.length > 0;
  });
  if (exercisesWithNotes.length > 0) {
    html += `<tr><td colspan="${colCount}" style="background:${COLORS.checkboxBg};padding:8px 16px 8px;font-size:10px;font-weight:700;color:${COLORS.metaValue};border-top:1px solid ${COLORS.divider};">📋 Full coaching notes</td></tr>`;
    for (let idx = 0; idx < exercisesWithNotes.length; idx++) {
      const e = exercisesWithNotes[idx];
      const fullNote = [e.notes, e.coachingCue].filter(Boolean).join('. ').trim();
      if (!fullNote) continue;
      const num = working.indexOf(e) + 1;
      html += `<tr><td colspan="${colCount}" style="background:${COLORS.checkboxBg};padding:4px 16px 10px;font-size:10px;color:${COLORS.notesText};border-bottom:1px solid ${COLORS.divider};vertical-align:top;">`;
      html += `<strong style="color:${COLORS.metaValue};">${num}. ${esc(e.exerciseName)}</strong><br/>`;
      html += esc(fullNote);
      html += `</td></tr>`;
    }
  }

  // Branding
  html += `<tr><td colspan="${colCount}" style="padding:8px 16px;font-size:9px;color:#c0c0c0;text-align:right;">Generated by Strength Architect · ${fmtDate()}</td></tr>`;

  html += `</table>`;

  // ─── Plain-text TSV fallback ──────────────────────

  const text = buildTsv(plan, working, warmups, clientName, hasTempo, hasSupersets, summaryParts);

  return { html, text };
}

/**
 * Build a clean, well-structured TSV (tab-separated) that looks professional
 * when pasted into Google Sheets even without HTML styling.
 *
 * Layout:
 *   Row 1: Workout title
 *   Row 2: Metadata (focus, difficulty, duration, tonnage, date)
 *   Row 3: Blank spacer
 *   Row 4: PRESCRIPTION headers ──── | ──── LOGGING headers
 *   Row 5+: Exercise rows
 *   Blank spacer
 *   Summary row
 */
function buildTsv(
  plan: StrengthWorkoutPlan,
  working: ExerciseBlock[],
  warmups: ExerciseBlock[],
  clientName: string | undefined,
  hasTempo: boolean,
  hasSupersets: boolean,
  summaryParts: string[],
): string {
  const rows: string[] = [];

  // Title
  rows.push(plan.title);

  // Metadata
  const meta = [plan.focus, plan.difficulty, `${plan.totalDurationMin} min`];
  if (plan.estimatedTonnage) meta.push(`~${plan.estimatedTonnage.toLocaleString()} lbs tonnage`);
  if (clientName) meta.push(`Athlete: ${clientName}`);
  meta.push(shortDate());
  rows.push(meta.join('  |  '));

  // Spacer
  rows.push('');

  // Column headers — notes pushed to far right so the working area stays clean
  const hdr = ['#', 'EXERCISE', 'SETS × REPS', 'Rx WEIGHT', '%1RM', 'RPE', 'REST'];
  if (hasTempo) hdr.push('TEMPO');
  if (hasSupersets) hdr.push('GROUP');
  hdr.push('ACTUAL WEIGHT', 'ACTUAL REPS', 'ACTUAL RPE', 'DONE', '', 'COACHING NOTES');
  rows.push(hdr.join('\t'));

  // Warmups
  if (warmups.length > 0) {
    const wCols = hdr.length;
    const wPad = new Array(Math.max(0, wCols - 4)).fill('').join('\t');
    rows.push(`\t🔥 WARM-UP\t\t${wPad}`);
    for (const e of warmups) {
      const row = [
        '—',
        e.exerciseName,
        setsXReps(e),
        e.weightLbs != null ? String(e.weightLbs) : '',
      ];
      // pad remaining columns
      while (row.length < wCols) row.push('');
      rows.push(row.join('\t'));
    }
    rows.push(''); // spacer after warmup
  }

  // Exercise rows (coaching notes column = preview only; full notes below)
  for (let i = 0; i < working.length; i++) {
    const e = working[i];
    const notes = [e.notes, e.coachingCue].filter(Boolean).join('. ').trim();
    const row: string[] = [
      String(i + 1),
      e.exerciseName,
      setsXReps(e),
      e.weightLbs != null ? `${e.weightLbs} lbs` : '',
      e.percentOf1RM != null ? `${e.percentOf1RM}%` : '',
      rpeText(e.rpeTarget),
      restLabel(e.restSeconds),
    ];
    if (hasTempo) row.push(e.tempo || '');
    if (hasSupersets) row.push(e.supersetGroup || '');
    // Logging columns (blank for athlete to fill in)
    row.push('', '', '', '');
    // Spacer + coaching notes preview (full notes in section below)
    row.push('', coachingNotePreview(notes));
    rows.push(row.join('\t'));
  }

  // Spacer + Summary
  rows.push('');
  rows.push(summaryParts.map(s => s.replace(/[📊⏱🎯💪]/g, '').trim()).join('  |  '));
  if (plan.summary) {
    rows.push(`"${plan.summary}"`);
  }

  // Full coaching notes (reference section so main table stays compact)
  const withNotes = working.filter(e => {
    const n = [e.notes, e.coachingCue].filter(Boolean).join('. ').trim();
    return n.length > 0;
  });
  if (withNotes.length > 0) {
    rows.push('');
    rows.push('Full coaching notes');
    for (const e of withNotes) {
      const full = [e.notes, e.coachingCue].filter(Boolean).join('. ').trim();
      if (full) rows.push(`${working.indexOf(e) + 1}. ${e.exerciseName}: ${full}`);
    }
  }

  // Branding
  rows.push('');
  rows.push(`Generated by Strength Architect · ${shortDate()}`);

  return rows.join('\n');
}


// ─── CSV (file download) ───────────────────────────

/**
 * Build CSV rows for a single workout, suitable for import into Google Sheets.
 * Includes athlete logging columns and a clean layout.
 */
export function workoutToCsv(plan: StrengthWorkoutPlan, clientName?: string): string {
  const rows: string[] = [];
  const working = plan.exercises.filter(e => !e.isWarmupSet);

  // Title & metadata
  rows.push([escapeCsv(plan.title), plan.focus, plan.difficulty, `${plan.totalDurationMin} min`, shortDate()].join(','));
  if (clientName) rows.push([`Athlete: ${escapeCsv(clientName)}`].join(','));
  rows.push(''); // blank spacer

  // Header — prescription, logging columns, then notes at the far right
  const header = ['#', 'Exercise', 'Sets × Reps', 'Rx Weight (lbs)', '%1RM', 'RPE Target', 'Rest', 'Tempo', 'Group', 'Actual Weight', 'Actual Reps', 'Actual RPE', 'Done', '', 'Coaching Notes'];
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
      '', // Actual Weight (blank for athlete)
      '', // Actual Reps
      '', // Actual RPE
      '', // Done
      '', // spacer column
      notes ? escapeCsv(coachingNotePreview(notes)) : '', // preview only; full notes below
    ].join(','));
  }

  // Summary
  rows.push('');
  const totalSets = working.reduce((s, e) => s + e.sets, 0);
  rows.push(`Summary,${working.length} exercises,${totalSets} total sets,${plan.estimatedTonnage ? `${plan.estimatedTonnage.toLocaleString()} lbs tonnage` : ''}`);
  if (plan.muscleGroupsCovered?.length) rows.push(`Muscles,"${plan.muscleGroupsCovered.join(', ')}"`);
  if (plan.summary) rows.push(`Notes,"${escapeCsv(plan.summary)}"`);

  // Full coaching notes (reference section)
  const withNotes = working.filter(e => {
    const n = [e.notes, e.coachingCue].filter(Boolean).join('. ').trim();
    return n.length > 0;
  });
  if (withNotes.length > 0) {
    rows.push('');
    rows.push('Full coaching notes');
    for (const e of withNotes) {
      const full = [e.notes, e.coachingCue].filter(Boolean).join('. ').trim();
      if (full) rows.push(`${escapeCsv(`${working.indexOf(e) + 1}. ${e.exerciseName}: ${full}`)}`);
    }
  }

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
