// Centralized prompt builders for Script generation/verification/improvement

// Verification: Section
export function buildScriptSectionVerificationSystem() {
    return `You are a podcast script section quality checker. Analyze a specific section of a podcast script for quality, coherence, and adherence to requirements.

Evaluate the following criteria:
1. DURATION COMPLIANCE (HIGHEST PRIORITY): Verify the script meets the target word count (160 words per minute) for the section's duration. If the word count is below target, the script MUST be marked invalid.
2. COMPLETENESS: Verify that the script covers all key points from the outline
3. RELEVANCE: Check if the script stays focused on the topic without tangential discussions
4. ACCURACY: Ensure the script is factually consistent with the document content
5. CONSISTENCY: Check for internal consistency and lack of contradictions
6. ENGAGING DIALOGUE: Ensure the script sounds like a natural conversation from the outline
7. COVERAGE: Check if the section adequately covers the topic without omitting key information
8. REDUNDANCY CHECK (HIGH PRIORITY): Identify any redundant content or repetitive dialogue, especially if this section repeats information from previous sections
9. CONVERSATIONAL FLOW: Verify that the dialogue feels natural and flows well between speakers
10. CHARACTER CONSISTENCY: Ensure host and guest voices maintain consistent personalities

Respond with a detailed JSON object containing:
- "isValid": true if the section meets all quality criteria, false otherwise
- "feedback": high-level summary of findings
- "issues": array of specific issues, each containing:
  * "type": issue type ("accuracy", "outline", "duration", "speaker_turn", "continuity", "conversation", "format")
  * "description": detailed description of the issue
  * "location": exact quote from the script showing the problematic text
  * "recommendation": specific suggestion on how to fix the issue

For each issue found, you MUST include exact quotes from the script to precisely identify where the problem occurs. Be very specific in your recommendations for fixes.

If the section is high quality and follows the outline well, respond with {"isValid": true, "feedback": "Section is well-structured and follows the outline appropriately.", "issues": []}`;
}

// System prompt for script generation based on part type
export function buildScriptSystem(host, guest, podcastFocus, partType, documentContent = '') {
    let basePrompt = `# Podcast Script Generator Instructions

## Characters

### Host: "${host.name || 'Host'}"
${host.personality ? `Personality: ${host.personality}\n` : ''}
${host.backstory ? `#### Host Backstory\n\n\`\`\` markdown\n${host.backstory}\n\`\`\`` : ''}

### Guest: "${guest.name || 'Guest'}"
${guest.personality ? `Personality: ${guest.personality}\n` : ''}
${guest.backstory ? `#### Guest Backstory\n\n\`\`\` markdown\n${guest.backstory}\n\`\`\`` : ''}

## Role Knowledge Separation (CRITICAL)

- The **HOST** only knows the podcast outline and what was said so far, therefore cannot reference specific document details unless the GUEST mentions them first
- The **HOST** should guide the conversation based on the outline topics only
- The **GUEST** has full knowledge of the document content and can provide detailed insights, examples, and quotes from it
- The **GUEST** should share expertise from the document without mentioning that it comes from "the document" - it should sound like their own knowledge

${podcastFocus ? `## Podcast Focus/Steer
\`\`\` markdown
${podcastFocus}
\`\`\`
` : ''}`;

    if (documentContent) {
        basePrompt += `

## Document Content (Only the GUEST has knowledge of this information)
\`\`\` markdown
${documentContent}
\`\`\``;
    }

    basePrompt += `

## Formatting Requirements (CRITICAL)

- NEVER include any verbatim text from the outline in the script
- DO NOT copy-paste phrases, sentences or paragraphs from the outline into the script
- Completely rephrase all content from the outline into natural conversational dialogue
- Use the outline only as a reference for topics and structure, not for wording
- Begin each speaker's dialogue with "---" followed by either "HOST:" or "GUEST:" on its own line
- DO NOT include character names, descriptions, or any other text after HOST: or GUEST:
- DO NOT include ANY stage directions, action descriptions, or non-verbal cues [like this]
- DO NOT include ANY section markers, separators, or titles
- Create natural-sounding conversational dialogue suitable for text-to-speech
- Text should contain only what would be actually spoken aloud
- NEVER refer to "segments", "sections", or "parts" of the podcast - the conversation should flow naturally as a single discussion
        - CRITICAL DURATION REQUIREMENT: Generate exactly enough dialogue to meet the target duration. At 160 words per minute, a section must meet its word count target.
        - LENGTH PENALTY: Scripts consistently run short. Add substantive detail and depth until you reach or slightly exceed the target word count.
        - VERBOSITY REQUIRED: Prefer longer turns with detailed explanations over brief exchanges. Include examples, analogies, and elaboration to reach word targets.
        - MEASURE YOUR OUTPUT: Count your generated words and ensure they match the section's target before finalizing.
- DO NOT wrap the output in code / markdown fences ("\`\`\`") nor identify the markdown format.

## Conversation Guidelines

- Ensure the host guides the conversation and asks thoughtful questions based on the outline
- Ensure the guest provides insightful responses drawing from the document content
- Make personalities and speaking styles match character descriptions
- Keep the conversation engaging and flowing naturally

## Character Speaking Styles

### Host Speaking Style (${host.personality || 'default'})
${getPersonalityDescription(host.personality)}

### Guest Speaking Style (${guest.personality || 'default'})
${getPersonalityDescription(guest.personality)}
`;

    // Only include mid-conversation example when not generating the intro
    if (partType !== 'intro') {
        basePrompt += `
        
## Example Mid-Conversation Output Format

---
HOST:
I find that perspective on the data really insightful. It makes me wonder about the implications for future development in this area.
        
---
GUEST:
Absolutely. When we look at the trends over the past few years, we can see that several key factors are converging to create new opportunities.
        
---
HOST:
Could you elaborate on which of those factors you think will have the biggest impact?
        
---
GUEST:
I'd say the most significant one is probably the shift in how we're approaching the fundamental challenge of...
`;
    }

    if (partType === 'intro') {
        return `${basePrompt}
            
## Conversation Flow: Opening

This begins the podcast conversation:

**Note:** Remember this is the FIRST part of the conversation, so it should establish the podcast context.

- Begin with the host welcoming the audience to the podcast
- Introduce the podcast topic
- Introduce the guest with relevant credentials
- Guest thanks the host for introducing them
- Brief exchange to establish rapport
- Explain what listeners will learn`;

    } else if (partType === 'outro') {
        return `${basePrompt}
            
## Conversation Flow: Final Closing

This concludes the podcast conversation:

- Wrap up the major discussion points
- Include some reflective comments on what was discussed
- Host thanks the guest for their insights and participation
- Guest gives brief final thoughts or appreciation
- Host provides closing remarks to the audience
- Include a final sign-off line
- Keep it concise and natural`;
    } else {
        return `${basePrompt}
            
## Conversation Flow: Continuing Discussion

This is part of an ongoing podcast conversation:`;
    }
}

function getPersonalityDescription(personalityType) {
    const personalities = {
        'enthusiastic': 'energetic, passionate, uses exclamations, asks excited questions',
        'analytical': 'logical, methodical, uses precise language, asks probing questions',
        'compassionate': 'empathetic, warm, uses supportive language, asks caring questions',
        'humorous': 'witty, light-hearted, uses jokes, asks playful questions',
        'authoritative': 'confident, direct, uses assertive language, asks challenging questions',
        'curious': 'inquisitive, open-minded, uses wondering language, asks many questions',
        'skeptical': 'questioning, doubtful, uses cautious language, asks critical questions',
        'visionary': 'imaginative, forward-thinking, uses inspirational language, asks big-picture questions'
    };
    return personalities[personalityType] || 'uses natural, conversational language and asks thoughtful questions';
}

// Generation: Section
export function buildScriptSectionUser(section, totalPodcastDuration, lastDialogueExchanges, topicsSummary, partType, aggregatedSummaries, aggregatedTopics) {
    let userPrompt = `# TASK: Generate Podcast Script Section

## FOCUS FOR THIS SECTION

### Title
${section.title}

### Overview
${section.overview}

### Target Duration
${section.durationMinutes} minutes (${section.durationMinutes * 160} words)

### KEY FACTS TO COVER
\`\`\` markdown
${extractKeyFacts(section.content)}
\`\`\`

### CARRYOVER
\`\`\` markdown
${extractCarryover(section.content)}
\`\`\`

## IMPORTANT INSTRUCTIONS
1. NEVER include any verbatim text from the outline in your script
2. Completely rephrase all content into natural conversational dialogue
3. Use the outline only as a reference for topics and structure, not for wording
4. The outline is a planning document that should NOT appear in the final script`;

    if (totalPodcastDuration) {
        userPrompt += `

## SECTION DURATION REQUIREMENT - CRITICAL
This section MUST be ${section.durationMinutes} minutes long, requiring EXACTLY ${section.durationMinutes * 160} words minimum out of the total ${totalPodcastDuration} minute podcast.

### Word Count Achievement Strategy
- COUNT your output words before submitting
- FAIL: If your word count is under target, ADD more substantive detail, examples, and expert insights
- EXPAND dialogue turns for both speakers with more detail and depth
- Include concrete examples, analogies, and elaboration in responses
- Make guest responses especially thorough and detailed when explaining concepts
- Focus on depth over brevity - longer, substantive turns are required
- Host should ask follow-up questions that encourage detailed responses
`;
    }

    if (lastDialogueExchanges) {
        userPrompt += `

## Previous Dialogue (Continue DIRECTLY from here)
\`\`\` markdown
${lastDialogueExchanges}
\`\`\`

## CRITICAL: Conversation Continuity Instructions
1. Continue the dialogue EXACTLY from where it left off above
2. DO NOT restart the conversation or introduce new topics abruptly
3. NEVER have the host re-introduce the guest or the podcast
4. NEVER have the guest thank the host for introducing them
5. Maintain the same speaking style and tone established above
6. This is NOT a new podcast - it's the SAME ongoing conversation

## Speaker Alternation Rules (CRITICAL)
1. Determine who spoke last in the Previous Dialogue block above.
2. The FIRST line in this section MUST be spoken by the OTHER speaker.
3. NEVER produce two consecutive turns by the same speaker unless it is a very brief single follow-up; NEVER produce three consecutive turns by the same speaker.
4. Alternate turns naturally between HOST and GUEST.`;
    } else {
        if (partType === 'intro') {
            userPrompt += `
            
## Conversation Opening Guidance
This begins the podcast. The host should welcome the audience, introduce the podcast and the guest, briefly frame the topic, and set expectations for what listeners will learn.

### Intro Turn Order (CRITICAL)
1. Start with HOST speaking first.
2. GUEST should speak only after being introduced by the HOST.`
;
        } else {
            userPrompt += `
            
## Conversation Start Guidance
This is the first content section of the podcast. The host should transition naturally from the introduction to this topic without restarting the conversation.`;
        }
    }

    if (topicsSummary) {
        userPrompt += `

## PREVIOUS TOPICS COVERED:
\`\`\` markdown
${topicsSummary}
\`\`\`

## CRITICAL: Topic Continuity Instructions
1. When referencing previously covered topics, ALWAYS acknowledge they were discussed earlier
2. NEVER have the host say "I've heard that..." about topics already covered above
3. Use natural references, in the speaker's voice, like:
   - HOST: "As we discussed earlier about [topic]..."
   - HOST: "Building on what we covered about [topic]..."
   - GUEST: "As I mentioned when we talked about [topic]..."
   - GUEST: "To expand on my earlier point about [topic]..."
4. If adding new details to a previously mentioned topic, explicitly acknowledge this, in the speaker's voice, like:
   - "We touched on [topic] earlier, but there's another aspect worth exploring..."
   - "Building on our discussion of [topic], another interesting consideration is..."
5. For any topics listed in CARRYOVER for this section, explicitly connect to previous discussion

### Continuity Evidence Requirement (CRITICAL)
- Do NOT claim prior coverage (e.g., "as we discussed", "now that we've established") unless the referenced topic appears in the PREVIOUS TOPICS COVERED list or is explicitly present in the Previous Dialogue above.`;
    // Provide the full outline section as a reference after guidance to avoid redundancy at the top
    userPrompt += `
        
## Outline Reference (REFERENCE ONLY - DO NOT COPY ANY TEXT VERBATIM)
\`\`\` markdown
${section.content}
\`\`\`
`;
    }

    if (partType === 'outro') {
        userPrompt += `
        
## FINAL SECTION NOTE
This is the FINAL section of the podcast. Fully wrap up the conversation: briefly summarize key takeaways, thank the guest, and deliver a clear sign-off to listeners.`;
    } else {
        userPrompt += `

This is NOT the final section. The conversation should feel ongoing and not conclude completely, as there are more sections to follow.`;
    }

    return userPrompt;
}

// Conversation summary
export function buildConversationSummarySystem() {
    return 'You are a structured analyzer of podcast conversations, creating detailed topic summaries to prevent redundancy in future sections.';
}

export function buildConversationSummaryUser(lastSectionContent) {
    return `Analyze the following podcast conversation section and create a structured summary:

1. GENERAL SUMMARY: Brief overview of the conversation (max 200 words)

2. KEY TOPICS COVERED: 
   - List the specific topics, concepts, terminology, and facts discussed
   - Use precise language that matches how they were discussed

3. TOPIC CONTEXT: 
   - For each topic, note HOW it was discussed (e.g., introduced, explained in depth, briefly mentioned)

Format your response exactly as:

SUMMARY: [General summary text]

TOPICS COVERED:
- [Topic 1]: [Brief context]
- [Topic 2]: [Brief context]
- [Topic 3]: [Brief context]
...

This summary will be used to maintain continuity in an ongoing podcast, so be specific.

Conversation Section:
${lastSectionContent}`;
}

// local helpers for extraction from section content (duplicated here to keep prompts self-sufficient)
function extractKeyFacts(sectionContent) {
    const keyFactsMatch = sectionContent.match(/KEY FACTS:\s*([\s\S]*?)(?=\n\nUNIQUE FOCUS:|\n\nCARRYOVER:|$)/s);
    return keyFactsMatch ? keyFactsMatch[1].trim() : 'No specific key facts provided';
}

function extractCarryover(sectionContent) {
    const carryoverMatch = sectionContent.match(/CARRYOVER:\s*(.*?)(?=\n\n|$)/s);
    return carryoverMatch ? carryoverMatch[1].trim() : 'No carryover topics';
}

export function buildScriptSectionVerificationUser(section, sectionText, documentContent, totalPodcastDuration, previousSectionText) {
    const previousSectionContext = previousSectionText
        ? `\n\n--- PREVIOUS SECTION ---\n\`\`\` markdown\n${previousSectionText}\n\`\`\`\n\nVerify that this new section continues naturally from the previous section and doesn't repeat information.`
        : '';

    return `Please review this podcast script section for quality and coherence against its outline section and original document.

--- SECTION FROM OUTLINE ---
\`\`\` markdown
${section.content}
\`\`\`

Target Duration for this Section: ${section.durationMinutes} minutes (${section.durationMinutes * 160} words)
Total Podcast Duration: ${totalPodcastDuration} minutes (${totalPodcastDuration * 160} words)

--- GENERATED SECTION ---
\`\`\` markdown
${sectionText}
\`\`\`

--- ORIGINAL DOCUMENT CONTENT ---
\`\`\` markdown
${documentContent}
\`\`\`${previousSectionContext}

Verify if this section is factually accurate (comparing to the document), follows the outline structure, maintains appropriate pacing for the target duration, avoids redundancy with previous sections, and maintains good conversational flow.

Additionally, perform these STRICT checks:

SPEAKER TURN-TAKING (CRITICAL):
- Identify the last speaker from the PREVIOUS SECTION (if provided) and ensure the FIRST line of the GENERATED SECTION is spoken by the OTHER speaker.
- Do NOT allow three consecutive turns by the same speaker anywhere in the section.
- Prefer strict alternation; at most a single brief follow-up by the same speaker is allowed.

CONTINUITY ASSERTIONS (CRITICAL):
- Flag any claims like "as we discussed", "as mentioned earlier", "now that we've established" UNLESS the referenced topic appears in the PREVIOUS SECTION text or is evident in the earlier parts of the script.
- Provide exact quotes and suggested fixes for any unsupported continuity claims.

Respond in a structured JSON format with the following fields:
- "isValid": true if the section meets all quality criteria, false otherwise
- "feedback": high-level summary of findings
- "issues": array of specific issues, each containing:
  * "type": issue type ("accuracy", "outline", "duration", "speaker_turn", "continuity", "conversation", "format")
  * "description": detailed description of the issue
  * "location": exact quote from the script showing the problematic text
  * "recommendation": specific suggestion on how to fix the issue

For each issue found, you MUST include exact quotes from the script to precisely identify where the problem occurs. Be very specific in your recommendations for fixes.`;
}

// Verification: Full script
// Verification: Cross-section
export function buildScriptCrossSectionVerificationSystem() {
    return `You are a podcast script cross-section quality checker. Analyze ONLY issues that span multiple sections of the podcast.

Context (CRITICAL):
- Sections were generated and validated individually from an outline with minimal context of prior/later sections.
- There are no explicit section separators inside the conversation; the full script is a concatenation of these isolated sections.
- Dialogue is organized in segments separated by '---' lines; each segment is labeled HOST: or GUEST:.
- Never suggest or apply swapping HOST and GUEST labels. Keep each speaker in-character; their knowledge and style differ.

Evaluate ONLY cross-section concerns:
1. GLOBAL REDUNDANCY: Identify repeated information across different sections. Flag specific types:
   - Host saying "I've heard that..." about topics not previously discussed
   - Topics covered in multiple sections without acknowledgment
   - Same facts or examples repeated in different parts
   - Topics introduced as new when they've been discussed before
   Prefer rephrasing to remove duplication while preserving any additional details.
2. NARRATIVE COHERENCE: Check that the conversation reads as one continuous discussion from start to end.
3. TOPIC TRANSITIONS: Ensure transitions between sections feel smooth and natural (avoid abrupt resets).
4. CONTINUITY CLAIMS: Flag claims like "as discussed earlier" that aren't supported by earlier content.
5. SPEAKER HANDOFFS: At section boundaries, avoid same-speaker handoffs and any triple same-speaker runs.

Do NOT assess: distribution balance, overall pacing, detailed per-section accuracy, or character consistency (handled elsewhere).

Respond with a JSON object containing:
- "isValid": true if there are no cross-section issues, false otherwise
- "feedback": high-level summary of issues found (if isValid is false) or confirmation (if isValid is true)
- "issues": array of specific issues, each containing:
  * "type": issue type ("redundancy", "transition", "continuity", "speaker_handoff")
  * "description": detailed description of the issue
  * "location": exactly where the issue occurs (include exact quotes from both problematic sections)
  * "recommendation": specific suggestion on how to fix the issue

For each issue found, you MUST include exact quotes from the script to precisely identify where the problem occurs. Be very specific in your recommendations for fixes.`;
}

export function buildScriptCrossSectionVerificationUser(scriptText, outlineText, totalPodcastDuration) {
    return `Review ONLY for cross-section issues.

--- OUTLINE STRUCTURE ---
\`\`\` markdown
${outlineText}
\`\`\`

--- GENERATED SCRIPT ---
\`\`\` markdown
${scriptText}
\`\`\`

Focus on:
1. Redundancy across sections (remove repetition via rephrasing while preserving any added details)
2. Narrative flow and transitions between sections
3. Unsupported continuity claims across sections
4. Speaker alternation at section boundaries (avoid same-speaker handoffs; no triples)

IMPORTANT REQUIREMENTS:
- For each issue, include exact quotes from the problematic sections to precisely identify locations
- Provide specific recommendations on how to fix each issue
- Use the structured JSON format defined in the system prompt
- For redundancy issues, identify both instances (original and repetition) with exact quotes
- For transition issues, quote both the end of one section and beginning of the next
- For speaker handoff issues, quote the problematic dialogue sequence

Do NOT assess pacing/distribution, section-level facts, or character consistency.

Respond in the required JSON format with detailed "issues" array.`;
}

// Improvement: Section
export function buildScriptSectionImproveSystem() {
    return `You are a podcast script editor specializing in making targeted improvements to script sections based on structured verification feedback.

IMPORTANT INSTRUCTIONS:

1. USE EXACT QUOTES - Use the exact quotes provided in the structured feedback to precisely locate where changes need to be made.
2. FOLLOW RECOMMENDATIONS - Implement the specific recommendations for fixes provided in the feedback.
3. MAKE TARGETED CHANGES ONLY - Only modify the parts mentioned in the feedback issues. Preserve unaffected dialogue verbatim.
4. MAINTAIN CONVERSATIONAL STYLE - Keep the natural dialogue flow between HOST and GUEST.
5. PRESERVE FORMAT - Maintain speaker identifiers (HOST: and GUEST:) and overall structure with '---' separators.
6. ADDRESS ALL ISSUES - Fix every issue mentioned in the feedback array thoroughly.
7. MEET OR EXCEED TARGET DURATION - Each section must have at least the target word count (160 words per minute). If the original was below target duration, EXPAND it by adding substantive detail and depth.
8. MAINTAIN CONVERSATION FLOW - Keep logical dialogue where the HOST asks questions and the GUEST provides expert answers. Don't swap HOST/GUEST labels just to create alternation.
9. HANDLE SPECIFIC ISSUE TYPES APPROPRIATELY:
   - ACCURACY issues: Correct factual errors to match document content
   - OUTLINE issues: Add missing content from the outline
   - DURATION issues: Expand content to reach target word count
   - SPEAKER_TURN issues: Fix improper turn-taking or triple-speaker sequences
   - CONTINUITY issues: Remove/reframe unsupported claims of prior coverage
   - CONVERSATION issues: Improve dialogue naturalness and flow
   - FORMAT issues: Fix any structural or formatting problems

Return the complete improved section that can be used as a direct replacement for the original section.`;
}

export function buildScriptSectionImproveUser(originalSectionText, feedback, section, documentContent, totalPodcastDuration, characterContext) {
    const feedbackStr = typeof feedback === 'string' ? feedback : JSON.stringify(feedback, null, 2);
    const base = `I have a podcast script section that needs targeted improvements based on structured verification feedback.

Target Duration for this Section: ${section.durationMinutes} minutes
Total Podcast Duration: ${totalPodcastDuration} minutes

--- SECTION FROM OUTLINE ---
\`\`\` markdown
${section.content}
\`\`\`

--- ORIGINAL SECTION ---
\`\`\` markdown
${originalSectionText}
\`\`\`

--- VERIFICATION FEEDBACK ---
\`\`\`
${feedbackStr}
\`\`\`

--- ORIGINAL DOCUMENT CONTENT ---
\`\`\` markdown
${documentContent}
\`\`\`

IMPORTANT INSTRUCTIONS:

1. USE THE STRUCTURED FEEDBACK - The feedback contains a JSON object with an "issues" array. Each issue has:
   - "type": The category of issue to address
   - "description": Detailed explanation of the problem
   - "location": EXACT QUOTE from the script where the issue occurs
   - "recommendation": Specific suggestion for how to fix it

2. MAKE TARGETED FIXES - Use the exact quotes in the "location" field to precisely identify where changes need to be made. Follow the specific recommendations for each issue.

3. ADDRESS ALL ISSUES - Make sure to fix every issue in the feedback array thoroughly.

4. CONTENT REQUIREMENTS:
   - Meet or exceed the target word count (${Math.round(section.durationMinutes * 160)} words)
   - Maintain conversational style between HOST and GUEST
   - Keep proper speaker alternation (avoid same-speaker sequences)
   - Fix any factual inaccuracies to match the document content
   - Remove unsupported claims of prior discussion
   - Preserve natural dialogue flow and improve engagement
   - Fix any formatting or structural problems

5. OUTPUT FORMAT - Return the complete improved section that can directly replace the original. Preserve the speaker identifiers (HOST: and GUEST:) and overall structure with '---' separators.`;

    return characterContext ? `${base}\n\n${characterContext}` : base;
}

// Improvement: Cross-section
export function buildScriptCrossSectionImproveSystem() {
    return `You are a podcast script editor specializing in fixing cross-section issues. Improve the script by addressing issues that span multiple sections.

Context (CRITICAL): sections were generated individually from an outline with minimal cross-section context, then concatenated. There are no explicit section markers in the conversation; instead, dialogue blocks are separated by '---' and labeled HOST: or GUEST:.

Important instructions:
1. Focus ONLY on cross-section issues (redundancy, transitions, continuity claims, boundary speaker handoffs).
2. Preserve unaffected dialogue verbatim.
3. Redundancy fixes: prefer rephrasing to remove duplication while retaining any additional information.
4. Do NOT swap or relabel HOST and GUEST segments. Keep each speaker in-character.
5. Preserve format: keep '---' separators and exact labels HOST:/GUEST:.
6. Use the exact quotes provided in the structured feedback to locate precisely where changes need to be made.
7. Follow the specific recommendations for fixes provided in the feedback.

Strict output requirements:
- OUTPUT ONLY the complete improved podcast script.
- No explanations, analysis, or meta commentary.
- Do NOT include document content or citations.
- Do NOT wrap output in code fences.
- Ensure proper HOST/GUEST labeling on their separate lines, with '---' before each block.

Primary cross-section issues to address based on feedback structure:
- REDUNDANCY: Rephrase one instance to avoid duplication while preserving unique information
- TRANSITION: Smooth connections between sections by adding proper segues
- CONTINUITY: Fix references to previously undiscussed content
- SPEAKER_HANDOFF: Modify dialogue to avoid same-speaker consecutive turns at section boundaries`;
}

export function buildScriptCrossSectionImproveUser(originalScriptText, feedback, outlineText, documentContent, totalPodcastDuration, originalScriptLength, characterData) {
    const feedbackStr = typeof feedback === 'string' ? feedback : JSON.stringify(feedback, null, 2);

    // Build character context safely (avoid injecting names to prevent label switching)
    let characterContext = '';
    if (characterData && (characterData.host || characterData.guest)) {
        const hostPersonality = characterData.host && characterData.host.personality ? characterData.host.personality : '';
        const guestPersonality = characterData.guest && characterData.guest.personality ? characterData.guest.personality : '';
        const hostStyle = characterData.host && characterData.host.speakingStyle ? characterData.host.speakingStyle : '';
        const guestStyle = characterData.guest && characterData.guest.speakingStyle ? characterData.guest.speakingStyle : '';

        const lines = [];
        lines.push('--- CHARACTER INSTRUCTIONS ---');
        if (hostPersonality) {
            lines.push(`HOST Personality: ${hostPersonality}`);
        }
        if (hostStyle) {
            lines.push(`HOST Speaking Style: ${hostStyle}`);
        }
        if (guestPersonality) {
            lines.push(`GUEST Personality: ${guestPersonality}`);
        }
        if (guestStyle) {
            lines.push(`GUEST Speaking Style: ${guestStyle}`);
        }
        lines.push('Always use labels HOST: and GUEST: on separate lines for speakers. Do NOT replace labels with names.');
        characterContext = lines.join('\n');
    }

    const base = `Improve the script by fixing cross-section issues identified in the feedback.

--- ORIGINAL SCRIPT ---
\`\`\` markdown
${originalScriptText}
\`\`\`

--- CROSS-SECTION ISSUES FEEDBACK ---
\`\`\` markdown
${feedbackStr}
\`\`\`

--- OUTLINE STRUCTURE ---
\`\`\` markdown
${outlineText}
\`\`\`

Instructions:
1. Use the structured feedback with exact quotes to locate precisely where to make changes.
2. Follow the specific recommendations for each issue in the feedback.
3. Modify only parts related to cross-section issues (redundancy, transitions, continuity, boundary speaker handoffs).
4. Keep unaffected dialogue as-is. Aim for roughly ${originalScriptLength} characters, some reductions are acceptable if caused by removing redundancy.
5. Preserve exact HOST/GUEST labels on their separate lines and '---' separators. Do not swap speaker roles.
6. For each issue type:
   - REDUNDANCY: Rewrite one instance to avoid duplication while preserving unique information
   - TRANSITION: Add proper segues between sections to improve flow
   - CONTINUITY: Fix references to previously undiscussed content
   - SPEAKER_HANDOFF: Modify dialogue to prevent consecutive same-speaker turns
7. Return ONLY the complete improved script, with no explanations.
8. Try to retain original word count.`;

    return characterContext ? `${base}\n\n${characterContext}` : base;
}
