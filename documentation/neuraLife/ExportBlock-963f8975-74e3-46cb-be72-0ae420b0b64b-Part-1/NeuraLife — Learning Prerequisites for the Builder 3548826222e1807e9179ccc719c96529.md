# NeuraLife — Learning Prerequisites for the Builder

*Every technical topic you need to learn, mapped precisely to where it is used in the NeuraLife platform, with honest difficulty ratings and the best learning resources for each.*

---

## How to use this document

Each section lists a technical domain, why it matters for NeuraLife specifically, which product segment uses it, the difficulty level, and exactly what to learn within that domain. You do not need to master everything before starting — the sequence matters. Learn what you need for v1 first.

**Difficulty rating:**

- 🟢 Learnable in 1–2 weeks with focused effort
- 🟡 Requires 1–3 months of dedicated practice
- 🔴 Deep specialisation — months to years — consider partnering or using existing solutions

---

## Section 1 — Mobile Development (React Native)

**Where it is used:** Teacher App, Parent/Student App

**Why it matters for NeuraLife:** Both apps are built in React Native. This is your highest-priority technical skill if you have not used it already.

**Difficulty:** 🟢 (if you know React) / 🟡 (if not)

**What to learn:**

| Topic | Why needed | Priority |
| --- | --- | --- |
| React Native fundamentals | All app screens | Must know |
| Navigation (React Navigation v6) | Tab bars, stack navigation between screens | Must know |
| Zustand for state management | Global app state — current child, sync status | Must know |
| TanStack Query | Data fetching, caching, background sync | Must know |
| WatermelonDB | Offline SQLite storage for attendance, mastery cache | Must know |
| React Native reanimated | Smooth animations for mastery bars, progress rings | Should know |
| Firebase Cloud Messaging | Push notifications to teachers and parents | Must know |
| Biometric auth (react-native-biometrics) | Teacher app login | Should know |
| React Native camera | v2 — bulk marks import via OCR | Learn when needed |

**Best resources:**

- Official React Native docs: reactnative.dev
- WatermelonDB docs: nozbe.github.io/WatermelonDB
- TanStack Query docs: tanstack.com/query

---

## Section 2 — Backend Development (Split Architecture)

**Architecture decision: Node.js (TypeScript) + Python (FastAPI) — two separate services.**

This is not a compromise. It is the optimal split for NeuraLife specifically:

- **Node.js handles everything operational** — attendance sync, mastery upload, homework push, messaging, fleet management, real-time WebSocket. Same language as the frontend (React Native + Web Admin), shared TypeScript types, first-class Supabase SDK support.
- **Python (FastAPI) handles everything ML** — OCR flywheel retraining, mastery model calibration, Cloud AI insight generation, data science queries. Python is the ML ecosystem. This cannot be done as well in Node.js.
- The two services communicate via internal REST API or a Redis message queue. From the outside they appear as one unified backend.

### 2A — Node.js + TypeScript (Platform API)

**Where it is used:** All app-facing APIs, Web Admin backend, real-time sync, background jobs

**Difficulty:** 🟢 (if you know Node/JS) / 🟡 (if starting fresh)

| Topic | Why needed | Priority |
| --- | --- | --- |
| Node.js + Express or Fastify | REST API for all platform services | Must know |
| TypeScript | Shared types between backend and all frontends — prevents bugs | Must know |
| Supabase JS SDK | Managed Postgres + Auth + Realtime + Storage — replaces 5 services | Must know |
| Row-Level Security (RLS) in Postgres | School A cannot access School B's data — enforced at DB level, not API level | Must know |
| JWT authentication | Secure API access across all apps | Must know |
| Supabase Realtime | Real-time WebSocket for timetable push, attendance sync, alert feed | Must know |
| Bull + Redis | Background jobs — nightly mastery snapshots, OTA model push, SMS dispatch | Should know |
| REST API design + versioning | Consistent contracts for all platform components | Must know |
| Zod validation | Runtime type validation on all API inputs — TypeScript alone is not enough | Must know |

**Why Supabase over raw Postgres + custom auth:**
Supabase gives you: managed Postgres, Auth with OTP (perfect for parent mobile login), Realtime WebSockets, S3-compatible file storage, and a visual dashboard — all in one. For a solo developer this is the difference between shipping in 5 months and 12 months. Migrate to custom infra post-funding if needed.

**Best resources:**

- Supabase docs: supabase.com/docs
- Supabase RLS guide: supabase.com/docs/guides/auth/row-level-security
- Fastify (faster than Express): fastify.dev
- Zod: zod.dev
- Bull queue: docs.bullmq.io

### 2B — Python + FastAPI (ML Microservice)

**Where it is used:** OCR retraining pipeline, mastery model calibration, Cloud AI insight generation, data analytics

**Difficulty:** 🟡

| Topic | Why needed | Priority |
| --- | --- | --- |
| Python fundamentals | The ML ecosystem is Python — no alternative | Must know |
| FastAPI | Async REST API for the ML microservice — fast, auto-docs, type hints | Must know |
| pandas + numpy | Data processing for training pipelines | Must know |
| PyTorch or TensorFlow | Training and fine-tuning OCR and gap models | Must know |
| SQLAlchemy | Reading from Postgres for analytics queries | Should know |
| Celery + Redis | Async task queue for long-running retraining jobs | Should know |
| Pydantic | Data validation in FastAPI — same philosophy as Zod in TS | Must know |
| Jupyter notebooks | Exploring student data, prototyping model ideas | Should know |

**How the two services communicate:**

```
Node.js API receives sync from SmartPad
→ Stores mastery snapshot in Postgres
→ Publishes event to Redis queue: "new_mastery_snapshot:{neura_id}"
→ Python ML service consumes event
→ Runs insight generation
→ Writes AI insight text back to Postgres
→ Node.js API reads insight and sends to Parent App on next request
```

**Cloud GPU for retraining:**

- AWS EC2 g4dn.xlarge (NVIDIA T4, $0.53/hr) — spin up only during monthly retraining
- Script: pull training data from S3 → retrain → validate → package TFLite → upload to S3 → shut down
- Total monthly cost at v1 scale: under ₹2,000
- Not a persistent server — a scheduled job

**Best resources:**

- FastAPI docs: fastapi.tiangolo.com
- fast.ai course (PyTorch): fast.ai
- Celery docs: docs.celeryq.dev

### 2C — Database: PostgreSQL via Supabase

**Where it is used:** All operational data — students, attendance, mastery, homework, messages, fees

**Difficulty:** 🟢

| Topic | Why needed | Priority |
| --- | --- | --- |
| PostgreSQL fundamentals | Primary database for all platform data | Must know |
| Advanced SQL (window functions, CTEs) | Mastery trend queries, attendance aggregation, class ranking | Must know |
| Supabase RLS policies | Data isolation between schools at database level | Must know |
| Database indexing | Fast queries on mastery_snapshots (millions of rows over time) | Should know |
| Database migrations | Evolving the schema without breaking production | Must know |
| JSONB in Postgres | Storing mastery map snapshots and session summaries | Should know |

**Key tables (high level):**

```
schools, teachers, students (NeuraID), parents
attendance_records, homework_assignments, homework_submissions
mastery_snapshots, writing_skill_records, exam_results
smartpad_devices, smartpad_sync_logs
neurasphere_posts, teacher_messages, announcements
alerts, leave_applications, fee_records
ai_insights, ocr_fallback_pairs (ML training data)
```

**Best resources:**

- PostgreSQL documentation: postgresql.org/docs
- Supabase database guide: supabase.com/docs/guides/database
- Use the Prisma ORM or Drizzle ORM for type-safe queries from Node.js

---

## Section 3 — Web Development (React + TypeScript)

**Where it is used:** Web Admin Console (principal dashboard)

**Why it matters for NeuraLife:** The Web Admin Console is a complex dashboard with real-time data, role-based views, and data-heavy tables. TypeScript prevents the category of bugs that kill dashboards.

**Difficulty:** 🟢

**What to learn:**

| Topic | Why needed | Priority |
| --- | --- | --- |
| React 18 + TypeScript | All Web Admin screens | Must know |
| Tailwind CSS | Rapid UI without custom CSS | Must know |
| shadcn/ui | Pre-built components — tables, dialogs, forms | Must know |
| Recharts | Mastery trend charts, attendance heatmaps | Must know |
| Leaflet.js | SmartPad GPS location map in fleet panel | Should know |
| TanStack Query (web) | Data fetching + cache invalidation on dashboard | Must know |
| Zustand | Web Admin global state | Must know |
| Socket.io client | Real-time alert feed, pad status updates | Must know |
| Role-based UI rendering | Principal vs Super Admin views | Must know |

**Best resources:**

- shadcn/ui docs: ui.shadcn.com
- Recharts: recharts.org
- Leaflet: leafletjs.com

---

## Section 4 — Machine Learning Fundamentals

**Where it is used:** Edge AI Engine — all four models (HWR-1, GAP-1, WSS-1, SHE-1)

**Why it matters for NeuraLife:** You do not need to be an ML researcher. But you need to understand how models work well enough to: fine-tune existing models, evaluate model accuracy, set up training pipelines, and make informed decisions about which approach to use.

**Difficulty:** 🟡

**What to learn:**

| Topic | Why needed in NeuraLife | Priority |
| --- | --- | --- |
| Supervised learning fundamentals | Gap detector (GAP-1) is a classifier — you need to understand what you're training | Must know |
| Classification models (decision trees, XGBoost) | GAP-1 architecture — error pattern classification | Must know |
| Model evaluation metrics (precision, recall, F1) | How to know if your gap detector is actually working | Must know |
| Overfitting and generalisation | Your OCR model will see new student handwriting styles — must generalise | Must know |
| Train/validation/test splits | Evaluating your models honestly before deploying to students | Must know |
| Feature engineering | What features to extract from stroke data to feed into GAP-1 | Must know |
| Bayesian inference (basics) | The mastery confidence score formula uses Bayesian weighting | Should know |
| Transfer learning | Fine-tuning ML Kit on Telugu school data — you're not training from scratch | Must know |
| Model quantisation (INT8) | Compressing models to run on low-power SmartPad hardware | Must know |

**Best resources:**

- fast.ai Practical Deep Learning course (free, practical, not overly theoretical)
- Hands-On Machine Learning with Scikit-Learn and TensorFlow (Aurélien Géron)
- XGBoost docs: xgboost.readthedocs.io
- Google ML Kit docs: developers.google.com/ml-kit

---

## Section 5 — Handwriting Recognition (OCR) — Specialised

**Where it is used:** HWR-1 model in Edge AI Engine

**Why it matters for NeuraLife:** This is your deepest technical challenge. Telugu handwriting OCR for school-grade students is an unsolved problem at high accuracy. Understanding how OCR works at the stroke level (not image level) is critical.

**Difficulty:** 🔴 (the research frontier — plan to use existing tools + fine-tune, not build from scratch)

**What to learn:**

| Topic | Why needed | Priority |
| --- | --- | --- |
| How online handwriting recognition differs from image OCR | SmartPad captures strokes (x, y, pressure, time) — not images. Completely different problem. | Must understand |
| Google ML Kit Text Recognition API | Your v1 base model — know its capabilities and limits deeply | Must know |
| TensorFlow Lite | Running fine-tuned models on Android (NeuraOS is AOSP) | Must know |
| Data collection methodology | How to collect labelled handwriting samples from students ethically and effectively | Must know |
| Fine-tuning a pre-trained model | How to adapt ML Kit for Telugu school handwriting | Must know |
| Confidence score calibration | Setting the 0.75 threshold for cloud fallback — too high = too many cloud calls, too low = bad OCR | Must know |
| Unicode normalisation for Telugu | Telugu text has complex combining characters — incorrect normalisation breaks spell checking | Should know |

**Telugu script specifically:**

- Telugu has 56 base characters (akshara) plus vowel modifiers (matras), conjunct consonants, and half-forms
- School students write Telugu in simplified forms that differ from typeset Telugu
- No public dataset of Telugu school handwriting exists — you will need to collect your own
- Recommended: collect 50 handwriting samples per character × 56 characters × 10 student writers = 28,000 labelled samples as your v1 dataset minimum

**Best resources:**

- Google ML Kit On-Device Text Recognition: developers.google.com/ml-kit/vision/text-recognition/v2
- TensorFlow Lite guide: tensorflow.org/lite
- Telugu Unicode standard: unicode.org/charts/PDF/U0C00.pdf
- Academic paper: "IAM On-Line Handwriting Database" (for understanding online HWR methodology)

---

## Section 6 — On-Device AI / TinyML

**Where it is used:** All four Edge AI models running on SmartPad

**Why it matters for NeuraLife:** Running AI on a low-power E-Ink device with no GPU is a specialised discipline called TinyML or Edge AI. The techniques for making models small enough and fast enough are different from regular ML engineering.

**Difficulty:** 🟡

**What to learn:**

| Topic | Why needed | Priority |
| --- | --- | --- |
| TensorFlow Lite (TFLite) | The deployment format for all Edge AI models on Android | Must know |
| Model quantisation (INT8 / FP16) | Reducing model size from 300MB to 80MB without losing accuracy | Must know |
| ONNX format | Universal model format — train in PyTorch, deploy in TFLite | Should know |
| Android ML integration | Loading and running TFLite models from Java/Kotlin on NeuraOS | Must know |
| Inference benchmarking | Measuring how long a model takes to run on target hardware | Must know |
| Memory management for ML on Android | Preventing out-of-memory crashes during inference | Must know |
| Model versioning and OTA updates | How to push new model weights to devices safely | Must know |

**The size budget per model (must stay within):**

| Model | Max size | Current approach |
| --- | --- | --- |
| HWR-1 (OCR) | 80 MB | TFLite quantised |
| GAP-1 (gap detector) | 15 MB | XGBoost → ONNX → TFLite |
| WSS-1 (skill scorer) | 20 MB | Lightweight neural net → TFLite |
| SHE-1 (hint engine) | 5 MB | Rule engine v1, tiny classifier v2 |
| Total | < 120 MB | Leaves 392 MB headroom |

**Best resources:**

- TensorFlow Lite guide: tensorflow.org/lite/guide
- TinyML book: "TinyML" by Pete Warden and Daniel Situnayake (O'Reilly)
- Pete Warden's blog: petewarden.com

---

## Section 7 — Android / AOSP Development (NeuraOS)

**Where it is used:** NeuraOS build, Activity Logger service, SmartPad lockdown, fleet management

**Why it matters for NeuraLife:** NeuraOS is AOSP (Android Open Source Project) with the Play Store removed and your apps pre-installed. Building on AOSP is fundamentally different from building a regular Android app.

**Difficulty:** 🔴 (needs a dedicated Android systems engineer — not a solo full-stack task)

**What to learn (or hire for):**

| Topic | Why needed | Priority |
| --- | --- | --- |
| Android system services | Activity Logger runs as a system service — not a regular app | Must understand |
| AOSP build system (Soong/Make) | Building and flashing a custom Android image | Hire/partner |
| E-Ink display driver integration | E-Ink displays need custom rendering pipeline — no standard Android driver | Hire/partner |
| Android Kiosk mode / Device Owner | Locking down the device so students cannot install apps | Must know |
| Android Device Policy API | Remote lock, wipe, location — used in SmartPad fleet management | Must know |
| Background services on Android | Activity Logger must survive battery optimisation killing it | Must know |
| OTA update architecture for AOSP | Pushing NeuraOS updates and model updates to devices | Hire/partner |
| SQLite on Android | Local event storage for Activity Logger | Must know |

**Honest assessment for solo developer:**
NeuraOS is a v3 problem. For v1 demo, run the Activity Logger as a regular Android app on a consumer tablet (Samsung Galaxy Tab A7 Lite). You get 90% of the demo value without building a custom OS. AOSP work begins after funding, with a dedicated Android systems engineer.

**Best resources:**

- AOSP documentation: source.android.com
- Android Device Policy: developer.android.com/work/device-admin
- Android Kiosk mode: developer.android.com/work/dpc/dedicated-devices

---

## Section 8 — Data Engineering & ML Pipelines

**Where it is used:** Cloud AI Backend — training the OCR flywheel, mastery model calibration, insight generation

**Why it matters for NeuraLife:** The OCR accuracy flywheel only works if you have a pipeline that: collects disagreements from devices → labels them → retrains the model → validates → deploys OTA. This is a data engineering problem, not just an ML problem.

**Difficulty:** 🟡

**What to learn:**

| Topic | Why needed | Priority |
| --- | --- | --- |
| Data pipeline design | Collecting OCR fallback pairs from cloud → training dataset | Must understand |
| Python (pandas, numpy) | Data processing for ML training | Must know |
| PyTorch or TensorFlow | Training and fine-tuning your OCR and gap models | Must know |
| MLflow or Weights & Biases | Tracking experiments — which model version is best | Should know |
| Data labelling workflows | How to label Telugu handwriting samples efficiently | Must know |
| Model evaluation dashboards | Monitoring model accuracy after each OTA deployment | Should know |
| AWS S3 + Lambda (or equivalent) | Storing training data and triggering monthly retraining | Should know |

**The monthly retraining cycle:**

```
Week 1–3: Collect OCR disagreements from syncing devices
Week 4: Run retraining pipeline (Python script + GPU cloud instance)
         Evaluate on validation set
         If accuracy improves: package new TFLite model
Week 4 (weekend): Push OTA to all devices overnight
Week 1 next month: Monitor post-deployment accuracy
```

**Best resources:**

- fast.ai course (covers PyTorch practically)
- MLflow docs: mlflow.org
- Label Studio (free, open-source data labelling): labelstud.io

---

## Section 9 — Data Privacy & Compliance

**Where it is used:** NeuraID data model, consent flows, deletion pipeline, data localisation

**Why it matters for NeuraLife:** You are collecting biometric-adjacent data (handwriting) from minors. India's DPDP Act 2023 is law. A privacy violation involving children's data ends the company. This is non-negotiable.

**Difficulty:** 🟢 (legal understanding, not coding)

**What to learn:**

| Topic | Why needed | Priority |
| --- | --- | --- |
| DPDP Act 2023 (India) | Primary regulation for all student data | Must understand |
| COPPA principles (US) — for reference | Best practices for children's data globally | Should understand |
| Data minimisation principle | Only collect what you actually need — less data = less liability | Must apply |
| Consent management | Parent consent at enrollment, re-consent on policy change | Must implement |
| Right to erasure implementation | 7-day deletion pipeline, anonymisation of aggregates | Must implement |
| Data localisation requirements | All data stored in India (AWS Mumbai ap-south-1) | Must implement |
| Encryption at rest and in transit | AES-256 + TLS 1.3 — not optional | Must implement |
| Audit logging | Every access to student data logged with who, when, why | Must implement |

**Best resources:**

- DPDP Act 2023 text: meity.gov.in
- OWASP data privacy guidelines: owasp.org
- Supabase Row Level Security (the technical implementation): supabase.com/docs/guides/auth/row-level-security

---

## Section 10 — Statistics for Product (not advanced ML)

**Where it is used:** Mastery confidence score formula, writing skill scoring, attendance analytics

**Why it matters for NeuraLife:** You need enough statistics to design the mastery formula, understand when your model is reliable, and avoid showing parents numbers that are statistically meaningless.

**Difficulty:** 🟢

**What to learn:**

| Topic | Why needed | Priority |
| --- | --- | --- |
| Weighted averages | The mastery confidence formula | Must know |
| Bayesian updating (intuition, not maths) | Why recent sessions matter more than old ones | Must understand |
| Percentile ranking | Sentence formation level (Developing/Proficient/Advanced) | Must know |
| Variance and standard deviation | Handwriting consistency scoring | Must know |
| Rolling averages | Writing speed trend over 7 days | Must know |
| Confidence intervals (basics) | When to trust your model's assessment and when not to | Should know |
| A/B testing (basics) | Testing whether a new hint type improves outcomes | Should know |

**Best resources:**

- Statistics for Data Science — Khan Academy (free, excellent)
- Naked Statistics by Charles Wheelan (intuition, not formulas)

---

## Section 11 — Real-time Systems

**Where it is used:** Attendance sync, timetable push, alert feed, SmartPad status updates

**Why it matters for NeuraLife:** When a teacher marks attendance, the parent must see the notification within seconds. When the principal updates the timetable, every SmartPad must reflect it instantly. This requires real-time architecture.

**Difficulty:** 🟢

**What to learn:**

| Topic | Why needed | Priority |
| --- | --- | --- |
| WebSockets (fundamentals) | Real-time bidirectional communication | Must know |
| Supabase Realtime | Managed WebSocket subscriptions on your Postgres tables | Must know |
| Firebase Cloud Messaging | Push notifications to Android and iOS | Must know |
| Offline queue patterns | Attendance submitted offline → synced when connected | Must know |
| Conflict resolution | What happens if two teachers submit attendance for same class | Must understand |
| Message queuing (Bull / Redis) | Background jobs for nightly mastery snapshots | Should know |

**Best resources:**

- Supabase Realtime docs: supabase.com/docs/guides/realtime
- Firebase Cloud Messaging: firebase.google.com/docs/cloud-messaging

---

## Learning Sequence for v1 Demo (Recommended Order)

This is the order in which you should learn things to reach a working demo as fast as possible:

```
Week 1–2:   Supabase setup + PostgreSQL + RLS
            → Build the NeuraID data model and enrollment API

Week 3–4:   React Native fundamentals + React Navigation
            → Build the Parent App home screen and attendance view

Week 5–6:   Web Admin Console (React + Tailwind + shadcn)
            → Build the principal dashboard with mock data

Week 7–8:   WatermelonDB + offline sync patterns
            → Make attendance marking work offline in Teacher App

Week 9–10:  Google ML Kit integration + basic stroke capture
            → Build the Activity Logger as an Android app on a tablet

Week 11–12: XGBoost basics + feature engineering from stroke data
            → Build GAP-1 v1 (simplified) — classify error patterns

Week 13–14: Writing skill scorer (WSS-1) — formula implementation
            → No ML needed yet — rule-based scoring is fine for v1

Week 15–16: TFLite + model integration on Android
            → Integrate HWR-1 (ML Kit) into the Activity Logger

Week 17–18: End-to-end integration
            → Activity Logger → sync → dashboard → parent app

Week 19–20: Polish + demo script preparation
            → School visit ready
```

**Total: 20 weeks (5 months) of focused solo development for v1 demo**

This is aggressive but achievable for a full-stack engineer. The hardest parts are Week 9–10 (AOSP / Android tablet setup) and Week 11–12 (first ML model). Do not skip these — they are the demo's most impressive moments.

---

## What to Hire or Partner For (Do Not Build Solo)

| What | Why you cannot do it solo | When to address |
| --- | --- | --- |
| AOSP / NeuraOS build | Requires dedicated Android systems engineer, 6–12 months | After funding |
| E-Ink display driver | Specialised hardware knowledge — partner with ODM | After funding |
| Telugu handwriting data labelling | Needs Telugu-speaking annotators, 500–1000 hours of work | v2, crowdsource locally |
| Hardware manufacturing / sourcing | ODM in Shenzhen or Optiemus in India | After funding |
| Legal / DPDP compliance review | Needs a tech lawyer familiar with Indian data law | Before first school deal |
| Security penetration testing | Needs a third-party firm | Before v2 launch |

---

## The One Thing That Matters Most

Everything in this document is learnable. The Telugu OCR problem is hard but tractable. The AOSP work is deferrable. The ML pipeline is buildable.

The one thing that cannot be learned from a course or hired in is: **school relationships in AP/TS.**

The technical platform can be built in 5 months. Getting a principal to trust you enough to put your device in the hands of 500 children takes much longer and requires physical presence, repeated visits, and community credibility in the Telugu-speaking education ecosystem.

Start building school relationships the day you start writing code. They take longer than the code.