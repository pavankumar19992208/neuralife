import type { FastifyPluginAsync } from "fastify";
import multipart from "@fastify/multipart";
import { z } from "zod";
import { generateContent, generateContentFromPdf } from "../lib/claude.js";
import {
  generateContentGemini,
  generateContentGeminiWithImages,
} from "../lib/gemini.js";
import logger from "../lib/logger.js";
import { withRetry } from "../utils/retry.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { ContentStudioRepository } from "../repositories/content-studio.repository.js";

type LLMProvider = "claude" | "gemini";

const SEGMENT_ORDER = [
  "concept_summary",
  "concept_explanation",
  "key_terms",
  "did_you_know",
  "interaction",
  "svg_diagram",
  "css_diagram",
  "problems",
  "prerequisites",
  "audio_text",
  "youtube_query",
  "free_style",
] as const;

function callLLM(
  provider: LLMProvider,
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  maxTokens: number,
): Promise<string> {
  if (provider === "gemini")
    return generateContentGemini(systemPrompt, messages, maxTokens);
  return generateContent(
    systemPrompt,
    messages as Parameters<typeof generateContent>[1],
    maxTokens,
  );
}

// ── Prompts ───────────────────────────────────────────────────────

const CONTENT_SYSTEM_PROMPT = `You are an expert curriculum content specialist for Indian school education.
You create content for NeuraLife — an AI learning platform for AP/Telangana schools.
Content must be:
- Age-appropriate and cognitively appropriate for the specified grade band
- Board-aligned: matches the exact syllabus (SCERT AP, NCERT, etc.)
- Student-friendly: visual intuition before formal definitions
- Factually accurate — no errors, no fabricated facts
- Written in clear, engaging English (or Telugu if specified)

Output ONLY valid JSON. No markdown fences. No preamble. No explanation outside JSON.`;

const PDF_PARSE_SYSTEM_PROMPT = `You are a curriculum structure analyst.
Parse the provided educational document and extract its structure.
Output ONLY valid JSON. No markdown fences. No explanations.`;

function getBandForGrade(grade: number): string {
  if (grade <= 3) return "FOUNDATION (Classes 1–3, ages 6–9)";
  if (grade <= 6) return "ELEMENTARY (Classes 4–6, ages 9–12)";
  if (grade <= 8) return "MIDDLE (Classes 7–8, ages 12–14)";
  return "SECONDARY (Classes 9–10, ages 14–16)";
}

function getGradeTier(grade: number): "PRIMARY" | "MIDDLE" | "SECONDARY" {
  if (grade <= 5) return "PRIMARY";
  if (grade <= 8) return "MIDDLE";
  return "SECONDARY";
}

// Detects legacy ANSI Telugu font encoding artifacts (Hemalatha, Vemana, etc.)
// AP government PDFs frequently use these fonts; pdf.js extracts garbage instead of Unicode.
// Telltale patterns: math symbols (∑≈£) clustered with Latin-extended chars in title-like positions.
function isGarbledTelugu(text: string): boolean {
  if (!text) return false;
  // Must contain at least one of the characteristic math/special-symbol clusters
  const hasMarkers = /[∑≈›¡£°·]/.test(text);
  if (!hasMarkers) return false;
  // Must also contain telltale two-char sequences from Hemalatha encoding
  const hasSequences = /ø£|dü|≈£î|>∑|ô\||e´e|\\\w{1,2}\+/.test(text);
  return hasSequences;
}

// Strip garbled ANSI-encoded Telugu from a string; returns null when the whole string is garbled.
function cleanTitle(value: string | null | undefined): string | null {
  if (!value) return null;
  // If the value itself is garbled, discard it
  if (isGarbledTelugu(value)) return null;
  // If it's mixed "English / <garbled>", keep only the English part
  const slashParts = value.split(/\s*\/\s*/);
  const clean = slashParts.filter((p) => !isGarbledTelugu(p)).join(" / ");
  return clean.trim() || null;
}

function extractPdfResources(
  text: string,
): Array<{ url: string; context: string }> {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  const matches = [...text.matchAll(urlRegex)];
  return matches.slice(0, 10).map((m) => {
    const url = m[0].replace(/[.,;:)]+$/, "");
    const start = Math.max(0, (m.index ?? 0) - 60);
    const ctx = text
      .substring(start, (m.index ?? 0) + url.length + 60)
      .replace(/\s+/g, " ")
      .trim();
    return { url, context: ctx };
  });
}

function buildBatch1Prompt(
  session: ContentStudioSession,
  prerequisiteTopics?: PrerequisiteTopic[],
): string {
  const band = getBandForGrade(session.grade);
  const tier = getGradeTier(session.grade);
  const isTelugu = session.medium === "TELUGU";

  const hasTextbookContext =
    session.topicContext && session.topicContext.trim().length > 50;

  const langInstruction = isTelugu
    ? `CRITICAL LANGUAGE INSTRUCTION: This content is for TELUGU medium students.
- Write ALL explanatory text in Telugu script (తెలుగు) — concept summary, explanation, key terms, everything
- Do NOT write anything in English except mathematical symbols/formulas
- Use correct Telugu grammar and correct Telugu script characters — no transliteration, no Romanised Telugu
${
  hasTextbookContext
    ? `BILINGUAL PDF RULE (MOST IMPORTANT):
- The textbook context below is a BILINGUAL document — it contains BOTH English and Telugu text printed together on every page by the original SCERT/NCERT authors.
- Telugu words are ALREADY PRESENT in the context. Your job is to FIND and COPY them, NOT to translate English words yourself.
- NEVER generate your own Telugu translation for any word or phrase that appears in the textbook context in Telugu. Extract it as-is.
- If a term's Telugu equivalent appears anywhere in the context, use that exact form — same word, same spelling. Students recognise these exact words from their printed textbook.
- Only translate a term yourself if that term does not appear in the Telugu text of the context at all.`
    : "- Prefer examples from AP/Telangana context (local rivers, crops, cities, festivals)"
}
- The "audio_text" must also be entirely in Telugu, suitable for TTS engines`
    : `Language: English. Use clear, simple language appropriate for Indian school students.
${hasTextbookContext ? "- Use the same terminology/keywords found in the textbook context below — students should see consistent vocabulary between this content and their textbook." : ""}`;

  const prereqInstruction =
    prerequisiteTopics && prerequisiteTopics.length > 0
      ? `The following topics from previous grades ARE available in the database:
${prerequisiteTopics.map((t) => `- Class ${t.grade}: [${t.subject}] ${t.chapter_title} → "${t.topic_title}"`).join("\n")}
For the "prerequisites" key: select ONLY the topics from this list that are genuinely required to understand this topic. Return empty array [] if none apply.`
      : `For the "prerequisites" key: return an empty array [] — no prerequisite data is available.`;

  const chapterTopicsBlock =
    session.chapterTopics && session.chapterTopics.length > 0
      ? `CHAPTER TOPIC LIST (all topics in this chapter):
${session.chapterTopics.map((t) => `  ${t.number}. ${t.title}${t.title === session.topicTitle ? " ← CURRENT TOPIC (generate content for THIS topic only)" : ""}`).join("\n")}

TOPIC ISOLATION RULE: The textbook context below is extracted from the FULL CHAPTER PDF, which contains content for all the topics listed above. You must ONLY generate content about "${session.topicTitle}". Do NOT include explanations, definitions, or examples that belong to adjacent topics. The chapter topic list defines your boundary — content from other topics in this list must NOT appear in any segment.`
      : "";

  const topicContextGarbled = isGarbledTelugu(session.topicContext || "");
  const garbledContextNote = topicContextGarbled
    ? `\nCONTEXT ENCODING WARNING: The textbook context below contains legacy ANSI font artifacts (characters like ∑, ≈, £, ô, ä). These are NOT readable Telugu text — they are encoding garbage. Completely ignore any text that looks like these garbled characters. Do NOT copy them into any output field. Generate all Telugu content from your knowledge of the AP/TS curriculum for this topic.`
    : "";

  const pdfResources = extractPdfResources(session.topicContext || "");
  const pdfResourcesBlock =
    pdfResources.length > 0
      ? `PDF RESOURCES FOUND IN TEXTBOOK CONTEXT:
${pdfResources.map((r) => `  - ${r.url}\n    (context: "${r.context}")`).join("\n")}
For the "youtube_videos" key: include links from this list that are relevant to "${session.topicTitle}" — they came directly from the textbook and should appear first. Supplement with 1-2 additional video searches to reach 3-4 total.`
      : "";

  const gradeTierInstruction =
    tier === "PRIMARY"
      ? `GRADE TIER: PRIMARY (Class ${session.grade})
Design effort priority: interaction > free_style > did_you_know > css_diagram > concept_explanation
- concept_explanation: max 100 words, story form ("Have you ever seen...?"), ZERO formal definitions, end with an observation invitation
- key_terms: max 3 terms, simple picture-word format
- interaction: ONLY Tap-to-Sequence or Label-the-Diagram — NO Slider or Stylus types
- did_you_know: a wonder story or observation challenge, not a statistic
- audio_text: max 100 words, rhythmic, short sentences
- youtube_videos: max 2 videos, under 5 minutes, Telugu preferred`
      : tier === "MIDDLE"
        ? `GRADE TIER: MIDDLE (Class ${session.grade})
Design effort priority: concept_explanation > interaction > svg_diagram > key_terms > problems
- concept_explanation: 200-350 words, intuition before formalism
- key_terms: 4-7 terms
- interaction: all 4 types permitted
- problems: 2 Foundation + 3 Standard + 1 Advanced = 6 total`
        : `GRADE TIER: SECONDARY (Class ${session.grade})
Full content — standard lengths and counts apply.`;

  return `Generate educational content for:
Board: ${session.board}
Class: ${session.grade}
Subject: ${session.subject}
Chapter ${session.chapterNumber}: ${session.chapterTitle}
Topic: ${session.topicTitle}
Medium: ${session.medium}
Age Band: ${band}

${gradeTierInstruction}

${chapterTopicsBlock}

${langInstruction}

${garbledContextNote}
Textbook context:
${session.topicContext || "(No additional context provided)"}

${pdfResourcesBlock}

${prereqInstruction}

Generate a JSON object with EXACTLY these keys:
{
  "concept_summary": "${isTelugu ? "ఒక లేదా రెండు వాక్యాలు. అంశం యొక్క సారాంశం." : "One or two sentences. Captures the essence of the topic."}",
  "concept_explanation": "${isTelugu ? "పూర్తి వివరణ. 300-500 పదాలు. సారూప్యత లేదా వాస్తవ-జీవిత ఉదాహరణతో ప్రారంభించండి. ముఖ్య పదాలను మొదటిసారి bold చేయండి." : "Full markdown explanation. 300-500 words. Visual-first: start with an analogy or real-world example before formal definitions. Use bold for key terms on first use. Include numbered steps for processes."}",
  "key_terms": [{"term": "string", "definition": "string (one sentence)", "example": "string (concrete example)"}],
  "did_you_know": {"fact": "A surprising or interesting real-world connection to this topic", "source": "optional source or null"},
  "interaction": {
    "type": "one of: Tap-to-Sequence | Label-the-Diagram | Slider-Parameter | Stylus-Fill-Equation. Choose based on concept nature: processes/sequences → Tap-to-Sequence, anatomy/apparatus → Label-the-Diagram, mathematical relationships → Slider-Parameter, equation solving → Stylus-Fill-Equation",
    "description": "What the student will do (1 sentence, use AP/Telangana context)",
    "instructions": "2-3 sentences of instructions for the student",
    "steps": ["step 1 text", "step 2 text", "step 3 text", "step 4 text"],
    "wrong_feedback": "One sentence shown when student makes a wrong attempt — explain WHY it's wrong and give a nudge toward the correct answer",
    "success_message": "One sentence shown on completion — connect to a real-world application in AP/Telangana"
  },
  "prerequisites": [{"title": "Topic name", "class_year": 8, "subject": "Mathematics"}],
  "audio_text": "Plain text version of concept_explanation. No markdown, no special characters. Written for text-to-speech.",
  "youtube_videos": [
    {
      "title": "Exact video title as it appears on YouTube",
      "channel": "Channel name (e.g. Khan Academy, Vedantu, Telugu Physics, BYJU's)",
      "search_url": "https://www.youtube.com/results?search_query=channel+name+topic+class+grade",
      "duration_estimate": "8-12 minutes",
      "language": "TELUGU or ENGLISH",
      "why": "One sentence on why this video is good for this topic"
    }
  ],
  "free_style": {
    "title": "A meaningful short title for this supplementary section",
    "html": "Self-contained responsive HTML with embedded <style> tag. MUST use max-width: 100%%. No fixed pixel widths. Inter font. NeuraLife colors: #1E40AF #0D9488 #F59E0B #10B981. Can be a timeline, comparison table, formula summary, step-by-step visual, concept map, or fact grid. Optimised for auditor review on a desktop screen."
  }
}

IMPORTANT:
- The "concept_summary" is a concise 1-2 sentence essence of the topic — like the back-of-book blurb. Clear, memorable, accurate. MUST start with a concrete object or place from AP/Telangana student life — NOT an abstract definition.
- The "concept_explanation" length and structure depends on the GRADE TIER above. PRIMARY: max 100 words, story form, zero definitions. MIDDLE: 200-350 words, intuition-first. SECONDARY: (1) AP/TS hook → (2) intuition → (3) formal definition → (4) AP/TS worked example → (5) diagram reference → (6) exam connection.
- ALL examples in ALL segments must use AP/Telangana context: rupee amounts, local cities, local crops (paddy, cotton, mango), local distances (Hyderabad-Vijayawada 275km), cricket scores. Never use foreign contexts.
- TOPIC ISOLATION: Only generate content about the CURRENT TOPIC. Do not define or explain concepts listed under other topics in the chapter topic list.
- The "youtube_videos" key: include any PDF resources that belong to this topic first, then add searches. Target: Primary=2 videos, Middle=3, Secondary=3-4. Use real YouTube search URLs.
- The "interaction.steps" must have 4-6 items. PRIMARY tier: only Tap-to-Sequence or Label-the-Diagram.
- The "free_style" is the visual memory anchor — design specifically for this topic AND grade tier. PRIMARY: activity/interactive HTML. SECONDARY: timeline, comparison card, formula card, flowchart, or mnemonic.

QUALITY GATE — review before returning:
· concept_summary: Opens with a real scene/question from student life? Explains real-life relevance? Hints at upcoming content? Does NOT start with a definition?
· concept_explanation: Matches grade tier structure exactly? AP/Telangana examples only?
· interaction: 4-6 steps? Steps are shuffled/engaging? Instructions are clear?
· All segments: factually accurate, age-appropriate, AP/Telangana context, zero foreign references.
If any segment fails these checks, improve it. Return only polished, classroom-ready content.

- Return ONLY valid JSON. No markdown fences. No preamble.`;
}

function buildSvgPrompt(session: ContentStudioSession): string {
  const isTelugu = session.medium === "TELUGU";
  const labelLang = isTelugu
    ? `CRITICAL LANGUAGE RULE: ALL text labels, annotations, and captions inside the SVG must be in Telugu script (తెలుగు). English labels are NOT allowed. This diagram replaces the printed Telugu-medium textbook diagram.`
    : `All labels in English.`;
  return `Generate an educational SVG diagram for:
Topic: ${session.topicTitle}
Subject: ${session.subject}
Grade: ${session.grade}
Board: ${session.board}
Medium: ${session.medium}

PURPOSE: This SVG is the PRIMARY visual for this topic on the SmartPad. It REPLACES the printed textbook diagram entirely. It must carry the same informational weight as the SCERT/NCERT figure — a student must be able to use it instead of the textbook diagram, not alongside it.

${labelLang}

E-INK DISPLAY REQUIREMENTS (non-negotiable):
- viewBox="0 0 800 500"
- Black and white ONLY — stroke="#000000", fill="white" or fill="none"
- Stroke width: minimum 2px for all lines (1px is invisible on E-Ink)
- Font size: minimum 14px for ALL labels (smaller is illegible at 0.38× scale)
- No gradients, no colors, no shadows, no opacity effects
- Font: font-family="sans-serif"

CONTENT REQUIREMENTS:
- Show the same core structures as the SCERT textbook figure for this topic
- Label every key structure, part, or element
- Maximum 8 tap target groups — each reveals ONE piece of information
- Include tap targets as: <g id="tap_1" class="tap-target">...</g>
- Caption as <text> at bottom-centre of diagram
- Prefer 4-6 clear elements over a complex 15-element diagram — E-Ink rewards clarity

Generate JSON:
{
  "svg_code": "complete valid SVG string starting with <svg viewBox=\\"0 0 800 500\\">",
  "caption": "${isTelugu ? "చిత్రం శీర్షిక తెలుగులో" : "Figure caption in English"}",
  "interaction_hints": ["what tap_1 reveals", "what tap_2 reveals", "..."]
}

QUALITY GATE: Before returning, verify — (1) minimum 2px stroke on all lines, (2) minimum 14px font on all labels, (3) no colours or gradients, (4) labels are complete and accurate, ${isTelugu ? "(5) ALL label text is in Telugu script." : "(5) all labels are in English."} If anything fails, fix it first.`;
}

function buildCssPrompt(session: ContentStudioSession): string {
  const isTelugu = session.medium === "TELUGU";
  const labelLang = isTelugu
    ? `CRITICAL LANGUAGE RULE: ALL visible text, labels, headings, and captions must be in Telugu script (తెలుగు). No English text allowed except mathematical symbols/formulas.`
    : `All text and labels in English.`;
  return `Generate a colorful CSS/HTML educational diagram for:
Topic: ${session.topicTitle}
Subject: ${session.subject}
Grade: ${session.grade}
Medium: ${session.medium}

PURPOSE: This colour diagram is shown on LCD screens (Mobile, Tablet) ONLY — NOT on E-Ink SmartPad. It must COMPLEMENT the SVG diagram by showing either a different angle, adding colour-coded information, or showing the concept in an animated state. Do NOT duplicate the SVG diagram — add new visual value.

${labelLang}

TECHNICAL REQUIREMENTS:
- Self-contained HTML with a single <style> tag — zero external dependencies (no CDN, no external fonts, no external images)
- Responsive: use percentage widths and em units — no fixed px widths for layout
- NeuraLife brand colours: primary #1E40AF, teal #0D9488, accent #F59E0B, success #10B981, danger #EF4444
- Border radius: 12px for cards, 8px for labels
- Font: Inter, ${isTelugu ? "'Noto Sans Telugu'," : ""} sans-serif
- Maximum ONE CSS animation — it must show a process (educational), not just decorate
- Animation should auto-play once and pause at final state
- Must render correctly at scale 0.38× (SmartPad preview in Content Studio) up to 1× (desktop audit)
- Max width: 760px, max height: 460px

Generate JSON:
{
  "html": "complete self-contained HTML string with embedded <style> tag",
  "caption": "${isTelugu ? "చిత్రం శీర్షిక తెలుగులో" : "Figure caption in English"}"
}

QUALITY GATE: Before returning, verify — (1) HTML is self-contained (no external dependencies), (2) responsive (no fixed px widths), (3) animation is educational (shows a process), (4) renders correctly at 0.38× scale, ${isTelugu ? "(5) ALL visible text is in Telugu script." : "(5) all text is in English."} Fix any issues before returning.`;
}

function buildProblemsPrompt(
  session: ContentStudioSession,
  difficulty: string,
): string {
  const tier = getGradeTier(session.grade);
  // Middle: 2 Foundation / 3 Standard / 1 Advanced. Primary: Foundation only (3).
  const countMap: Record<string, Record<string, number>> = {
    PRIMARY: { FOUNDATION: 3, STANDARD: 0, ADVANCED: 0 },
    MIDDLE: { FOUNDATION: 2, STANDARD: 3, ADVANCED: 1 },
    SECONDARY: { FOUNDATION: 3, STANDARD: 5, ADVANCED: 2 },
  };
  const count = countMap[tier]?.[difficulty] ?? 0;
  if (count === 0) return ""; // tier does not include this difficulty level
  const isStandard = difficulty === "STANDARD";
  return `Generate ${count} ${difficulty} difficulty problems for:
Topic: ${session.topicTitle}
Subject: ${session.subject}
Grade: ${session.grade}
Board: ${session.board}
Medium: ${session.medium}

Difficulty guidelines:
- FOUNDATION (3 problems): Single-step. Direct application of one rule. Student must feel "I can do this." Build confidence.
- STANDARD (5 problems): Multi-step. Match EXACT SCERT exam format, vocabulary, and question patterns. These 5 questions are also used as the topic quiz gate (student needs 70%+ to earn NeuraCoins).
- ADVANCED (2 problems): Application in a new, unfamiliar context. Requires synthesis of multiple concepts.

AP/TELANGANA CONTEXT (mandatory):
- All problem statements must use AP/Telangana context: rupee amounts, local distances (Hyderabad-Vijayawada 275km), local crops (paddy, cotton, mango), cricket scores, local names (Ramu, Sita, Krishna, Arjun)
- Never use foreign contexts, foreign currencies, or non-Indian place names

HINT SYSTEM (3 levels, progressively closer to solution):
- Hint 1 (conceptual nudge): "Think about what relationship exists between X and Y"
- Hint 2 (method pointer): "Try applying [formula/rule] here"
- Hint 3 (near-solution): Give the method and setup WITHOUT the final numerical answer

${isStandard ? 'NOTE: These Standard problems are the quiz gate. They must match SCERT past-paper style precisely — same question format, same instruction verbs ("Find", "Solve", "Calculate", "Verify").' : ""}

Generate a JSON array of exactly ${count} problem objects:
[{
  "id": "P_${difficulty.substring(0, 1)}_001",
  "text": "Problem statement using AP/Telangana context",
  "hints": ["Hint 1 (conceptual nudge)", "Hint 2 (method pointer)", "Hint 3 (near-solution, no final answer)"],
  "solution": "Final answer with units",
  "solution_steps": ["Step 1 — shows the method", "Step 2", "Step 3 — final answer"],
  "error_patterns": ["SIGN_ERROR | UNIT_CONVERSION_ERROR | FORMULA_RECALL_ERROR | INCOMPLETE_SOLUTION | CALCULATION_ERROR | DIRECTION_ERROR | PREREQUISITE_GAP"]
}]

QUALITY GATE: Before returning, verify — (1) each problem is solvable in the stated difficulty level, (2) the solution_steps are complete and correct, (3) all numbers/calculations are accurate, (4) AP/Telangana context used throughout. Fix any errors before returning.`;
}

// ── Types ─────────────────────────────────────────────────────────

interface ContentStudioSession {
  board: string;
  grade: number;
  subject: string;
  chapterNumber: number;
  chapterTitle: string;
  topicTitle: string;
  topicContext: string;
  medium: string;
  chapterTopics?: Array<{ number: number; title: string }>;
}

interface PrerequisiteTopic {
  grade: number;
  chapter_title: string;
  topic_title: string;
  subject: string;
}

const LLMProviderSchema = z.enum(["claude", "gemini"]).default("claude");

const GenerateSchema = z.object({
  board: z.string().min(2),
  grade: z.coerce.number().int().min(1).max(12),
  subject: z.string().min(2),
  chapterNumber: z.coerce.number().int().min(1),
  chapterTitle: z.string().min(2),
  topicTitle: z.string().min(2),
  topicContext: z.string().default(""),
  medium: z.enum(["ENGLISH", "TELUGU"]).default("ENGLISH"),
  model: LLMProviderSchema,
  chapterTopics: z
    .array(
      z.object({
        number: z.number().int().min(1),
        title: z.string().min(1),
      }),
    )
    .optional(),
  prerequisiteTopics: z
    .array(
      z.object({
        grade: z.number(),
        chapter_title: z.string(),
        topic_title: z.string(),
        subject: z.string(),
      }),
    )
    .optional(),
  // Present when the caller wants Gemini to translate existing English segments to Telugu
  englishSegments: z.record(z.unknown()).optional(),
});

const ChatSchema = z.object({
  message: z.string().min(1).max(2000),
  targetSegment: z.string().optional(),
  currentSegments: z.record(z.unknown()).optional(),
  model: LLMProviderSchema,
  topicContext: z.object({
    board: z.string(),
    grade: z.number(),
    subject: z.string(),
    chapterTitle: z.string(),
    topicTitle: z.string(),
  }),
});

// ── Telugu translation via Gemini ─────────────────────────────────

function buildTeluguTranslationPrompt(
  englishSegments: Record<string, unknown>,
  session: ContentStudioSession,
): string {
  const contextGarbled = isGarbledTelugu(session.topicContext || "");
  const contextBlock =
    session.topicContext?.trim() && !contextGarbled
      ? `\nTEXTBOOK CONTEXT — extract Telugu vocabulary from here. For every technical term, look here first and use the exact Telugu spelling the textbook uses:\n${session.topicContext.substring(0, 5000)}`
      : contextGarbled
        ? `\n(Textbook context omitted — legacy ANSI font encoding produced unreadable characters.)`
        : "";

  return `You are translating educational content from English to Telugu for NeuraLife — an AP/Telangana school learning platform.

Topic: "${session.topicTitle}" | Subject: ${session.subject} | Grade: ${session.grade} | Board: ${session.board}
${contextBlock}

═══ TRANSLATION RULES (every rule is mandatory) ═══

1. STRUCTURE: Return the EXACT same JSON structure — identical keys, array lengths, nesting. Do not add, remove, or rename any key.

2. LANGUAGE: Translate EVERY human-readable text value to Telugu script (తెలుగు).
   - Zero English words anywhere in the output — not in labels, not in captions, not in steps.
   - Exception: mathematical symbols/formulas/numbers/units stay as-is.
   - Exception: "search_url" values stay exactly as-is (they are URLs, not text).

3. SVG (svg_diagram.svg_code): COPY the svg_code string character-for-character EXCEPT for text content inside <text> and <tspan> elements — translate ONLY those text strings. Every attribute (x, y, viewBox, width, height, transform, fill, stroke, font-size, id, class, etc.) must be BYTE-FOR-BYTE identical to the input. Do NOT reposition, resize, add, or remove any SVG element.

4. HTML (css_diagram.html, free_style.html): COPY the entire HTML string verbatim EXCEPT for human-readable text between tags — translate ONLY those text strings. DO NOT change:
   - Any CSS rule, property, or value (inside <style> or inline style="")
   - Any HTML tag name, class name, id, or attribute
   - The layout, structure, order of elements, or animations
   - The <style> block — copy it character-for-character
   Think of it as a find-replace for visible text strings only. The HTML frame is frozen.

5. INTERACTIONS (interaction.steps, instructions, description, wrong_feedback, success_message): Fully in Telugu.

6. PROBLEMS (problems.FOUNDATION, STANDARD, ADVANCED): Translate text, hints, solution, solution_steps to Telugu. Keep numeric answers, formulas, and units as-is.

7. TEXTBOOK VOCABULARY: When a term appears in the textbook context above in Telugu, use that exact Telugu word — same spelling, same form. Only generate your own Telugu if the term is absent from the context.

8. NATURAL TELUGU: Write natural Telugu — proper grammar, proper script. Not a literal word-for-word translation. Telugu sentences should flow as a native speaker would write them.

9. YOUTUBE VIDEOS (youtube_query.videos): Do NOT translate the English video entries. Instead, REPLACE them with Telugu-language educational YouTube videos about this topic.
   - Use real Telugu educational channels: Vedantu Telugu, BYJU's Telugu, Mana TV Education, ETV Education, Sunflower Kids Telugu, Telugu Physics, Telugu Maths, SCERT Telangana
   - Write video titles in Telugu script (e.g., "కిరణజన్య సంయోగం అంటే ఏమిటి?")
   - search_url format: https://www.youtube.com/results?search_query=topic+telugu+class+grade
   - Set "language": "TELUGU" for Telugu videos
   - If you genuinely cannot identify Telugu videos for this specific topic, keep the original English entry unchanged with "language": "ENGLISH"
   - Aim for at least 2 Telugu videos; mix channels (e.g., Vedantu Telugu + one local channel)
   - Keep the same array length as the original

English content to translate:
${JSON.stringify(englishSegments)}

Return ONLY the translated JSON. No markdown fences. No explanation. No preamble.`;
}

// ── Helper ────────────────────────────────────────────────────────

function parseJsonSafe(text: string): unknown {
  // Strip any markdown fences if Claude accidentally added them
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

// ── Plugin ────────────────────────────────────────────────────────

const contentStudioRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  });

  const repo = new ContentStudioRepository(supabaseAdmin, logger);

  // ── Health check ───────────────────────────────────────────────

  fastify.get("/api/v1/content-studio/health", async (_req, reply) => {
    return reply.send({ status: "ok", model: "bedrock-claude" });
  });

  // ── Textbook structure (DB-backed) ─────────────────────────────

  // GET /api/v1/content-studio/textbooks?board=&grade=&subject=
  fastify.get("/api/v1/content-studio/textbooks", async (request, reply) => {
    const correlationId = request.correlationId;
    const q = request.query as Record<string, string>;
    const { board, grade, subject } = z
      .object({
        board: z.string().min(2),
        grade: z.coerce.number().int().min(1).max(12),
        subject: z.string().min(2),
      })
      .parse(q);

    const textbook = await repo.findTextbook(
      board,
      grade,
      subject,
      correlationId,
    );
    if (!textbook) return reply.code(404).send({ data: null, exists: false });

    const chapters = await repo.getChaptersWithTopics(
      textbook.id,
      correlationId,
    );
    return reply.send({ data: { textbook, chapters }, exists: true });
  });

  // POST /api/v1/content-studio/textbooks — save parsed index structure
  fastify.post("/api/v1/content-studio/textbooks", async (request, reply) => {
    const correlationId = request.correlationId;
    const body = z
      .object({
        board: z.string().min(2),
        grade: z.coerce.number().int().min(1).max(12),
        subject: z.string().min(2),
        chapters: z
          .array(
            z.object({
              chapter_number: z.number().int().positive(),
              title_en: z.string().min(1),
              title_te: z.string().optional(),
              topics: z
                .array(
                  z.object({
                    topic_number: z.number().int().positive(),
                    title_en: z.string().min(1),
                    title_te: z.string().optional(),
                  }),
                )
                .default([]),
            }),
          )
          .min(1),
      })
      .parse(request.body);

    // Get or create textbook
    let textbook = await repo.findTextbook(
      body.board,
      body.grade,
      body.subject,
      correlationId,
    );
    if (!textbook) {
      textbook = await repo.createTextbook(
        body.board,
        body.grade,
        body.subject,
        correlationId,
      );
    }

    const chapters = await repo.upsertChaptersAndTopics(
      textbook.id,
      body.chapters,
      correlationId,
    );
    return reply.code(201).send({ data: { textbook, chapters } });
  });

  // POST /api/v1/content-studio/textbooks/:textbookId/append-chapters — add semester 2 chapters
  fastify.post(
    "/api/v1/content-studio/textbooks/:textbookId/append-chapters",
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { textbookId } = request.params as { textbookId: string };
      const body = z
        .object({
          chapters: z
            .array(
              z.object({
                chapter_number: z.number().int().positive(),
                title_en: z.string().min(1),
                title_te: z.string().optional(),
                topics: z
                  .array(
                    z.object({
                      topic_number: z.number().int().positive(),
                      title_en: z.string().min(1),
                      title_te: z.string().optional(),
                    }),
                  )
                  .default([]),
              }),
            )
            .min(1),
        })
        .parse(request.body);

      const chapters = await repo.appendChapters(
        textbookId,
        body.chapters,
        correlationId,
      );
      return reply.code(201).send({ data: { chapters } });
    },
  );

  // GET /api/v1/content-studio/topics/:topicId/content?mediums=ENGLISH,TELUGU
  fastify.get(
    "/api/v1/content-studio/topics/:topicId/content",
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { topicId } = request.params as { topicId: string };

      const allContent = await repo.getAllGeneratedContentForTopic(
        topicId,
        correlationId,
      );
      const result: Record<string, unknown> = {};
      for (const c of allContent) {
        result[c.medium] = {
          id: c.id,
          segments: c.segments,
          generated_at: c.generated_at,
          last_modified_at: c.last_modified_at,
          audit_status: c.audit_status,
        };
      }
      return reply.send({ data: result });
    },
  );

  // POST /api/v1/content-studio/topics/:topicId/content — save generated content
  fastify.post(
    "/api/v1/content-studio/topics/:topicId/content",
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { topicId } = request.params as { topicId: string };
      const body = z
        .object({
          medium: z.enum(["ENGLISH", "TELUGU"]),
          segments: z.record(z.unknown()),
        })
        .parse(request.body);

      const saved = await repo.saveGeneratedContent(
        topicId,
        body.medium,
        body.segments,
        correlationId,
      );
      return reply.code(201).send({ data: saved });
    },
  );

  // PUT /api/v1/content-studio/generated-content/:id — update segments
  fastify.put(
    "/api/v1/content-studio/generated-content/:id",
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { id } = request.params as { id: string };
      const body = z
        .object({ segments: z.record(z.unknown()) })
        .parse(request.body);

      await repo.updateGeneratedContent(id, body.segments, correlationId);
      return reply.send({ data: { updated: true } });
    },
  );

  // POST /api/v1/content-studio/generated-content/:id/approve — finalize audit
  fastify.post(
    "/api/v1/content-studio/generated-content/:id/approve",
    async (request, reply) => {
      const correlationId = request.correlationId;
      const { id } = request.params as { id: string };
      const body = z
        .object({ segments: z.record(z.unknown()) })
        .parse(request.body);

      await repo.approveGeneratedContent(id, body.segments, correlationId);
      logger.info({ correlationId, id }, "Generated content approved");
      return reply.send({ data: { approved: true } });
    },
  );

  // GET /api/v1/content-studio/prerequisites?board=&grade=&subject=
  fastify.get(
    "/api/v1/content-studio/prerequisites",
    async (request, reply) => {
      const correlationId = request.correlationId;
      const q = request.query as Record<string, string>;
      const { board, grade, subject } = z
        .object({
          board: z.string().min(2),
          grade: z.coerce.number().int().min(1).max(12),
          subject: z.string().min(2),
        })
        .parse(q);

      const topics = await repo.getPreviousGradeTopics(
        board,
        subject,
        grade,
        correlationId,
      );
      return reply.send({ data: topics });
    },
  );

  // GET /api/v1/content-studio/grade-subjects?board=&grade=
  fastify.get(
    "/api/v1/content-studio/grade-subjects",
    async (request, reply) => {
      const correlationId = request.correlationId;
      const q = request.query as Record<string, string>;
      const { board, grade } = z
        .object({
          board: z.string().min(2),
          grade: z.coerce.number().int().min(1).max(12),
        })
        .parse(q);

      const { data, error } = await supabaseAdmin
        .from("cs_grade_subjects")
        .select("subject_en, subject_te")
        .eq("board", board)
        .eq("grade", grade)
        .order("created_at");

      if (error) {
        logger.error(
          { correlationId, error },
          "Failed to fetch grade subjects",
        );
        return reply
          .code(500)
          .send({ error: "DB_ERROR", message: error.message });
      }
      return reply.send({ data: data ?? [] });
    },
  );

  // POST /api/v1/content-studio/grade-subjects — bulk insert subjects for a grade
  fastify.post(
    "/api/v1/content-studio/grade-subjects",
    async (request, reply) => {
      const correlationId = request.correlationId;
      const body = z
        .object({
          board: z.string().min(2),
          grade: z.coerce.number().int().min(1).max(12),
          subjects: z
            .array(
              z.object({
                subject_en: z.string().min(1).max(100).trim(),
                subject_te: z.string().max(100).trim().optional().nullable(),
              }),
            )
            .min(1)
            .max(30),
        })
        .parse(request.body);

      const rows = body.subjects.map((s) => ({
        board: body.board,
        grade: body.grade,
        subject_en: s.subject_en,
        subject_te: s.subject_te ?? null,
      }));

      const { data, error } = await supabaseAdmin
        .from("cs_grade_subjects")
        .upsert(rows, {
          onConflict: "board,grade,subject_en",
          ignoreDuplicates: false,
        })
        .select("subject_en, subject_te");

      if (error) {
        logger.error({ correlationId, error }, "Failed to save grade subjects");
        return reply
          .code(500)
          .send({ error: "DB_ERROR", message: error.message });
      }
      logger.info(
        {
          correlationId,
          board: body.board,
          grade: body.grade,
          count: rows.length,
        },
        "Grade subjects saved",
      );
      return reply.code(201).send({ data: data ?? rows });
    },
  );

  // POST /api/v1/content-studio/refine-segment — comment-driven, regenerate, or translate one segment
  fastify.post(
    "/api/v1/content-studio/refine-segment",
    async (request, reply) => {
      const correlationId = request.correlationId;
      const body = z
        .object({
          segmentId: z.string().min(1),
          currentContent: z.unknown(),
          comment: z.string().max(2000).optional(),
          mode: z.enum(["refine", "regenerate", "translate"]).default("refine"),
          session: z.object({
            board: z.string(),
            grade: z.number(),
            subject: z.string(),
            chapterTitle: z.string(),
            topicTitle: z.string(),
            medium: z.string(),
            topicContext: z.string().optional(),
          }),
          model: LLMProviderSchema,
        })
        .parse(request.body);

      const {
        segmentId,
        currentContent,
        comment,
        mode,
        session: sess,
        model,
      } = body;

      // ── translate mode: English content → Telugu via Gemini ────────
      if (mode === "translate") {
        logger.info(
          { correlationId, segmentId },
          "Translating segment to Telugu",
        );
        const contextGarbled = isGarbledTelugu(sess.topicContext || "");
        const contextBlock =
          sess.topicContext?.trim() && !contextGarbled
            ? `\nTextbook context (extract Telugu vocabulary from here):\n${sess.topicContext.substring(0, 3000)}`
            : "";

        const translatePrompt = `Translate this single educational content segment from English to Telugu for NeuraLife.

Topic: "${sess.topicTitle}" | Subject: ${sess.subject} | Grade: ${sess.grade} | Board: ${sess.board}${contextBlock}

RULES:
1. Return the EXACT same JSON structure — same keys, array lengths, nesting. Do not add, remove, or rename any key.
2. Translate every human-readable text value to Telugu script (తెలుగు). Zero English words except mathematical symbols/formulas/numbers/units.
3. "search_url" values: copy exactly as-is (they are URLs, not text).
4. SVG (svg_code field): COPY the SVG string character-for-character EXCEPT translate the text content inside <text> and <tspan> elements only. Every attribute (x, y, fill, stroke, font-size, transform, id, class, etc.) must be IDENTICAL to the input. Do NOT reposition or restructure any element.
5. HTML (html field — css_diagram or free_style): COPY the entire HTML string verbatim EXCEPT translate human-readable text between tags. DO NOT change any CSS rule or property, any HTML tag, class name, id, attribute, or the layout. The <style> block must be copied character-for-character. Only the visible text strings change.
6. youtube_query.videos: Replace with Telugu-language YouTube videos (Vedantu Telugu, BYJU's Telugu, ETV Education, Mana TV Education). Set language: "TELUGU". If no Telugu video known for this topic, keep the original with language: "ENGLISH".
7. Use textbook vocabulary from the context above when available.
8. Write natural Telugu — proper grammar, not literal word-for-word.

English segment content:
${JSON.stringify(currentContent)}

Return ONLY the translated JSON. No markdown fences. No explanation.`;

        const translated = await withRetry(
          () =>
            generateContentGemini(
              "You are a professional Telugu translator for school education. Output ONLY valid JSON. No markdown fences.",
              [{ role: "user", content: translatePrompt }],
              8192,
            ),
          correlationId,
          { maxAttempts: 2, backoffMs: 1000 },
        );

        let teluguContent: unknown;
        try {
          teluguContent = parseJsonSafe(translated);
        } catch {
          return reply
            .code(502)
            .send({
              error: "INVALID_JSON",
              message: "Translation returned non-JSON. Try again.",
            });
        }

        if (
          teluguContent &&
          typeof teluguContent === "object" &&
          !Array.isArray(teluguContent)
        ) {
          const keys = Object.keys(teluguContent as Record<string, unknown>);
          if (keys.length === 1 && keys[0] === segmentId) {
            teluguContent = (teluguContent as Record<string, unknown>)[
              segmentId
            ];
          }
        }

        return reply.send({ data: { segmentId, content: teluguContent } });
      }

      const systemPrompt = `You are an expert curriculum content specialist for Indian school education.
You are refining a single content segment for NeuraLife — an AI learning platform.
Output ONLY valid JSON for the segment content. No markdown fences. No preamble.`;

      let userMessage: string;
      const teluguNote =
        sess.medium === "TELUGU"
          ? `\nTELUGU RULE: Write in Telugu script. The textbook PDF is bilingual — use Telugu vocabulary that already appears in the student's textbook. Do NOT translate English words yourself; use the existing Telugu terms from the textbook.`
          : "";

      const contextGarbledRefine = isGarbledTelugu(sess.topicContext || "");
      const contextBlock =
        sess.topicContext?.trim() && !contextGarbledRefine
          ? `\n\nTextbook context for "${sess.topicTitle}" (stay strictly within this scope — do not introduce content from other topics):\n${sess.topicContext.substring(0, 3000)}`
          : "";

      if (mode === "regenerate") {
        userMessage = `Generate a DIFFERENT version of the "${segmentId}" segment for:
Topic: ${sess.topicTitle} (${sess.subject}, Grade ${sess.grade}, ${sess.board})
Medium: ${sess.medium}${teluguNote}${contextBlock}

Current content (generate something meaningfully different — same structure, fresh approach):
${JSON.stringify(currentContent, null, 2).substring(0, 2000)}

IMPORTANT: Stay strictly within the scope of "${sess.topicTitle}". Do not introduce content from other topics.
Return ONLY the JSON content for "${segmentId}".`;
      } else {
        userMessage = `Refine the "${segmentId}" segment based on user feedback.
Topic: ${sess.topicTitle} (${sess.subject}, Grade ${sess.grade}, ${sess.board})
Medium: ${sess.medium}${teluguNote}${contextBlock}

Current content (preserve structure and style — only apply the feedback):
${JSON.stringify(currentContent, null, 2).substring(0, 2000)}

User feedback: ${comment ?? "Improve overall quality"}

IMPORTANT: Stay strictly within the scope of "${sess.topicTitle}". Do not introduce content from other topics.
Return ONLY the updated JSON content for "${segmentId}".`;
      }

      logger.info({ correlationId, segmentId, mode }, "Refining segment");

      const result = await withRetry(
        () =>
          callLLM(
            model,
            systemPrompt,
            [{ role: "user", content: userMessage }],
            4096,
          ),
        correlationId,
        { maxAttempts: 3, backoffMs: 1000 },
      );

      let content: unknown;
      try {
        content = parseJsonSafe(result);
      } catch {
        return reply
          .code(502)
          .send({
            error: "INVALID_JSON",
            message: "Model returned non-JSON. Try again.",
          });
      }

      // LLM sometimes wraps the value: {"concept_summary": "text"} → unwrap to just the value
      if (content && typeof content === "object" && !Array.isArray(content)) {
        const keys = Object.keys(content as Record<string, unknown>);
        if (keys.length === 1 && keys[0] === segmentId) {
          content = (content as Record<string, unknown>)[segmentId];
        }
      }

      return reply.send({ data: { segmentId, content } });
    },
  );

  // POST /api/v1/content-studio/parse-index-text — parse extracted text OR page images (from pdf.js client)
  fastify.post(
    "/api/v1/content-studio/parse-index-text",
    async (request, reply) => {
      const correlationId = request.correlationId;
      const body = z
        .object({
          text: z.string().max(80000).default(""),
          model: LLMProviderSchema,
          // base64 JPEG page images — used when model=gemini for accurate Telugu OCR
          images: z.array(z.string().max(4_000_000)).max(10).optional(),
        })
        .parse(request.body);

      const useVision = body.model === "gemini" && !!body.images?.length;

      if (!useVision && body.text.trim().length < 10) {
        return reply.code(422).send({
          error: "TEXT_TOO_SHORT",
          message:
            "Could not extract text from the selected pages. This PDF may be image-based (scanned). Try selecting pages that contain visible text.",
        });
      }

      // Detect legacy ANSI Telugu font encoding (Hemalatha/Vemana) in extracted text.
      // These PDFs produce garbage chars instead of Unicode Telugu when text-extracted.
      const hasGarbledFont = isGarbledTelugu(body.text);
      const garbledWarning = hasGarbledFont
        ? `\nFONT ENCODING WARNING: The extracted text contains characters like ∑, ≈, £, ô, ä — these are artifacts of a legacy ANSI Telugu font (Hemalatha/Vemana). They are NOT readable Telugu or meaningful content. For ALL title_te and topic title_te fields: set them to null. Do NOT copy these garbage characters. Do NOT try to decode or translate them. Extract only the English titles (title_en) which are readable.`
        : "";

      const userPrompt = `This is text extracted from the index/table of contents pages of an Indian school textbook.

The index is a TABLE. Common column layout:
  [Chapter No] | [English Chapter Title] | [Telugu Chapter Title] | [Topic Names]

CRITICAL RULES:
1. Topics are NOT separate section headings. They appear in the SAME TABLE ROW as their chapter, in the column to the right of the chapter title.
2. Sub-numbered items like "1.1 Name", "1.2 Name" or items separated by commas/newlines within a row ARE the topics for that chapter.
3. Every chapter MUST have at least 1 topic — look carefully at the right column.
4. Ignore standalone page numbers (single integers like "1", "15", "32" at row ends).
5. Do NOT invent topic names — only extract what is present in the text.

BILINGUAL EXTRACTION RULE (non-negotiable):
- AP/Telangana textbooks print BOTH English and Telugu on the same page. Telugu text is already written by the official authors — do NOT translate anything yourself.
- For title_te and topic title_te: copy the Telugu Unicode characters exactly as they appear. If no readable Telugu text exists, set to null.
- NEVER generate a Telugu translation for a title. Only use Telugu that is visibly present.${garbledWarning}

Output ONLY valid JSON (no markdown fences):
{
  "chapters": [
    {
      "chapter_number": 1,
      "title_en": "Real Numbers",
      "title_te": "వాస్తవ సంఖ్యలు",
      "topics": [
        {"topic_number": 1, "title_en": "Euclid's Division Lemma", "title_te": "యూక్లిడ్ విభజన సూత్రం"},
        {"topic_number": 2, "title_en": "The Fundamental Theorem of Arithmetic", "title_te": null}
      ]
    }
  ]
}`;

      logger.info(
        {
          correlationId,
          model: body.model,
          useVision,
          textLen: body.text.length,
          imageCount: body.images?.length ?? 0,
          hasGarbledFont,
        },
        "Parsing index text",
      );

      let result: string;
      try {
        if (useVision) {
          // Vision path: send rendered page images — accurate for Telugu/complex scripts
          // 32768 tokens: a full textbook index with bilingual titles can easily exceed 8192
          result = await withRetry(
            () =>
              generateContentGeminiWithImages(
                PDF_PARSE_SYSTEM_PROMPT,
                body.images!,
                `${userPrompt}\n\nPlease read all text from the page images above, including Telugu script characters, and extract the full chapter and topic structure. Copy Telugu script exactly as it appears — do NOT translate English to Telugu.`,
                32768,
              ),
            correlationId,
            { maxAttempts: 2, backoffMs: 2000 },
          );
        } else {
          // Text path: extracted text (works well for Claude, or English-only Gemini)
          result = await withRetry(
            () =>
              callLLM(
                body.model,
                PDF_PARSE_SYSTEM_PROMPT,
                [
                  {
                    role: "user",
                    content: `${userPrompt}\n\n---TEXT---\n${body.text}`,
                  },
                ],
                16384,
              ),
            correlationId,
            { maxAttempts: 2, backoffMs: 2000 },
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(
          { correlationId, model: body.model, useVision, err: msg },
          "LLM call failed for index parse",
        );
        return reply.code(502).send({ error: "LLM_ERROR", message: msg });
      }

      let parsed: unknown;
      try {
        parsed = parseJsonSafe(result);
      } catch {
        logger.error(
          {
            correlationId,
            model: body.model,
            resultSnippet: result.substring(0, 300),
          },
          "JSON parse failed for index text response",
        );
        return reply
          .code(502)
          .send({
            error: "INVALID_JSON",
            message:
              "Model returned non-JSON response. Try again or switch models.",
          });
      }

      // Post-process: strip any garbled legacy-font text the LLM may have copied anyway.
      // Also flag if the text was garbled so the frontend can show a warning.
      if (
        parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as Record<string, unknown>).chapters)
      ) {
        type RawChapter = {
          chapter_number: number;
          title_en: string;
          title_te?: string | null;
          topics: Array<{
            topic_number: number;
            title_en: string;
            title_te?: string | null;
          }>;
        };
        const chapters = (parsed as { chapters: RawChapter[] }).chapters;
        for (const ch of chapters) {
          ch.title_te = cleanTitle(ch.title_te);
          for (const t of ch.topics ?? []) {
            t.title_te = cleanTitle(t.title_te);
          }
        }
      }

      logger.info(
        { correlationId, model: body.model, hasGarbledFont },
        "Index text parsed successfully",
      );
      return reply.send({ data: parsed, garbledFontDetected: hasGarbledFont });
    },
  );

  // ── Parse PDF ─────────────────────────────────────────────────

  fastify.post("/api/v1/content-studio/parse-pdf", async (request, reply) => {
    const correlationId = request.correlationId;

    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: "No file uploaded" });
    }

    const parseType =
      (request.query as Record<string, string>).parseType || "index";

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk as Buffer);
    }
    const pdfBuffer = Buffer.concat(chunks);
    const pdfBase64 = pdfBuffer.toString("base64");

    logger.info(
      { correlationId, parseType, size: pdfBuffer.length },
      "Parsing PDF",
    );

    let userPrompt: string;
    if (parseType === "index") {
      userPrompt = `This is an index/table of contents page from an Indian school textbook.
Extract ALL chapter and topic entries.
Output JSON: {"chapters": [{"number": 1, "title": "string", "topics": [{"number": 1, "title": "string"}]}]}`;
    } else {
      userPrompt = `This is a chapter from an Indian school textbook.
Extract the main text content and identify topic sections.
Output JSON: {
  "chapterTitle": "string",
  "extractedText": "full text of the chapter (max 8000 chars)",
  "topics": [{"number": 1, "title": "string", "startPageEstimate": 1}]
}`;
    }

    const result = await withRetry(
      () =>
        generateContentFromPdf(
          PDF_PARSE_SYSTEM_PROMPT,
          pdfBase64,
          userPrompt,
          4096,
        ),
      correlationId,
      { maxAttempts: 2, backoffMs: 1000 },
    );

    const parsed = parseJsonSafe(result);
    return reply.send({ data: parsed });
  });

  // ── Generate (SSE stream) ──────────────────────────────────────

  fastify.post("/api/v1/content-studio/generate", async (request, reply) => {
    const correlationId = request.correlationId;
    const { model, prerequisiteTopics, englishSegments, ...session } =
      GenerateSchema.parse(request.body);

    // Hijack connection for SSE
    reply.hijack();
    const raw = reply.raw;
    raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    raw.setHeader("Cache-Control", "no-cache, no-transform");
    raw.setHeader("Connection", "keep-alive");
    raw.setHeader("X-Accel-Buffering", "no");
    raw.setHeader("Access-Control-Allow-Origin", "*");
    raw.flushHeaders();

    const emit = (eventType: string, data: unknown) => {
      raw.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // ── Telugu translation fast-path (Gemini) ──────────────────────
    // When englishSegments is present the caller already has Claude's English output.
    // Gemini translates the whole JSON in one shot — no Claude call needed.
    if (
      session.medium === "TELUGU" &&
      englishSegments &&
      Object.keys(englishSegments).length > 0
    ) {
      logger.info(
        { correlationId, topic: session.topicTitle },
        "Telugu translation via Gemini",
      );
      try {
        emit("start", { totalSegments: 12, batches: 1, mode: "translation" });
        const prompt = buildTeluguTranslationPrompt(
          englishSegments,
          session as ContentStudioSession,
        );
        const translated = await withRetry(
          () =>
            generateContentGemini(
              "You are a professional Telugu translator for school education. Output ONLY valid JSON. No markdown fences.",
              [{ role: "user", content: prompt }],
              20000,
            ),
          correlationId,
          { maxAttempts: 2, backoffMs: 2000 },
        );
        let translatedSegments: Record<string, unknown>;
        try {
          translatedSegments = parseJsonSafe(translated) as Record<
            string,
            unknown
          >;
        } catch {
          emit("segment_error", {
            id: "concept_summary",
            message: "Translation returned invalid JSON — try again.",
          });
          raw.write("event: done\ndata: {}\n\n");
          raw.end();
          return;
        }
        // Emit each translated segment
        for (const segId of SEGMENT_ORDER) {
          if (translatedSegments[segId] !== undefined) {
            emit("segment_complete", {
              id: segId,
              content: translatedSegments[segId],
            });
          }
        }
        raw.write("event: done\ndata: {}\n\n");
        raw.end();
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error({ correlationId, err: msg }, "Gemini translation failed");
        emit("segment_error", {
          id: "concept_summary",
          message: `Translation failed: ${msg}`,
        });
        raw.write("event: done\ndata: {}\n\n");
        raw.end();
        return;
      }
    }

    logger.info({ correlationId, session }, "Content generation started");

    try {
      emit("start", { totalSegments: 12, batches: 4 });

      // ── Batch 1: Text segments ─────────────────────────────────
      // prerequisites only included when DB has previous grade topics
      const hasPrereqs = prerequisiteTopics && prerequisiteTopics.length > 0;
      const batch1Ids = [
        "concept_summary",
        "concept_explanation",
        "key_terms",
        "did_you_know",
        "interaction",
        "audio_text",
        "youtube_query",
        "free_style",
        ...(hasPrereqs ? ["prerequisites"] : []),
      ];
      emit("batch_start", { batch: 1, segmentIds: batch1Ids });

      const batch1Text = await withRetry(
        () =>
          callLLM(
            model,
            CONTENT_SYSTEM_PROMPT,
            [
              {
                role: "user",
                content: buildBatch1Prompt(
                  session as ContentStudioSession,
                  prerequisiteTopics,
                ),
              },
            ],
            10240,
          ),
        correlationId,
        { maxAttempts: 3, backoffMs: 1000 },
      );

      let batch1Data: Record<string, unknown>;
      try {
        batch1Data = parseJsonSafe(batch1Text) as Record<string, unknown>;
      } catch {
        batch1Data = {};
        logger.error({ correlationId }, "Failed to parse batch 1 JSON");
      }

      // LLM outputs "youtube_videos" key; we store it under "youtube_query" segment ID
      if (
        batch1Data["youtube_videos"] !== undefined &&
        batch1Data["youtube_query"] === undefined
      ) {
        batch1Data["youtube_query"] = { videos: batch1Data["youtube_videos"] };
      }

      // If no prereqs from DB, emit empty-skipped signal so frontend hides the segment
      if (!hasPrereqs) {
        emit("segment_complete", {
          id: "prerequisites",
          content: { topics: [] },
        });
      }

      for (const id of batch1Ids) {
        if (id === "prerequisites" && !hasPrereqs) continue; // already emitted above
        if (batch1Data[id] !== undefined) {
          emit("segment_complete", { id, content: batch1Data[id] });
        } else {
          emit("segment_error", {
            id,
            message: "Segment missing from generation output",
          });
        }
      }

      // ── Batches 2, 3, 4 in parallel ───────────────────────────
      const batch2Ids = ["svg_diagram"];
      const batch3Ids = ["css_diagram"];
      const batch4Ids = ["problems"];

      emit("batch_start", { batch: 2, segmentIds: batch2Ids });
      emit("batch_start", { batch: 3, segmentIds: batch3Ids });
      emit("batch_start", { batch: 4, segmentIds: batch4Ids });

      const [svgResult, cssResult, problemsResult] = await Promise.allSettled([
        // SVG diagram
        withRetry(
          () =>
            callLLM(
              model,
              CONTENT_SYSTEM_PROMPT,
              [
                {
                  role: "user",
                  content: buildSvgPrompt(session as ContentStudioSession),
                },
              ],
              8192,
            ),
          correlationId,
          { maxAttempts: 3, backoffMs: 1000 },
        ),
        // CSS diagram
        withRetry(
          () =>
            callLLM(
              model,
              CONTENT_SYSTEM_PROMPT,
              [
                {
                  role: "user",
                  content: buildCssPrompt(session as ContentStudioSession),
                },
              ],
              8192,
            ),
          correlationId,
          { maxAttempts: 3, backoffMs: 1000 },
        ),
        // Problems — generate applicable difficulties in parallel (empty prompt = skip for this tier)
        Promise.all(
          (["FOUNDATION", "STANDARD", "ADVANCED"] as const).map((diff) => {
            const prompt = buildProblemsPrompt(
              session as ContentStudioSession,
              diff,
            );
            if (!prompt) return Promise.resolve("[]"); // tier doesn't include this difficulty
            return withRetry(
              () =>
                callLLM(
                  model,
                  CONTENT_SYSTEM_PROMPT,
                  [{ role: "user", content: prompt }],
                  6000,
                ),
              correlationId,
              { maxAttempts: 2, backoffMs: 1000 },
            );
          }),
        ),
      ]);

      // Emit SVG result
      if (svgResult.status === "fulfilled") {
        try {
          emit("segment_complete", {
            id: "svg_diagram",
            content: parseJsonSafe(svgResult.value),
          });
        } catch {
          emit("segment_error", {
            id: "svg_diagram",
            message: "Invalid SVG diagram JSON",
          });
        }
      } else {
        emit("segment_error", {
          id: "svg_diagram",
          message: "SVG generation failed",
        });
      }

      // Emit CSS result
      if (cssResult.status === "fulfilled") {
        try {
          emit("segment_complete", {
            id: "css_diagram",
            content: parseJsonSafe(cssResult.value),
          });
        } catch {
          emit("segment_error", {
            id: "css_diagram",
            message: "Invalid CSS diagram JSON",
          });
        }
      } else {
        emit("segment_error", {
          id: "css_diagram",
          message: "CSS diagram generation failed",
        });
      }

      // Emit problems result
      if (problemsResult.status === "fulfilled") {
        const [foundRes, stdRes, advRes] = problemsResult.value;
        try {
          emit("segment_complete", {
            id: "problems",
            content: {
              foundation: parseJsonSafe(foundRes),
              standard: parseJsonSafe(stdRes),
              advanced: parseJsonSafe(advRes),
            },
          });
        } catch {
          emit("segment_error", {
            id: "problems",
            message: "Problem set parsing failed",
          });
        }
      } else {
        emit("segment_error", {
          id: "problems",
          message: "Problem generation failed",
        });
      }

      emit("done", {});
      logger.info({ correlationId }, "Content generation complete");
    } catch (error) {
      logger.error({ correlationId, error }, "Content generation failed");
      emit("error", { message: (error as Error).message });
    } finally {
      raw.end();
    }
  });

  // ── Chat ──────────────────────────────────────────────────────

  fastify.post("/api/v1/content-studio/chat", async (request, reply) => {
    const correlationId = request.correlationId;
    const { model, ...body } = ChatSchema.parse(request.body);

    const systemPrompt = `You are an expert curriculum content specialist helping the NeuraLife content team refine educational content.
The team will ask you to modify specific segments of a generated topic.
You must:
1. Answer their question or make the requested change
2. If a segment needs updating, include it in updatedSegments
3. Only include segments that actually changed
Output JSON: {"reply": "your message", "updatedSegments": {"segment_id": updatedContent}}`;

    const contextSummary = body.currentSegments
      ? `Current content context:\n${JSON.stringify(body.currentSegments, null, 2).substring(0, 3000)}`
      : "";

    const userMessage = `Topic: ${body.topicContext.topicTitle} (${body.topicContext.subject}, Grade ${body.topicContext.grade}, ${body.topicContext.board})

${contextSummary}

Team request: ${body.message}
${body.targetSegment ? `Segment to modify: ${body.targetSegment}` : ""}`;

    const result = await withRetry(
      () =>
        callLLM(
          model,
          systemPrompt,
          [{ role: "user", content: userMessage }],
          8192,
        ),
      correlationId,
      { maxAttempts: 3, backoffMs: 1000 },
    );

    let parsed: { reply: string; updatedSegments?: Record<string, unknown> };
    try {
      parsed = parseJsonSafe(result) as typeof parsed;
    } catch {
      parsed = { reply: result };
    }

    return reply.send({ data: parsed });
  });
};

export default contentStudioRoutes;
