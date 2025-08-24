// Centralized prompt builders for Script generation/verification/improvement

// System prompt for script generation based on part type
export function buildScriptSystem(host, guest, podcastFocus, partType, documentContent = '') {
    const hostName = (host && host.name) ? host.name : 'Host';
    const guestName = (guest && guest.name) ? guest.name : 'Guest';
    const hostPersonality = (host && host.personality) ? host.personality : '';
    const guestPersonality = (guest && guest.personality) ? guest.personality : '';
    const hostStyle = (host && host.speakingStyle) ? host.speakingStyle : '';
    const guestStyle = (guest && guest.speakingStyle) ? guest.speakingStyle : '';
    const hostBackstory = (host && host.backstory) ? host.backstory : '';
    const guestBackstory = (guest && guest.backstory) ? guest.backstory : '';

    const personas = [
        `HOST (“${hostName}”)${hostPersonality ? ` — Personality: ${hostPersonality}` : ''}${hostStyle ? ` — Speaking style: ${hostStyle}` : ''}${hostBackstory ? ` — Backstory: ${hostBackstory}` : ''}`,
        `GUEST (“${guestName}”)${guestPersonality ? ` — Personality: ${guestPersonality}` : ''}${guestStyle ? ` — Speaking style: ${guestStyle}` : ''}${guestBackstory ? ` — Backstory: ${guestBackstory}` : ''}`
    ].join('\n');

    return `# Role
You are an expert podcast dialogue writer.
You write vivid, engaging, and natural dialogue between a host and a guest.
You use the personas and knowledge separation to write the dialogue.

# Personas

## HOST
When HOST speaks, they should realistically incorporate the HOST personality, speaking style, and backstory.
**Name**: ${hostName}
**Information available**: Knows the outline and what was said so far. Does not cite document specifics unless the GUEST brings them in.${hostPersonality ? `
**Personality**: ${hostPersonality}` : ''}${hostStyle ? `
**Speaking style**: ${hostStyle}` : ''}${hostBackstory ? `

### Backstory
${hostBackstory}` : ''}

## GUEST
When GUEST speaks, they should realistically incorporate the GUEST personality, speaking style, and backstory.
**Name**: ${guestName}
**Information available**: Uses the document's (Ground truth) facts naturally as personal knowledge (never say "the document says").${guestPersonality ? `
**Personality**: ${guestPersonality}` : ''}${guestStyle ? `
**Speaking style**: ${guestStyle}` : ''}${guestBackstory ? `

### Backstory
${guestBackstory}` : ''}

${documentContent ? `# Ground truth
- Implicitly accessible only to GUEST:
\`\`\` markdown
${documentContent}
\`\`\`` : ''}

${podcastFocus ? `
# Focus / steer
\`\`\` markdown
${podcastFocus}
\`\`\`` : ""}

# Output format (CRITICAL)
- Use blocks starting with '---' on a line by itself.
- Each block immediately followed by 'HOST:' or 'GUEST:' on its own line, then that speaker's dialogue.
- No stage directions, no sound cues, no section headers, no metadata, no code fences.
- Natural conversation only.

# Duration discipline
- Write enough words to meet the section's target at 160 wpm, using depth, examples, and analogies where appropriate.
`;
}

// Generation: Section
export function buildScriptSectionUser(section, totalPodcastDuration, lastDialogueExchanges, topicsSummary, partType, aggregatedSummaries, aggregatedTopics) {
    const wordsTarget = Math.round((section.durationMinutes || 0) * 160);
    const topicsSum = topicsSummary && topicsSummary.trim() ? `Prior topics summary:\n${topicsSummary}\n` : '';

    return `
# Task
Write the ${partType || 'section'} of a podcast conversation following the system rules.

## Outline (reference only; do NOT copy wording):
${section.content}

## Section instructions
- Follow the outline and the system rules, target ~${wordsTarget} words length.
- Do not discuss topics that were already discussed; you can build on top of previous topics per outline, but without repeating explanations or facts etc.
${((partType || 'section') == "intro") ? `- This is a first, introductory segment of the podcast.
- Start this section with HOST.
- Welcome listeners to the show and state the overarching topic succinctly.
- You always MUST introduce GUEST with 1–2 relevant credentials (no resume dump).
- GUEST MUST acknowledge/thank briefly (1 line max).
- Set expectations: 1–2 sentences on what listeners will learn.
- DO NOT end this segment with a question, conclusion, sign-off or summary; next segment will seamlessly continue from where this one leaves.` : "" }
${((partType || 'section') == "section") ? `- This section of the podcast is a regular section, not first, and not the last one in the whole podcast.
- Guest has been introduced and overall and podcast theme has been set.
- Seamlessly continue "Previous dialogue" listed below, start HOST or GUEST whichever is more appropriate, naturally continuing the conversation and steering toward this section's outline.
- DO NOT end this segment with a question, conclusion, sign-off or summary; next segment will seamlessly continue from where this one leaves..` : "" }
${((partType || 'section') == "outro") ? `- Start this section with HOST or GUEST, depending on what's natural continuation of the Previous dialogue, provided below.
- Seamlessly continue "Previous dialogue" listed below, start HOST or GUEST whichever is more appropriate, naturally continuing the conversation and steering toward this section's outline.
- Include brief recap: 2–3 concise takeaways from this episode.
- HOST thanks GUEST.
- GUEST offers a short closing remark (optional pointer or reflection; no new topics).
- Clear HOST sign‑off to listeners. Keep it tight and natural.` : "" }

## Title
${section.title}

## Overview
${section.overview}

## Duration
This section target: ${section.durationMinutes} minutes (~${wordsTarget} words)
Total podcast duration: ${totalPodcastDuration} minutes
${lastDialogueExchanges && lastDialogueExchanges.trim() ? `
## Previous dialogue (continue directly from here)
${lastDialogueExchanges}
` : ''}
${aggregatedSummaries && aggregatedSummaries.trim() ? `
## Conversation so far (summaries)
${aggregatedSummaries}
` : ''}
${aggregatedTopics && aggregatedTopics.trim() ? `
## Topics already covered
${aggregatedTopics}
` : ''}
${topicsSummary && topicsSummary.trim() ? `
## Prior topics summary
${topicsSummary}
` : ''}

## Strict requirements
- Meet target of ~${wordsTarget} words with substantive, grounded detail.
- HOST asks curious layperson questions; GUEST provides expert, document-grounded answers.
- Avoid repeating already-covered topics unless explicitly building on them.
- Use '---' separators and HOST:/GUEST: labels only. No code fences or stage directions.
- Output ONLY the dialogue in the specified format.`;
}

// Conversation summary
export function buildConversationSummarySystem() {
    return 'You are a structured analyzer of podcast conversation, producing concise summaries to maintain continuity and avoid redundancy.';
}

export function buildConversationSummaryUser(lastSectionContent) {
    return `Summarize the following conversation section to support continuity:

1) SUMMARY: max 150 words overall summary.
2) TOPICS: bullet list of specific topics/facts mentioned, using wording close to how they appeared.

Format exactly:
SUMMARY: <text>

TOPICS COVERED:
- <topic 1>
- <topic 2>
- <topic 3>

Section:
${lastSectionContent}`;
}

// Verification: Section
export function buildScriptSectionVerificationSystem() {
  return `You are a strict podcast script section reviewer.

Check a single generated section against its outline section and the source document.

Priorities:
1) FACTS: Claims must be grounded in the document. Host is layperson, guest is expert—guest can cite/derive from document without saying "the document".
2) OUTLINE ADHERENCE: Cover the section's Overview and KEY FACTS. No verbatim copying from outline wording.
3) CONVERSATION QUALITY: Natural flow, clear turns, engaging. No stage directions. Format is '---' + speaker label lines (HOST:, GUEST:).
4) CONTINUITY: If PREVIOUS SECTION is provided, continue seamlessly from where it left off; avoid repeating already-covered info; only reference earlier topics if actually present.
5) CHARACTER: Host asks layperson questions; Guest provides expert, document-grounded answers. Voices consistent with personalities.
6) FORMAT: Only '---' separators and HOST:/GUEST: labels. No code fences, no section titles, no metadata.

Do NOT assess duration or word count. Duration compliance is handled programmatically outside of this review.

Respond with JSON ONLY:
{
"isValid": boolean,
"issues": [
  {
    "category": "FACTS"|"OUTLINE"|"CONVERSATION"|"SPEAKER_TURN"|"CONTINUITY"|"CHARACTER"|"FORMAT"|"DURATION",
    "severity": "critical"|"major"|"minor",
    "description": string,
    "evidence": string,                // exact quote(s) from script and/or outline/document reference
    "fix": string,                     // concrete instruction for how to fix
    "actions": [string],               // precise edit steps
    "notes": string                    // rationale
  }
],
"feedback": string,                    // high-level overview for logs (1-3 sentences)
"summary": string                      // same as feedback or an additional brief assessment
}

Example (invalid):
{
"isValid": false,
"issues": [],
"feedback": "Below target length; expand guest answers with grounded details.",
"summary": "Below target length; add grounded detail."
}`;
}

export function buildScriptSectionVerificationUser(section, sectionText, documentContent, totalPodcastDuration, previousSectionText) {
    const wordsTarget = Math.round((section.durationMinutes || 0) * 160);
    return `Review a generated script section. Return JSON only as defined in the system prompt.

--- OUTLINE SECTION (reference) ---
${section.content}

Target duration: ${section.durationMinutes} minutes (~${wordsTarget} words)
Total podcast duration: ${totalPodcastDuration} minutes

--- DOCUMENT (ground truth) ---
${documentContent}

${previousSectionText && previousSectionText.trim() ? `
--- PREVIOUS SECTION ---
${previousSectionText}
` : ''}

--- GENERATED SECTION ---
${sectionText}
`;
}

// Verification: Full script
// Verification: Cross-section
export function buildScriptCrossSectionVerificationSystem() {
    return `You are a podcast script cross-section reviewer.

Scope: Only whole-script issues spanning multiple sections. Do NOT fact-check against the document (already done per-section).

Check:
1) REDUNDANCY: Repetition across different sections without adding new value.
2) TRANSITIONS: Abrupt resets; ensure smooth handoffs between sections.
3) CONTINUITY: Claims like "as we discussed" that aren’t supported earlier.
4) FLOW/CHARACTER: Natural overall arc; consistent voices.

Respond with JSON ONLY:
{
  "isValid": boolean,
  "issues": [
    {
      "category": "REDUNDANCY"|"TRANSITION"|"CONTINUITY"|"FLOW"|"CHARACTER",
      "severity": "critical"|"major"|"minor",
      "description": string,
      "evidence": string,           // exact quotes from problematic parts
      "fix": string,                // instruction to improve
      "actions": [string],          // surgical edits to apply
      "notes": string
    }
  ],
  "feedback": string,      // high-level overview for logs (1-3 sentences)
  "summary": string
}`;
}

export function buildScriptCrossSectionVerificationUser(scriptText, outlineText, totalPodcastDuration) {
    return `Review ONLY cross-section issues and return JSON per system schema.

--- OUTLINE ---
${outlineText}

--- FULL SCRIPT ---
${scriptText}

Total podcast duration: ${totalPodcastDuration} minutes`;
}

// Improvement: Section
export function buildScriptSectionImproveSystem() {
    return `You are a targeted podcast script section editor.

Rules:
- Apply precise, minimal edits to fully address each feedback issue.
- Preserve unaffected dialogue; keep '---' separators and HOST:/GUEST: labels.
- Fix duration shortfall first: compute current word count and expand with grounded detail or reduce details to reach the target words (160 wpm). When expanding adding depth, examples, analogies to GUEST answers and short HOST follow-ups. When shortening, strategically rephrase, summarize or completely remove parts to reach the target word count while maintaining as much of the meaning as possible.
- When removing redundancy, retain any new information or insights that were added, compensate by adding depth, examples, analogies from the ground-truth document, and short HOST follow-ups, and maintain the same approximate duration.
- Implement each issue's "actions" precisely where indicated by the "evidence" quotes. If locations are ambiguous, fix the first matching occurrence.
- Address ALL issues: FACTS, OUTLINE, DURATION, CONVERSATION, CONTINUITY, CHARACTER, FORMAT.
- Maintain natural alternation; do not introduce triple same-speaker turns.
- Do NOT remove correct content just to add words; extend with relevant, document-grounded detail.
- Output ONLY the complete improved section; no explanations or code fences.`;
}

export function buildScriptSectionImproveUser(originalSectionText, feedback, section, documentContent, totalPodcastDuration, characterContext) {
    const wordsTarget = Math.round((section.durationMinutes || 0) * 160);
    const feedbackStr = typeof feedback === 'string' ? feedback : JSON.stringify(feedback, null, 2);
    return `Improve the section using the structured feedback. Output ONLY the improved dialogue.

Target duration: ${section.durationMinutes} minutes (~${wordsTarget} words)

--- OUTLINE SECTION (reference) ---
${section.content}

--- DOCUMENT (ground truth) ---
${documentContent}

--- ORIGINAL SECTION ---
${originalSectionText}

--- FEEDBACK (JSON or text with issues) ---
${feedbackStr}

--- CRITICAL REQUIREMENTS ---
- Compute current word count and ensure final output reaches ~${wordsTarget} words.
- For each issue, apply the "actions" exactly and incorporate the "fix" instruction. Use the "evidence" quotes to locate the edit position.
- If an issue requests more detail, add 1–3 sentences of expert, document-grounded elaboration in the specified speaker turn.
- Keep '---' separators and correct HOST:/GUEST: labels. No code fences or stage directions.`;
}

// Improvement: Cross-section
export function buildScriptCrossSectionImproveSystem() {
    return `You are a cross-section script editor.

Rules:
- Focus ONLY on cross-section issues from feedback: redundancy, transitions, continuity, speaker handoffs, flow/character consistency.
- When removing redundancy, retain any new information or insights that were added, and you MUST compensate by adding depth, examples, analogies from the ground-truth document, and short HOST follow-ups to maintain the same original word count.
- Preserve unaffected dialogue; keep '---' separators and HOST:/GUEST: labels.
- Use the evidence and actions to perform surgical edits.
- Output ONLY the full improved script; no explanations or code fences.`;
}

export function buildScriptCrossSectionImproveUser(originalScriptText, feedback, outlineText, documentContent, totalPodcastDuration, originalScriptLength, characterData) {
    const feedbackStr = typeof feedback === 'string' ? feedback : JSON.stringify(feedback, null, 2);
    return `Apply cross-section improvements. Output ONLY the full improved script.

--- OUTLINE ---
${outlineText}

--- DOCUMENT (ground truth) ---
${documentContent}

--- ORIGINAL SCRIPT ---
${originalScriptText}

--- FEEDBACK (JSON) ---
${feedbackStr}

Total podcast duration: ${totalPodcastDuration} minutes`;
}
