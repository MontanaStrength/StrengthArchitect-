
/**
 * STRENGTH ARCHITECT: Workout Archetypes
 * 
 * Each archetype is a scientifically-backed strength training template.
 * The AI selects one archetype per session and fills in exercise selection,
 * loads, and rep schemes based on the user's profile and history.
 * 
 * ─────────────────────────────────────────────────────────────────────────
 * TO ADD YOUR OWN CUSTOM ARCHETYPES:
 * ─────────────────────────────────────────────────────────────────────────
 * 1. Scroll to the "CUSTOM ARCHETYPES" section at the bottom
 * 2. Add a new numbered entry following this pattern:
 * 
 *    42. custom_myworkout — "My Workout Name": Description of sets/reps/intensity.
 *        Rest periods. Best for: who this is for and when to use it. Focus: specific notes.
 * 
 * REQUIRED COMPONENTS:
 *    - Number (42, 43, 44... — continue from 41)
 *    - ID (custom_xxx — use lowercase, underscores, must be unique)
 *    - Name (in quotes after the —)
 *    - Sets × reps scheme (e.g., "5×5", "3-4×8-10", "10×10")
 *    - Intensity (% of 1RM or RPE)
 *    - Rest periods
 *    - "Best for:" (experience level, goal, when to use)
 * 
 * EXAMPLE:
 *    42. custom_5_3_1_boring — "5/3/1 Boring But Big": Main lift follows 5/3/1 progression
 *        (65/75/85% → 70/80/90% → 75/85/95%), then 5×10 @ 50-60% of the same lift.
 *        3-5 min rest on main sets, 90 sec on volume work. Best for: intermediate lifters
 *        who want strength + hypertrophy. Focus: squat, bench, deadlift, OHP only.
 * 
 * The AI will automatically see and use your custom archetypes in the rotation.
 * ─────────────────────────────────────────────────────────────────────────
 */

export const STRENGTH_ARCHETYPES = `
=== STRENGTH-FOCUSED ===
1. str_5x5 — "5×5 Linear Progression": Classic 5 sets of 5 reps on compound lifts. 80-85% 1RM. 3-5 min rest. Best for: intermediate lifters building raw strength. Focus: Squat, Bench, Deadlift, OHP, Row.
2. str_531 — "5/3/1 Wendler": 3 working sets of 5, 3, then 1+ reps across a mesocycle. Percentages: 65/75/85 → 70/80/90 → 75/85/95. Plus AMRAP on final set. 3-5 min rest. Best for: long-term strength progression.
3. str_texas — "Texas Method": Volume day (5×5 @ 90% of 5RM), recovery day (light), intensity day (1×5 PR attempt). Weekly undulation. Best for: late-intermediate lifters who stall on linear progression.
4. str_heavy_singles — "Heavy Singles Practice": Work up to 90-97% 1RM for 5-8 singles with 3-5 min rest. Builds neuromuscular efficiency. Follow with back-off sets at 75-80%. Best for: peaking phase or technique at high loads.
5. str_cluster — "Cluster Sets": 5 reps at 87-92% 1RM, broken into singles/doubles with 15-30 sec intra-set rest. 3-4 min between clusters. Allows heavier loads with less fatigue. Best for: advanced strength athletes.
6. str_pause — "Paused Reps Strength": 3-5 sets of 3-5 reps with 2-3 sec pause at the hardest position (bottom of squat, chest on bench). 80-87% 1RM. Eliminates stretch reflex. Best for: building strength out of the hole.
7. str_speed — "Dynamic Effort / Speed Work": 8-10 sets of 2-3 reps at 50-60% 1RM + accommodating resistance if available. Maximum bar speed. 45-60 sec rest. Best for: rate of force development (Westside Barbell method).
8. str_overload — "Partial ROM Overload": Rack pulls, pin squats, or board press at 100-110% 1RM. 3-5 sets of 1-3 reps. Builds lockout strength and CNS preparedness for heavy loads. Best for: advanced lifters with specific sticking points.

=== HYPERTROPHY-FOCUSED ===
9. hyp_ppl — "Push/Pull/Legs Hypertrophy": 4-5 exercises per session, 3-4 sets of 8-12 reps. RPE 7-8. 60-75% 1RM. 60-90 sec rest. Mix compound + isolation. Best for: muscle growth in a balanced split.
10. hyp_upper_lower — "Upper/Lower Split": 5-6 exercises per session. Upper: bench, row, OHP, curls, triceps. Lower: squat, RDL, leg press, leg curl, calves. 3-4 sets of 8-12. Best for: 4-day/week training.
11. hyp_bro_split — "Bodypart Split (Bro Split)": One muscle group per day, 5-6 exercises, 4 sets of 10-15 reps. High volume, full recovery between muscle groups. Best for: experienced lifters wanting maximum volume per muscle.
12. hyp_arnold — "Arnold Split": Chest+Back / Shoulders+Arms / Legs. Antagonist supersets for efficiency. 4 sets of 8-12 reps. Best for: high frequency with balanced development.
13. gvt — "German Volume Training (10×10)": 10 sets of 10 reps at 60% 1RM. 60 sec rest. One compound lift per muscle group. Extreme volume for hypertrophy. Best for: dedicated hypertrophy blocks (not year-round).
14. hyp_rest_pause — "Rest-Pause Hypertrophy": Work to near-failure, rest 15-20 sec, continue for 2-3 mini-sets. Extends time under tension past normal failure. RPE 9-10. Best for: advanced hypertrophy stimulus.
15. hyp_myo_reps — "Myo-Rep Sets": Activation set to near failure (12-20 reps), then 3-5 mini-sets of 3-5 reps with 10-15 sec rest. Efficient volume accumulation. Best for: isolation movements and time-efficient training.
16. hyp_drop_sets — "Mechanical Drop Sets": Start heavy (6-8 reps), immediately reduce weight 20-30%, continue to near failure, repeat once more. 3-4 total drops per exercise. Best for: maximizing metabolic stress.
17. hyp_tempo — "Tempo Training": 4 sets of 8-10 reps with controlled tempo (3-1-2-0 or 4-0-1-0). Increases time under tension without increasing load. 65-70% 1RM. Best for: hypertrophy + mind-muscle connection.

=== POWER-FOCUSED ===
18. pow_olympic — "Olympic Lift Derivatives": Power cleans, hang snatches, clean pulls. 4-6 sets of 2-3 reps at 70-80% 1RM. 2-3 min rest. Best for: explosive power development.
19. pow_plyometric — "Plyometric + Heavy Compound": Pair a plyometric (box jump, med ball throw) with a heavy compound lift. Post-activation potentiation. 3-4 supersets. Best for: athletes needing speed-strength.
20. pow_contrast — "Contrast Training": Alternate heavy (85-90% 1RM, 2-3 reps) with light explosive (30-40% 1RM, 3-5 reps) of same movement pattern. 3-4 pairs. Best for: developing rate of force development.

=== ENDURANCE / WORK CAPACITY ===
21. end_circuit — "Strength Circuit": 6-8 exercises, 12-15 reps each, 30-45 sec rest between exercises. 3-4 rounds. Full body. Best for: general conditioning and work capacity.
22. end_emom — "EMOM Strength": Every Minute On the Minute — perform a set of 3-5 reps, rest remainder of minute. 10-20 minutes. Builds work capacity under load. Best for: conditioning + strength maintenance.
23. end_amrap — "AMRAP Block": As Many Reps/Rounds As Possible in a time block (8-15 min). 3-4 exercises, moderate loads. Best for: metabolic conditioning with resistance.
24. end_high_rep — "High Rep Endurance": 3-4 sets of 15-25 reps at 40-55% 1RM. Short rest (30-60 sec). Best for: muscular endurance and tendon health.

=== PERIODIZATION PROTOCOLS ===
25. dup_3day — "Daily Undulating Periodization (3-Day)": Day 1: Hypertrophy (4×10 @ 70%). Day 2: Strength (5×5 @ 82%). Day 3: Power (6×3 @ 88%). Varies stimulus within the week. Best for: intermediate+ lifters.
26. conjugate_me — "Conjugate Max Effort": Work up to a 1-3RM on a main variation (close-stance squat, floor press, etc.). Rotate exercise weekly. Follow with hypertrophy accessories. Best for: advanced lifters (Westside method).
27. conjugate_de — "Conjugate Dynamic Effort": 8-12 sets of 2-3 reps at 50-60% 1RM with maximal bar speed. Band/chain accommodating resistance preferred. Follow with accessories. Best for: speed development.
28. wave_loading — "Wave Loading": Sets of 3/2/1 repeated 2-3 waves. Each wave slightly heavier than the last. Example: 85%, 90%, 95%, then 87%, 92%, 97%. Best for: neuromuscular potentiation before max attempts.

=== DELOAD / RECOVERY ===
29. deload_light — "Standard Deload": Same exercises, 50-60% of normal training loads, 50% of normal volume. Focus on movement quality and recovery. Required every 3-5 weeks of hard training.
30. deload_movement — "Movement Quality Deload": Light loads (40-50% 1RM), exaggerated tempo (5-0-5-0), focus on perfect form and positioning. Mobility work between sets. Best for: technique refinement.

=== SPECIALIZATION ===
31. spec_squat — "Squat Specialization": Squat 3-4x/week with varying rep schemes. Main squat + 2-3 squat variations + accessories. Best for: bringing up a lagging squat.
32. spec_bench — "Bench Specialization": Bench 3-4x/week. Competition bench + close-grip + incline + accessories. Progressive overload focus. Best for: bringing up a lagging bench.
33. spec_deadlift — "Deadlift Specialization": Deadlift 2-3x/week. Competition pull + deficit pulls + rack pulls + accessories. Best for: bringing up a lagging deadlift.
34. spec_ohp — "Overhead Press Specialization": OHP 3x/week. Strict press + push press + behind-neck press + shoulder accessories. Best for: building overhead strength.

=== SUPERSET / EFFICIENCY ===
35. ss_antagonist — "Antagonist Supersets": Pair opposing muscle groups (bench + row, curl + extension, squat + leg curl). 3-4 sets each. 60-90 sec rest between pairs. Best for: time-efficient training.
36. ss_compound — "Compound Supersets": Pair two compound lifts for different muscle groups (squat + OHP, deadlift + bench). Higher fatigue but extremely time-efficient. Best for: advanced lifters with limited time.

=== FULL BODY ===
37. fb_3day — "Full Body 3x/Week": One squat, one hinge, one push, one pull, one accessory per session. 3-4 sets of 5-8 reps on compounds. Best for: beginners and time-constrained lifters.
38. fb_minimalist — "Minimalist Strength": 3 exercises only (squat/bench or deadlift/OHP + pull). 3-5 sets of 3-5 reps. In and out in 30-40 min. Best for: maintaining strength with minimal time.

=== ADVANCED TECHNIQUES ===
39. adv_eccentric — "Eccentric Overload": 4-5 sec eccentric with 100-110% concentric 1RM (requires spotter or machine). 3-5 sets of 3-5 reps. Best for: advanced hypertrophy and strength past sticking points.
40. adv_isometric — "Isometric Holds": 3-5 sec holds at sticking points with 80-90% 1RM. 5-8 sets. Builds tendon strength and position-specific strength. Best for: overcoming plateaus.
41. adv_mechanical_advantage — "Mechanical Advantage Drop Set": Start with weakest variation, progress to strongest (e.g., incline → flat → decline bench) without rest. Best for: advanced hypertrophy.

=== CUSTOM ARCHETYPES (add your own below) ===
`;

/**
 * Parse archetype ID from the numbered list.
 */
export const getArchetypeNameById = (id: string): string => {
  const lines = STRENGTH_ARCHETYPES.split('\n').filter(l => l.trim());
  for (const line of lines) {
    const match = line.match(/^(\d+)\.\s+(\w+)\s+—\s+"([^"]+)"/);
    if (match && match[1] === id) return match[3];
    if (match && match[2] === id) return match[3];
  }
  return `Archetype #${id}`;
};
