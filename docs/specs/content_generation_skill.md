# NeuraLife — Content Generation Skill

*The complete reference for generating high-quality, high-impact educational content using the PRAJNA Framework. Covers all 12 segments, per-segment quality standards, grade-tier strategy, AP/TS contextual grounding, Telugu generation rules, inter-segment coherence, and common failure modes.*

---

## 1. Purpose

This document defines exactly how each of the 12 content segments should be generated to maximise learning impact, visual clarity on SmartPad and app surfaces, and integration with the AI feedback loop.

Every decision here is made with three constraints in mind:
1. **Student reality** — a student in AP/Telangana across Grades 1–10; from a 7-year-old in Kurnool swiping their first Science activity to a 15-year-old in Guntur solving quadratics on an E-Ink SmartPad
2. **GAP-1 integration** — content must generate measurable learning signals, not just explanations
3. **Audit clarity** — human auditors must be able to evaluate and approve in under 3 minutes per segment

---

## 2. Grade Tier Strategy

Content is generated for students across Grades 1–10. **The grade tier determines where the LLM allocates design effort** across the 12 segments. There is no single template — the tier tells the model which segments are most important, what tone to use, and how long each piece should be.

### Tier Definitions

| Tier | Grades | Pedagogy | Core belief |
|---|---|---|---|
| **Primary** | 1–5 | Activity-first. Practical. Story-based. | A child learns by DOING, not by reading definitions |
| **Middle** | 6–8 | Transitional. Formal vocabulary introduced through familiar context | Moving from intuitive to systematic understanding |
| **Secondary** | 9–10 | Exam-aware. Full SCERT alignment. Mastery-driven | A student ready to be assessed can explain, apply, and evaluate |

---

### Primary Tier (Grades 1–5)

**Design effort ranking** (most → least):

| Rank | Segment | Why |
|---|---|---|
| 1 | `interaction` | The entire lesson in one activity — this IS the learning |
| 2 | `free_style` | The visual that sticks: puzzle, colouring, matching game — must be fun |
| 3 | `did_you_know` | A wonder story, not a statistic — ignites curiosity |
| 4 | `css_diagram` | Bright, colourful, animated discovery — the child sees the concept |
| 5 | `concept_explanation` | Max 100 words, story form, zero formal definitions |
| 6 | `key_terms` | Max 3 terms, picture + word — anchor the new vocabulary |
| 7 | `audio_text` | Read-aloud optimised, rhythmic, almost song-like |
| 8 | `svg_diagram` | Large, simple, max 3 elements, big labels |
| 9 | `concept_summary` | One concrete sentence a 6-year-old can say aloud |
| 10 | `problems` | 2 Foundation only — activity-style, never exam-style |
| 11 | `prerequisites` | Empty or max 1 (a single simple prior concept) |
| 12 | `youtube_query` | Max 2 videos, Telugu preferred, under 5 minutes each |

**Tone**: Warm, wonder-filled, story-driven. A kind teacher telling a story to children gathered around. Zero formal definitions. Zero "The definition of X is...". Lead with wonder: *"Have you ever seen...?"*, *"What happens when...?"*, *"Can you find...?"*

**Subject-specific approach for Primary:**
- **Mathematics (1–5)**: Manipulatives first — counting mangoes, chapatis, beads; shapes in familiar objects (circle of a plate, rectangle of a window, triangle of a roof). Story problems: "Raju has 5 laddoos. He gives 2 to Priya. How many does he have?"
- **Environmental Science (EVS)**: Observation-based — things the student can see, touch, or smell near the school: the garden, water in a cup, their own shadow, a local bird. Questions the student can test at home.
- **Telugu/Language**: Story characters, rhythm, rhyme, oral patterns. Content should feel like reading a picture book.
- **Social Studies / GK**: Community and family — home, village, school, market. "Our school is in __. The state is __."

---

### Middle Tier (Grades 6–8)

**Design effort ranking** (most → least):

| Rank | Segment | Why |
|---|---|---|
| 1 | `concept_explanation` | 200–350 words, intuition before formalism — the conceptual leap happens here |
| 2 | `interaction` | Reinforces the concept; builds structured thinking |
| 3 | `svg_diagram` | Introduces diagram literacy — reading and interpreting figures |
| 4 | `free_style` | Conceptual anchor; starts using formal visual formats |
| 5 | `key_terms` | 4–7 terms — building a subject vocabulary |
| 6 | `problems` | 2 Foundation, 3 Standard, 1 Advanced |
| 7 | `did_you_know` | Curiosity + connection to the bigger picture |
| 8 | `css_diagram` | Colour adds what SVG cannot show |
| 9 | `audio_text` | Standard, 60–90 seconds |
| 10 | `concept_summary` | One clear hook |
| 11 | `prerequisites` | 2–3 prior concepts |
| 12 | `youtube_query` | 3 videos, mixed language |

**Tone**: Engaging, curious, conversational. A peer who knows the subject. Formal terms appear — but always after the intuition is built, never before. The student should feel like they discovered the concept, not that it was dumped on them.

---

### Secondary Tier (Grades 9–10)

Full spec as written throughout this document. This is the default tier that all segment-level guidelines describe.

**Design effort ranking** (most → least):

| Rank | Segment | Why |
|---|---|---|
| 1 | `concept_explanation` | 300–500 words, full SCERT structure — the authoritative explanation |
| 2 | `problems` | 3/5/2 distribution, GAP-1 tagged — the proof of understanding |
| 3 | `interaction` | Deep engagement with the core concept |
| 4 | `svg_diagram` | Textbook-quality replacement |
| 5 | `key_terms` | 6–10 terms |
| 6 | `free_style` | Visual memory anchor before the quiz gate |
| 7 | `css_diagram` | Complementary colour view |
| 8 | `did_you_know` | AP/TS grounded curiosity spike |
| 9 | `audio_text` | TTS-ready, 60–90 seconds |
| 10 | `concept_summary` | SCERT-aware hook |
| 11 | `prerequisites` | 3–5 prior concepts from DB |
| 12 | `youtube_query` | 3–4 videos, mixed language |

---

### The LLM's Judgment Call

For any given topic and grade, ask these four questions before generating:

1. **What is the SINGLE core insight this topic builds?** (All tiers)
2. **At this grade level, how does a student first encounter this insight?**
   - Primary: through observation, activity, or a story
   - Middle: through an analogy or familiar experiment, then formalised
   - Secondary: through a worked problem, then connected to theory
3. **Which 3 segments, if perfect, would ensure the student remembers this topic forever?** Invest most design effort there.
4. **What can be simplified or shortened to make room for those 3 segments?** Every segment has a cost — shorter is better if the key 3 segments are richer.

---

## 3. Content Generation Input Format

Every content generation call receives the following inputs. Understanding the full input enables the LLM to produce focused, non-overlapping content that stays within its topic boundary.

### Input Payload

```json
{
  "grade": 8,
  "subject": "Physical Science",
  "board": "SCERT_AP",
  "medium": "ENGLISH",
  "chapter_number": 2,
  "chapter_title": "Motion",
  "current_topic_title": "Speed",
  "chapter_topics": [
    { "number": 1, "title": "Rest and Motion" },
    { "number": 2, "title": "Types of Motion" },
    { "number": 3, "title": "Speed" },
    { "number": 4, "title": "Velocity" },
    { "number": 5, "title": "Acceleration" },
    { "number": 6, "title": "Equations of Motion" }
  ],
  "pdf_text": "...(full chapter PDF text, all topics)...",
  "pdf_resources": [
    {
      "url": "https://youtu.be/abc123",
      "context": "shown on page 18, near the Speed and Distance section"
    },
    {
      "url": "https://youtu.be/def456",
      "context": "referenced on page 24, Acceleration examples"
    }
  ]
}
```

---

### Rule 1: Topic Isolation

**The PDF contains the full chapter — but the content being generated is ONLY for `current_topic_title`.**

The `chapter_topics` list defines the conceptual boundary of each topic. Content from adjacent topics (even if they appear nearby in the PDF) must NOT bleed into any segment being generated now.

**Isolation protocol:**
1. Scan `chapter_topics` — locate `current_topic_title` in the list
2. Identify which paragraphs and sections of `pdf_text` cover the current topic (by heading, keyword density, and position between topics)
3. Generate all 12 segments using content from those sections only
4. If the PDF introduces a concept from the NEXT topic in the same paragraph, stop at the conceptual boundary — do not teach that concept here
5. `did_you_know` and `free_style` may lightly reference an adjacent topic only to create contrast ("Unlike speed, velocity also tells you direction — but that's the next topic") — never to teach it

**Bad isolation** (Speed topic, leaks Velocity):
> "Speed tells us how fast something moves. Velocity adds direction to this — if the auto-rickshaw is going 40 km/h north, that is velocity."

**Good isolation** (Speed topic only):
> "Speed tells us how fast something moves — the total distance covered in one unit of time. An auto-rickshaw going 40 km/h covers 40 kilometres every hour, whichever road it takes."

**The test**: Read back the generated `concept_explanation`. Could a student who hasn't yet studied the adjacent topics still understand everything in it? If no, trim to the boundary.

---

### Rule 2: PDF Resource Extraction

**If `pdf_resources` is non-empty, assign each link to the most relevant topic in the chapter.**

For the current generation run, include links that belong to `current_topic_title` in the `youtube_query` segment. Links that belong to other topics in the chapter should be excluded — they will be picked up when those topics are generated.

**Assignment logic:**
1. Check the `context` field — the page/section where the link appeared in the PDF
2. Match the context to the closest topic in `chapter_topics` by position and keyword
3. If the context matches `current_topic_title` → **include** in this `youtube_query`
4. If the context matches a different topic → **exclude** (leave for that topic's run)
5. If context is ambiguous (e.g., "Chapter introduction") → include in the **first topic only**

**Example** (current topic: Speed):
- Resource 1 context: "page 18, Speed and Distance section" → **Include** in Speed's `youtube_query`
- Resource 2 context: "page 24, Acceleration examples" → **Exclude** — belongs to Acceleration's run

**URL type handling:**
- YouTube video URL (`youtu.be/`, `youtube.com/watch`) → use as direct link; use video context to fill `title`, `channel`, `duration_estimate`
- YouTube search URL → use as-is for `search_url`
- NCERT/SCERT official site link → include with `channel: "NCERT Official"` or `"SCERT AP"`
- Generic educational web link → include only if clearly relevant and not a paywall

---

## 4. The Unified Story Rule

**The most important rule in this document: all 12 segments for a topic tell ONE story.**

Before generating, internalise: *What is the single insight this topic is trying to give the student?* Every segment is a different lens on that same insight — not 12 independent outputs.

```
concept_summary    → The headline (one sentence)
concept_explanation → The narrative (full story)
key_terms          → The vocabulary (tools to tell the story)
did_you_know       → The hook (why this story matters)
svg_diagram        → The visual (the story drawn in black and white)
css_diagram        → The visual (the story drawn in colour)
interaction        → The experience (the student lives the story)
problems           → The proof (the student proves they understood the story)
prerequisites      → The foundation (what must be true before the story makes sense)
audio_text         → The spoken word (the story read aloud)
youtube_query      → The reference (where to see the story in the real world)
free_style         → The designer's lens (the story's most memorable visual)
```

If any segment contradicts, ignores, or diverges from the central story — regenerate it.

---

## 5. AP/TS Contextual Grounding

Every example, number, place, crop, name, and reference in every segment must come from the student's world. A student in AP/Telangana should never feel like they are reading content made for someone else.

### Subject Context Reference

**Mathematics**
| Use | Examples |
|-----|---------|
| Money | Rupee amounts at local kirana shops, auto-rickshaw fares (Hyderabad: ₹30 minimum), paddy prices (₹2,183/quintal MSP 2024) |
| Distances | Hyderabad → Vijayawada: 275 km, Vijayawada → Guntur: 65 km, Guntur → Nellore: 165 km |
| Area / Volume | House plot sizes (200 sq yards is common in AP towns), tank capacity (village tank), classroom floor |
| Agriculture | Paddy yield (4–5 tonnes/acre in Krishna district), cotton acreage (Guntur), mango orchards |
| Sports | Cricket: run rate calculations, bowling economy, IPL score targets |
| Interest / Finance | Post office savings rates (7.5%), Kisan Vikas Patra, chit fund weekly contributions |

**Physical Science**
| Use | Examples |
|-----|---------|
| Forces | Bullock cart pulling, auto-rickshaw braking, farmers lifting water pots (Gangamma gudi steps) |
| Electricity | Home voltage (230V AC), power cuts in AP towns, Srisailam dam (770 MW capacity) |
| Heat | Summer temperatures in Hyderabad (45°C), Rayalaseema heat, cooking on firewood stove |
| Waves / Sound | Nadaswaram at Tirupati, folk drumming, distance to lightning (count seconds × 340 m) |
| Optics | Mirrors in temples (Padmavathi), spectacles worn by elders in village, camera obscura |

**Biological Science**
| Use | Examples |
|-----|---------|
| Plants | Paddy, cotton, tamarind (Chintapandu), neem (Vepa), mango (Mamidi), banana (Arati) |
| Animals | Water buffalo (Murrah breed, AP's most common cattle), peacock (state bird), cobra (Naga panchami), kingfisher |
| Human body | Use Telugu organ names alongside scientific: హృదయం (heart), కాలేయం (liver), ఊపిరితిత్తులు (lungs) |
| Ecosystems | Godavari delta mangroves, Nallamala forest (tigers), Kolleru lake (pelicans), Krishna river |
| Food | Rice (staple in AP/TS), pesarattu, gongura, coconut oil — use for nutrition/digestion examples |

**Social Studies**
| Use | Examples |
|-----|---------|
| Rivers | Godavari (longest in AP/TS), Krishna (major dam), Tungabhadra (Hampi), Penna (Nellore) |
| Cities | Use tier-2 cities realistically — not just Hyderabad: Vijayawada, Nellore, Kurnool, Tirupati, Vizag |
| History | Kakatiyas (Warangal Fort), Satavahanas (Amaravati stupa), Nizam rule, 1953 AP state formation |
| Agriculture | AP ranks 1st in rice production; Guntur: world's largest chilli market |
| Economy | IT sector (HITEC City), Visakhapatnam port, auto manufacturing (Kia in Anantapur) |

**Telugu Language**
| Use | Examples |
|-----|---------|
| Classical literature | Nannaya (ఆది కవి), Tikkana, Erranna (the trio who translated Maha Bharatam) |
| Modern literature | Gurajada Apparao (Kanyasulkam), Viswanatha Satyanarayana (Ramayana Kalpavriksham) |
| Proverbs | "నీళ్ళు లేని చెరువు ఏమి?" (A tank without water — what is it?) for empty concepts |
| Oral tradition | Burrakatha, Harikatha, Oggu Katha — use for rhythm/pattern examples |

---

## 6. Telugu Generation Rules

These rules are non-negotiable for `medium = TELUGU`. A single violation (Roman letter, transliteration, wrong term) fails the segment.

1. **Full Telugu Unicode script only** — no Roman/ASCII transliteration. "Quadratic equation" → "వర్గ సమీకరణం". Never "Varga Sameekaranam".
2. **Textbook vocabulary first** — if the uploaded SCERT PDF contains a Telugu term, use that exact term. Do not substitute synonyms.
3. **No code-switching** — do not write "quadratic equation (వర్గ సమీకరణం)". Use only the Telugu form with enough context for the student to understand without the English crutch.
4. **Mathematical operators by band:**
   - Foundation/Elementary: Spell out — "కూడిక" (addition), "తీసివేత" (subtraction), "గుణకారం" (multiplication)
   - Middle/Secondary: Use standard symbols (+, −, ×, ÷) — students know them
5. **SOV sentence structure** — Telugu is Subject-Object-Verb. "The ball falls down" → "బంతి క్రిందకు పడుతుంది" (ball / downward / falls). Honour this; do not translate English syntax word-for-word.
6. **Formal register** — use classroom Telugu (formal but warm), not colloquial street speech or overly bureaucratic government-document style.
7. **Equations and formulas** — write variable names in English letters (x, y, F, V) as they appear in textbooks; all surrounding explanation in Telugu.
8. **Audio text for Telugu** — include phonetic guidance for unfamiliar scientific terms: "ప్రకాశ సంశ్లేషణ (pra-kaasha samshleshana)" — helps TTS and oral reading.

---

## 7. Segment-by-Segment Generation Briefs

### 7.1 concept_summary

**What it is:** The mental hook. One sentence. Before the student reads anything else, this sentence should make them think "oh, I already know something about this."

**Quality standard:**
- Must contain one concrete referent from the student's world OR one surprising fact
- Must be understandable without reading the explanation first
- Must not be a textbook definition copy-pasted

**Grade-tier variants:**

| Tier | Tone | Example (Quadratic Equations) |
|---|---|---|
| Primary (1–5) | Wonder/story | "When you throw a ball and catch it, it draws a beautiful curved path in the sky!" |
| Middle (6–8) | Curiosity | "The same curve a cricket ball draws through the air is described by a quadratic equation." |
| Secondary (9–10) | Hook | "Every time a cricket ball follows its arc through the air, it traces the curve of a quadratic equation." |

**Bad example** (any tier):
> "A quadratic equation is a second-degree polynomial equation with one variable."

**Generation prompt fragment:**
```
concept_summary: One sentence (max 20 words). Start with a concrete object or
phenomenon from AP/Telangana student life. The student must feel "I already know
something about this" before reading the explanation. No formal definitions.
Match tone to grade tier: Primary = wonder/story, Middle = curiosity, Secondary = hook.
```

---

### 7.2 concept_explanation

**What it is:** The full narrative. Length and structure vary by grade tier.

**Grade-tier word counts and structure:**

| Tier | Words | Structure |
|---|---|---|
| Primary (1–5) | Max 100 words | Story → What we noticed → What we call it → "Try it yourself!" |
| Middle (6–8) | 200–350 words | Hook → Intuition → Formal definition → Simple example → Diagram reference |
| Secondary (9–10) | 300–500 words | Hook → Intuition → Formal definition → Worked example (AP/TS context) → Diagram reference → Exam connection |

**Secondary structure (the default):**
```
1. Hook (1 paragraph)      — relatable AP/TS scenario
2. Intuition (1–2 para)    — physical/visual intuition BEFORE any formula
3. Formal definition       — using exact SCERT vocabulary, bold on first use
4. Worked example          — with local AP/TS numbers/context
5. Visual connection       — "The diagram below shows..."
6. Exam connection         — "In SCERT exams, this appears as..."
```

**Quality standard:**
- Formal definition always comes after intuition — never first (all tiers)
- Every bold term must appear in the key_terms segment
- The worked example must use AP/TS context (local numbers, names, places)
- "The diagram below shows" must match what the SVG/CSS diagram actually shows
- Primary tier: zero formal definitions; story-driven; ends with an invitation to try something

**Generation prompt fragment:**
```
concept_explanation: Adjust length and structure to grade tier.
Primary: max 100 words, story form, invitation to observe/try, zero formal definitions.
Middle: 200–350 words, intuition-first, introduce formal term after analogy.
Secondary: 300–500 words — Hook → Intuition → Formal definition → AP/TS worked example
→ Diagram reference → Exam connection.
ALL tiers: formal definition AFTER intuition, not before.
```

---

### 7.3 key_terms

**What it is:** The vocabulary card. Built sequentially — each term may reference earlier terms.

**Grade-tier term counts:**

| Tier | Term count | Format |
|---|---|---|
| Primary (1–5) | Max 3 | Picture word + one plain sentence + familiar example |
| Middle (6–8) | 4–7 | Term + plain definition + AP/TS example |
| Secondary (9–10) | 6–10 | Term + Telugu term + one-sentence definition + AP/TS example |

**Quality standard:**
- Definition: one sentence in plain language a student of that grade can understand immediately
- Example: concrete, from AP/TS context
- Terms must appear in concept_explanation (no surprise terms)
- For Telugu medium: include both Telugu term and English term

**Generation prompt fragment:**
```
key_terms: Count by tier (Primary: ≤3, Middle: 4–7, Secondary: 6–10).
Each: one-sentence plain-language definition, one concrete AP/Telangana example.
Terms build on each other — simpler first. All terms must have appeared in concept_explanation.
```

---

### 7.4 did_you_know

**What it is:** The curiosity spike. Two sentences maximum.

**Grade-tier tone:**

| Tier | Format | Example |
|---|---|---|
| Primary (1–5) | A wonder story or observation invitation | "Did you know that a butterfly near Vijayawada can feel vibrations through its feet? The same way, plants can feel when insects walk on them!" |
| Middle (6–8) | Surprising fact with local connection | "The paddy fields of the Krishna delta fix more carbon than all the vehicles in Vijayawada combined — the same reaction you just studied." |
| Secondary (9–10) | Verifiable, surprising, AP/TS linked | "The paddy fields of the Krishna-Godavari delta absorb an estimated 2.3 million tonnes of CO₂ every year — more than all the cars in Hyderabad emit." |

**Quality standard:**
- Must be directly about THIS specific topic — not just the subject
- Prefer AP/TS connection (local scientist, local application, local statistic)
- Must be surprising — something not in the textbook
- Must be factually verifiable
- Primary: the "fact" can be an observation challenge or a local story — curiosity over precision

**Generation prompt fragment:**
```
did_you_know: Exactly 2 sentences. Must be:
(a) directly about this specific topic (not just the subject)
(b) surprising — something not in the textbook
(c) connected to AP/Telangana or India when possible
(d) 100% factually accurate
Primary tier: frame as a wonder/observation challenge. Secondary: verifiable statistic or discovery.
No generic statements about importance.
```

---

### 7.5 interaction

**What it is:** The experience layer. The student does something — they don't just read.

**Interaction type selection rules:**

| Concept type | Best interaction | Why |
|---|---|---|
| Process / sequence (digestion, water cycle, algorithm steps) | Tap-to-Sequence | Student must reconstruct the order |
| Anatomy / apparatus / spatial diagram | Label-the-Diagram | Student must identify parts |
| Mathematical relationship (direct/inverse) | Slider-Parameter | Student feels the relationship change |
| Equation solving / formula completion | Stylus-Fill-Equation | Student writes the working, GAP-1 watches |

**Grade-tier constraints:**

| Tier | Suitable types | Avoid |
|---|---|---|
| Primary (1–5) | Tap-to-Sequence, Label-the-Diagram | Slider-Parameter (abstract), Stylus-Fill-Equation (requires formal writing) |
| Middle (6–8) | All 4 types, but prefer Tap-to-Sequence and Label-the-Diagram | Stylus-Fill-Equation for Grade 6 only if algebra introduced |
| Secondary (9–10) | All 4 types freely | N/A |

**Steps quality rules:**
- 4–6 steps for Tap-to-Sequence (more is frustrating)
- Each step = one atomic action (not "first do A, then do B")
- Steps must directly reinforce the concept_explanation — use the same examples
- Wrong answer feedback: explain WHY it's wrong + give one hint toward the correct answer
- Success feedback: connect to real-world application ("You just sequenced what every drop of water does in the Godavari river basin")
- Primary: success message must feel celebratory ("Amazing! You got it! 🌟")

**Generation prompt fragment:**
```
interaction: Choose the SINGLE BEST type from:
[Tap-to-Sequence | Label-the-Diagram | Slider-Parameter | Stylus-Fill-Equation]
Grade constraint: Primary uses only Tap-to-Sequence or Label-the-Diagram.
Selection must be justified by the concept's nature — not arbitrary.
Steps must use the same examples from concept_explanation.
Include wrong-answer feedback that explains WHY, not just "incorrect".
Include success feedback that connects to a real-world application in AP/TS.
```

---

### 7.6 problems

**What it is:** The proof of understanding. Problems across difficulty tiers.

**How problems are displayed in the E-Library:**
- All problems shown at once in a scrollable list (grouped by tier)
- Each problem has a "Solve" button opening a dedicated full-screen solving page
- Score counter updates in real time
- The **topic quiz** (for NeuraCoins) is drawn from Standard tier

**Grade-tier problem counts:**

| Tier | Foundation | Standard | Advanced | Total | Notes |
|---|---|---|---|---|---|
| Primary (1–5) | 3 | 0 | 0 | 3 | Activity-style only, no quiz gate |
| Middle (6–8) | 2 | 3 | 1 | 6 | Standard = quiz gate (3 questions, 70% pass) |
| Secondary (9–10) | 3 | 5 | 2 | 10 | Standard = quiz gate (5 questions, 70% pass) |

**Primary tier problem style:**
- No exam format — activity style: "Draw 5 leaves and count them", "Fill the missing number: 3 + __ = 7"
- No hints structure — just the question and a simple answer
- Use relatable objects: chapatis, stars, birds, stones

**Tier rules (Middle and Secondary):**

| Tier | Purpose | Format |
|---|---|---|
| Foundation | Build confidence. Single-step. Direct application. | All AP/TS context. Student must feel "I can do this." |
| Standard | SCERT exam pattern. Multi-step. Exam-realistic. | Match exact format, vocabulary, and structure of SCERT past papers. These are also the quiz gate questions. |
| Advanced | Synthesis. Application in new context. | Requires combining multiple concepts. A student who mastered Standard may still find this hard. |

**Problem statement rules:**
- Every number must feel real: rupees not dollars, kilometres not miles, AP/TS crops/places
- Each problem tests ONE primary skill or exposes ONE error pattern
- 3-level hint chain (Middle and Secondary):
  - Hint 1: Conceptual nudge ("What do you know about the relationship between voltage and current?")
  - Hint 2: Method pointer ("Try applying Ohm's Law here — V = IR")
  - Hint 3: Near-solution ("You have V = 12V, R = 4Ω — what does IR give you?")
- Solution steps: show the method, not just the final answer. Each step is one operation.

**GAP-1 error pattern tagging (Middle and Secondary):**
Every problem must list which error patterns it is designed to expose:
- `SIGN_ERROR` — mishandling negatives
- `UNIT_CONVERSION_ERROR` — wrong unit, missing unit
- `FORMULA_RECALL_ERROR` — wrong formula chosen
- `INCOMPLETE_SOLUTION` — stops before reaching final answer
- `CALCULATION_ERROR` — arithmetic mistake (not conceptual)
- `DIRECTION_ERROR` — gets direction/inequality wrong
- `PREREQUISITE_GAP` — missing concept from earlier class

**Generation prompt fragment:**
```
problems: Count by tier (Primary: 3 Foundation only; Middle: 2+3+1; Secondary: 3+5+2).
ALL problem statements must use AP/Telangana context — rupee amounts, local distances, local crops.
Primary: activity-style, no hints structure needed.
Middle/Secondary: each problem has 3-level hint chain (nudge → method → near-answer),
full solution steps, GAP-1 error pattern tags.
Foundation: single-step, builds confidence.
Standard: exact SCERT exam format and vocabulary. These are the quiz gate questions.
Advanced: requires synthesis of multiple concepts from this topic.
```

---

### 7.7 audio_text

**What it is:** A TTS-ready plain-text rendering of the concept explanation. Read aloud on the SmartPad.

**Quality standard:**
- Zero markdown: no asterisks, no headers, no bullet points
- Zero symbols: equations spelled out — "x squared minus 5x plus 6 equals zero"
- Diagrams described verbally: "Imagine a U-shaped curve opening upward, with its lowest point at the bottom..."
- Natural rhythm: commas where a speaker would pause; sentences ending where thought completes
- Duration: 45–60 seconds for Primary (~100 words), 60–90 seconds for Middle/Secondary (~150–200 words)
- Telugu TTS: include pronunciation guides for unfamiliar scientific terms inline
- Primary: rhythmic, almost song-like; short sentences; repeat key words twice

**Generation prompt fragment:**
```
audio_text: Plain text ONLY. No markdown, no symbols, no special characters.
All equations spelled out in words. All diagrams described visually in words.
Written for a teacher's voice speaking to a class — natural pauses via commas
and periods.
Primary: ~100 words, rhythmic short sentences, key word repetition.
Secondary: ~150–200 words, 60–90 seconds speaking time.
Telugu: include pronunciation in brackets after first use of scientific terms.
```

---

### 7.8 svg_diagram

**What it is:** The E-Ink diagram. The SVG is the **primary visual representation of this topic on the SmartPad** — it replaces the printed textbook diagram entirely. It must carry the same informational weight as the textbook figure, while being interactive and E-Ink optimised.

**Quality standard:**
- ViewBox: exactly `0 0 800 500`
- Stroke width: minimum 2px (thinner is invisible on E-Ink)
- Font size: minimum 14px for labels (smaller is illegible on E-Ink)
- Colors: black (`#000000`) and white (`#ffffff`) only — no grays, no fills except pure white
- Maximum tap targets: 8 per diagram (cognitive load rule), max 3 for Primary
- Each tap reveals ONE label or explanation — not a paragraph
- **For Telugu medium: ALL SVG text in Telugu script** — non-negotiable
- Caption: always include as `<text>` element at bottom-center of the diagram
- Must show the same core structures as the textbook figure — not a simplified illustration

**Diagram complexity by tier:**

| Tier | Max elements | Max tap targets | Label size |
|---|---|---|---|
| Primary (1–5) | 3 clear elements | 3 | 18px minimum — big enough for small fingers |
| Middle (6–8) | 5–8 elements | 6 | 14px minimum |
| Secondary (9–10) | 8–12 elements | 8 | 14px minimum |

**Textbook replacement rule:** If the SCERT textbook has a specific diagram for this topic, the SVG must represent the same information. The student should be able to use it instead of the printed figure — not alongside it.

**Generation prompt fragment:**
```
svg_diagram: Valid SVG, viewBox="0 0 800 500".
E-Ink rules: black/white ONLY, stroke-width minimum 2px, font-size minimum 14px.
Primary: max 3 elements, font-size 18px minimum, 3 tap targets max.
Secondary: max 8 tap targets (<g id="tap_N"> elements) — each reveals ONE label.
Include a <text> caption at the bottom.
For Telugu medium: ALL text elements in Telugu script.
Prefer fewer, larger, clearer elements over complex multi-element diagrams.
No gradients, no fills (except white), no shadows, no effects.
```

---

### 7.9 css_diagram

**What it is:** The colour diagram for LCD screens (Mobile, Tablet, Web). Complements the SVG — different angle or adds colour information. Self-contained HTML with inline CSS.

**Quality standard:**
- Self-contained: all CSS in a `<style>` tag — no external libraries, no CDN
- NeuraLife brand colours: `#1e40af` (primary blue), `#0d9488` (teal), `#f59e0b` (amber), `#10b981` (green), `#ef4444` (red)
- Responsive: works at scale 0.38× (SmartPad), 0.65× (tablet), 1× (desktop)
- Animation: maximum one animation per diagram; must be educational (shows a process), not decorative; auto-plays once, pauses at final state
- Must complement SVG — different angle, additional colour information, or animated state
- For Telugu medium: all labels in Telugu script
- Primary: bright, large, child-friendly; animation should be obvious and satisfying

**Responsive approach:**
```css
/* Use percentage widths and em units — never px for layout */
.diagram-container { width: 100%; max-width: 600px; padding: 1em; }
.label { font-size: clamp(10px, 2vw, 14px); }
```

**Generation prompt fragment:**
```
css_diagram: Self-contained HTML (<style> tag + HTML only, no external dependencies).
Must COMPLEMENT the SVG diagram — show different angle or add colour information.
Brand colours: primary #1e40af, teal #0d9488, amber #f59e0b.
Responsive: use percentage widths and em/rem units — no fixed px widths.
Maximum ONE animation — it must show a process, not just decorate.
Auto-plays once, pauses at final state (not looping).
For Telugu medium: all text labels in Telugu script.
Primary: bright and large; animation must be visually obvious.
```

---

### 7.10 youtube_query

**What it is:** 3–4 curated video recommendations for human auditors to evaluate and approve.

**Note:** If the source PDF contained resource links relevant to this topic (see Section 3, Rule 2), include them here first, then supplement with LLM-recommended searches to reach 3–4 total.

**Structure per video:**
```json
{
  "title": "Quadratic Equations — Introduction (Telugu)",
  "channel": "Telugu Physics",
  "search_url": "https://www.youtube.com/results?search_query=quadratic+equations+class+10+telugu",
  "duration_estimate": "8–12 minutes",
  "language": "TELUGU",
  "why": "Explains graphical method with worked examples matching SCERT format"
}
```

**Channel reference by subject:**

| Subject | Telugu | English |
|---------|--------|---------|
| Mathematics | Maths Telugu, Chandu Maths Telugu | Khan Academy, PatrickJMT |
| Physical Science | Telugu Physics, Namasthe Telangana Science | Physics Wallah |
| Biology | Telugu Biology, Bio Guru Telugu | Amoeba Sisters, Ninja Nerd |
| Social Studies | Telugu Social, AP History Telugu | BYJU'S Social |
| Chemistry | Chemistry Telugu | Vedantu Chemistry |

**Grade-tier video count and duration:**

| Tier | Count | Max duration | Language mix |
|---|---|---|---|
| Primary (1–5) | 2 | 5 minutes | Telugu preferred, visual/animated |
| Middle (6–8) | 3 | 8 minutes | 1–2 Telugu + 1 English |
| Secondary (9–10) | 3–4 | 10 minutes | Mixed, SCERT-aligned |

---

### 7.11 prerequisites

**What it is:** Topics from earlier classes that students must understand before this topic makes sense. Sourced from the database (previous grade content) and filtered for relevance.

**Rules:**
- Only list prerequisites that are genuinely required — not every loosely related topic
- Empty array `[]` is correct when there are no hard prerequisites
- Use the grade and subject from the database query result — no invented values
- Maximum limits by tier: Primary = 1, Middle = 2–3, Secondary = 3–5

---

### 7.12 free_style

**What it is:** The designer's segment. The most memorable, visually distinct piece of the topic. Responsive HTML. Displayed at full width in the audit tool.

**Placement:** Segment 10 in the E-Library — the visual summary / memory anchor before the quiz gate.

**Choose the format based on concept type AND grade tier:**

| Concept type | Primary (1–5) | Middle/Secondary |
|---|---|---|
| Process / sequence | **Illustrated step cards** — large images, minimal text, numbered | **Flowchart** or **timeline** |
| Two things compared | **Matching game** — drag or tap to match | **Side-by-side comparison card** |
| Formula-heavy | N/A (no formulas at Primary) | **Formula card** — formula highlighted, worked mini-example, common mistakes |
| Memory-heavy (elements, bones, amendments) | **Colouring / labelling activity** | **Visual mnemonic card** — acronym, story, or image-association |
| Geography / spatial | **Illustrated map with stickers** | **Map-based infographic** |
| Real-world applications | **"Look for this in your home!" card** | **"You See This In..." card** — 4 real-world examples with icons |

**Quality standard:**
- Self-contained HTML with inline CSS — no external dependencies
- NeuraLife brand colours and font stack (Inter, Noto Sans Telugu)
- Mobile-first responsive layout
- Print-friendly (auditors sometimes print for review)
- Must be the MOST MEMORABLE piece of the 12 segments — auditors should want to pin it
- Primary: interactive or activity-based where possible (tap, match, colour)

**Generation prompt fragment:**
```
free_style: {title, html}. Choose the format that best serves THIS specific concept
AND this grade tier.
Primary: interactive/activity HTML (matching, colouring, counting) — fun over formal.
Secondary: choose the visual format that best serves this exact topic
(timeline / comparison card / formula card / flowchart / mnemonic / applications card).
Self-contained HTML with inline <style>. NeuraLife colours (#1e40af, #0d9488, #f59e0b).
Responsive. Print-friendly. This must be the most visually memorable segment.
Do NOT use a generic template — design specifically for this concept and grade.
```

---

## 8. Inter-Segment Coherence Checklist

Before marking a topic complete, verify these cross-segment links:

| Check | What to verify |
|---|---|
| explanation → diagram | "The diagram below shows..." in explanation matches what SVG/CSS diagram actually shows |
| explanation → key_terms | Every bolded term in concept_explanation appears in key_terms |
| explanation → audio_text | Audio text covers the same content; diagrams are verbally described |
| explanation → problems | Problems use the same examples/contexts introduced in explanation |
| explanation → interaction | Interaction steps reinforce the same process described in explanation |
| did_you_know ≠ explanation | The fun fact is NOT something already covered in the explanation |
| key_terms → problems | Problem statements don't use terms that aren't in key_terms (vocabulary shock) |
| svg_diagram ↔ css_diagram | They show different angles or complementary information — not the same diagram twice |
| free_style ≠ explanation | Free_style adds a NEW angle — it does not repeat the explanation in visual form |
| topic isolation | No segment contains content that belongs to an adjacent topic in the chapter |
| pdf_resources | If PDF had links, relevant ones are in youtube_query; non-relevant ones are excluded |

---

## 9. Common Failure Modes and Fixes

| Failure mode | What the LLM tends to do | Prompt fix |
|---|---|---|
| Abstract concept_summary | "A quadratic equation is a polynomial of degree 2" | "Start with a concrete object or place the student can see or touch in AP/Telangana" |
| Formula-first explanation | Introduces the formula in paragraph 1 | "You MUST give an analogy or physical intuition BEFORE any formula or formal definition" |
| Foreign context in problems | "A car in New York travels 60 mph..." | "ALL examples must use AP/Telangana context — rupees, local distances, local crops" |
| Telugu transliteration | "Varga sameekaranam" instead of "వర్గ సమీకరణం" | "CRITICAL: Write exclusively in Telugu Unicode script. Any Latin letter for a Telugu word is wrong." |
| Overly complex SVG | 15+ elements, small text, thin strokes | "Maximum 8 elements, stroke ≥2px, font ≥14px, no grays" |
| Primary content sounds Secondary | "Photosynthesis is the process by which plants convert light energy..." at Grade 2 | "Primary tier: max 100 words, story form, zero formal definitions, end with an observation challenge" |
| Topic bleeding | Speed topic explains velocity in detail | "chapter_topics defines your boundary. Stop at the edge of this topic. Do not teach what comes next." |
| Ignoring PDF resources | PDF has a YouTube link; youtube_query has only LLM-invented searches | "Check pdf_resources first. Include relevant links. Supplement to reach 3–4 total." |
| Textbook copy-paste in key_terms | Definition word-for-word from NCERT | "Definition must be one original sentence in plain language a student of this grade understands immediately" |
| Interaction mismatched to concept | Using Tap-to-Sequence for a formula | "Choose type based on concept nature: process→Tap-to-Sequence, anatomy→Label, relationship→Slider, equation→Stylus" |
| Generic did_you_know | "Photosynthesis is important for all life on Earth" | "This must be a fact the student will repeat at dinner. AP/TS connection preferred. Not in the textbook." |
| Generic free_style | Standard layout regardless of topic or grade | "Design specifically for this concept AND this grade tier. What format best serves a Grade 4 student vs a Grade 10 student?" |
| audio_text with markdown | "**Quadratic** equation is..." | "Zero markdown. No asterisks, headers, bullets. Equations spelled out in words." |
| Hints that give the answer | Hint 3 = full solution | "Hint 3 must give the METHOD without the final number. Student must still calculate." |

---

## 10. Generation Quality Gate

Before any topic is submitted for human audit, the automated QA system checks:

| Check | Primary (1–5) | Middle (6–8) | Secondary (9–10) |
|---|---|---|---|
| concept_summary word count | ≤ 15 words | ≤ 20 words | ≤ 20 words |
| concept_explanation word count | ≤ 100 words | 200–350 words | 300–500 words |
| key_terms count | 1–3 | 4–7 | 6–10 |
| problems count | Exactly 3 | Exactly 6 (2+3+1) | Exactly 10 (3+5+2) |
| problems hint depth | N/A | All Standard + Advanced problems have 3 hints | All problems have 3 hints |
| svg_diagram viewBox | Must be `0 0 800 500` | Must be `0 0 800 500` | Must be `0 0 800 500` |
| svg_diagram colors | No non-black/non-white fill | No non-black/non-white fill | No non-black/non-white fill |
| css_diagram dependencies | No external URLs | No external URLs | No external URLs |
| free_style dependencies | No external URLs | No external URLs | No external URLs |
| audio_text markdown | Zero `*`, `#`, `-` formatting chars | Same | Same |
| youtube_query count | 2 items | 3 items | 3–4 items |
| Telugu segments | Zero ASCII transliteration | Same | Same |
| topic isolation | No adjacent topic content found by keyword scan | Same | Same |

Segments failing any check are flagged for regeneration before going to human audit.

---

## 11. SmartPad Rendering Constraints

Content must render correctly on these surfaces. Design for the most constrained first.

| Surface | Resolution | Scale | Key constraint |
|---|---|---|---|
| SmartPad E-Ink (v1, LCD) | 1404 × 1872 px | 0.38× | Text minimum 13px at scale, no subtle colours |
| SmartPad E-Ink (v2, native) | 1404 × 1872 px | 0.38× | No animations, no colour, partial refresh |
| Mobile (Teacher/Parent app) | 390 × 844 px | 0.85× | Touch targets minimum 44×44px |
| Tablet | 810 × 1080 px | 0.65× | Wider layout available |
| Web audit (Content Studio) | 1440+ px | 1× | Full detail, all animations |

**Rule:** Design at 1× for the web audit view, but test at 0.38× scale before approving. If an SVG label is illegible at 0.38×, the diagram fails.

---

## 12. Telugu SVG Font Handling

Telugu script in SVG requires the Noto Sans Telugu font. The `.nlc` bundle includes the font file. Every SVG with Telugu text must include:

```svg
<defs>
  <style>
    @font-face {
      font-family: 'NotoTelugu';
      src: url('../assets/fonts/NotoSansTelugu-Regular.ttf');
    }
    text { font-family: 'NotoTelugu', 'Noto Sans Telugu', sans-serif; }
  </style>
</defs>
```

Without this, Telugu characters render as boxes on the SmartPad.

---

*This document is the content generation quality standard. Update it when new segment types are added, when new AP/TS context tables are needed, or when recurring failure modes are identified.*

*Linked specs: **Content Layer** (architecture), **Content Studio** (audit tool), **E-Library** (student-facing rendering), **Edge AI Engine** (GAP-1 error taxonomy)*
