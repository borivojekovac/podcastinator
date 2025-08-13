// Centralized prompt builders for Script generation/verification/improvement

// Verification: Section
export function buildScriptSectionVerificationSystem() {
    return `You are a podcast script section quality checker and fact verifier. Your job is to analyze a generated podcast script section against its outline section and original document content for:

1. FACTUAL ACCURACY: Ensure all claims and information are supported by the original document
2. SECTION ADHERENCE: Ensure the script follows the specific section topic from the outline
3. COVERAGE: Check if the section adequately covers the topic without omitting key information
4. REDUNDANCY CHECK (HIGH PRIORITY): Identify any redundant content or repetitive dialogue, particularly checking if this section repeats information already covered in previous sections
5. CONVERSATIONAL FLOW: Verify that the dialogue feels natural and flows well between speakers
6. CHARACTER CONSISTENCY: Ensure host and guest voices maintain consistent personalities

Respond with a JSON object containing:
- "isValid": true if the section meets quality criteria, false otherwise
- "feedback": specific issues found (if isValid is false) or confirmation (if isValid is true)

If the section is high quality and follows the outline well, respond with {"isValid": true, "feedback": "Section is well-structured and follows the outline appropriately."}`;
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
- Pay close attention to the target duration for this section and aim to generate dialogue that would take approximately that amount of time to speak aloud
- Adjust the level of detail and depth based on the allocated duration for this section, assuming 160 words per minute are spoken
- DO NOT wrap the output in code / markdown fences ("\`\`\`").

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
        
\`\`\` markdown
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
\`\`\``;
    }

    if (partType === 'intro') {
        return `${basePrompt}
            
## Conversation Flow: Opening

This begins the podcast conversation:

**Note:** Remember this is the FIRST part of the conversation, so it should establish the podcast context.

- Begin with the host welcoming the audience to the podcast
- Introduce the podcast topic
- Introduce the guest with relevant credentials
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
export function buildScriptSectionUser(section, totalPodcastDuration, lastDialogueExchanges, topicsSummary, partType) {
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

## Section Duration Guidance
This section should be approximately ${section.durationMinutes} minutes long (${section.durationMinutes * 160} words) out of the total ${totalPodcastDuration} minute (${totalPodcastDuration * 160} words) podcast. Adjust the depth and detail accordingly.
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

1. GENERAL SUMMARY: Brief overview of the conversation (max 100 words)

2. KEY TOPICS COVERED: 
   - List the specific topics, concepts, terminology, and facts discussed
   - Use precise language that matches how they were discussed
   - Include 5-8 key topics/facts maximum

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

Respond in JSON with at least: { isValid, feedback, speakerTurnIssues: [], continuityIssues: [] }.`;
}

// Verification: Full script
export function buildScriptVerificationSystem() {
    return `You are a podcast script quality checker and fact verifier. Your job is to analyze a generated podcast script against the outline and original document content for:

1. FACTUAL ACCURACY: Ensure all claims and information in the script are supported by the original document
2. OUTLINE ADHERENCE: Ensure the script follows the structure and topics in the outline
3. DURATION ACCURACY: Check if the script's length is appropriate for the target podcast duration
4. REDUNDANCY CHECK (HIGH PRIORITY): Identify any redundant content or repetitive dialogue, particularly:
   - Host saying "I've heard that..." about topics already discussed
   - Topics covered in multiple sections without acknowledgment
   - Same facts or examples repeated in different parts of the script
   - Topics introduced as new when they've been discussed before
5. CONVERSATIONAL FLOW: Verify that the dialogue feels natural and flows well between speakers
6. CHARACTER CONSISTENCY: Ensure host and guest voices maintain consistent personalities

For redundancy issues, provide specific examples of the redundant content and how it should be fixed.

Respond with a JSON object containing:
- "isValid": true if the script meets quality criteria, false otherwise
- "feedback": specific issues found (if isValid is false) or confirmation (if isValid is true)
- "redundancyIssues": array of specific redundancy problems (empty if none found)

If the script is high quality and follows the outline well, respond with {"isValid": true, "feedback": "Script is well-structured and follows the outline appropriately.", "redundancyIssues": []}`;
}

export function buildScriptVerificationUser(scriptText, outlineText, documentContent, totalPodcastDuration) {
    return `Please review this podcast script for quality and coherence against the outline and original document.

Target Podcast Duration: ${totalPodcastDuration} minutes (${totalPodcastDuration * 160} words)

--- OUTLINE STRUCTURE ---
\`\`\` markdown
${outlineText}
\`\`\`

--- GENERATED SCRIPT ---
\`\`\` markdown
${scriptText}
\`\`\`

--- ORIGINAL DOCUMENT CONTENT ---
\`\`\` markdown
${documentContent}
\`\`\`

Verify if this script is factually accurate (comparing to the document), follows the outline structure, maintains appropriate pacing for the target duration, avoids redundancy, and maintains good conversational flow. Respond in the required JSON format.`;
}

// Verification: Cross-section
export function buildScriptCrossSectionVerificationSystem() {
    return `You are a podcast script cross-section quality checker. Your ONLY job is to analyze the script for issues that span across different sections of the podcast:

1. GLOBAL REDUNDANCY: Identify content repeated across different sections
2. NARRATIVE COHERENCE: Verify the podcast flows logically from beginning to end
3. TOPIC TRANSITIONS: Check that transitions between sections are smooth and natural
4. DISTRIBUTION BALANCE: Ensure key topics aren't concentrated too heavily in some sections
5. OVERALL PACING: Verify the podcast maintains appropriate pacing across sections

IMPORTANT: DO NOT focus on section-specific issues like factual accuracy or character consistency, as these have already been addressed. ONLY look for issues that span across multiple sections.

Respond with a JSON object containing:
- "isValid": true if there are no cross-section issues, false otherwise
- "feedback": specific cross-section issues found (if isValid is false) or confirmation (if isValid is true)`;
}

export function buildScriptCrossSectionVerificationUser(scriptText, outlineText, totalPodcastDuration) {
    return `Please review this podcast script ONLY for cross-section issues - problems that occur across multiple sections of the podcast.

Target Podcast Duration: ${totalPodcastDuration} minutes (${totalPodcastDuration * 160} words)

--- OUTLINE STRUCTURE ---
\`\`\` markdown
${outlineText}
\`\`\`

--- GENERATED SCRIPT ---
\`\`\` markdown
${scriptText}
\`\`\`

Focus EXCLUSIVELY on these cross-section issues:
1. Redundancy across sections (same topics or facts repeated in different sections)
2. Narrative flow between sections (awkward transitions)
3. Content distribution (important topics being unevenly distributed)
4. Overall structure and pacing
5. Script length (should be close to target duration)
6. Speaker alternation at section boundaries (avoid same-speaker handoffs; no triples)
7. Unsupported continuity claims across sections (claims of prior discussion without evidence in earlier sections)

DO NOT evaluate individual section quality, factual accuracy, or other issues already addressed in per-section verification.

Respond in the required JSON format.`;
}

// Improvement: Section
export function buildScriptSectionImproveSystem() {
    return `You are a podcast script editor. Your task is to improve a specific section of a podcast script based on verification feedback.

IMPORTANT INSTRUCTIONS:

1. MAKE TARGETED CHANGES ONLY - Only modify the parts mentioned in the feedback. Do not rewrite unaffected parts.
2. MAINTAIN CONVERSATIONAL STYLE - Keep the natural dialogue flow between HOST and GUEST.
3. PRESERVE FORMAT - Maintain speaker identifiers (HOST: and GUEST:) and overall structure.
4. FIX IDENTIFIED ISSUES - Address all points in the feedback thoroughly.
5. PRESERVE SECTION LENGTH - Your improved section should be approximately the same length as the original, unless specified otherwise in the feedback.
6. FIX SPEAKER TURN-TAKING - Ensure alternating speakers; avoiding starting with the same speaker who finished the previous section, unless it is a very brief single follow-up.
7. REMOVE UNSUPPORTED CONTINUITY - Remove or reframe any claims of prior coverage that aren't supported by the provided previous section/topics.

Return the complete improved section that can be used as a direct replacement for the original section.`;
}

export function buildScriptSectionImproveUser(originalSectionText, feedback, section, documentContent, totalPodcastDuration, characterContext) {
    const feedbackStr = typeof feedback === 'string' ? feedback : JSON.stringify(feedback, null, 2);
    const base = `I have a podcast script section that needs targeted improvements based on verification feedback.

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

Please improve this section by addressing the specific issues mentioned in the verification feedback. Return the complete improved section that maintains the same basic structure and approximate length as the original.

Additionally, ensure:
- Speaker turn-taking alternates properly and does not begin with the same speaker as the prior section (if provided).
- Any continuity phrases implying prior discussion are supported by the provided previous section/topics; otherwise, rephrase as new information.`;

    return characterContext ? `${base}\n\n${characterContext}` : base;
}

// Improvement: Cross-section
export function buildScriptCrossSectionImproveSystem() {
    return `You are a podcast script editor specializing in fixing cross-section issues. Your job is to improve a podcast script by addressing issues that span across multiple sections.

IMPORTANT INSTRUCTIONS FOR CROSS-SECTION IMPROVEMENT:

1. FOCUS ON CROSS-SECTION ISSUES ONLY - Only fix issues that span multiple sections (redundancy, transitions, etc).
2. PRESERVE ORIGINAL CONTENT - Keep all dialogue not affected by cross-section issues exactly as it is.
3. MAINTAIN EQUIVALENT LENGTH - Your response MUST be approximately the same length as the original script, unless specified otherwise in the feedback.
4. PRESERVE DETAILED DIALOGUE - Keep the same level of conversational detail and depth as the original script, unless specified otherwise in the feedback.
5. PRESERVE FORMAT - Maintain section headers, speaker identifiers (HOST/GUEST), and overall structure.

STRICT OUTPUT REQUIREMENTS:

- OUTPUT ONLY the complete improved podcast script.
- DO NOT include explanations, analysis, or meta commentary.
- DO NOT include the original document content or any citations verbatim.
- DO NOT wrap the output in code / markdown fences ("\`\`\`").
- Ensure every dialogue block uses the exact labels 'HOST:' and 'GUEST:' with '---' on the line above each block.

Primary cross-section issues to address:
- Redundant content across different sections (same information repeated)
- Poor transitions between sections
- Topics introduced as new when they've been covered in earlier sections
- Unbalanced distribution of key topics across sections
- Speaker alternation problems at section boundaries (avoid same-speaker handoffs; no triple same-speaker runs)
- Unsupported continuity claims across sections (remove or reframe if not evidenced by earlier content)`;
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
        lines.push('Always use labels HOST: and GUEST: for speakers. Do NOT replace labels with names.');
        characterContext = lines.join('\n');
    }

    const base = `You are improving a podcast script by fixing cross-section issues identified in verification feedback.

Target Podcast Duration: ${totalPodcastDuration} minutes

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

--- ORIGINAL DOCUMENT CONTENT ---
\`\`\` markdown
${documentContent}
\`\`\`

IMPORTANT INSTRUCTIONS:

1. FOCUS ON CROSS-SECTION ISSUES - Only modify parts that relate to issues spanning multiple sections.
2. MAINTAIN ORIGINAL LENGTH - Your improved script should be approximately ${originalScriptLength} characters, unless specified otherwise in the feedback.
3. PRESERVE all dialogue exchanges, conversational depth, and detail level unrelated to cross-section issues, unless specified otherwise in the feedback.
4. Ensure proper HOST and GUEST speaker formatting is preserved.
5. Return the COMPLETE script with your improvements incorporated.`;

    return characterContext ? `${base}\n\n${characterContext}` : base;
}
