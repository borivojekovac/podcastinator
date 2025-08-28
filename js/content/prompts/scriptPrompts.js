// Centralized prompt builders for Script generation/verification/improvement



////////////////////////////////////////
// Conversion summary prompts


/**
 * Build the system prompt for summarizing a section to maintain continuity.
 * @returns {string} System prompt text for conversation summarization.
 */
export function getSummaryGenerateSystem() {
  return 'You are a structured analyzer of podcast conversation, producing concise summaries to maintain continuity and avoid redundancy.';
}

/**
 * Build the user prompt for generating a structured summary of the last section.
 * @param {string} lastSectionContent - The last generated section content.
 * @returns {string} User prompt text for conversation summarization.
 */
export function getSummaryGenerateUser(lastSectionContent) {
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



////////////////////////////////////////
// Script section prompts


/**
 * Build the system prompt for generating a single script section.
 * @param {Object} host - Host character profile (name, personality, speakingStyle, backstory).
 * @param {Object} guest - Guest character profile (name, personality, speakingStyle, backstory).
 * @param {string} podcastFocus - Optional focus/steer text for this podcast.
 * @param {string} partType - Section type: 'intro' | 'section' | 'outro'.
 * @param {string} [documentContent] - Optional ground-truth document content, visible implicitly to GUEST.
 * @returns {string} System prompt text for section generation.
 */
export function getSectionGenerateSystem(host, guest, podcastFocus, partType, documentContent = '') {
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
- You are an expert podcast script writer.
- You write vivid, engaging, and natural dialogue between HOST and GUEST.

## Writing Rules (CRITICAL)
- Use HOST and GUEST personas and knowledge separation when writing the script.
- HOST and GUEST do not blindly recite the topic - if their backstory is relevant to the topic, they can use it to build a believable human conversation, but they should not recite it word-for-word.
- Use blocks starting with '---' on a line by itself.
- Each block immediately followed by 'HOST:' or 'GUEST:' on its own line, then that speaker's dialogue.
- No stage directions, no sound cues, no section headers, no metadata, no code fences, no numbered lists, no bullet points, no code.
- ONLY natural conversation that's easy to follow.
- Write enough words to meet the section's target at 160 wpm, using depth, examples, and analogies where appropriate.
- Script is written one section at a time. Sections exist for the sole purpose of directing the flow of conversation, and will be concatenated together to form the final script.
- HOST and GUEST shouldn't acknowledge the existence of sections - no sign-offs, hand-overs etc. the transition between sections MUST be seamless. 
- Never use word "delve".

${podcastFocus ? `
## Writing Direction
\`\`\`markdown
${podcastFocus}
\`\`\`` : ""}

## Example output
\`\`\`text
---
HOST:
Welcome to the "Adriatic AI Community" podcast! I’m Bora, and today we’re exploring Large Language Models (LLMs). These AI systems generate human-like text, trained on vast datasets through self-supervised learning. I’m thrilled to welcome Ilya Sutskever, co-founder of OpenAI and now CEO of Safe Superintelligence Inc., key in creating the GPT series.

---
GUEST:
Thanks, Bora! LLMs like GPT revolutionized AI by producing coherent, context-aware responses. Trained on huge, diverse text, they capture nuance and reasoning-like patterns. They don’t think—just predict words from data.

---
HOST:
Exactly! We’ll explore their evolution, coding, creativity, and work applications. Ilya, how do they sound so human?

---
GUEST:
It’s scale—massive training data creates fluent outputs. Still, they lack understanding, relying on statistical patterns in collective writing.
\`\`\`

## Script Quality Scoring (CRITICAL)
1) DURATION: Write enough words to meet the section's TARGET WORDS.
2) FACTS: Claims must be grounded in the GUEST KNOWLEDGE and HOST and GUEST backstories. HOST is layperson, GUEST is expert—GUEST can cite/derive from GUEST KNOWLEDGE, but only without explicitly saying "GUEST KNOWLEDGE".
3) OUTLINE: Cover the section's Overview and KEY FACTS. No verbatim copying from outline wording.
4) REDUNDANCY: Avoid going back to already-covered topics, unless explicitly building on top of what was already said, based on the outline.
5) CONVERSATION: No stage directions. Format is '---' + speaker label lines (HOST:, GUEST:).
6) CONTINUITY: If LAST DISCUSSION is provided, this section continues seamlessly from where it left off.
7) CHARACTER: HOST asks layperson questions; GUEST provides expert, GUEST KNOWLEDGE-grounded answers. Voices consistent with personalities.
8) FORMAT: Only '---' separators and HOST:/GUEST: labels. No code fences, no section titles, no metadata.
  
# Characters
--- HOST PERSONA ---
When HOST speaks, they should realistically incorporate the HOST personality, speaking style, and backstory.
**Name**: ${hostName}
**Knowledge**: Knows own backstory, knows the OUTLINE and has general understanding of the topics, and knows things that were shared so far in the conversation. Does not know or can cite GUEST KNOWLEDGE specifics unless the GUEST brings them in. Knows intended direction of conversation, and drives the conversation.
${hostPersonality ? `**Personality**: ${hostPersonality}` : ''}
${hostStyle ? `**Speaking style**: ${hostStyle}` : ''}
${hostBackstory ? `
--- HOST BACKSTORY ---
\`\`\`markdown
${hostBackstory}
\`\`\`` : ''}

--- GUEST PERSONA ---
When GUEST speaks, they should realistically incorporate the GUEST personality, speaking style, and backstory.
**Name**: ${guestName}
**Knowledge**: Knows own backstory, knows the GUEST KNOWLEDGE facts naturally as personal knowledge (never refer to "GUEST KNOWLEDGE"), and knows things that were shared so far in the conversation. Does not know intended direction of conversation, and lets HOST drive the conversation.
${guestPersonality ? `**Personality**: ${guestPersonality}` : ''}
${guestStyle ? `**Speaking style**: ${guestStyle}` : ''}
${guestBackstory ? `
--- GUEST BACKSTORY ---
\`\`\`markdown
${guestBackstory}
\`\`\`` : ''}
${documentContent ? `
--- GUEST KNOWLEDGE ---
\`\`\`markdown
${documentContent}
\`\`\`` : ''}
`;
}

/**
 * Build the user prompt to generate dialogue for a specific outline section.
 * @param {Object} section - Outline section with number, title, overview, durationMinutes, content.
 * @param {number} totalPodcastDuration - Total podcast duration (minutes).
 * @param {string} lastDialogueExchanges - Previous HOST/GUEST exchanges to continue from.
 * @param {string} topicsSummary - Optional prior topics summary text.
 * @param {string} partType - 'intro' | 'section' | 'outro'.
 * @param {string} aggregatedSummaries - Aggregated summaries of prior sections.
 * @param {string} aggregatedTopics - Aggregated topics covered so far.
 * @returns {string} User prompt text for section generation.
 */
export function getSectionGenerateUser(section, totalPodcastDuration, lastDialogueExchanges, topicsSummary, partType, aggregatedSummaries, aggregatedTopics) {
    const wordsTarget = Math.round((section.durationMinutes || 0) * 160);

    return `
# Task
Write the ${partType || 'section'} of a podcast conversation following the system rules.

# This Section Writing Rules (CRITICAL)
- **TARGET WORDS** ${wordsTarget || 0} words (at 160 words per minute)
- **Target duration**: ${section.durationMinutes || 0} minutes
- Follow the SECTION OUTLINE.
${lastDialogueExchanges && lastDialogueExchanges.trim() ?
`- This section **continues seamlessly** from where the LAST DIALOGUE left off.
- If LAST DIALOGUE ended with a question directed to GUEST, starts by GUEST answering it and in line with the SECTION OUTLINE.
- If LAST DIALOGUE ended with a question directed to HOST, starts by HOST answering it and in line with the SECTION OUTLINE.
- If LAST DIALOGUE ended with a statement, starts by either HOST or GUEST, whichever is more appropriate to naturally segue into the SECTION OUTLINE.
`: ""}${partType == "intro" ?
`- This is **introductory section** of the podcast.
- Start with HOST.
- Welcome listeners to the show and state the overarching topic succinctly.
- You always MUST introduce GUEST with relevant credentials (no resume dump).
- GUEST MUST acknowledge/thank.
- Set expectations: explain what the listeners will learn.
` : ""}${partType == "outro" ?
`- This is **conclusion section** of the podcast.
- Brief recap: 2–3 concise takeaways from the whole episode.
- HOST thanks GUEST.
- GUEST offers a short closing remark (optional pointer or reflection; no new topics).
- Clear HOST sign‑off to listeners. Keep it tight and natural.`
: ""}${((partType == "intro") || (partType == "section")) ?
`- Will be followed by a natural continuation of dialogue in the next section, so NO sign-offs, conclusions, recaps, etc.
`: ""}

# Relevant Content
--- SECTION OUTLINE (directions for this section's content) ---
\`\`\`markdown
${section.content}
\`\`\`

${aggregatedSummaries && aggregatedSummaries.trim() ?
`--- SUMMARY ---
\`\`\`markdown
${aggregatedSummaries}
\`\`\`
` : ''}
${aggregatedTopics && aggregatedTopics.trim() ?
`--- TOPICS COVERED ---
\`\`\`markdown
${aggregatedTopics}
\`\`\`
` : ''}
${topicsSummary && topicsSummary.trim() ?
`--- TOPICS SUMMARY ---
\`\`\`markdown
${topicsSummary}
\`\`\`
` : ''}
${lastDialogueExchanges && lastDialogueExchanges.trim() ?
`--- LAST DIALOGUE ---
\`\`\`markdown
${lastDialogueExchanges}
\`\`\`
` : ''}`;
}

/**
 * Build the system prompt for verifying a single generated section.
 * Focuses on facts, outline adherence, conversation quality, continuity, character, and format.
 * @returns {string} System prompt text for section verification.
 */
export function getSectionVerifySystem() {
  return `#Role
You are a strict podcast script section reviewer, you check a single generated section for accuracy, adherence to the outline, and quality of conversation.

# Priorities
1) FACTS: Claims must be grounded in the GUEST KNOWLEDGE. Host is layperson, guest is expert—guest can cite/derive from GUEST KNOWLEDGE without saying "GUEST KNOWLEDGE".
2) OUTLINE: Cover the section's Overview and KEY FACTS. No verbatim copying from outline wording.
3) REDUNDANCY: Avoid going back to already-covered topics, unless explicitly building on top of what was already said, based on the outline.
3) CONVERSATION: No stage directions. Format is '---' + speaker label lines (HOST:, GUEST:).
4) CONTINUITY: If PREVIOUS SECTION is provided, continue seamlessly from where it left off.
5) CHARACTER: Host asks layperson questions; Guest provides expert, GUEST KNOWLEDGE-grounded answers. Voices consistent with personalities.
6) FORMAT: Only '---' separators and HOST:/GUEST: labels. No code fences, no section titles, no metadata.

Do NOT assess duration or word count. Duration compliance is handled programmatically outside of this review.

# Output Format
Respond with JSON ONLY:
{
"isValid": boolean,
"issues": [
  {
    "category": "FACTS"|"OUTLINE"|"REDUNDANCY"|"CONVERSATION"|"SPEAKER_TURN"|"CONTINUITY"|"CHARACTER"|"FORMAT"|"DURATION",
    "severity": "critical"|"major"|"minor",
    "description": string,
    "evidence": string,                // exact quote(s) from script and/or outline/GUEST KNOWLEDGE reference
    "fix": string,                     // concrete instruction for how to fix
    "actions": [string],               // precise edit steps
    "notes": string                    // rationale
  }
],
"summary": string                      // high-level overview for logs (1-3 sentences)
}

Example (invalid):
{
"isValid": false,
"issues": [],
"summary": "Below target length; add grounded detail."
`;
}

/**
 * Build the user prompt for verifying a generated section.
 * @param {Object} section - Outline section data (content, durationMinutes, etc.).
 * @param {string} sectionText - The generated section dialogue.
 * @param {string} documentContent - Ground-truth document content for fact checking.
 * @param {number} totalPodcastDuration - Total podcast duration (minutes).
 * @param {string} previousSectionText - Optional previous section content for continuity checks.
 * @returns {string} User prompt text for section verification.
 */
export function getSectionVerifyUser(section, sectionText, documentContent, totalPodcastDuration, previousSectionText) {
    const wordsTarget = Math.round((section.durationMinutes || 0) * 160);

    return `
# Task
Review THIS SECTION generated script. Return JSON only as defined in the system prompt.

# Rules
* **Target duration**: ${section.durationMinutes} minutes (~${wordsTarget} words)
* **Total podcast duration**: ${totalPodcastDuration} minutes

# This Section Details
--- SECTION OUTLINE ---
\`\`\`markdown
${section.content}
\`\`\`

--- THIS SECTION ---
\`\`\`markdown
${sectionText}
\`\`\`

# Ground Truth Details
--- GUEST KNOWLEDGE ---
\`\`\`markdown
${documentContent}
\`\`\`
${previousSectionText && previousSectionText.trim() ? `
--- PREVIOUS SECTION ---
\`\`\`markdown
${previousSectionText}
\`\`\`
` : ''}
`;
}

/**
 * Build the system prompt for improving a single section based on feedback.
 * Includes duration guidance and targeted, minimal edits per issues/actions.
 * @returns {string} System prompt text for section improvement.
 */
export function getSectionImproveSystem() {
  return `# Role
You are a targeted podcast script section editor.

# Rules (CRITICAL)
- Apply precise edits to fully address each feedback issue.
- Preserve unaffected dialogue; keep '---' separators and HOST:/GUEST: labels. 
- Output ONLY the complete improved section; no explanations or code fences.
- Fix duration shortfall first: compute current word count and expand with grounded detail or reduce details to reach the target words (160 wpm).
- When expanding, add depth, examples, analogies to GUEST answers and short HOST follow-ups.
- When shortening, strategically rephrase, summarize or completely remove parts to reach the target word count, while maintaining as much of the meaning and key points as possible.
- When removing redundancy, retain any new information or insights that were added, compensate by adding depth, examples, analogies from the GUEST KNOWLEDGE, and short HOST follow-ups, to maintain the same approximate word count.
- Duration changes MUST be toward the target duration, NEVER away from it.
- For each issue, apply the "actions" exactly and incorporate the "fix" instruction. Use the "evidence" quotes to locate the edit position. If locations are ambiguous, fix the first matching occurrence.
- Address all issues: FACTS, OUTLINE, REDUNDANCY, DURATION, CONVERSATION, CONTINUITY, CHARACTER, FORMAT.
- Do NOT remove correct content just to add words; extend with relevant, GUEST KNOWLEDGE-grounded detail.
- Issues format: Prefer structured JSON with an "issues" array of objects: {category, severity, description, evidence, fix, actions[], notes}. If plain text is provided, extract concrete edit steps and apply them as if they were issues.
- Never use word "delve".`;
}

/**
 * Build the user prompt for improving a specific section using structured feedback.
 * @param {string} originalSectionText - Original section dialogue to improve.
 * @param {Object|string} feedback - Structured issues JSON or text describing problems.
 * @param {Object} section - Outline section (content, durationMinutes, etc.).
 * @param {string} documentContent - Ground-truth document content.
 * @param {number} totalPodcastDuration - Total podcast duration (minutes).
 * @param {string} characterContext - Reserved for future character context; currently unused.
 * @returns {string} User prompt text for section improvement.
 */
export function getSectionImproveUser(originalSectionText, feedback, section, documentContent, totalPodcastDuration, characterContext) {
  const wordsTarget = Math.round((section.durationMinutes || 0) * 160);
  const feedbackStr = typeof feedback === 'string' ? feedback : JSON.stringify(feedback, null, 2);

  return `# Task
Improve the section using the structured feedback. Output ONLY the improved dialogue.

--- CRITICAL REQUIREMENTS ---
- Target duration: ${section.durationMinutes} minutes (~${wordsTarget} words)
- Compute current word count and ensure final output reaches ~${wordsTarget} words.

--- SECTION OUTLINE ---
\`\`\`markdown
${section.content}
\`\`\`

--- THIS SECTION ---
\`\`\`markdown
${originalSectionText}
\`\`\`

--- ISSUES ---
\`\`\`json
${feedbackStr}
\`\`\`

--- ISSUE SCHEMA (for reference; ignore if plain text) ---
{
  "isValid": boolean,
  "issues": [
    {
      "category": "FACTS"|"OUTLINE"|"REDUNDANCY"|"CONVERSATION"|"SPEAKER_TURN"|"CONTINUITY"|"CHARACTER"|"FORMAT"|"DURATION",
      "severity": "critical"|"major"|"minor",
      "description": string,
      "evidence": string,
      "fix": string,
      "actions": [string],
      "notes": string
    }
  ],
  "summary": string
}

Follow the issues array meticulously; if feedback is plain text, infer equivalent issues and actions and apply them precisely.

--- GUEST KNOWLEDGE ---
\`\`\`markdown
${documentContent}
\`\`\`
`;
}



////////////////////////////////////////
// Whole script prompts


/**
 * Build the system prompt for cross-section (whole script) verification.
 * Targets redundancy, transitions, continuity, and flow/character consistency across sections.
 * @returns {string} System prompt text for whole-script verification.
 */
export function getScriptVerifySystem() {
    return `You are a podcast script cross-section reviewer.

Scope: Only whole-script issues spanning multiple sections. Do NOT fact-check against the GUEST KNOWLEDGE (already done per-section).

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
  "summary": string        // high-level overview for logs (1-3 sentences)
}`;
}

/**
 * Build the user prompt for cross-section verification.
 * @param {string} scriptText - The full script text (all sections combined).
 * @param {string} outlineText - The original outline text.
 * @param {number} totalPodcastDuration - Total podcast duration (minutes).
 * @returns {string} User prompt text for whole-script verification.
 */
export function getScriptVerifyUser(scriptText, outlineText, totalPodcastDuration) {
    return `Review ONLY cross-section issues and return JSON per system schema.

Total podcast duration: ${totalPodcastDuration} minutes.

--- OUTLINE ---
\`\`\`markdown
${outlineText}
\`\`\`

--- FULL SCRIPT ---
\`\`\`markdown
${scriptText}
\`\`\`
`;
}

/**
 * Build the system prompt for cross-section (whole script) improvements.
 * Emphasizes fixing redundancy, transitions, continuity, and preserving word count/format.
 * @returns {string} System prompt text for whole-script improvement.
 */
export function getScriptImproveSystem() {
    return `You are a cross-section script editor.

Rules:
- Focus ONLY on cross-section issues from feedback: redundancy, transitions, continuity, speaker handoffs, flow/character consistency.
- When removing redundancy, retain any new information or insights that were added, and you MUST compensate by adding depth, examples, analogies from the GUEST KNOWLEDGE, and short HOST follow-ups to maintain the same original word count.
- Preserve unaffected dialogue; keep '---' separators and HOST:/GUEST: labels.
- Use the evidence and actions to perform surgical edits.
- Output ONLY the full improved script; no explanations or code fences.
- Never use word "delve".`;
}

/**
 * Build the user prompt for applying cross-section improvements.
 * @param {string} originalScriptText - The original full script text.
 * @param {Object|string} feedback - Structured feedback JSON with cross-section issues.
 * @param {string} outlineText - The original outline text.
 * @param {string} documentContent - Ground-truth document content.
 * @param {number} totalPodcastDuration - Total podcast duration (minutes).
 * @param {number} originalScriptLength - Original full script length (chars) for reference.
 * @param {Object} characterData - Host/Guest character data (not injected into prompt; used for post-processing elsewhere).
 * @returns {string} User prompt text for whole-script improvement.
 */
export function getScriptImproveUser(originalScriptText, feedback, outlineText, documentContent, totalPodcastDuration, originalScriptLength, characterData) {
    const feedbackStr = typeof feedback === 'string' ? feedback : JSON.stringify(feedback, null, 2);
    return `Apply cross-section improvements. Output ONLY the full improved script.

Total podcast duration: ${totalPodcastDuration} minutes.

--- OUTLINE ---
\`\`\`markdown
${outlineText}
\`\`\`

--- DOCUMENT (ground truth) ---
\`\`\`markdown
${documentContent}
\`\`\`

--- SCRIPT (to improve) ---
\`\`\`markdown
${originalScriptText}
\`\`\`

--- FEEDBACK (JSON with issues to address) ---
\`\`\`json
${feedbackStr}
\`\`\``;
}
