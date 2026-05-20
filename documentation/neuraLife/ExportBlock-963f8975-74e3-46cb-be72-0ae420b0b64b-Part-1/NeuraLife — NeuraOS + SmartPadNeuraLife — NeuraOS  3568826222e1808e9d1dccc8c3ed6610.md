# NeuraLife — NeuraOS + SmartPadNeuraLife — NeuraOS + SmartPad

[SCREENS](SCREENS%203588826222e180838878ff00b92bed47.md)

![image.png](image%2014.png)

*A purpose-built educational device and operating system — every design decision serving one purpose: helping a student learn without distraction, in any environment, on a device that works all day with or without internet.*

---

## Two Hardware Paths — v1 and v2

This document covers both hardware and software paths:

|  | v1 — Demo & First Schools | v2 — Post First Deal |
| --- | --- | --- |
| **Hardware** | Stock Android tablet (10") | NeuraLife SmartPad (E-Ink, India OEM) |
| **OS** | NeuraLife Kiosk App (screen pinned, kiosk mode) | NeuraOS (full AOSP 13 fork) |
| **Stylus** | Active capacitive stylus (pressure-limited) | EMR stylus (4096 pressure levels, 200Hz) |
| **Display** | LCD IPS (standard tablet screen) | E-Ink Carta HD (paper-like, zero blue light) |
| **Battery** | 7,000 mAh — 1 full school day + evening | 3,000 mAh — 2–3 weeks typical use |
| **Build time** | 8–10 weeks | 6–9 months (OEM procurement + AOSP build) |
| **Cost** | ₹8,000–12,000 (procurement) | ₹12,999 (sell price) |
| **Demo capability** | 80% of demo impact at 10% of v2 build effort | Full product experience |

**The strategy:** The v1 Kiosk App proves the entire data pipeline and AI loop to school principals on a familiar device they can hold. When the first school deal closes, the v2 E-Ink SmartPad and NeuraOS AOSP build begin. The backend, AI, sync architecture, and content format are identical between v1 and v2 — only the device and OS layer changes.

---

## Part 1 — v1: NeuraLife Kiosk App

*Runs on any Android tablet, 10-inch, Android 11+. Demo-ready in 8–10 weeks.*

### What the Kiosk App Is

The NeuraLife Kiosk App is a single APK that:

- Pins itself as the device owner (screen pinning via Android Device Policy Manager)
- Disables the home button, recent apps button, and status bar pull-down
- Runs all NeuraLife student-facing features inside one locked experience
- Cannot be exited by the student without a PIN known only to IT admin

**It is not** a full OS replacement. It is Android with one app running in kiosk mode. The underlying Android OS remains. This is the demo architecture.

### Services Inside the Kiosk App

All services run as threads/workers within one APK:

| Service | Job |
| --- | --- |
| **Home Screen Activity** | NeuraHome (school mode + home mode) |
| **Writing Canvas Activity** | Full writing surface, tool palette, pen colours |
| **E-Reader Activity** | SVG content viewer, .nlc bundle renderer |
| **Stroke Logger Service** | Background — captures all stylus strokes, packages session data |
| **Edge AI Runtime** | Background — runs HWR-1-S and GAP-1 locally |
| **Sync Agent Service** | Background — queues session deltas, syncs on WiFi |
| **OTA Check Service** | Background — polls for model updates on WiFi |
| **Fleet Agent Service** | Background — reports battery, GPS (if hardware available), last sync |

### v1 Hardware Recommendation

| Spec | Recommended device | Minimum |
| --- | --- | --- |
| Brand / Model | Lenovo Tab M10 FHD Plus / Samsung Tab A8 | Any Android 11+ tablet |
| Screen size | 10.1" | 9" |
| RAM | 4 GB | 3 GB |
| Storage | 64 GB | 32 GB |
| Stylus | Lenovo Precision Pen 2 (active, pressure-sensitive) | Capacitive stylus |
| Battery | 7,040 mAh — 10+ hours | — |
| Price | ₹9,000–12,000 | — |

**On stylus:** v1 uses an active capacitive stylus, not EMR. This means:

- Pressure levels: 4096 levels if using Wacom AES or USI stylus (some tablets support this)
- Palm rejection: software-only (less reliable than hardware EMR)
- Practical impact on demo: writing feels natural and captures pressure. The AI functions correctly. Gap from EMR is noticeable only under stress testing, not in a 90-minute school demo.

### Kiosk App — Student PIN

```
Device setup (IT admin one-time):
  → Install NeuraLife Kiosk APK
  → Enable Device Owner mode (ADB command)
  → Set IT admin PIN (4-digit, known only to IT admin)
  → Launch kiosk — student cannot exit without IT PIN

Student login:
  → Student enters NeuraID + their personal PIN
  → JWT issued for session
  → Home screen loads (band-appropriate)

Kiosk exit (IT admin only):
  → Settings icon (long-press 3 seconds) → IT admin PIN prompt
  → Opens restricted settings: WiFi, time zone, software update
```

### What the v1 Demo Proves

| Step | What to show | What it proves |
| --- | --- | --- |
| 1 | Turn on tablet → NeuraHome in school mode | Context detection + timetable integration |
| 2 | Current period shown, one tap to canvas | Seamless subject switching |
| 3 | Student writes maths solution on canvas | Writing capture + stylus input |
| 4 | Edge AI indicator + mastery ring updating | On-device AI running offline |
| 5 | Wait 60 seconds → hint appears at bottom | HDE hint system works |
| 6 | Open principal dashboard → heatmap updates | Cloud sync end-to-end |
| 7 | Show fleet panel → pad battery and last sync | Fleet management |
| 8 | Show parent app → insight in Telugu at 8 PM | Full closed loop |

### What the Demo Does Not Prove (Explain, Don't Simulate)

| Limitation | How to address in demo |
| --- | --- |
| App whitelist / locked OS | "On the actual SmartPad, the student cannot install any app or access any other software. What you see here is the learning experience. The OS lock is in the production device." |
| E-Ink display | Show a product photo/video of E-Ink device. Explain zero blue light, paper feel, weeks of battery. |
| EMR stylus precision | Acknowledge: "This tablet stylus approximates the feel. The production device uses an EMR stylus — more like an actual pen." |
| Exam lock (OS-level) | "On the production device, exam lock is enforced at the OS level — students physically cannot access textbooks or hints. On this demo, I'll show the UI." |
| GPS beacon | "GPS fleet tracking is active on the production device. I'll show you the fleet map with simulated location." |

---

## Part 2 — v2: NeuraLife SmartPad Hardware

*Purpose-built E-Ink stylus device. India OEM manufacturing. Ships after first school deal closes.*

### Display

- **Panel:** E-Ink Carta HD (or equivalent) — 10.3" diagonal
- **Resolution:** 1404 × 1872 pixels, 227 DPI
- **Surface:** Paper-like, zero blue light, fully readable in direct sunlight
- **Refresh modes:**

| Mode | When used | Speed | Ghosting |
| --- | --- | --- | --- |
| A2 (fast partial) | Active writing — each stroke | < 20ms | Acceptable |
| GL16 (partial) | Page transitions, menu changes | ~250ms | Minimal |
| GC16 (full refresh) | Opening chapter, home screen load | ~700ms | Zero |
- **Why E-Ink:** Zero eye strain for multi-hour use. Weeks of battery. Eliminates parent concern about screen damage. Reads like paper in any lighting.

### Processor & Memory

- **SoC:** ARM Cortex-A55 class, 2.0GHz quad-core
- **RAM:** 4 GB LPDDR4 — sufficient for Edge AI inference + OS + apps simultaneously
- **Storage:** 32 GB eMMC flash
    - AI models: 120 MB reserved
    - OS + system: 4 GB reserved
    - Student content (textbooks, SVGs, problem sets): up to 20 GB
    - Student writing data: up to 7 GB

### Stylus (EMR)

- **Protocol:** EMR (Electromagnetic Resonance) — stylus has no battery, powered by the pad
- **Pressure levels:** 4096 levels — captures light sketching to heavy pressing
- **Tilt sensing:** Azimuth and altitude — enables pencil-shading simulation
- **Report rate:** 200Hz — 200 position samples per second
- **Why EMR over Bluetooth stylus:** No battery to charge. Never runs out. More reliable pressure sensing. Student cannot forget to charge the stylus.

### Connectivity

- **WiFi:** 802.11ac (WiFi 5)
- **Bluetooth:** BLE 5.0 — v3 classroom presence detection
- **USB-C:** Charging + data transfer (IT admin use only)
- **No SIM / No cellular — permanently.** This is a locked architectural decision across all hardware versions. WiFi-only by design. Reduces device cost. Eliminates data plan complexity. Removes cellular distraction entirely. Mobile data sync is not available in any version.

### Battery & Power

- **Capacity:** 3,000 mAh
- **Battery life:**
    - Reading mode (E-Ink static): 4–6 weeks per charge
    - Heavy writing (frequent partial refresh): 7–10 days
    - Typical school use (mixed): 2–3 weeks per charge
- **Charging:** USB-C, 18W fast charge — 2 hours to full
- **GPS beacon in standby:** Active even when device appears powered off — draws < 0.5mW from reserved battery capacity

### Physical Design

- **Dimensions:** 240mm × 180mm × 8mm (A5 form factor — fits in school bag)
- **Weight:** 420g (lighter than a standard notebook + textbook together)
- **Drop resistance:** 1.5 metre MIL-STD-810G tested on all edges and corners
- **Case:** Rubberized bumper integrated into device body — no add-on case required
- **Screen:** Shatter-resistant E-Ink layer — flex-resistant, does not crack like glass
- **Stylus storage:** Magnetic silo on right edge — stylus clicks in, does not fall out

### Additional Hardware

- **GPS module:** Low-power GPS for fleet tracking and theft recovery — active in all power states
- **Accelerometer:** Orientation detection, drop detection
- **Ambient light sensor:** Adjusts E-Ink contrast for different lighting environments
- **Camera:** Hardware present, disabled in v2 default. Enabled in v3 for handwriting photo capture.

---

## Part 3 — v2: NeuraOS Architecture

*Full AOSP 13 fork. Built after first school deal closes. Deployed on NeuraLife SmartPad.*

### Foundation: AOSP (Android Open Source Project)

NeuraOS is built on AOSP — the same open-source kernel that powers all Android devices. This is not a shortcut. It is the correct engineering decision:

- Linux kernel provides battle-tested hardware abstraction, memory management, process scheduling
- Hardware driver support (WiFi, GPS, USB) available from India OEM without custom engineering
- Security model (SELinux, sandboxing) is mature and well-understood
- Android build system (Soong) enables reproducible OS builds

**What is kept from AOSP:**

- Linux kernel (unmodified)
- Hardware abstraction layer (HAL)
- Android Runtime (ART)
- Core system libraries
- Security framework (SELinux, verified boot)

**What is removed from AOSP:**

| Removed | Reason |
| --- | --- |
| Google Play Store | No app installation except via NeuraLife OTA |
| Google Play Services | Not needed without Play Store |
| Chrome / browsers | No web browsing |
| Google Search | No search outside NeuraLife content |
| Camera app | Disabled — hardware present but inaccessible |
| Full Settings app | Replaced with NeuraLife Settings — students cannot access system settings |
| Full notification shade | Replaced with NeuraLife notification system |
| App drawer | Replaced with NeuraHome |
| USB ADB access | Disabled in production mode — IT admin re-enables via device owner PIN |

### App Whitelist Engine

Only explicitly whitelisted apps can run. Attempting to install or launch any non-whitelisted app silently fails — no error shown to the student.

**Whitelisted system apps (NeuraOS v2):**

| App | Function |
| --- | --- |
| NeuraHome | Home screen — school mode + home mode |
| Writing Canvas | Core writing surface |
| E-Reader | SVG + .nlc content viewer |
| NeuraLife Settings | Restricted settings only |
| Stroke Logger | Background service — stylus event capture |
| Edge AI Runtime | Background service — HWR-1 + GAP-1 (+ WSS-1, SHE-1 in v2) |
| Sync Agent | Background service — offline queue + WiFi sync |
| Fleet Agent | Background service — battery, GPS, remote lock |
| OTA Updater | Background service — model + OS update management |

Not whitelisted (cannot run): any app installed by student or parent, any APK sideloaded via USB, any browser-based app, any game or social media app.

### Stylus Input Framework

Custom input pipeline processing raw EMR stylus data into the Stroke Logger event stream. Runs as a kernel-level input driver — captures every stylus event regardless of which app is active.

```
EMR digitiser hardware
        ↓ raw x, y, pressure, tilt at 200Hz
Custom stylus input driver (kernel module)
        ↓ calibrated, timestamped events
NeuraOS Input Dispatcher
        ↓ routes to active app AND to Stroke Logger simultaneously
Writing Canvas (renders ink) + Stroke Logger (records for AI)
```

**Palm rejection (two layers):**

1. Hardware: EMR protocol distinguishes stylus from hand (different electromagnetic signatures)
2. Software: contact area > 15mm radius = palm → completely ignored on canvas surface

Result: Student rests their entire hand on the screen while writing — zero accidental marks.

### E-Ink Display Manager

Custom rendering logic that does not exist in standard Android. Switches refresh modes automatically:

```kotlin
fun selectRefreshMode(renderType: RenderType): EInkMode {
  return when (renderType) {
    STROKE_ACTIVE    -> A2_FAST_PARTIAL    // < 20ms — writing
    PAGE_TRANSITION  -> GL16_PARTIAL       // ~250ms — navigation
    FULL_SCREEN_LOAD -> GC16_FULL_REFRESH  // ~700ms — chapter open
  }
}
```

### Context Detection Engine

Determines school mode vs home mode automatically:

```python
def determine_context():
  current_time = get_current_time()
  timetable = fetch_today_timetable()
  connected_ssid = get_wifi_ssid()
  school_wifi_ssid = fetch_school_wifi_ssid()  # set during school onboarding

  is_school_wifi = (connected_ssid == school_wifi_ssid)
  current_period = get_current_period(timetable, current_time)
  is_school_hours = current_period is not None

  if is_school_hours and is_school_wifi:
    return CONTEXT.SCHOOL
  else:
    return CONTEXT.HOME
```

Context checked every 5 minutes. Home screen updates automatically — no student action required.

---

## Home Screen — NeuraHome

### School Mode

Displayed during timetable hours when connected to school WiFi.

**Layout:**

1. Status bar: date, time, battery %, WiFi status, sync status indicator (dot: green/amber/grey)
2. Current period hero card (prominent):
    - Subject name (large)
    - Teacher name + chapter being covered today
    - Live countdown timer to period end
3. Quick access buttons:
    - "Open [Subject] Canvas" — one tap to writing canvas for current subject
    - "Open Textbook" — one tap to current chapter in E-Reader
4. Today's schedule list: all periods, completed greyed out, current highlighted "NOW"

**Subject lock (optional):** If teacher activates from Teacher App: only current subject accessible during class. Others show "Locked by [Teacher Name] during [Subject] class."

### Home Mode

Displayed outside school hours or not on school WiFi.

**Layout:**

1. Status bar
2. Homework due panel: all pending homework sorted by urgency, overdue items darkened, tap to open
3. Subject tiles grid (2×2): all subjects, mastery %, weak subjects (< 40%) flagged ⚠️, E-Library tile
4. Needs attention strip: top 3 weakest topics from mastery map, progress bars

---

## Writing Canvas

### Core Design Philosophy

The writing canvas is the most important screen in the entire NeuraLife product. A student spends 2–4 hours per day here. Every design decision serves the act of writing.

**Free canvas — no imposed structure.** No templates, no boxes, no guided sections. A blank surface that behaves like paper — except it remembers everything and the AI watches.

### Band-Specific Canvas Behaviour

The canvas adapts to the student's age band. A Class 1 student and a Class 10 student have fundamentally different needs on the writing surface.

**Foundation Band (Classes 1–3):**

```
Canvas loads with letter/word tracing guide mode by default:
  → Ghost character shown at full page scale
  → Student traces over it with stylus
  → HWR-1-F evaluates: stroke order + formation quality
  → Feedback: animated ring + "Great!" after each correct trace
  → Real-time stroke order guidance: next stroke highlighted with arrow
  → Touch interactions ENABLED: painting, colouring, matching games
  → Stylus interactions: tracing, freehand writing exercises
  → No subject-divided notebooks: one "Practice Book" + one "Drawing Book"
  → Auto-pause at 20 minutes: "Time for a break! 🌟"
```

**Elementary Band (Classes 4–6):**

```
Standard canvas with simplified toolbar:
  → Pen, eraser, undo — no advanced tools (ruler, shapes in v2)
  → Subject notebooks enabled (Telugu, English, Maths, EVS)
  → Word-level hint delivery (HDE)
  → Progress ring shows topic mastery (stars, not %)
  → Touch for navigation, stylus for all writing
```

**Middle Band (Classes 7–8):**

```
Full canvas with standard toolbar
  → All writing tools available
  → Progress ring shows mastery % (age-appropriate to see numbers)
  → Cross-subject notebook navigation
  → Doubt flagging from E-Reader enabled
  → Homework submission enabled
```

**Secondary Band (Classes 9–10):**

```
Full canvas + exam features
  → Full toolbar including ruler, shapes, highlighter
  → Mastery % + percentile shown
  → Full hint system (HDE 3 stages)
  → Homework submission + page export (v2)
  → Exam lock mode at scheduled times
```

### Writing Tools — Full Set (Secondary Band)

| Tool | Function | E-Ink note |
| --- | --- | --- |
| Pen | Variable width with pressure | Crisp strokes, partial refresh per stroke |
| Pencil | Lighter, textured strokes | Grey tones, simulates pencil |
| Highlighter | Semi-transparent overlay | Lighter grey + hatching pattern |
| Eraser | Full area or per-stroke | Instant partial refresh |
| Ruler | Straight line guide | Physical ruler overlay, locks stroke |
| Shapes | Circle, rect, triangle, line | Tap-drag, auto-closes |
| Text insert | Type text into canvas | Software keyboard, inserts text box |
| Undo / Redo | Unlimited history within session | Instant partial refresh |

### Pen Colours on E-Ink

Four ink colours supported, rendered as distinct greyscale shades on E-Ink:

| Colour | E-Ink rendering | Indian school convention |
| --- | --- | --- |
| **Black** | Pure black strokes — highest contrast | Default |
| **Blue** | Dark grey — slightly lighter than black | Most common in Indian schools (students write in blue ink) |
| **Red** | Medium grey + slightly wider stroke | Corrections, teacher-style marking |
| **Dark grey** | Light grey, sparse density | Light notes, pencil-like |

**OCR impact: zero.** HWR-1 processes stroke geometry and pressure — not colour. Every stroke is tagged with colour metadata separately from coordinate data. OCR runs identically on all strokes regardless of colour.

### Active AI Indicator

A small indicator in the bottom-right corner: "Edge AI · active ●" with a pulsing dot. Intentional — makes the AI feel like a present tutor rather than hidden surveillance. Students know it is there. Transparency builds trust.

### Homework Submission

Student marks any canvas page as submitted directly from the pad:

1. Taps page icon in toolbar → "Submit this page as homework"
2. Selects homework assignment from list of pending assignments
3. Page uploaded to cloud on next WiFi sync (or immediately if connected)
4. Appears in Teacher App → Homework → Submissions
5. Page marked "Submitted ✓" in student's notebook — locked, cannot be edited after submission
6. Teacher views submitted page image with colour simulation preserved

---

## E-Reader

### Content Types (.nlc Bundle)

Three content types — all downloaded offline in `.nlc` bundle format, all E-Ink optimised:

**Type 1 — SVG Textbook Pages:**
SCERT/NCERT content digitised as SVG vector graphics. Renders perfectly at any zoom. Telugu and English text rendered with E-Ink optimised fonts.

**Type 2 — NeuraLife Lesson Slides:**
Step-by-step animated SVG explanations for complex topics. Each slide is one SVG — partial refresh between slides. More visual than textbook — labelled diagrams, process arrows, MathJax-rendered equations as static SVG.

**Type 3 — Practice Problem Sets:**
Problem card shown at top. Student writes answer on Writing Canvas (not in E-Reader). Taps "Check answer" — Edge AI compares written answer to solution.

### Reader Features

- **Annotation:** Tap pen icon → write notes directly on textbook page. Saved to subject notebook, page-linked to textbook reference.
- **Doubt flagging:** Long-press any paragraph → "🚩 Flag as doubt" → added to subject teacher's doubt queue with page reference, paragraph context, student name. Flag icon persists on paragraph until teacher resolves it.
- **Search:** Find word or topic within current textbook (v2)
- **Font size:** Small / Medium (default) / Large
- **Zoom:** Pinch to zoom
- **Progress tracking:** Page number + chapter completion % at bottom
- **Offline:** All content pre-downloaded — no internet needed to read

### Content Unlock Rules

- Current + completed chapters: always accessible
- Future chapters: accessible — student can read ahead (curiosity is not blocked)
- Previous class chapters: always accessible for remediation and prerequisite content
- During Exam Lock: all E-Reader content locked

---

## Hint Delivery Engine (HDE) — On SmartPad

When GAP-1 detects a student is stuck (same problem > 60 seconds, erase count > 2, no progress in 30 seconds), the HDE triggers a 3-stage response:

```
Stage 1 (60–120s stuck):
  → Small card appears at bottom of canvas
  → Step decomposition: "Start by moving all terms to one side"
  → Does not interrupt writing — appears below active writing area

Stage 2 (120–180s stuck):
  → Full card: Socratic question
  → "What do you get when you multiply (x+3) by (x-3)?"
  → Student can write answer in a mini-canvas within the card

Stage 3 (180s+ stuck):
  → Full-screen overlay: Similar solved example from curriculum
  → Student studies it, dismisses, returns to their problem
  → "I've saved this for your teacher" if still stuck

Student opt-out: Single tap on AI indicator → "Pause hints for 24 hours"
Teacher override: AT_RISK students have mandatory hints (set in Teacher App)
```

**v2 addition:** AI-generated hints (Claude API) when online. Pre-authored hints remain for standard curriculum problems.

---

## Achievement Animation (E-Ink Optimised)

When mastery milestone, chapter completion, or streak badge is triggered by Edge AI:

- Full-screen animation plays
- E-Ink design: high-contrast sequential frames at 4–8fps (E-Ink cannot do 60fps)
- Black and white only — bold geometric shapes that render cleanly
- Duration: 2 seconds maximum — returns to canvas
- Student can tap to dismiss early

**v1 Kiosk App (stock LCD tablet):** Same animation, rendered at 30fps with colour. More visually impressive on LCD — acceptable.

**Post-animation prompt:**

| Version | Post-animation prompt |
| --- | --- |
| v1 Kiosk App | "You've mastered [Topic]! 🎯" — returns to canvas. No NeuraSphere prompt (kiosk has no social layer). |
| v2 AOSP SmartPad | "You've mastered [Topic]! 🎯" + "Share this achievement?" → [Share] [Skip]. If Share: auto-generates NeuraSphere post → AI moderation → parent sees it. |

---

## Notification System

NeuraOS has a completely custom notification system — Android's standard shade is removed.

**Where notifications appear:**

- Small badge on NeuraHome status bar (number count)
- Tapping badge opens simple notification list
- During active writing (Focus Mode): all notifications held in queue, shown in batch after session ends

**Notification types:**

| Notification | Source | Timing |
| --- | --- | --- |
| New homework assigned | Teacher → Cloud → Pad | On next sync |
| Homework due tomorrow | System | 8 PM the day before |
| New content chapter unlocked | Cloud AI | On next sync |
| Hint available | HDE (local) | During writing, bottom-of-canvas card |
| Achievement earned | Edge AI (local) | Immediately — full-screen animation |
| Timetable changed | Teacher → Cloud | On next sync |
| OTA update ready | OTA Updater | 10 PM — "Update installs tonight" |
| Exam lock activating | Principal/Teacher → Cloud | 5 minutes before exam |

**What does NOT notify on the pad:**

- NeuraSphere social activity (mobile app only)
- Teacher messages (mobile app only)
- Fee alerts (mobile app only)
- School announcements (mobile app only)

The pad is a learning device. Social and administrative communication happens on the Parent & Student App.

**Focus Mode:** Stylus first touch starts session → all notifications held. No stylus activity for 5 minutes → session ended → batch notification shown: "3 notifications while you were writing."

---

## Edge AI on SmartPad — Active Models

The Edge AI Engine runs as a background service. Active model variant is determined by the student's band (from NeuraID profile):

| Band | Classes | HWR-1 variant | GAP-1 | WSS-1 | SHE-1 |
| --- | --- | --- | --- | --- | --- |
| FOUNDATION | 1–3 | HWR-1-F (v2) | Foundation error taxonomy (v2) | Foundation rubric (v2) | Foundation baselines (v2) |
| ELEMENTARY | 4–6 | HWR-1-E (v2) | Elementary taxonomy (v2) | Elementary rubric (v2) | Elementary baselines (v2) |
| MIDDLE | 7–8 | HWR-1-S (v1 + v2) | Middle taxonomy | v2 | v2 |
| SECONDARY | 9–10 | HWR-1-S (v1 + v2) | Secondary taxonomy | v2 | v2 |

**v1 demo deploys:** HWR-1-S + GAP-1 (Secondary taxonomy) + HDE only. WSS-1 and SHE-1 are v2 additions.

---

## Fleet Management

### Remote Lock

Activated by principal from Web Admin Console via Android Device Owner API.

**Lock effects:**

- Screen shows: "This device has been locked by [School Name]. Contact your teacher."
- All apps inaccessible
- WiFi stays active for location reporting
- USB data transfer disabled (charging still works)
- Cannot be bypassed by student — OS-level enforcement

### Exam Lock Mode

Principal sets exam date + time window in Web Admin Academic Calendar.

**At scheduled exam start:** All pads in the school receive lock command on next sync (within 15 minutes on school WiFi). If pad offline when exam starts: lock activates at next sync.

**What exam lock does:**

- Writing Canvas opens in blank mode (no previous notes)
- Hints disabled
- E-Reader inaccessible
- Progress view inaccessible
- WiFi sync disabled during exam window
- Live countdown timer shown

**How it ends:** Automatically at scheduled end time, or manually unlocked by principal/teacher. All writing during exam saved to student's subject notebook on unlock.

### Remote Wipe

Nuclear option for confirmed theft only. Used exclusively on explicit principal confirmation after police report.

- All student data deleted from local storage
- All AI model weights deleted
- All textbook content deleted
- Device returns to factory state

### Location Tracking

GPS logged every 30 minutes, uploaded on next WiFi sync. GPS beacon active even in apparent power-off state (reserved battery).

**Theft recovery flow:**

1. Principal registers loss report in Web Admin
2. System activates 5-minute GPS polling interval
3. Principal sees real-time location on fleet map (Leaflet.js + OpenStreetMap)
4. Location history (last 72 hours) as map timeline
5. Remote lock activated simultaneously

---

## OTA Updates

All updates — NeuraOS (v2), NeuraLife apps, AI models — delivered via NeuraLife OTA. No student or parent action required.

```yaml
Trigger:   WiFi connected + battery > 30% + device idle
Check:     Every WiFi connection (poll /api/v1/ota/check)
Download:  Background, low priority (does not interrupt student)
Install:   2 AM overnight — device reboots silently
Rollback:  If device fails to boot after update → auto-rollback to previous version
Size:      Delta updates only — typical model update 5–15 MB
Verify:    SHA-256 checksum before install — failed check = download discarded
```

Student wakes to an updated device with no interruption, no notification, no required action.

---

## Handwriting Practice Module

Integrated within Writing Canvas as a practice mode. Serves two simultaneous purposes: student skill improvement + highest-quality OCR training data collection.

**Practice content levels:**

1. Individual characters (Telugu aksharas, English alphabet) — ground truth 100% certain
2. Common words (curriculum vocabulary, subject-specific terms) — ground truth 100%
3. Sentences from AP/TS textbooks — ground truth verified against known text
4. Paragraphs from student's current chapter — natural writing rhythm in controlled context

**Student UX:**

- Sample shown at top (ghost text or character outline)
- Student writes in the space below
- Real-time clarity feedback ring after each word
- Session: 10 minutes or all samples complete
- Result: "Today's clarity: 71 → 74. Your Telugu characters are improving!"
- Badge: "Clear Writer" at clarity ≥ 80/100 sustained 2 weeks

**Recommendation rules:**

- Clarity < 60: daily 10-minute practice, shown as "Morning warm-up" on home screen
- Clarity 60–75: weekly practice suggested
- Clarity > 75: on-demand, no prompt

---

## Version Roadmap

| Feature | v1 Demo | v2 Post-Deal | v3 Scale |
| --- | --- | --- | --- |
| NeuraLife Kiosk App (stock tablet) | ✅ | ✅ | ✅ |
| Edge AI — HWR-1-S + GAP-1 + HDE | ✅ | ✅ | ✅ |
| NeuraHome (school + home modes) | ✅ | ✅ | ✅ |
| Writing Canvas (Secondary band full set) | ✅ | ✅ | ✅ |
| E-Reader (SVG + .nlc bundles) | ✅ | ✅ | ✅ |
| Homework submission from pad | ✅ | ✅ | ✅ |
| Doubt flagging from E-Reader | ✅ | ✅ | ✅ |
| Achievement animations | ✅ | ✅ | ✅ |
| Fleet management (remote lock, GPS, OTA) | ✅ | ✅ | ✅ |
| Handwriting practice module | ✅ | ✅ | ✅ |
| Foundation band canvas (tracing, guided strokes) | ❌ | ✅ | ✅ |
| HWR-1-F + HWR-1-E variants | ❌ | ✅ | ✅ |
| WSS-1 + SHE-1 Edge AI models | ❌ | ✅ | ✅ |
| Full AOSP build (NeuraOS proper) | ❌ | ✅ | ✅ |
| E-Ink SmartPad hardware (India OEM) | ❌ | ✅ | ✅ |
| E-Ink Display Manager (A2/GL16/GC16 modes) | ❌ | ✅ | ✅ |
| NeuraSphere post prompt on achievement | ❌ | ✅ | ✅ |
| Telugu system UI | ❌ | ✅ | ✅ |
| Camera enabled (handwriting photo) | ❌ | ❌ | ✅ |
| BLE classroom presence detection | ❌ | ❌ | ✅ |
| Dedicated NPU for faster AI | ❌ | ❌ | ✅ |
| NeuraLife Tutor (Claude chat on pad) | ❌ | ✅ | ✅ |

---

## Confirmed Design Decisions

| Decision | Detail |
| --- | --- |
| v1 = stock Android tablet + kiosk app | Full AOSP is 6–9 months. Kiosk app delivers 80% of demo impact in 8–10 weeks. Same backend, same AI, same content format. |
| No SIM, no cellular — permanently | Architectural decision across all hardware versions. WiFi-only. Reduces cost. Eliminates distraction. No mobile data sync in any version. |
| NeuraSphere post prompt: v2 AOSP only | v1 kiosk app has no social layer. Achievement animation returns to canvas. v2 AOSP adds the share prompt after mastery milestone. |
| HWR-1 variant per band | Foundation (1–3) processes letter formation. Standard (7–10) processes text. One model for all produces poor results at both ends. Three variants deploy in v2. v1 deploys HWR-1-S only (Secondary band focus for demo). |
| WSS-1 + SHE-1 in v2, not v1 | v1 demo proves the core loop with HWR-1-S + GAP-1. WSS-1 (writing skill) and SHE-1 (study habits) add in v2 when data from first schools is available. |
| Pen colours rendered as greyscale on E-Ink | True colour impossible on E-Ink. Each colour = distinct greyscale shade + stroke width variation. OCR unaffected — processes stroke geometry, not colour. |
| Focus Mode during writing | No notifications interrupt active writing. Held in queue, shown in batch after 5-minute idle. Protects cognitive flow. |
| Exam lock at OS level (v2) / kiosk lock (v1) | v2 AOSP: Device Owner API makes all apps truly inaccessible. v1 kiosk: app-level lock (explain the v2 enforcement in demo, do not simulate). |
| Free canvas — no imposed structure | Students organise their writing naturally. No templates, no guided sections. The AI watches strokes, not the structure. |
| Palm rejection: EMR hardware (v2) + software (both) | v1: software-only (contact area > 15mm = palm). v2: EMR protocol + software. Both versions handle palm rejection. v1 is slightly less reliable under stress. |

## Open Questions

| Question | Impact | Recommended action |
| --- | --- | --- |
| India OEM SmartPad partner — which company? | v2 hardware procurement timeline | Research: Lava, Karbonn, or Hyderabad-based hardware firms. Approach after first school deal. Target: 200–500 unit MOQ at ₹9,000 procurement cost. |
| E-Ink panel supplier — Eink Corp (US) or BOE Moshion (China)? | Display quality and sourcing cost | Eink Corp is the premium option (used by Remarkable, Onyx Boox). BOE is cheaper. Decision at OEM negotiation stage. |
| v1 stylus — active capacitive or USI? | Pressure sensitivity + palm rejection quality | Some tablets (Lenovo Tab P12 Pro) support USI stylus with 4096 pressure levels — matches EMR feel closely. Evaluate before ordering demo devices. |
| Foundation band — touch-only for play-to-learn, stylus for writing. Does the kiosk app handle both cleanly on v1? | v1 kiosk Foundation band UX | Test on Lenovo Tab M10 FHD. Foundation is v2 anyway — v1 demo focuses on Secondary band. Note for v2 build planning. |
| NeuraLife Tutor (Claude chat) — character limit for student questions? | Privacy + cost control | Max 200 characters per query. Prompt includes: student's class, subject, topic context. Claude API cost per query: < ₹0.05. Acceptable. |

---

*Next update: **NeuraSphere + Chat — age gating corrections***