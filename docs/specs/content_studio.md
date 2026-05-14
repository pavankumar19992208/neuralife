# NeuraLife — Content Studio

*The internal authoring tool for NeuraLife's content management team to generate, review, and publish structured educational content powered by Claude via AWS Bedrock.*

---

## 1. Purpose

Content Studio is the **human-in-the-loop interface** for Stage 2 + Stage 3 of the Content Agent Pipeline (defined in Content Layer spec, Section 8). It allows the NeuraLife content team to:

1. Upload a chapter PDF (SCERT/NCERT/CBSE)
2. Upload an index PDF to auto-detect chapter and topic structure
3. Select a topic and trigger AI-powered content generation
4. Review all 11 generated segments live in a device frame (SmartPad / Mobile / Tablet)
5. Toggle between Color and E-Ink rendering modes
6. Chat with Claude to refine any segment
7. Approve the final content and publish it to the content library

---

## 2. Access

| Who | Access |
|-----|--------|
| NeuraLife Content Team | Full access (SUPER_ADMIN role) |
| Subject Auditors | Read + edit (future: CONTENT_AUDITOR role) |
| School Staff | No access — this is an internal tool |

Route: `/content-studio`  
Not inside the school admin AppShell — standalone layout.

---

## 3. Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ ▣ Content Studio                              [← Dashboard]       │
├─────────────────────┬────────────────────────────────────────────┤
│  UPLOAD PANEL       │  DEVICE VIEWER                             │
│  (320px fixed)      │  (flex-1)                                  │
│                     │                                            │
│  Syllabus:          │  ┌─ Controls ─────────────────────────┐   │
│  [SCERT AP ▼]       │  │ [SmartPad][Mobile][Tablet]  [🎨][📄]│   │
│                     │  └────────────────────────────────────┘   │
│  Grade: [10 ▼]      │                                            │
│  Subject: [Math ▼]  │  ┌─ Device Frame ─────────────────────┐   │
│  Chapter: [3 ▼]     │  │  ┌─────────────────────────────┐  │   │
│                     │  │  │                             │  │   │
│  Medium: [English▼] │  │  │   Content segments render   │  │   │
│                     │  │  │   here — 11 segments with   │  │   │
│  ──────────────     │  │  │   skeleton → reveal anim    │  │   │
│                     │  │  │                             │  │   │
│  📄 Index PDF       │  │  │              [💬 Chat]      │  │   │
│  [Upload or drop]   │  │  └─────────────────────────────┘  │   │
│                     │  └────────────────────────────────────┘   │
│  Topics: (auto)     │                                            │
│  ○ 3.1 Intro        │                                            │
│  ● 3.2 Standard Form│                                            │
│  ○ 3.3 Factoring    │                                            │
│                     │                                            │
│  ──────────────     │                                            │
│                     │                                            │
│  📄 Chapter PDF     │                                            │
│  [Upload or drop]   │                                            │
│                     │                                            │
│  [▶ Generate]       │                                            │
└─────────────────────┴────────────────────────────────────────────┘
```

---

## 4. The 11 Content Segments

Every topic generates exactly 11 segments. They are generated in 4 parallel batches for speed.

| # | Segment ID | Description | Batch |
|---|-----------|-------------|-------|
| 1 | `concept_summary` | Hero one-sentence summary (max 20 words) | 1 (text) |
| 2 | `concept_explanation` | Full markdown explanation, 300–500 words | 1 (text) |
| 3 | `key_terms` | Glossary — term + definition + example | 1 (text) |
| 4 | `did_you_know` | Fun fact or surprising insight | 1 (text) |
| 5 | `interaction` | Recommended play-to-learn interaction type | 1 (text) |
| 6 | `prerequisites` | Prerequisite topics from earlier classes | 1 (text) |
| 7 | `audio_text` | TTS-ready plain text (no markdown) | 1 (text) |
| 8 | `svg_diagram` | E-ink compatible SVG diagram with tap targets | 2 (SVG) |
| 9 | `css_diagram` | Colorful CSS/HTML diagram for screens | 3 (CSS) |
| 10 | `problems` | 10 × 3 difficulty levels (30 total) | 4 (probs) |
| 11 | `youtube_query` | Best search query for a topic video | 1 (text) |

### Generation Batches

```
Batch 1 (text):      segments 1–7 + 11        ~2–3 min  →  emits 8 segment_complete events
Batch 2 (SVG):       segment 8                ~1–2 min  →  emits 1 segment_complete event
Batch 3 (CSS):       segment 9                ~1–2 min  →  emits 1 segment_complete event
Batch 4 (problems):  segment 10 (split ×3)    ~2–4 min  →  emits 1 segment_complete event
```

Batches 2, 3, and 4 run in parallel after Batch 1 completes.

---

## 5. Device Frames

| Frame | Resolution | Scale | Notes |
|-------|-----------|-------|-------|
| SmartPad 10.3" | 1404 × 1872 px | 0.38× | NeuraLife's primary device |
| Mobile | 390 × 844 px | 0.85× | Android phones (parent / teacher app) |
| Tablet | 810 × 1080 px | 0.65× | Generic Android tablet |

### Rendering Modes

| Mode | Appearance | Diagram priority |
|------|-----------|-----------------|
| Color | Standard NeuraLife colors | CSS diagram shown |
| E-Ink | Grayscale, high contrast, white bg | SVG diagram shown |

---

## 6. SSE Streaming Protocol

The generation endpoint uses **Server-Sent Events** (SSE) so the team sees content appearing in real time.

### Request
```
POST /api/v1/content-studio/generate
Content-Type: application/json

{
  "board": "SCERT_AP",
  "grade": 10,
  "subject": "MATHEMATICS",
  "chapterNumber": 3,
  "chapterTitle": "Quadratic Equations",
  "topicTitle": "Introduction to Quadratic Equations",
  "topicContext": "...extracted text from PDF...",
  "medium": "ENGLISH"
}
```

### SSE Event Stream
```
event: start
data: {"totalSegments": 11, "batches": 4}

event: batch_start
data: {"batch": 1, "segmentIds": ["concept_summary", "concept_explanation", ...]}

event: segment_complete
data: {"id": "concept_summary", "content": {"text": "..."}}

event: segment_complete
data: {"id": "concept_explanation", "content": {"text": "..."}}

...

event: batch_start
data: {"batch": 2, "segmentIds": ["svg_diagram"]}

event: segment_complete
data: {"id": "svg_diagram", "content": {"svg_code": "<svg...>", "caption": "..."}}

...

event: done
data: {}
```

### Error Event
```
event: error
data: {"segment": "svg_diagram", "message": "Generation failed", "retryable": true}
```

---

## 7. Chat Protocol

The chat panel allows the team to ask Claude to modify any segment.

### Request
```
POST /api/v1/content-studio/chat
Content-Type: application/json

{
  "message": "The SVG diagram doesn't show the axis labels clearly. Make them larger.",
  "targetSegment": "svg_diagram",
  "currentSegments": { ... },
  "topicContext": { "board": "SCERT_AP", "grade": 10, ... }
}
```

### Response
```json
{
  "data": {
    "reply": "I've updated the SVG diagram with larger axis labels...",
    "updatedSegments": {
      "svg_diagram": { "svg_code": "<svg...>", "caption": "..." }
    }
  }
}
```

---

## 8. PDF Parse Protocol

```
POST /api/v1/content-studio/parse-pdf
Content-Type: multipart/form-data

fields:
  pdf: <binary file>
  parseType: "index" | "chapter"
```

For `index`: returns `{ topics: Array<{ number, title }> }`  
For `chapter`: returns `{ text: string, estimatedTopics: Array<{ title, startPage }> }`

---

## 9. Content Segment Schemas

### Batch 1 JSON Schema (Claude output)

```json
{
  "concept_summary": "string (max 20 words)",
  "concept_explanation": "string (markdown)",
  "key_terms": [{"term": "string", "definition": "string", "example": "string?"}],
  "did_you_know": {"fact": "string", "source": "string?"},
  "interaction": {
    "type": "Tap-to-Sequence | Label-the-Diagram | Slider-Parameter | Stylus-Fill-Equation",
    "description": "string",
    "instructions": "string"
  },
  "prerequisites": [{"title": "string", "class_year": "number", "subject": "string"}],
  "audio_text": "string (plain text, no markdown)",
  "youtube_query": "string"
}
```

### SVG Diagram Schema
```json
{
  "svg_code": "string (valid SVG, viewBox 0 0 800 500, black/white only)",
  "caption": "string",
  "interaction_hints": ["string"]
}
```

### CSS Diagram Schema
```json
{
  "html": "string (self-contained HTML with inline <style>)",
  "caption": "string"
}
```

### Problems Schema (per difficulty level)
```json
[{
  "id": "string",
  "text": "string",
  "hints": ["string", "string", "string"],
  "solution": "string",
  "solution_steps": ["string"],
  "error_patterns": ["string"]
}]
```

---

## 10. Claude Prompt Architecture

All prompts follow this structure:

```
SYSTEM:
You are an expert curriculum content specialist for Indian school education.
You are creating content for NeuraLife — an AI-powered learning platform for 
AP/Telangana schools. Your content must be:
- Age-appropriate for {band} band (Grade {grade}, age {age_range})
- Board-specific: {board} syllabus
- Student-friendly: visual first, intuition before formal language
- Accurate: no factual errors, matches textbook
Output ONLY valid JSON. No preamble. No markdown fences.

USER:
[context from PDF]
[specific segment request]
[JSON output schema]
```

---

## 11. API Routes Summary

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/content-studio/parse-pdf` | Upload PDF, extract structure |
| POST | `/api/v1/content-studio/generate` | SSE stream — generate all 11 segments |
| POST | `/api/v1/content-studio/chat` | Chat to modify segments |
| GET  | `/api/v1/content-studio/health` | Check Bedrock connectivity |

---

## 12. Tech Stack

| Component | Tech |
|-----------|------|
| Frontend | React 18 + Vite + Tailwind (in apps/web) |
| Backend | Fastify 4.x + TypeScript (in apps/api) |
| AI Model | Claude via AWS Bedrock (`anthropic.claude-sonnet-4-5-20250929-v1:0`) |
| File Upload | @fastify/multipart |
| State | Zustand + localStorage persistence |

---

## 13. Confirmed Decisions

| Decision | Rationale |
|----------|-----------|
| Claude reads PDFs natively via base64 document messages | Avoids pdf-parse complexity with ESM; Claude 3.5+ supports PDF documents in messages |
| SSE streaming over WebSocket | Simpler for one-directional server→client flow; no reconnect logic needed |
| 4-batch parallel generation (text → SVG \| CSS \| problems) | Batch 1 delivers visible content fast; 2/3/4 run in parallel for speed |
| Device frame as styled div (not actual iframe) | No sandbox security constraints; React components render directly inside the frame |
| Content stored in Zustand + localStorage for v1 | No DB migration needed for initial tool; persistence added in v2 |
| Chat modifies individual segments only | Prevents Claude from inadvertently changing unrelated segments |

---

## 14. Open Questions

| Question | Impact |
|----------|--------|
| Should generated content auto-save to content_chapters DB? | Needs migration 011; v2 scope |
| PDF pages can exceed Claude's context window — how to handle? | Implement page chunking for PDFs > 50 pages |
| Should Content Studio be a separate app (apps/content-studio)? | Currently in apps/web; extract if team grows |

---

*Created: 2026-05-12. Next: implement DB persistence (migration 011) and publish to content_library.*
