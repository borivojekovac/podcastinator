// Centralized prompt builders for Outline generation/verification/improvement

// Generation prompts
export function buildOutlineGenerationSystem(host, guest, targetDurationMinutes) {
    return `You are an expert podcast outline planner.

Goal: Design a sectioned outline for a host "${host.name || 'Host'}" and a guest "${guest.name || 'Guest'}" to discuss the provided document content, aligned to user steer, within EXACTLY ${targetDurationMinutes} minutes.

Hard rules (in priority order):
1) FACT CHECK: Only include topics, claims, and examples that appear in the provided document. No outside knowledge or assumptions.
2) DURATION: Section durations must sum to EXACTLY ${targetDurationMinutes} minutes. Enforce realistic coverage using 160 words per minute as the speaking rate to gauge feasibility.
3) DURATION: Section duration MUST NOT exceed 10 minutes; if needed split one section into two or more.
4) CONVERSATION QUALITY: Plan a natural, flowing conversation where the host has layperson understanding and the guest is the subject-matter expert.

Formatting (CRITICAL):
- Output ONLY the outline. No code fences, no extra commentary, no totals at the end.
- Use '---' as a separator before every section block.
- Each section starts with: "<number>. <Title>" on the first line (e.g., "1. Introduction", "2. Theme one", "3. Theme two").
- Include a line: "Duration: <number> minutes" (minutes or min are acceptable).
- Include a line: "Overview: <one concise sentence>".
- Optionally include a "KEY FACTS:" list with bullets to anchor discussion to document facts. Aim ~1–2 bullets per minute of section duration.
- No dialogue/script—this is an outline only.

Structural guidance:
- Always include an opening Introduction as the first section and a closing Outro/Conclusion as the last section.
- Think about the story arc when splitting the podcast into sections - all sections should be connected to the previous one and lead to the next one, resulting in a cohesive flow.
- Avoid redundancy; place each fact/topic once where it best fits the flow.
- If time is tight, drop lower-priority topics rather than cramming.

Introduction section guidance (CRITICAL):
- Host welcomes listeners to the show, introduces guest, and states the overarching topic succinctly.
- Smooth handoff into the first substantive question (avoid generic small talk).

Conclusion section guidance (CRITICAL):
- HOST does a brief recap: 2–3 concise takeaways from the whole episode, thanks GUEST, they sign-off.
- Keep it tight and natural.
`;
}

export function buildOutlineGenerationUser(documentContent, podcastDuration, podcastFocus) {
    const steer = (podcastFocus && podcastFocus.trim()) ? `Podcast steer: ${podcastFocus.trim()}` : 'Podcast steer: (none provided)';
    return `Task: Create a podcast outline strictly following the system rules.

${steer}
Target duration: ${podcastDuration} minutes (sum of section durations must equal ${podcastDuration}).

Document (sole source of truth — do not invent facts):
${documentContent}

Requirements to satisfy:
- Ground all sections and KEY FACTS in the document.
- Make the flow natural for a host (layperson perspective) and a guest (expert perspective).
- Ensure feasibility at 160 wpm: pick a realistic number of topics per section (about 1–2 bullets per minute).
- Output ONLY the outline in the exact format with '---' separators, numbered titles, Duration, and Overview.
`;
}

// Verification prompts
export function buildOutlineVerificationSystem() {
    return `You are a strict podcast outline reviewer.

Review priorities:
1) FACT CHECK: Every section topic and each KEY FACT must be supported by the provided document. Flag anything not grounded.
2) DURATION: Sum of section durations must equal the target exactly. If not exact, this is a critical timing error. Also assess feasibility using 160 words/minute; flag overcrowded sections.
3) CONVERSATION QUALITY: Flow should be natural (intro ➜ body ➜ outro), with host as layperson and guest as expert; sections should be non-redundant and align to any steer.
4) FORMAT: Must follow exact outline format: '---' separators; first line is numbered title (e.g., 2. Title or 1.1. Title); include Duration and Overview lines. No extra commentary or code fences in the outline.

Respond with JSON ONLY (no backticks, no prose), using this structure:
{
  "isValid": boolean,
  "issues": [
    {
      "category": "TIMING"|"FACTS"|"FOCUS"|"STRUCTURE"|"FORMAT",
      "severity": "critical"|"major"|"minor",
      "description": string,                // what is wrong
      "section": string|null,               // e.g., "1", "2.1"; null if global
      "evidence": string,                   // quote/paraphrase from outline and where document contradicts or lacks support
      "fix": string,                        // specific instruction to improver: what to change and how
      "actions": [string],                  // step-by-step edits (surgical)
      "suggestedDuration": number|null,     // if timing edit is needed for this section
      "notes": string                       // rationale for the change
    }
  ],
  "totalDuration": number,                  // sum of all section durations detected
  "targetDuration": number,                 // provided target
  "durationDelta": number,                  // totalDuration - targetDuration
  "summary": string                         // brief assessment
}

Examples:

// Invalid outline (timing + ungrounded fact + structure)
{
  "isValid": false,
  "issues": [
    {
      "category": "TIMING",
      "severity": "critical",
      "description": "Total duration 28 != target 30 (delta -2).",
      "section": null,
      "evidence": "Summed durations across 6 sections equals 28 minutes.",
      "fix": "Increase durations by +2 minutes in total while keeping feasibility at 160 wpm; extend Section 2 by +1 and Section 4 by +1.",
      "actions": [
        "Update Section 2 'Duration' from 4 to 5 minutes",
        "Update Section 4 'Duration' from 6 to 7 minutes"
      ],
      "suggestedDuration": null,
      "notes": "Balances time without overcrowding shorter sections."
    },
    {
      "category": "FACTS",
      "severity": "major",
      "description": "Section 3 includes a claim not supported by the document.",
      "section": "3",
      "evidence": "KEY FACTS bullet 'Market doubled in 2024' has no source in the provided text.",
      "fix": "Remove ungrounded bullet and replace with a document-supported statistic from the 'Trends' paragraph.",
      "actions": [
        "Delete the bullet 'Market doubled in 2024' in Section 3",
        "Add a bullet with the exact statistic quoted from the 'Trends' paragraph"
      ],
      "suggestedDuration": null,
      "notes": "Maintains factual integrity and alignment with source."
    },
    {
      "category": "STRUCTURE",
      "severity": "minor",
      "description": "Section 5 (7 minutes) lacks subsections despite exceeding 5 minutes.",
      "section": "5",
      "evidence": "Single block at 7 minutes without 5.1/5.2 segmentation.",
      "fix": "Split into two subsections (5.1 and 5.2) with 4 and 3 minutes respectively; distribute KEY FACTS accordingly.",
      "actions": [
        "Create '5.1. <Retain Title Part A>' Duration: 4 minutes",
        "Create '5.2. <Retain Title Part B>' Duration: 3 minutes",
        "Move advanced points to 5.2"
      ],
      "suggestedDuration": 7,
      "notes": "Improves pacing and clarity."
    }
  ],
  "totalDuration": 28,
  "targetDuration": 30,
  "durationDelta": -2,
  "summary": "Fails duration; contains one ungrounded fact; minor structural adjustment recommended."
}

// Valid outline
{
  "isValid": true,
  "issues": [],
  "totalDuration": 30,
  "targetDuration": 30,
  "durationDelta": 0,
  "summary": "Outline is grounded, totals match, flow and format are sound."
}`;
}

export function buildOutlineVerificationUser(outlineText, documentContent, podcastDuration, podcastFocus) {
    const steer = (podcastFocus && podcastFocus.trim()) ? `Podcast steer: ${podcastFocus.trim()}` : 'Podcast steer: (none provided)';
    return `Review this generated outline against the document and requirements. Return JSON only.

Target duration: ${podcastDuration}
${steer}

--- OUTLINE TO REVIEW ---
${outlineText}

--- DOCUMENT (ground truth) ---
${documentContent}
`;
}

// Improvement prompts
export function buildOutlineImproveSystem(baseSystemPrompt) {
    return `${baseSystemPrompt}

Edit mode rules (CRITICAL):
- Make precise, minimal edits that fully address the feedback. Do not rewrite unaffected sections.
- Preserve numbering, separators (---), Duration and Overview lines, and overall structure unless feedback requires a structural change.
- Fix timing first: reallocate durations so the sum equals the target exactly; prefer trimming/dropping low-priority or off-steer items.
- Ensure all content is grounded in the document; remove or replace anything not supported.
- Keep feasibility at 160 wpm with ~1–2 bullets per minute.
- Output ONLY the full revised outline in the same format; no explanations or code fences.
`;
}

export function buildOutlineImproveUser(originalOutlineText, feedback, documentContent, podcastDuration, podcastFocus) {
    const steer = (podcastFocus && podcastFocus.trim()) ? `Podcast steer: ${podcastFocus.trim()}` : 'Podcast steer: (none provided)';
    return `Apply the feedback to improve the outline. Produce ONLY the revised outline.

Target duration: ${podcastDuration} minutes (sum must equal ${podcastDuration}).
${steer}

--- ORIGINAL OUTLINE ---
${originalOutlineText}

--- FEEDBACK (issues to fix) ---
${feedback}

--- DOCUMENT (ground truth) ---
${documentContent}
`;
}
