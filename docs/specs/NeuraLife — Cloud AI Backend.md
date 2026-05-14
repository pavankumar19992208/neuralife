# NeuraLife — Cloud AI Backend

*The server-side intelligence layer that calibrates mastery scores against population norms, generates plain-language insights for parents and teachers, powers content recommendations, detects cross-school curriculum patterns, retrains Edge AI models, and generates the SVG-animated educational content that runs on every SmartPad.*

---

## Purpose & Scope

The Cloud AI Backend is not a single service. It is a collection of **six specialised pipelines**, each running on its own schedule, each consuming data from the Edge AI Engine or the content authoring process, and producing outputs consumed by the Teacher App, Parent App, Web Admin Console, and SmartPads.

**What makes it different from the Edge AI:**

| Dimension | Edge AI (SmartPad) | Cloud AI (server-side) |
| --- | --- | --- |
| Data scope | One student, one session | All students, all schools, all time |
| Connectivity | Offline — no internet needed | Online — runs on schedule |
| Latency | Real-time (< 200ms) | Batch (nightly / weekly / monthly) |
| Compute | ARM CPU, 2–4 GB RAM | Modal.com GPU for training, Railway CPU for inference |
| Primary job | Detect + respond in the moment | Calibrate + pattern-match + generate language + generate content |
| Output | Local mastery map + hint delivery | Insights, recommendations, model updates, educational content |

**The six Cloud AI pipelines:**

| # | Pipeline | Schedule | Primary output |
| --- | --- | --- | --- |
| 1 | **Mastery Calibration Engine** | Nightly (1 AM) | Population-normed percentile scores |
| 2 | **Insight Generator** | Nightly (4 AM) — daily parent push | Plain-language insights in Telugu + English |
| 3 | **Content Recommendation Engine** | Post-sync (2 AM batch) | Personalised content + problem sets per student |
| 4 | **Curriculum Pattern Detector** | Weekly (Sunday 3 AM) | Cross-school topic failure detection |
| 5 | **Model Training Pipeline** | Monthly (first weekend) | Retrained Edge AI models, OTA-pushed to all devices |
| 6 | **Content Agent Pipeline** | On-demand (human-triggered) | SVG + animated + play-to-learn content for SmartPad |

---

## Pipeline 1 — Mastery Calibration Engine

*Transforms raw Edge AI mastery confidence scores into population-normed, meaningful percentiles.*

### The Problem With Raw Scores

The Edge AI produces a mastery confidence score per topic per student — a float between 0 and 1, computed in isolation: it only knows about that one student. It does not know whether the topic is inherently hard, whether the curriculum explains it poorly, or whether the student is above or below their peers.

A raw score of 0.65 could mean:

- Student is struggling (if class average is 0.82)
- Student is excelling (if class average is 0.41)
- Topic is badly taught (if every student scores below 0.50 across all schools)

Without calibration: noise. With calibration: signal.

### How Calibration Works

**Step 1 — Population baseline construction (weekly, Sunday 1 AM)**

```python
for each board in [SCERT_AP, SCERT_TS, NCERT]:
  for each subject in board.subjects:
    for each topic in subject.topics:
      for each class_year in [1..10]:
        population = fetch_all_mastery_scores(
          topic=topic,
          class_year=class_year,
          board=board,
          min_sessions=3,          # only students with enough data
          date_range=last_30_days
        )

        if len(population) < 30:
          continue  # insufficient data — use previous baseline

        baseline[board][topic][class_year] = {
          "mean":     mean(population),
          "std_dev":  std_dev(population),
          "p25":      percentile(population, 25),
          "p50":      percentile(population, 50),
          "p75":      percentile(population, 75),
          "p90":      percentile(population, 90),
          "at_risk_threshold":  percentile(population, 35),
          "mastered_threshold": percentile(population, 85),
          "sample_size":        len(population)
        }
```

**Step 2 — Per-student calibrated score (nightly)**

```python
calibrated_score = {
  "raw":                    0.82,    # from Edge AI
  "percentile":             91,      # where this student sits
  "vs_class_avg":           "+14%",  # raw - class mean
  "vs_school_avg":          "+9%",
  "classification":         "MASTERED",
  "population_sample_size": 1240,
  "board_calibrated":       "SCERT_AP"
}
```

**Classification thresholds (calibrated percentile):**

| Calibrated percentile | Classification | Display |
| --- | --- | --- |
| ≥ 85th | MASTERED | Green |
| 60th–84th | GOOD | Blue |
| 35th–59th | DEVELOPING | Amber |
| < 35th | AT_RISK | Red — triggers teacher alert |

**Why this compounds in value:** In v1 with one school of 500 students, calibration is rough. After 6 months with 20 schools and 10,000 students, the baseline is statistically robust. After 2 years with 100 schools and 50,000 students, it is the most accurate curriculum-specific mastery benchmark in AP/TS — built from real student behaviour, not standardised tests.

**Why board separation matters:** A Class 10 SCERT AP student and a Class 10 NCERT student are not calibrated against the same baseline — syllabi differ, difficulty levels differ, student populations differ. Each board has its own calibration baseline.

### Data Model

```json
{
  "calibration_id": "CAL-2025-09-SCERT_AP-MATH-QE-10",
  "topic": "QUADRATIC_EQUATIONS",
  "subject": "MATHEMATICS",
  "board": "SCERT_AP",
  "class_year": 10,
  "computed_at": "2025-09-01T01:00:00Z",
  "sample_size": 1240,
  "mean_raw_score": 0.68,
  "std_dev": 0.14,
  "percentiles": {
    "p25": 0.58, "p50": 0.69, "p75": 0.79, "p90": 0.88
  },
  "at_risk_threshold": 0.52,
  "mastered_threshold": 0.84
}
```

---

## Pipeline 2 — Insight Generator

*Converts numerical mastery data into plain-language summaries parents and teachers can act on immediately — daily, in Telugu or English.*

### Why Language Generation Is the Core Feature

A parent in Guntur receiving "Mastery: 0.38, percentile: 18th, error_patterns: [SPELLING_ERROR_PHONETIC, VOCABULARY_SUBSTITUTION]" cannot act on that. A parent receiving:

> "Ravi's Telugu needs attention — he is spelling words as they sound rather than how they are written, and tends to use simpler words when he does not know the correct one. Daily reading practice in Telugu for 15 minutes would help significantly. **Ask him tonight: 'Can you tell me one new Telugu word you learned today?'"**
> 

...can act on that immediately. And the conversation starter at the end is what makes a parent open the app tomorrow.

The insight generator's job is this translation — from numbers to actionable language, in the parent's preferred medium, every day.

### Architecture

**Model:** Claude API (`claude-sonnet-4-20250514`) via Anthropic API.

**Why not a smaller model:** Insight quality directly affects parent trust. A poorly worded or factually wrong insight destroys product credibility. Claude produces consistently accurate, well-calibrated language in both English and Telugu. At NeuraLife's v1 scale (500–5,000 students), API cost is negligible (< ₹15,000/year for 1,000 students at current pricing).

**Why generate in one language, not both:** Generate in parent's selected language only. If they want it in the other language, a translate button triggers a one-off API call. This halves baseline API cost and eliminates translation inconsistency.

### Insight Types and Schedule

| Insight type | Trigger | Recipient | Time |
| --- | --- | --- | --- |
| **Daily student insight** | Nightly after calibration | Parent App — push at 8 PM | Every night |
| **Weekly class insight** | Monday | Teacher App | Monday 7 AM |
| **Post-exam insight** | 24hr after marks entered | Parent App + Teacher App | Event-triggered |
| **Mastery milestone** | Mastery trigger from SmartPad sync | Parent App | Real-time on sync |
| **AT_RISK alert insight** | Student drops to AT_RISK | Teacher App + Principal | Immediate |
| **Monthly summary** | 1st of month | Parent App | 1st, 6 AM |

**The daily parent insight is the primary feature** — not the monthly summary. Parents open the app because there is something new every evening. This drives the retention and the word-of-mouth that closes school deals.

### Insight Prompt Structure

```python
DAILY_PARENT_INSIGHT_PROMPT = """
You are NeuraLife's educational AI. Generate a clear, warm, actionable
daily insight for a parent about their child's learning. Write in {language}.
Be specific. Be honest. Never alarming, never falsely positive.
End with exactly ONE practical suggestion the parent can do tonight.
Then add ONE conversation starter — a question the parent can ask
their child at dinner. Maximum 4 sentences + 1 suggestion + 1 question.
Do not use percentages, percentile numbers, or technical jargon.

Student: {student_name}, Class {class_year}, {band} band
School: {school_name}
Today's sessions: {sessions_today} session(s), {total_minutes} minutes total

Subject performance this week:
{subject_summaries}
  [Each subject: name, trend (improving/stable/declining), key gap if any]

Writing skills:
  Handwriting clarity: {clarity}/100 ({clarity_trend})
  Spelling accuracy: {spelling}% ({spelling_trend})

Study habits today:
  Session start: {session_start_time}
  Focus score: {focus_score}/1.0
  Distraction flags: {distraction_flags}

Attendance this month: {attendance_pct}%
Homework completion: {homework_rate}%

Most critical gap: {top_gap_subject} — {top_gap_description}
Biggest improvement this week: {top_improvement}

Generate the parent insight now. No bullet points. Flowing sentences.
End with: "Tonight, ask {student_first_name}: [specific question about
what they studied today or a concept they struggled with]"
"""
```

**Output example (English):**

> "Ravi had a focused 47-minute Mathematics session today, and his Algebra is improving steadily. His biggest challenge right now is Physical Science — he is getting confused between force and momentum, which is very common at this stage. His attendance this month is excellent at 94%, which shows real commitment. **Try this at home: review the difference between force and momentum together for 10 minutes — a helpful video is in the app under Science, Chapter 4. Tonight, ask Ravi: 'What happens to an object's speed when you apply a bigger force to it?'"**
> 

**Output example (Telugu):**

> "రవి ఈ రోజు 47 నిమిషాలు గణితంలో చాలా శ్రద్ధగా చదివాడు, అల్జీబ్రాలో మెరుగుదల కనిపిస్తోంది. ఇప్పుడు ఫిజికల్ సైన్స్‌లో శ్రద్ధ అవసరం — ఫోర్స్ మరియు మొమెంటమ్ మధ్య తేడా అర్థం కావడం లేదు. ఇంట్లో ఇద్దరూ కలిసి ఈ తేడా 10 నిమిషాలు చదవండి. రాత్రి రవిని అడగండి: 'వస్తువుపై పెద్ద బలం వేస్తే దాని వేగం ఏమవుతుంది?'"
> 

### Teacher Class Insight (Weekly, Monday)

```python
TEACHER_CLASS_INSIGHT_PROMPT = """
Generate a weekly class learning summary for a teacher.
Professional, data-informed tone. Be direct. Highlight patterns, not individuals.
Include: what the class mastered, what needs reteaching, any cross-student pattern.
Maximum 5 bullet points. End with one recommended teaching action for this week.
Language: English only (teachers use English professionally).

Teacher: {teacher_name}
Class: {class_year}-{section}, {student_count} students
Subject: {subject}

Class mastery this week:
{topic_mastery_summary}

Common error patterns (more than 30% of students):
{common_errors}

Students with AT_RISK classification: {at_risk_count}
Students who improved > 10%: {improved_count}
Average session duration: {avg_session_min} minutes
"""
```

### AT_RISK Alert Insight (Immediate)

Generated the moment a student crosses the AT_RISK threshold. Sent to class teacher within 3 minutes of calibration completing.

```python
AT_RISK_PROMPT = """
Generate a brief, specific alert for a teacher about a student who has
just been classified as AT_RISK. Professional, actionable, no alarmism.
Include: what subject, what specific error patterns, how long the decline
has been happening, one suggested intervention. Maximum 3 sentences.
"""
```

### Insight Rating System

Teachers rate each AI insight in the Teacher App (thumbs up / down). Negative ratings logged with optional reason. Accumulated ratings feed quarterly prompt refinement. Target: maintain > 85% positive rating.

---

## Pipeline 3 — Content Recommendation Engine

*Decides what content, practice problems, and revision material each student encounters next on their SmartPad.*

### Architecture — Two Layers

The recommendation engine combines curriculum sequencing rules (hard rules that respect educational sequencing) with collaborative filtering (ML that learns from what worked for similar students).

**Layer 1 — Curriculum sequencing rules (v1):**

```python
# Band-aware sequencing
if student.band == "FOUNDATION":
  # Sequential locking — must complete in order
  if topic.mastery >= 0.80:
    recommend_next_topic_in_sequence(topic)
  else:
    recommend_same_topic_different_approach(topic)

elif student.band in ["ELEMENTARY", "MIDDLE", "SECONDARY"]:
  # Open navigation — but guided recommendations
  if topic.mastery < 0.40:
    # Check for prerequisite gap first
    prereq_gap = find_prerequisite_gap(topic, student)
    if prereq_gap:
      recommend_prerequisite_content(prereq_gap)  # cross-grade, lower class
    else:
      recommend_same_topic_targeted_problems(topic, error_patterns=student.errors)

  elif topic.mastery >= 0.40 and topic.mastery < 0.85:
    recommend_continue_topic_increased_difficulty(topic)

  elif topic.mastery >= 0.85 for 3_consecutive_sessions:
    recommend_advance_to_next_topic(topic)
    recommend_revision_weakest_prerequisite(topic)
```

**Layer 2 — Collaborative filtering (v2, post 5,000 students):**

```python
similar_students = find_similar_mastery_profiles(
  current_student=student,
  metric="cosine_similarity",
  min_similarity=0.80,
  max_results=50
)

# Among similar students at same mastery stage:
# What content led to the fastest improvement?
content_effectiveness = aggregate_mastery_improvement(
  students=similar_students,
  content_pool=available_content_for_topic
)

recommendation = content_effectiveness.top_3()
```

### What Gets Recommended

- **Next chapter content** (if mastery threshold met) — SVG + animated content module
- **Targeted problem sets** — matched to specific error patterns from GAP-1
    - v1: pre-authored problem sets from curriculum database
    - v2: AI-generated problem sets (Claude API) for uncommon error combinations
- **Prerequisite content** (cross-grade) — Class 10 student with algebra gap gets Class 8 content
- **Revision topics** — topics not practised in 14+ days (mastery decay triggered)
- **Differentiated homework variant** — AT_RISK students get Foundation-level variant

### Mastery Decay Detection

A topic mastered 3 weeks ago but not practised since may have decayed:

```python
def mastery_decay(original_mastery, days_since_practice, band):
  # Decay rate calibrated per band
  decay_rates = {
    "FOUNDATION":  0.07,   # forgetting curve faster for young learners
    "ELEMENTARY":  0.06,
    "MIDDLE":      0.05,
    "SECONDARY":   0.04    # more consolidated memory
  }
  rate = decay_rates[band]
  decayed = original_mastery × (1 - rate) ^ (days_since_practice / 7)
  return max(decayed, 0.30)  # floor at 30% — never fully forgotten

if decayed_mastery < 0.65 and original_mastery >= 0.85:
  trigger_revision_recommendation(topic)
  parent_insight += "Ravi hasn't practised {topic} in {days} days —
                     a short revision tonight would help."
```

### Content Pushed to SmartPad on Next Sync

- Recommended .nlc content bundles pre-downloaded
- Targeted problem sets in JSON format
- Revision reminders for decayed topics
- SmartPad home screen: "Recommended for you" card appears
- Parent App: "New learning content recommended for Ravi" notification
- Teacher App: "AI has recommended remedial content for 3 students in your class"

---

## Pipeline 4 — Curriculum Pattern Detector

*The most strategically valuable pipeline — identifies systemic learning failures across schools, and distinguishes curriculum problems from teaching patterns.*

### Why This Is Unique

No individual teacher, principal, or even education officer can see: "74% of Class 8 students across all NeuraLife schools in Guntur district are failing the same topic in Chapter 6 of Science." Only a platform with cross-school data can detect this.

### The Critical Distinction: Curriculum Gap vs Teaching Pattern

This is the most important analytical decision in the detector. Treating a teaching pattern as a curriculum problem wastes content team effort. Treating a curriculum problem as a teaching problem unfairly burdens teachers.

**Curriculum gap:** Same error pattern, same topic, across multiple teachers in multiple schools → the problem is in the content, not the instruction.

**Teaching pattern:** Same error pattern, same topic, within one teacher's classes → the problem may be in how the concept is being taught by that specific teacher.

```python
def classify_pattern(topic, class_year, failure_data):
  school_variance = measure_school_variance(failure_data)
  teacher_variance = measure_within_teacher_variance(failure_data)
  cross_teacher_consistency = measure_cross_teacher_consistency(failure_data)

  if school_variance < 0.15 and cross_teacher_consistency > 0.80:
    # Consistent failure across teachers AND schools = curriculum issue
    return "CURRICULUM_GAP"

  elif teacher_variance < 0.10 and school_variance > 0.30:
    # Consistent failure within one teacher's classes = teaching pattern
    return "TEACHING_PATTERN"

  else:
    # Mixed signal — flag for human review
    return "MIXED_SIGNAL"
```

### Detection Logic

**Runs:** Every Sunday at 3 AM

```python
for each board in [SCERT_AP, SCERT_TS, NCERT]:
  for each topic in curriculum.topics:
    for each class_year in [1..10]:
      data = fetch_all_students(
        topic=topic,
        class_year=class_year,
        board=board,
        min_sessions=2,
        date_range=last_30_days
      )

      if len(data) < 50:
        continue  # insufficient data

      failure_rate = count(score < 0.40) / len(data)
      pattern_type = classify_pattern(topic, class_year, data)

      if failure_rate > 0.60 and pattern_type in ["CURRICULUM_GAP", "TEACHING_PATTERN"]:
        flag_pattern(
          topic=topic,
          class_year=class_year,
          board=board,
          failure_rate=failure_rate,
          pattern_type=pattern_type,
          affected_schools=count_distinct_schools(data),
          affected_students=len(data),
          top_error_patterns=extract_top_errors(data)
        )
```

### Output — Pattern Detection Report

```json
{
  "pattern_id": "PAT-2025-09-001",
  "detected_at": "2025-09-07T03:00:00Z",
  "pattern_type": "CURRICULUM_GAP",
  "topic": "FORCE_AND_LAWS_OF_MOTION",
  "subject": "SCIENCE",
  "class_year": 8,
  "board": "SCERT_AP",
  "failure_rate": 0.71,
  "affected_students": 847,
  "affected_schools": 12,
  "affected_teachers": 18,
  "cross_school_variance": 0.08,
  "top_error_patterns": ["CAUSE_EFFECT_REVERSAL", "DEFINITION_CONFUSION"],
  "diagnosis": "CURRICULUM_GAP",
  "ai_recommendation": "Review SVG lesson module for this topic. The cause-effect confusion suggests the textbook explanation conflates Newton's Second and Third Laws. Adding a visual force diagram animation and a counterexample would help. Consider additional class hours.",
  "severity": "HIGH",
  "status": "OPEN"
}
```

**Who sees this and what they see:**

| Recipient | What they see | What is hidden |
| --- | --- | --- |
| NeuraLife product team | Full report — all schools, all teachers, all students | Nothing |
| Principal (Web Admin) | "74% of Class 8 students across NeuraLife schools struggle with Force & Motion. Content team reviewing." | Other school names, teacher names |
| Subject Teacher (Teacher App) | "This topic is challenging for students across many schools — not unique to your class. Content improvement coming." | Other school data |
| District Education Officer (v3) | Anonymised district-level aggregate | Individual school or student data |

---

## Pipeline 5 — Model Training Pipeline

*Retrains the Edge AI models monthly using accumulated training data from all SmartPad syncs.*

### HWR-1 Retraining — Three Separate Streams

Each HWR-1 variant has its own training data source and retraining schedule:

**HWR-1-S (Standard, Classes 7–10) — Monthly retraining:**

```python
# Primary source: OCR fallback disagreements
training_pairs_S = fetch_ocr_training_pairs(
  variants=["HWR-1-S"],
  date_range=last_30_days,
  min_confidence_gap=0.15,   # only significant disagreements
  language=["TELUGU", "ENGLISH"],
  class_range=[7, 10]
)
# Secondary source: handwriting practice sessions (ground truth = 100%)
practice_sessions_S = fetch_practice_sessions(class_range=[7, 10])
```

**HWR-1-E (Elementary, Classes 4–6) — Bi-monthly (v2 only):**

```python
training_pairs_E = fetch_ocr_training_pairs(
  variants=["HWR-1-E"],
  date_range=last_60_days,   # slower data accumulation
  class_range=[4, 6]
)
# Emphasis on: word-level recognition, Telugu conjuncts, spelling
```

**HWR-1-F (Foundation, Classes 1–3) — Quarterly (v2 only):**

```python
training_pairs_F = fetch_ocr_training_pairs(
  variants=["HWR-1-F"],
  date_range=last_90_days,
  class_range=[1, 3]
)
# Emphasis on: letter formation sequences, tracing overlay matching
# Ground truth quality: highest — all practice sessions fully labelled
```

### Monthly Retraining Flow (HWR-1-S, v1)

```python
# Step 1: Fetch and validate training data
training_pairs = fetch_ocr_training_pairs(...)
print(f"Training pairs this month: {len(training_pairs)}")
# Month 1: ~5,000 | Month 6: ~60,000 | Month 12: ~150,000+

# Step 2: Fine-tune on accumulated data
new_model = fine_tune(
  base_model=current_hwr1_s_model,
  training_data=training_pairs,
  epochs=10,
  validation_split=0.20,
  early_stopping=True
)

# Step 3: Evaluate — only deploy if genuinely better
validation_accuracy = evaluate(new_model, held_out_validation_set)
if validation_accuracy > current_accuracy + 0.01:
  quantised = quantise_int8(new_model)             # compress for device
  checksum = sha256(quantised)
  upload_to_supabase_storage(quantised, version=next_version)
  schedule_ota_push(
    target="ALL_ACTIVE_PADS",
    model_type="HWR-1-S",
    deploy_time="OVERNIGHT_2AM"
  )
  notify_teachers(
    title=f"NeuraLife AI updated (v{old} → v{new})",
    body=f"Telugu spelling detection improved {delta}%. Mastery scoring recalibrated for Class 9–10."
  )
else:
  log("No significant improvement. Skipping OTA update.")
```

### GAP-1 Retraining (Quarterly)

- Primary signal: teacher overrides of AI mastery assessments
- "Student got lucky — not truly mastered" → negative training example
- "Confirmed — student has mastered this" → positive training example
- After 500+ override events: retrain GAP-1 with teacher feedback as ground truth
- Target: teacher disagreement rate < 10% (currently ~25% at v1 launch)

### WSS-1 Retraining (Semi-Annually, v2)

- Writing skill scores calibrated against teacher-provided assessments
- v2: External handwriting expert labels 1,000 session samples to validate WSS-1 accuracy
- Band-specific rubrics recalibrated after each label batch

### SHE-1 (Study Habit Evaluator) Retraining (Annually, v2)

- Calibrate session duration baselines against teacher-reported engagement quality
- Adjust focus score thresholds per band based on accumulated data

### Infrastructure

```yaml
Training compute (v1):
  Provider: Modal.com (GPU on demand — spin up only when needed)
  Hardware: A10G GPU ($0.76/hr)
  Duration: 4–6 hours for monthly HWR-1-S retraining
  Monthly cost: ~$5 (₹420)

Training compute (v2):
  All three HWR-1 variants + GAP-1
  Estimated: $15–20/month (₹1,250–1,650)

Training data storage:
  Provider: Supabase Storage (same as content library)
  Location: ap-south-1 (Mumbai) — data localisation compliant
  OCR pairs: ~50 MB/month per 1,000 students
  Annual at 5,000 students: ~3 GB — negligible cost

Model storage and OTA distribution:
  Storage: Supabase Storage (model binaries)
  Distribution: SmartPad polls /api/v1/ota/check on WiFi connect
    → Downloads binary from Supabase Storage signed URL
    → SHA-256 verification before install
    → Atomic file replace (partial download = no install)
  Keep: last 3 versions for rollback
  Rollback: if error rate > 5% in first 48hr → auto-revert

Experiment tracking: MLflow (self-hosted on Railway)
  Logs every training run, parameters, validation accuracy
  Enables comparison across model versions over time
```

---

## Pipeline 6 — Content Agent Pipeline

*Claude-powered content generation engine that converts textbook chapters into SVG-animated, play-to-learn educational content for the SmartPad.*

### Why Content Generation Is a Cloud AI Pipeline

The Content Layer spec (Segment 11) defines a 5-stage pipeline for generating educational content. This pipeline lives in the Cloud AI Backend — it uses the Claude API, Supabase Storage, and the human audit dashboard (an internal web tool). It is human-triggered (not scheduled) — a content editor initiates a chapter generation run.

### The 5-Stage Content Agent

```
INPUT: Textbook chapter (PDF or image scan)
        ↓
┌───────────────────────────────────────────────────┐
│  Stage 1 — Extraction Agent (Claude API)          │
│  Parse: chapter structure → topics → subtopics    │
│  Output: structured JSON chapter map              │
│  { title, topics: [{ name, subtopics, formulas,  │
│    key_terms, examples, page_refs }] }            │
└──────────────────────┬────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────────┐
│  Stage 2 — Content Generation Agent (Claude API) │
│  Prompt includes: board, class, subject,          │
│  band, medium (ENGLISH/TELUGU)                   │
│                                                   │
│  For each topic generates:                        │
│  • Concept explanation (band-calibrated language) │
│  • One-sentence plain-language summary            │
│  • SVG diagram code (clean, viewBox-based)        │
│  • MathJax equations → converted to SVG          │
│  • Animation storyboard (CSS @keyframes spec)    │
│  • Play-to-learn interaction recommendation      │
│  • 10 problems × 3 difficulty tiers              │
│  • Error pattern tags per problem (for GAP-1)    │
│  • 3-stage hint sequences per problem (for HDE)  │
│  • Prerequisite topic tags                       │
│  • YouTube search query                          │
│  • TTS-ready plain text (no markdown)            │
└──────────────────────┬────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────────┐
│  Stage 3 — Human Audit Dashboard                 │
│  Internal React web app (separate from Admin)    │
│                                                   │
│  Auditor types:                                   │
│  • Subject expert (accuracy)                     │
│  • Telugu language expert (medium quality)       │
│  • Teacher reviewer (age-appropriateness)        │
│                                                   │
│  Per topic, auditor can:                         │
│  • Approve as-is                                 │
│  • Edit text inline                              │
│  • Reject SVG → flag for human illustrator      │
│  • Override interaction type                     │
│  • Approve/replace YouTube link                  │
│  • Reject and regenerate (with feedback note)   │
│  Nothing publishes without audit approval        │
└──────────────────────┬────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────────┐
│  Stage 4 — Rendering Pipeline                    │
│                                                   │
│  SVG code → validated, optimised SVG files       │
│  MathJax equations → node-mathjax → SVG output  │
│    (all mathematical expressions rendered as     │
│    static SVG — no MathJax library on device)   │
│  Animation storyboard → CSS @keyframes files    │
│  Interactions → HTML/CSS/JS bundles              │
│  Problems → validated JSON (Zod schema)          │
│  Audio text → TTS-ready plain strings            │
│  All assets → packaged into .nlc bundle (ZIP)   │
└──────────────────────┬────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────────┐
│  Stage 5 — Device QA + Publish                   │
│  .nlc bundle loaded on test SmartPad             │
│  Checklist:                                      │
│  □ Renders on LCD (v1) and E-Ink (v2)           │
│  □ All interactions work offline                 │
│  □ Stylus input processed by HWR-1              │
│  □ Audio TTS plays correctly (Telugu + English) │
│  □ MathJax SVGs render correctly                │
│  □ Bundle size within storage budget            │
│  Sign-off → published to content_chapters table  │
│  Bundle uploaded to Supabase Storage             │
│  Pushed to SmartPads via OTA content channel    │
└───────────────────────────────────────────────────┘
```

### Content Agent Prompt Structure

```python
CONTENT_GENERATION_PROMPT = """
You are a curriculum content specialist for Indian school education.
Generate structured educational content.

Board: {board}  (SCERT_AP | SCERT_TS | NCERT)
Class: {class_year}
Subject: {subject}
Topic: {topic_name}
Medium: {medium}  (ENGLISH | TELUGU)
Age band: {band}  (FOUNDATION | ELEMENTARY | MIDDLE | SECONDARY)

Reading level for {band}:
  FOUNDATION:  Max 8 words/sentence. Everyday words only. Story-like tone.
  ELEMENTARY:  Max 12 words/sentence. New terms with simple definitions.
  MIDDLE:      Max 18 words/sentence. Subject-standard terminology.
  SECONDARY:   No limit. Full academic vocabulary. Exam-oriented.

Generate the following as valid JSON only (no preamble, no markdown):
{
  "concept_summary": "One sentence. Max {max_words} words.",
  "concept_explanation": "Full explanation at {band} reading level.",
  "key_terms": [{ "term": "", "definition": "" }],
  "svg_diagram": "Valid SVG code, viewBox='0 0 800 500', tap targets as <g id='tap_N'>",
  "math_expressions": ["MathJax LaTeX strings — will be converted to SVG by pipeline"],
  "animation_storyboard": [{ "step": 1, "description": "what animates", "duration_ms": 500 }],
  "interaction_recommendation": { "type": "TAP_TO_SEQUENCE|LABEL_DIAGRAM|SLIDER|FILL_EQUATION", "justification": "" },
  "problems": [30 problems — 10 per difficulty: FOUNDATION, STANDARD, ADVANCED],
  "prerequisite_topics": [{ "topic": "", "class_year": 0, "subject": "" }],
  "youtube_query": "Best search query for {medium} video on this topic",
  "audio_text": "Plain text for TTS — no markdown, no special characters"
}
"""
```

### MathJax → SVG Conversion

All mathematical expressions in content are rendered as SVG — not displayed via MathJax library on-device. This ensures:

- No JavaScript library dependency on SmartPad
- Consistent rendering on both LCD (v1) and E-Ink (v2)
- Fully offline — no CDN call needed

```jsx
// Stage 4 rendering pipeline (Node.js)
const mathjax = require('mathjax-node');

async function convertMathToSVG(latexExpression) {
  const result = await mathjax.typeset({
    math: latexExpression,
    format: 'TeX',
    svg: true
  });
  return result.svg;  // clean SVG string, embedded in content SVG
}

// Example:
// Input:  "$x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$"
// Output: <svg viewBox="...">...</svg>
// Embedded inline in the content SVG or as a separate asset
```

### .nlc Bundle Format

```
MATH-10-CH3.nlc  (ZIP archive)
├── manifest.json           → chapter metadata, topic list, version, checksum
├── topics/
│   ├── topic_001/
│   │   ├── content.json    → explanation, key terms, audio text
│   │   ├── diagram.svg     → interactive SVG diagram (tap targets)
│   │   ├── equations/      → MathJax-rendered SVG files
│   │   │   ├── eq_001.svg
│   │   │   └── eq_002.svg
│   │   ├── animation.css   → CSS @keyframes
│   │   ├── interaction/
│   │   │   ├── index.html  → play-to-learn (self-contained)
│   │   │   ├── style.css
│   │   │   └── script.js
│   │   └── problems.json   → 30 problems with hints + error pattern tags
│   └── topic_002/ ...
├── assets/
│   ├── fonts/              → Telugu + English (subset, offline)
│   └── shared/             → shared SVG assets (arrows, symbols)
└── youtube.json            → video refs per topic (fetched on WiFi)
```

**Bundle size estimates:** 500 KB–1.2 MB per chapter. Classes 9–10 demo set (~120 chapters): 60–145 MB total. Well within current grade pre-download storage budget.

---

## Nightly Batch Jobs Schedule

All heavy computation runs overnight to avoid impacting real-time API performance.

| Time (IST) | Job | What it does | Frequency |
| --- | --- | --- | --- |
| 12:00 AM | Session aggregator | Aggregates all synced session deltas into nightly mastery snapshot | Daily |
| 12:30 AM | Decay calculator | Runs forgetting curve on all topics not practised in 7+ days | Daily |
| 1:00 AM | Calibration update | Updates population baseline percentiles with today's new data | Daily |
| 2:00 AM | Content recommendations | Generates next-session recommendations per student | Daily |
| 3:00 AM | Curriculum pattern scan | Detects cross-school topic failure patterns | Weekly (Sunday only) |
| 4:00 AM | **Daily parent insight generation** | Generates today's parent insight for all active students | **Daily** |
| 4:30 AM | Weekly teacher class insight | Generates weekly class summary for all teachers | Weekly (Monday only) |
| 5:00 AM | OTA model push | Pushes new model versions overnight | Monthly (first weekend) |
| 5:30 AM | Alert generation | Creates AT_RISK alerts, inactive pad alerts, fleet health | Daily |
| 6:00 AM | Monthly summary | Generates extended monthly parent + principal reports | Monthly (1st only) |
| 8:00 PM | **Daily parent push** | FCM push to all parents with today's insight | **Daily** |

---

## API Endpoints (Cloud AI Microservice — Internal Only)

These are called by the Node.js API Gateway. Never exposed directly to client apps.

```yaml
POST /ml/calibrate/run
  Description: Run nightly calibration for all students who synced today
  Input:  { date, school_ids[] }
  Output: { students_calibrated, baselines_updated }

POST /ml/insights/generate
  Description: Generate insight for a student or batch of students
  Input:  { neura_ids[], insight_type, language }
  Output: { insights: [{ neura_id, text, generated_at }] }

POST /ml/recommendations/compute
  Description: Compute content recommendations for a student
  Input:  { neura_id, current_mastery_map, available_content_ids[] }
  Output: { recommendations: [{ content_id, reason, priority }] }

GET  /ml/patterns/active
  Description: Fetch active curriculum patterns (Super Admin only)
  Output: { patterns: [CurriculumPattern] }

POST /ml/training/trigger
  Description: Trigger model retraining manually (Super Admin only)
  Input:  { model_type, force_deploy }
  Output: { job_id, estimated_completion }

POST /ml/content/generate
  Description: Trigger Content Agent for a chapter
  Input:  { chapter_pdf_url, board, class_year, subject, medium, band }
  Output: { job_id }  (async — result in content_chapters table when done)

GET  /ml/health
  Description: All pipeline health check
  Output: { pipelines: { name, last_run, status, next_run } }
```

---

## Data Privacy in Cloud AI

| Data type | How it enters Cloud AI | Privacy protection |
| --- | --- | --- |
| Mastery map snapshots | Uploaded by SmartPad on sync | NeuraID linked, encrypted at rest (AES-256) |
| OCR fallback batches | Uploaded when confidence < threshold | Anonymised before training pipeline — no NeuraID in Cloud Vision API call |
| Teacher override signals | From Teacher App | Linked to NeuraID but anonymised for model training |
| Insight generation prompts | Assembled by Node.js API → Claude API | No raw handwriting data, no Aadhaar hash, no parent mobile |
| Curriculum pattern analysis | Aggregated across all students | Fully anonymised — school-level statistics only |
| Content generation prompts | Textbook chapter text only | No student data included in any content agent API call |

**What never enters Cloud AI:**

- Raw stylus stroke data (purged on-device after 24 hours)
- Student photographs, audio, or biometric data
- Parent or teacher personal information
- Fee or financial records
- Aadhaar hash or any identity document data

---

## Edge AI → Cloud AI Boundary (Confirmed)

**Edge AI handles alone (offline, always available):**

- 3-stage hints: pre-authored, HDE rule-based, instant (< 200ms)
- Chapter summary cards: pre-downloaded per chapter
- Curriculum glossary: local dictionary (Telugu + English)
- Error classification and mastery update: runs after every session

**Edge AI cannot handle — requires Cloud AI:**

| Scenario | Why Edge AI fails | Cloud AI solution |
| --- | --- | --- |
| Free-form question: "Why does force change direction?" | Requires LLM reasoning. No LLM fits in device constraints. | Claude API when WiFi available |
| "Explain this differently" | Requires generative AI, not lookup | Claude on demand |
| Tenglish (Telugu-English mixed) | Code-switching hard for small classifiers | Claude handles naturally |
| Multi-turn tutoring conversation | Requires conversation state across turns | Cloud AI session |
| Novel questions not in hint library | HDE only knows pre-authored content | Claude generates novel response |

**The SmartPad explanation flow:**

```
Student stuck → HDE Stage 1, 2, 3 hints (offline, instant)
Still stuck after Stage 3?
  WiFi available → Claude API called → streamed back to SmartPad
                   ("NeuraLife Tutor is thinking...")
  No WiFi       → Added to doubt queue → Teacher notified
                   → Answer pushed next sync
```

**v2 feature: NeuraLife Tutor** — simple text chat on SmartPad when online. Student types free-form question. Claude responds in Telugu or English. Socratic by design — guides, never gives direct exam answers. Full content safety guardrails for minors.

---

## Handwriting Practice — Dual Purpose

The handwriting practice exercises in the SmartPad app serve two purposes simultaneously:

**Purpose 1 — Student benefit:** Students with poor handwriting clarity scores (< 60/100) are shown a "Morning warm-up" practice session (10 minutes) before first class period. Letter tracing, word copying, sentence dictation. Progress ring shows clarity score improving. Achievement badge: "Clear Writer" at 80/100.

**Purpose 2 — Training data collection:** Practice sessions produce the highest-quality labelled training data possible — ground truth is 100% certain (we know exactly what the student was supposed to write).

```
Session type          Ground truth certainty   Training value
Letter tracing        100%                     Highest — controlled formation data
Word copying          100%                     High — good for conjuncts
Sentence dictation    100%                     Natural rhythm in controlled context
Free writing          Cloud-verified           Good for personal style variation

Students with clarity < 60:  daily 10-min practice recommended
Students with clarity 60–75: weekly practice suggested
Students with clarity > 75:  normal sessions provide sufficient training data
```

Students improve their handwriting. Models improve their recognition. No additional cost or effort required.

---

## Version Roadmap

| Capability | v1 Demo | v2 Post-Deal | v3 Scale |
| --- | --- | --- | --- |
| Mastery calibration — basic (small sample) | ✅ | ✅ Robust (10k+ students) | ✅ District benchmarks |
| Insight generation — English (Claude API) | ✅ | ✅ | ✅ |
| Insight generation — Telugu (Claude API) | ✅ | ✅ | ✅ |
| **Daily parent insight (not just monthly)** | **✅** | ✅ | ✅ |
| **Conversation starter in parent insight** | **✅** | ✅ | ✅ |
| Content recommendation — rule-based | ✅ | ✅ | ✅ |
| Mastery decay / forgetting curve | ✅ | ✅ | ✅ |
| Content recommendation — collaborative filtering | ❌ | ✅ | ✅ |
| AI-generated practice problems (Claude) | ❌ | ✅ | ✅ |
| Curriculum Pattern Detector (curriculum vs teaching) | ❌ (need 5+ schools) | ✅ | ✅ |
| HWR-1-S monthly retraining | ✅ | ✅ | ✅ |
| HWR-1-F and HWR-1-E retraining | ❌ | ✅ | ✅ |
| GAP-1 retraining from teacher overrides | ❌ | ✅ | ✅ |
| WSS-1 retraining | ❌ | ✅ | ✅ |
| **Content Agent Pipeline (SVG + MathJax)** | **✅** | ✅ | ✅ |
| NeuraLife Tutor (on-demand Claude chat) | ❌ | ✅ | ✅ |
| Government / district reporting | ❌ | ❌ | ✅ |
| APAAR integration | ❌ | ❌ | ✅ |

---

## Confirmed Design Decisions

| Decision | Detail |
| --- | --- |
| Daily parent insight (not monthly) | Daily push at 8 PM is the primary engagement driver. Monthly summary is supplementary. Parents open the app because something new is there every evening. |
| Conversation starter in every insight | "Tonight, ask {child_name}: [specific question]" — closes the loop between school and home. Parents use it, children get reinforcement. No other EdTech platform does this. |
| Telugu insight generated natively, not translated | Generate in parent's preferred language. Translate button available for one-off. Halves API cost, eliminates translation inconsistency. |
| MathJax → SVG on server, not on device | No MathJax library needed on SmartPad. Consistent rendering on all devices. Fully offline. Equations are static SVG — not rendered at runtime. |
| Content Agent is human-audited before publish | AI generates structure + text + SVG + problems. Human confirms accuracy, age-appropriateness, Telugu quality. Nothing reaches a student without human approval. |
| Three HWR-1 variants trained separately | HWR-1-F, HWR-1-E, HWR-1-S each have different training data sources, confidence thresholds, and retraining schedules. Mixed training degrades accuracy for all bands. |
| Curriculum vs Teaching Pattern distinction | Treating a teaching gap as a curriculum problem wastes content team effort. Treating a curriculum gap as a teaching problem unfairly damages teacher trust. The distinction protects both. |
| Modal.com for GPU training | On-demand GPU — pay only for the 4–6 hours of monthly retraining. No idle GPU cost. ~$5/month in v1 vs $150+/month for always-on GPU instance. |
| Training data in Supabase Storage (Mumbai) | Same storage as platform content. DPDP data localisation. No additional AWS dependency. |
| Teacher insight rating → quarterly prompt refinement | Teacher feedback is the highest-quality evaluation signal available. > 85% positive rating target maintained through quarterly prompt updates. |

## Open Questions

| Question | Impact | Recommended action |
| --- | --- | --- |
| How does the Content Agent handle complex biology diagrams it cannot generate as SVG? | Some diagrams (detailed anatomy, complex cellular structures) exceed Claude's SVG generation capability | Flag these automatically during Stage 2 output validation. Create a human illustrator queue. Target: < 10% of diagrams need human illustration. Track this metric from first content run. |
| YouTube video curation — who curates and how often is it updated? | Curated videos go offline, become outdated, or change quality | Add a quarterly review job: check all YouTube links for availability. Flag broken links. Human curator replaces. Teacher suggestion flow (Teacher App → submit video → admin approves) adds community curation from v2. |
| At what student count does collaborative filtering become statistically meaningful? | Pipeline 3 v2 feature depends on sufficient similar-student data | Minimum 5,000 students for cosine similarity to produce stable results. Below this: pure rule-based recommendations. Monitor at Month 6. |
| Content Agent — what is the prompt version control strategy? | Prompt changes can degrade previously generated content | Store prompt version in content_chapters.bundle_version. When prompt changes, increment version. Regeneration of existing content is optional — not automatic. |

---

*Next update: **NeuraID — DPDP compliance additions***