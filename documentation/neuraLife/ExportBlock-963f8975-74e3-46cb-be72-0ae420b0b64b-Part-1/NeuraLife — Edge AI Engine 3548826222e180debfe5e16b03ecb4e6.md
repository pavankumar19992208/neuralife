# NeuraLife — Edge AI Engine

*The on-device intelligence layer running on every NeuraLife SmartPad — continuously analysing student writing behaviour, inferring learning gaps, scoring skills, and tracking study habits, entirely offline, with raw handwriting data never leaving the device.*

![image.png](image%205.png)

![image.png](image%206.png)

---

---

## Purpose & Scope

The Edge AI Engine is NeuraLife's most defensible technical asset. It transforms a SmartPad from a digital notebook into a personalised learning companion. Every other feature in NeuraLife can be replicated by a well-funded competitor. The Edge AI Engine cannot — because it trains on proprietary student handwriting data that only exists inside the NeuraLife platform.

**What it is not:** A general-purpose AI assistant. Not an LLM running on-device. It is a purpose-built collection of small, specialised models — each doing one specific job extremely well — within the tight compute and power constraints of a mobile device.

**The core privacy principle:** Raw handwriting strokes never leave the device. The Edge AI processes everything locally and sends only classified, anonymised signals to the cloud. This is not a feature — it is a foundational design constraint. Even a full cloud breach exposes nothing meaningful about any student's actual handwriting.

> **The competitive moat in one sentence:** After 12 months of real student usage, NeuraLife has the largest dataset of Telugu and English school-grade handwriting in India — and the most accurate on-device OCR model trained on it. No competitor can buy this. They have to build it from scratch — and they cannot build it without the schools.
> 

---

## Hardware Context — v1 vs v2

### v1 Demo (Stock Android Tablet + Kiosk App)

```yaml
Device:       Any 10-inch Android tablet (Lenovo Tab M10, Samsung Tab A8)
Processor:    Snapdragon 680 class or equivalent (Cortex-A73 / A53 cluster)
RAM:          3–4 GB LPDDR4
Storage:      32–64 GB
GPU:          Adreno 610 class (used for TFLite acceleration)
OS:           Android 11+ with NeuraLife Kiosk App (screen pinned)
Connectivity: WiFi only — no SIM
Stylus:       Active stylus (included) or capacitive stylus
EMR support:  Preferred — 4096 pressure levels at 200Hz
```

### v2 (NeuraLife SmartPad — India OEM E-Ink)

```yaml
Device:       Custom India OEM 10.3" E-Ink device
Processor:    ARM Cortex-A55 quad-core (or equivalent low-power SoC)
RAM:          2–4 GB LPDDR4
Storage:      32 GB (min) — AI models: 512 MB reserved
GPU:          ARM Mali (v2 target) or dedicated NPU (v3)
OS:           NeuraOS — full AOSP 13 fork, locked
Connectivity: WiFi only — no SIM, permanently
```

### Hard Constraints (Both Versions)

```yaml
AI model storage budget: Max 512 MB total across all models
Power budget:            Inference must not drain battery more than 5% per hour
Inference latency:       Under 200ms per stroke batch (real-time feel)
Connectivity:            WiFi only — models must run fully offline
```

These constraints drive the architecture toward small, quantised, single-purpose models — not one large multi-purpose model.

---

## Model Architecture — Four Models + One Rule Engine

The Edge AI Engine is five components:

| Component | Type | Job | v1 | v2 |
| --- | --- | --- | --- | --- |
| **HWR-1** (3 variants) | TFLite ML model | Handwriting OCR — strokes to text | ✅ HWR-1-S only | ✅ All 3 variants |
| **GAP-1** | XGBoost model | Gap detection — error classification, mastery delta | ✅ | ✅ |
| **WSS-1** | TFLite ML model | Writing skill scoring — 4 dimensions | ❌ | ✅ |
| **SHE-1** | Rule-based + sequence classifier (v2) | Study Habit Evaluator — session patterns, focus score, habit consistency | ❌ | ✅ |
| **HDE** (Hint Delivery Engine) | Rule-based logic + lookup table | Socratic hint delivery — detects stuck student, delivers 3-stage hints | ✅ | ✅ + AI-generated hints |

**v1 demo deploys:** HWR-1-S + GAP-1 + HDE (rule-based). This is sufficient to demonstrate the complete core loop.

**v2 adds:** All three HWR-1 variants + WSS-1 + SHE-1 (Study Habit Evaluator).

---

## Model 1 — Handwriting Recognition (HWR-1)

**Job:** Convert raw stylus strokes into recognised text in Telugu and English.

### Why Three Variants

A Class 1 student learning to write individual letters is producing fundamentally different stylus data from a Class 10 student writing exam answers at speed. One model trained on mixed data performs poorly for both. Three dedicated variants, each trained on age-appropriate samples, outperform any single model across all ages.

### HWR-1-F — Foundation Variant (Classes 1–3)

```yaml
Target students: 6–9 years old. Still learning letter formation.
Stroke characteristics: Large, slow, shaky, traced, inconsistent
Primary job: Letter formation scoring, not word recognition
Confidence threshold: 0.55 (lower — accept more variation)
Cloud fallback threshold: < 0.55 (all strokes sent for labelling)
Key difference from Standard model:
  - Not scored on word accuracy — scored on stroke order and formation quality
  - Each letter evaluated independently (not word-level)
  - Recognises alphabet tracing overlays (student traces guide strokes)
  - Telugu vowel marks tracked separately from base characters
Training data: Primarily Class 1–3 tracing exercises + early freehand
Model size target: Under 50 MB (INT8 quantised)
```

**Output (Foundation band — per letter, not per word):**

```json
{
  "letter": "క",
  "recognised": "క",
  "correct_stroke_order": true,
  "formation_quality": 0.71,
  "confidence": 0.68,
  "feedback_type": "STROKE_ORDER_CORRECT",
  "encouragement": "GOOD_TRY"
}
```

**When HWR-1-F is deployed:** From Class 1. The Foundation kiosk app uses HWR-1-F for all writing exercises. Touch is used for play-to-learn interactions (painting, matching, drag-drop).

### HWR-1-E — Elementary Variant (Classes 4–6)

```yaml
Target students: 9–12 years old. Developing handwriting.
Stroke characteristics: Mix of print and cursive, still forming habits
Confidence threshold: 0.65
Cloud fallback threshold: < 0.65
Key difference: Both Telugu and English at word level.
  - Telugu vowel conjuncts begin appearing (more complex than Foundation)
  - Spelling accuracy scoring begins
  - HWR-1-E output feeds GAP-1 at word level (not just letter level)
Training data: Class 4–6 school writing samples across AP/TS
Model size target: Under 65 MB (INT8 quantised)
```

### HWR-1-S — Standard Variant (Classes 7–10)

```yaml
Target students: 12–16 years old. Mature but exam-speed degraded handwriting.
Stroke characteristics: Established personal style, degrades under time pressure
Confidence threshold: 0.75
Cloud fallback threshold: < 0.75
Key difference: Full GAP-1 integration. Error pattern classification.
  - Multi-word and sentence-level recognition
  - Mathematical expression parsing (numbers, operators, variables)
  - Telugu sentence recognition (full clause-level)
  - Feeds mastery confidence computation
Training data: Class 7–10 student samples, exam conditions + home study
Model size target: Under 80 MB (INT8 quantised)
```

### Accuracy Targets by Variant

| Variant | English (v1) | Telugu (v1) | English (v2) | Telugu (v2) | English (v3) | Telugu (v3) |
| --- | --- | --- | --- | --- | --- | --- |
| HWR-1-F (letter level) | 82% formation | 75% formation | 90% | 85% | 95% | 92% |
| HWR-1-E (word level) | 85–88% | 72–78% | 92–94% | 84–88% | 96% | 92% |
| HWR-1-S (full text) | 88–92% | 70–78% | 94–96% | 85–90% | 97%+ | 93–96% |

### Cloud Fallback — The Accuracy Flywheel

When on-device confidence < threshold for any word:

1. Stroke batch flagged locally
2. On next WiFi sync: sent to Google Cloud Vision API (anonymised — no student ID in API call)
3. Cloud result vs on-device result compared:
    - AGREE → on-device was correct, no action
    - DISAGREE → Cloud result is ground truth → stored as training pair (strokes → correct text)
4. Monthly: all accumulated training pairs sent to ML Training Pipeline
5. New HWR-1 model trained → pushed via OTA to all devices

**Why this is a moat:**

```
Month 1:  250 students × 2 sessions/day × 30 days = 15,000 labelled samples
Month 6:  90,000 samples. Model fine-tuned 6× across all variants.
Month 12: 180,000+ samples. Telugu accuracy reaches 90%+.
          Cloud fallback rarely triggered → Vision API cost drops to near zero.
```

Competitors cannot access this data. They would need to start from zero.

### OCR Pipeline — Full Flow

```
Student writes on SmartPad (stylus stroke captured at 200Hz)
        ↓
Stroke Logger captures: x, y, pressure, tilt, timestamp
        ↓
HWR-1 variant processes stroke batch (per stroke-end event)
        ↓
Output: Unicode text + per-character confidence score
        ↓
Confidence ≥ threshold?
  YES → Accept. Feed to GAP-1.
  NO  → Flag for Cloud OCR fallback queue.
        Stored in sync_queue as OCR_FALLBACK payload.
        ↓ (on next WiFi sync)
Google Cloud Vision processes flagged stroke batch
        ↓
Cloud result vs on-device result:
  AGREE    → On-device was correct. No action.
  DISAGREE → Store as training pair → monthly retraining pipeline
        ↓
Monthly: New HWR-1 models trained → OTA push to all SmartPads
```

---

## Model 2 — Gap Detector (GAP-1)

**Job:** Analyse HWR-1 output and raw stroke metadata to classify what specific learning gaps a student is exhibiting right now, and compute the mastery confidence delta for each topic.

**This model does not grade the student.** It classifies the *type* of error — which is far more useful than a score.

**Architecture:** Gradient Boosted Decision Tree (XGBoost) — fast, small, no GPU needed, interpretable.

**Model size target:** Under 15 MB

### Input Features (per problem, per session)

- Recognised text from HWR-1
- Expected answer (from curriculum database)
- Erase count per word
- Pause duration at each word boundary
- Pressure variance (high pressure = effort/struggle)
- Correction count (times student rewrote same word)
- Time on problem vs class average for this problem type
- Authenticity signals (gaming score, copying score — see below)

### Error Taxonomy by Band

Error patterns are band-specific. Applying Class 10 error taxonomy to a Class 2 student's output produces meaningless signals.

**Foundation Band (Classes 1–3) — Formation Errors:**

```yaml
STROKE_ORDER_ERROR:     Wrong stroke order for letter formation
LETTER_CONFUSION:       b/d, p/q, 6/9 confusion (common developmental)
NUMERAL_REVERSAL:       Reversed numerals (3, 5, 7)
SPACING_ERROR:          Letters/words too close or too far
UPPERCASE_LOWERCASE:    Inconsistent case usage
```

**Elementary Band (Classes 4–6) — Foundational Academic Errors:**

```yaml
Mathematical:
  CARRY_ERROR:          Wrong digit carried in addition/subtraction
  PLACE_VALUE_ERROR:    Digit in wrong column
  MULTIPLICATION_TABLE: Basic table recall error
  FRACTION_CONFUSION:   Numerator/denominator confusion

Language:
  PHONETIC_SPELLING:    Spelled as it sounds, wrong letters
  COMMON_WORD_ERROR:    High-frequency word misspelled
  PUNCTUATION_MISSING:  Full stops, commas absent
  TENSE_CONFUSION:      Simple past/present confusion
```

**Middle Band (Classes 7–8) — Conceptual Errors:**

```yaml
Mathematical:
  SIGN_ERROR:           Wrong operation sign applied
  FORMULA_RECALL:       Correct method, wrong formula recalled
  UNIT_ERROR:           Missing or wrong units in answers
  ALGEBRAIC_MANIPULATION: Transposition without sign change

Science:
  CAUSE_EFFECT_REVERSAL: Effect stated as cause
  DEFINITION_CONFUSION:  Term confused with similar concept

Language:
  SUBJECT_VERB_AGREEMENT: Disagreement in complex sentences
  VOCABULARY_SUBSTITUTION: Simpler/wrong word used
```

**Secondary Band (Classes 9–10) — Application Errors:**

```yaml
Mathematical:
  MULTI_STEP_BREAKDOWN:  Lost track in multi-step problem
  PREREQUISITE_GAP:      Error reveals missing concept from earlier class
  FORMULA_MISAPPLICATION: Right formula, wrong variable substitution
  COMPUTATION_CARELESS:  Method correct, arithmetic slip

Science:
  DIAGRAM_MISLABELLING:  Labels placed on wrong part
  EQUATION_BALANCING:    Chemical equation not balanced
  HYPOTHESIS_CONFUSION:  Hypothesis stated as conclusion

Language/Essays:
  ESSAY_STRUCTURE:       Introduction/body/conclusion unclear
  ARGUMENT_UNSUPPORTED:  Claim without evidence
  GRAMMAR_COMPLEX:       Conditional/subjunctive errors
```

**Behavioural Signals (all bands):**

```yaml
HESITATION_PATTERN:   Paused > 30s before writing (all bands)
REPEATED_CORRECTION:  Rewrote same word 3+ times
RUSH_PATTERN:         Very fast, low pressure (guessing)
AVOIDANCE:            Skipped problem entirely
HINT_DEPENDENCY:      Requested hint before attempting (3+ times per topic)
```

### Output Format (per session, per topic)

```json
{
  "session_id": "SES-20250901-084291",
  "neura_id": "NID-2025-AP-084291",
  "band": "SECONDARY",
  "subject": "MATHEMATICS",
  "topic": "QUADRATIC_EQUATIONS",
  "problems_attempted": 8,
  "problems_correct": 5,
  "error_classifications": [
    { "error_type": "SIGN_ERROR", "frequency": 3, "confidence": 0.91 },
    { "error_type": "HESITATION_PATTERN", "frequency": 5, "confidence": 0.87 }
  ],
  "mastery_delta": -0.04,
  "confidence_in_assessment": 0.88,
  "authenticity": {
    "gaming_score": 0.12,
    "copying_score": 0.08,
    "overall": "HIGH",
    "mastery_delta_weight": 1.00
  }
}
```

### Authenticity Detection (Inside GAP-1)

**Why this matters:** A mastery score is only useful if it reflects genuine learning. Two failure modes exist — gaming (rushing without thinking) and copying (transcribing from textbook).

**Policy (locked):** Detection does not trigger punishment. It adjusts the session's contribution to the mastery score downward. The student receives a gentle prompt. The teacher sees a flag at threshold. Nothing is shown to parents or students about the detection itself.

**Gaming Detection — Behavioural Signals:**

Gaming signature: very high writing speed + very low pressure + zero hesitation + zero erasure + correct answers.

| Signal | Gaming | Genuine |
| --- | --- | --- |
| Writing speed | > 2× class avg for problem type | Within 1 SD of class avg |
| Stylus pressure | Consistently low (< 1200 / 4096) | Variable, higher on complex words |
| Pause count | Zero / near-zero | 2–5 pauses per problem |
| Erase count | Zero | 1–3 per problem |
| Time on problem | < 30% of class avg | Within normal range |

```python
gaming_score = weighted_sum(
  speed_anomaly     × 0.30,
  pressure_anomaly  × 0.25,
  pause_deficit     × 0.20,
  erase_deficit     × 0.15,
  time_deficit      × 0.10
)

if gaming_score > 0.75:
    mastery_delta_weight = 0.20   # 20% of normal weight
    show_gentle_prompt = True     # "Try solving this one on your own first"
elif gaming_score > 0.50:
    mastery_delta_weight = 0.60
else:
    mastery_delta_weight = 1.00
```

**Copying Detection — Stroke Pattern Analysis:**

Copying from textbook: very slow, deliberate strokes tracing printed letterforms. Student's natural rhythm is disrupted.

| Signal | Copying | Natural writing |
| --- | --- | --- |
| Writing speed | < 40% of student's own baseline | Within 20% of baseline |
| Stroke smoothness | Overly smooth — tracing curves | Natural variation |
| Pen lift frequency | High (looks up at book) | Lower, continuous |
| Content match | > 80% n-gram match to textbook text | < 40% |
| Rhythm consistency | Irregular (look-up pauses) | Consistent rhythm |

Home assignments: mastery weight reduction is milder (0.60). Teacher receives a flag: "Ravi's homework for Chapter 4 shows high similarity to textbook text. Consider asking him to explain in class."

---

## Model 3 — Writing Skill Scorer (WSS-1)

**Job:** Compute writing skill dimensions continuously across every session. Does not need to understand what is written — only how it is written.

**Deployed in:** v2 (Secondary and Middle bands first, then all bands).

**Model size target:** Under 20 MB

### Four Dimensions — Computation

**Dimension 1 — Handwriting Clarity Score (0–100)**

```
Input features:
  stroke_smoothness:     average curvature deviation from smooth arc
  height_consistency:    variance in ascender/descender heights
  spacing_consistency:   variance in inter-letter and inter-word gaps
  baseline_alignment:    deviation of baseline from horizontal
  pen_lift_precision:    distance between intended and actual pen-lift points

clarity = 100 - weighted_sum(
  stroke_noise       × 0.35,
  height_variance    × 0.25,
  spacing_variance   × 0.20,
  baseline_deviation × 0.20
)
```

**Dimension 2 — Writing Speed (words per minute)**

```
wpm = (total_words_written / active_writing_seconds) × 60
active_writing_seconds = total_session_time - sum(all_pauses > 3 seconds)
Rolling 7-day average updated after each session.
```

**Dimension 3 — Spelling Accuracy (%)**

```
spelling_accuracy = (correctly_spelled_words / total_words_written) × 100
where correctly_spelled = HWR-1 output matches dictionary lookup
Dictionary: AP/TS curriculum word list (Telugu) + standard English dictionary
Proper nouns excluded from scoring.
```

**Dimension 4 — Sentence Formation Level**

Three-level classifier: DEVELOPING / PROFICIENT / ADVANCED

```
Input features:
  average_sentence_length (words)
  clause_complexity (subordinate clauses present?)
  conjunction_variety (variety of connectors used)
  punctuation_accuracy (full stops, commas in correct positions)
  vocabulary_richness (type-token ratio)

Output: Classification label + confidence
  DEVELOPING: < 40th percentile for class year
  PROFICIENT: 40th–75th percentile
  ADVANCED:   > 75th percentile
```

### Per-Band WSS-1 Rubric Differences

| Dimension | Foundation (1–3) | Elementary (4–6) | Middle (7–8) | Secondary (9–10) |
| --- | --- | --- | --- | --- |
| Clarity | Letter formation quality, stroke order | Word-level consistency | Full handwriting clarity | Clarity under exam speed |
| Speed | Not scored (formation priority) | Words per minute (low target) | WPM with age-appropriate baseline | WPM, consistency under pressure |
| Spelling | Letter-sound correspondence | Common word accuracy | Subject-specific vocabulary | Academic vocabulary accuracy |
| Formation | Sentence formation: N/A | Basic sentence structure | Multi-clause sentences | Essay and paragraph structure |

**Session duration baselines per band (SHE-1 depends on these):**

| Band | Healthy session | Short session (concern) | Very long session (fatigue) |
| --- | --- | --- | --- |
| Foundation (1–3) | 15–20 min | < 10 min | > 30 min |
| Elementary (4–6) | 20–30 min | < 15 min | > 45 min |
| Middle (7–8) | 30–45 min | < 20 min | > 75 min |
| Secondary (9–10) | 45–60 min | < 25 min | > 90 min |

Using the wrong baseline makes SHE-1 signals wrong. A 15-minute session from a Class 1 student is full engagement — not low engagement.

---

## Model 4 — Study Habit Evaluator (SHE-1)

**Job:** Analyse session timing, duration, pause patterns, and consistency to evaluate study habits and produce a daily focus score and habit signals.

**Deployed in:** v2. Secondary and Middle bands first.

**Architecture:** Rule-based signals (v1) → Lightweight sequence classifier on session metadata (v2).

**Model size target:** Under 10 MB

### What SHE-1 Analyses

**Session timing:**

- What time of day does the student typically study? (consistency matters)
- Study start time deviation: does timing vary > 2 hours day to day?
- Day-of-week pattern: active on school days, absent on weekends?

**Session duration:**

- Is session duration within the band-appropriate healthy range?
- Short sessions that end abruptly (device power-off, not clean end) — distraction signal
- Very long sessions at unusual hours (late night) — parental concern signal

**Within-session focus:**

- Pause frequency and duration: long pauses (> 60 seconds) = distraction or confusion
- Recovery time after pause: does student resume quickly or drift?
- Task switching: does student frequently change topics (low focus)?

**Consistency over time:**

- Study streak: consecutive days active
- Week-on-week active days
- Declining engagement pattern: active days decreasing over 3+ weeks

### Output Format

```json
{
  "neura_id": "NID-2025-AP-084291",
  "session_date": "2025-09-10",
  "band": "SECONDARY",
  "focus_score": 0.78,
  "session_start_time": "18:45",
  "session_duration_minutes": 47,
  "study_start_consistency": 0.82,
  "pause_count": 3,
  "longest_pause_seconds": 180,
  "distraction_flags": ["LONG_PAUSE_AT_18:47"],
  "active_days_this_week": 5,
  "active_days_last_week": 4,
  "habit_trend": "IMPROVING",
  "concern_flags": []
}
```

### SHE-1 Signals Sent to Cloud

SHE-1 signals are included in the session delta sync payload. The Cloud AI (Insight Generator) uses them to produce habit-related insights for parents:

```
"Arjun studies consistently between 6:30–8 PM — great routine.
 This week he had 3 sessions with long pauses (> 3 minutes).
 Encouraging focused study without distractions at home may help."
```

Teachers see SHE-1 signals for AT_RISK students — declining habit scores are often early indicators of dropout risk.

---

## Hint Delivery Engine (HDE)

**Note on naming:** The Hint Delivery Engine is not a separate ML model. It is a rule-based component inside the SmartPad app that uses lookup tables from the curriculum database. It was previously called "Socratic Hint Engine (SHE-1)" in earlier drafts — this name is retired. SHE-1 is the Study Habit Evaluator. HDE is the hint component.

**Job:** Detect when a student is genuinely stuck and deliver the right type of hint at the right moment — without giving away the answer.

**Trigger conditions (all must be true):**

1. Student on same problem for > 60 seconds
2. Erase count > 2 on this problem
3. No new correct stroke in last 30 seconds
4. Topic flagged as a gap by GAP-1 in last 7 days (optional — higher priority if true)

### Three-Stage Adaptive Response

```
Stage 1 (60–120 seconds stuck):
  → Type: Step decomposition
  → Break problem into sub-steps, show which step to attempt next
  → Maths example: "Start by moving all terms to one side of the equation."
  → Telugu example: "Look at the root word. What suffix is being used?"
  → Source: Pre-authored hint library, mapped to curriculum topics
  → Display: Small card at bottom of screen, non-intrusive

Stage 2 (120–180 seconds stuck):
  → Type: Socratic question
  → A guiding question that makes the student think — not the answer
  → Maths example: "What do you get when you multiply (x+3) by (x-3)?"
  → English example: "Which part of the sentence is the subject?"
  → Source: Pre-authored question library + template substitution
  → Display: Full card with optional input field for student response

Stage 3 (180+ seconds stuck):
  → Type: Worked example from textbook
  → A similar (not identical) solved problem from the curriculum
  → Example: Shows problem 4.2b (solved) while student is stuck on 4.2c
  → Source: Content library — pre-linked similar examples per problem type
  → Display: Full-screen overlay, student studies it and returns to problem

After any hint → student solves within 3 minutes:
  → Show: "You got it! Hints work best when used to think, not to copy."
  → Log: HINT_WAS_HELPFUL = true (training signal for Cloud AI)

After Stage 3 → student still stuck:
  → Add topic to doubt queue (flagged for teacher)
  → Show: "I've saved this question for your teacher.
            Keep trying — or move to the next problem."
```

**v2 upgrade:** AI-generated hints (Claude API) replace pre-authored hints for ambiguous or novel problem types. Human-authored hints remain for standard curriculum problems (reliability > flexibility for core content).

**Student opt-out:** Student can pause the hint system for 24 hours from SmartPad settings (one tap). Class teacher can override this pause for AT_RISK students — hints become mandatory until mastery > 50% on that topic. Override set in Teacher App, enforced on SmartPad.

---

## Mastery Confidence Score

The mastery confidence score for each topic is the central output of the Edge AI Engine. Every downstream feature — teacher alerts, content recommendations, parent insights, NeuraSphere achievements — is computed from this number.

**It is not a simple percentage.** It is a Bayesian estimate weighting recent evidence more heavily than old, accounting for problem difficulty and session authenticity.

### Formula

```
mastery_confidence(topic, student) =
  weighted_average(
    recent_accuracy_score    × 0.35,   // last 3 sessions on this topic
    error_pattern_severity   × -0.25,  // penalise specific error patterns
    consistency_score        × 0.20,   // correct every session or sometimes?
    hint_dependency_rate     × -0.10,  // relied heavily on hints?
    problem_difficulty_bonus × 0.10    // harder problems = more credit
  ) × authenticity_weight              // gaming/copying reduces contribution

Where:
  recent_accuracy_score:   % problems correct in last 3 sessions on this topic
  error_pattern_severity:  weighted sum of error classifications
    (CARRY_ERROR = 0.3 penalty, SIGN_ERROR = 0.25, HESITATION = 0.1)
  consistency_score:       1.0 if correct all 3 sessions, 0.5 if 2/3, 0.0 if 1/3
  hint_dependency_rate:    hints_used / total_problems on this topic
  problem_difficulty_bonus: (difficulty - 0.5) × 0.2 (positive for hard problems)
  authenticity_weight:     1.0 (HIGH) | 0.6 (MEDIUM) | 0.2 (LOW)

Output: Float 0.0–1.0
  0.00–0.39: AT_RISK     (red — triggers teacher alert)
  0.40–0.69: DEVELOPING  (amber)
  0.70–0.84: GOOD        (blue)
  0.85–1.00: MASTERED    (green)
```

### Student-Facing Mastery Display (SmartPad)

Students see a simplified visual — not the raw confidence percentage:

- **Progress ring** or **star rating (1–5 stars)** per topic
- Raw percentages create anxiety and invite gaming
- Ring/star system motivates without exposing the underlying score
- Teachers and parents see full percentage with trend data

### Mastery Trigger — Three Simultaneous Actions

When `mastery_confidence(topic) ≥ 0.85` for 3 consecutive sessions:

**On SmartPad — immediate (no internet required):**

```
1. Achievement animation: "You've mastered [Topic Name]! 🎯"
2. Next chapter unlocked — lock icon removed from Chapter N+1
3. Challenge problem appears: harder problem from local problem bank
   "Ready for a challenge? Try this harder problem."

v1 kiosk: No NeuraSphere post prompt (kiosk app has no social layer)
v2 AOSP: "Share this achievement?" → auto-generates NeuraSphere post
         → AI moderation before publishing
```

**On sync — when WiFi available:**

```
4. Teacher App notification: "Ravi Kumar mastered Quadratic Equations (89%)"
   → Teacher views evidence: which problems, which sessions, confidence
   → Teacher can override: "Disagree — student got lucky on easy problems"
   → Override logged as training signal for Cloud AI
5. Parent App: mastery map updates — topic turns green at 8 PM batch
   → AI insight refreshed: "Ravi has now mastered 3 of 5 Algebra topics"
6. Cloud AI queues next content module for download to SmartPad
7. NeuraID achievement record updated
```

**Teacher override:** When a teacher disagrees with a mastery assessment, their override is stored as a training signal. The Cloud AI model training pipeline uses teacher overrides to recalibrate mastery thresholds over time — making the system more accurate as teacher expertise is incorporated.

---

## Stroke Logger — Raw Data Pipeline

The Stroke Logger is a background service within the SmartPad Kiosk App (v1) and NeuraOS (v2). It runs throughout every writing session.

### Event Schema (every stylus event)

```json
{
  "event_id": "EVT-0000000001",
  "session_id": "SES-20250901-084291",
  "neura_id": "NID-2025-AP-084291",
  "timestamp_ms": 1725168000000,
  "event_type": "STROKE_POINT",
  "x": 412,
  "y": 687,
  "pressure": 2841,
  "tilt_azimuth": 45,
  "tilt_altitude": 72,
  "velocity": 8.4,
  "context": {
    "subject": "MATHEMATICS",
    "chapter": 4,
    "page": 12,
    "problem_id": "CH04-P012-Q03",
    "content_id": "MATH-10-CH4"
  }
}
```

### Event Types Captured

| Event | Description |
| --- | --- |
| STROKE_POINT | Single stylus position at 200Hz |
| STROKE_START | Pen touched screen |
| STROKE_END | Pen lifted |
| ERASE_START | Eraser tool activated |
| ERASE_END | Eraser deactivated + region erased |
| PAUSE_START | No stylus activity > 3 seconds |
| PAUSE_END | Stylus activity resumed |
| PAGE_CHANGE | Student moved to different page |
| CHAPTER_OPEN | Student opened a chapter |
| HINT_REQUESTED | Student manually tapped hint button |
| HINT_SHOWN | System showed a hint (any stage) |
| SESSION_START | Writing session began |
| SESSION_END | Writing session ended (clean) |
| SESSION_INTERRUPTED | Session ended unexpectedly (power off, app crash) |

### Local Storage and Purge

- Raw events: stored in SQLite, processed immediately by Edge AI models
- **Raw events purged after 24 hours** — never uploaded, never retained
- Processed session summaries: retained indefinitely on-device (small JSON, < 5 KB per session)
- On sync: processed summaries uploaded. Raw events: never.

**Privacy guarantee by architecture:** Since raw events are purged after 24 hours and never uploaded, not even NeuraLife can reconstruct a student's handwriting from cloud data. Physical device access within 24 hours is the only way to see raw strokes.

---

## Cloud Sync Payload

What leaves the device on every WiFi sync:

```json
{
  "sync_id": "SYNC-20250901-084291",
  "neura_id": "NID-2025-AP-084291",
  "pad_id": "PAD-0042",
  "synced_at": "2025-09-01T08:55:00Z",
  "session_summaries": [
    {
      "session_id": "SES-20250901-084291",
      "date": "2025-09-01",
      "subject": "MATHEMATICS",
      "duration_minutes": 47,
      "topics_covered": ["QUADRATIC_EQUATIONS"],
      "problems_attempted": 8,
      "problems_correct": 6,
      "hint_events": 1,
      "mastery_deltas": { "QUADRATIC_EQUATIONS": +0.06 },
      "authenticity_weight": 1.00
    }
  ],
  "writing_skill_update": {
    "handwriting_clarity": 74,
    "writing_speed_wpm": 18,
    "spelling_accuracy_pct": 81,
    "sentence_formation_level": "PROFICIENT"
  },
  "study_habit_signals": {
    "session_start_time": "18:45",
    "focus_score": 0.78,
    "distraction_flags": ["LONG_PAUSE"],
    "active_days_this_week": 5
  },
  "achievement_events": [
    { "type": "MASTERY_MILESTONE", "topic": "QUADRATIC_EQUATIONS", "confidence": 0.89 }
  ],
  "doubt_queue_items": [
    { "topic": "POLYNOMIAL_DIVISION", "chapter": 3, "problem_id": "CH03-P008-Q02" }
  ],
  "ocr_fallback_batches": [],
  "model_versions": {
    "HWR-1-S": "1.4.2",
    "GAP-1": "1.2.0",
    "WSS-1": "1.3.1",
    "SHE-1": "1.0.5"
  },
  "raw_strokes_included": false
}
```

---

## Local Mastery Map — Data Structure

The central on-device data store. All models read from and write to it.

```json
{
  "neura_id": "NID-2025-AP-084291",
  "band": "SECONDARY",
  "hwr_variant": "HWR-1-S",
  "last_updated": "2025-09-01T08:52:00Z",
  "subjects": {
    "MATHEMATICS": {
      "overall_mastery": 0.82,
      "topics": {
        "QUADRATIC_EQUATIONS": {
          "mastery_confidence": 0.89,
          "status": "MASTERED",
          "sessions_on_topic": 7,
          "last_active": "2025-09-01",
          "consecutive_mastered_sessions": 3,
          "error_patterns": [],
          "hint_dependency_rate": 0.12
        },
        "POLYNOMIAL_DIVISION": {
          "mastery_confidence": 0.38,
          "status": "AT_RISK",
          "sessions_on_topic": 4,
          "last_active": "2025-08-28",
          "consecutive_mastered_sessions": 0,
          "error_patterns": ["CARRY_ERROR", "HESITATION_PATTERN"],
          "hint_dependency_rate": 0.67
        }
      }
    },
    "TELUGU": {
      "overall_mastery": 0.38,
      "topics": {
        "SYNONYMS_ANTONYMS": {
          "mastery_confidence": 0.31,
          "status": "AT_RISK",
          "error_patterns": ["PHONETIC_SPELLING", "VOCABULARY_SUBSTITUTION"],
          "hint_dependency_rate": 0.80
        }
      }
    }
  },
  "writing_skills": {
    "handwriting_clarity": 74,
    "writing_speed_wpm": 18,
    "spelling_accuracy_pct": 81,
    "sentence_formation_level": "PROFICIENT"
  },
  "study_habits": {
    "avg_session_start_time": "18:45",
    "start_time_consistency": 0.82,
    "avg_focus_score_7d": 0.76,
    "active_days_this_week": 5,
    "study_streak_days": 12
  },
  "session_stats": {
    "total_active_days": 47,
    "total_writing_minutes": 2840,
    "avg_session_minutes": 60,
    "hint_usage_trend": "DECREASING"
  }
}
```

---

## OTA Model Updates

Models are updated over-the-air without user action.

```yaml
Trigger:     School WiFi connected + battery > 30% + device idle
Schedule:    Every 4 weeks (aligned with monthly ML training run)
Size:        Delta updates only — typically 5–15 MB per model per month
Verification: SHA-256 checksum + model version signature
Install:     Atomic file replace — either fully updated or not at all
Rollback:    If new model error rate > 5% in first 48 hours → auto-rollback to previous
Student impact: Zero — model swaps happen during device idle
```

**Model versioning:**

```json
{
  "HWR-1-F": "1.2.1",
  "HWR-1-E": "1.3.0",
  "HWR-1-S": "1.4.2",
  "GAP-1":   "1.2.0",
  "WSS-1":   "1.3.1",
  "SHE-1":   "1.0.5",
  "updated_at": "2025-09-01T02:00:00Z",
  "trained_on_samples": 360000
}
```

**OTA notification to teachers:**
Every model update pushes a brief in-app notification to all Teacher App users:
"NeuraLife AI updated (v1.4.2 → v1.5.0). Telugu spelling detection improved 8%. Mastery scoring recalibrated for Class 9–10."
Teachers tap to read the full changelog. Principal sees the update log in the fleet dashboard.

---

## Version Roadmap

| Capability | v1 Demo | v2 Post-Deal | v3 Scale |
| --- | --- | --- | --- |
| HWR-1-S (Classes 7–10) — English 88–92%, Telugu 70–78% | ✅ | ✅ | ✅ |
| HWR-1-F (Classes 1–3) — letter formation | ❌ | ✅ | ✅ |
| HWR-1-E (Classes 4–6) — word level | ❌ | ✅ | ✅ |
| Cloud OCR fallback flywheel | ✅ | ✅ | ✅ |
| GAP-1 error taxonomy (Secondary band) | ✅ | ✅ | ✅ |
| GAP-1 all bands (Foundation/Elementary/Middle) | ❌ | ✅ | ✅ |
| HDE — Socratic hints (rule-based, 3 stages) | ✅ | ✅ | ✅ |
| HDE — AI-generated hints (Claude API v2) | ❌ | ✅ | ✅ |
| Authenticity detection (gaming + copying) | ✅ | ✅ | ✅ |
| Mastery confidence score + trigger | ✅ | ✅ | ✅ |
| WSS-1 — Writing skill scorer | ❌ | ✅ | ✅ |
| SHE-1 — Study Habit Evaluator | ❌ | ✅ | ✅ |
| OTA model updates | ✅ | ✅ | ✅ |
| Dedicated NPU hardware support | ❌ | ✅ | ✅ |
| Adaptive difficulty generation | ❌ | ✅ | ✅ |
| Cognitive load inference | ❌ | ❌ | ✅ |
| Emotional state proxy | ❌ | ❌ | ✅ |
| Multi-language code-switching detection | ❌ | ❌ | ✅ |

---

## Confirmed Design Decisions

| Decision | Detail |
| --- | --- |
| Three HWR-1 variants (F, E, S) | Different age bands produce fundamentally different stylus data. One model trained on mixed data underperforms for all. Three dedicated variants outperform. |
| SHE-1 = Study Habit Evaluator | All NeuraLife documents use this naming. Previous "Socratic Hint Engine" name retired. Hint system renamed HDE. |
| HDE is rule-based, not an ML model | Rule-based hints with pre-authored content are more reliable for academic content than AI-generated hints in v1. AI hints in v2 when validated. |
| v1 deploys HWR-1-S + GAP-1 + HDE only | Sufficient to demonstrate the full core loop (write → gap detected → insight → teacher alert). WSS-1 + SHE-1 in v2. |
| Student sees progress ring / stars, not % | Raw percentages create anxiety and invite gaming. Simplified visual motivates without exposing the model score. |
| NeuraSphere post on mastery: v2 AOSP only | v1 kiosk app has no social layer. Achievement post prompt available only on v2 AOSP SmartPad. |
| Teacher override is a training signal | Teacher expertise feeds the model. Disagreements are the most valuable training data the system can collect. |
| Raw strokes purged after 24 hours, never uploaded | Privacy by architecture. Even NeuraLife cannot reconstruct handwriting from cloud data. |
| SHE-1 band-specific session baselines | A 15-minute session from a Class 1 student is full engagement. A 15-minute session from a Class 10 student is a concern. Same raw data, different classification. |
| Authenticity detection does not punish | Detection silently adjusts mastery weight. Student receives gentle prompt. Teacher sees flag at threshold. No marks deducted, no parent notification. |

## Open Questions

| Question | Impact | Recommended action |
| --- | --- | --- |
| HWR-1-F stylus force threshold for tracing vs freeform? | Foundation model training parameter | Define during v2 build. Use tracing overlay until Foundation model is trained on sufficient data (target: 5,000 traced samples from Class 1–3). |
| Class 1–3: does the student use stylus at all for non-writing interactions? | Input method design for Foundation app | Dual input confirmed: stylus for writing exercises (alphabet tracing, number formation). Touch for all other interactions (painting, matching, drag-drop). |
| Mathematical equation rendering — how does GAP-1 handle LaTeX-style expressions? | GAP-1 needs to parse mathematical expressions from HWR-1 output | MathJax → SVG pipeline handles rendering. GAP-1 receives structured token stream (operator, operand, variable) extracted from HWR-1 output rather than raw text. This is a v2 enhancement — v1 uses pattern matching on recognised numeric/operator sequences. |
| At what sample count does HWR-1-S reach 90% Telugu accuracy? | Determines when Cloud Vision API cost drops significantly | Projected at 200,000 labelled samples (Month 9–12 with 500+ students). Track accuracy monthly. Switch to fully custom model when Cloud Vision disagreement rate drops below 5%. |

---

*Next update: **Cloud AI Backend — Content Agent + MathJax pipeline***