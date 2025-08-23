// Centralized prompt builders for Outline generation/verification/improvement

// Generation prompts
export function buildOutlineGenerationSystem(host, guest, targetDurationMinutes) {
    return `You are a podcast outline generator.
        
Create a structured outline for a podcast discussion between a host named "${host.name || 'Host'}" 
(${host.personality ? `personality: ${host.personality}` : ''}) 
and a guest named "${guest.name || 'Guest'}" (${guest.personality ? `personality: ${guest.personality}` : ''}).

IMPORTANT: The target duration for the entire podcast is ${targetDurationMinutes} minutes. You MUST structure the outline so that each section has an appropriate amount of time allocation, with section durations EXACTLY adding up to ${targetDurationMinutes} minutes total - not more, not less.

FORMATTING REQUIREMENTS (CRITICAL):
- DO NOT include code block syntax or language identifiers anywhere in your response
- DO NOT add any summary text, explanations, or annotations outside of the outline format
- DO NOT include any total duration summaries at the end
- ONLY provide the raw outline format with section separators (---), section numbers, titles, durations, and content
- Your response should begin with --- and contain ONLY the outline

The outline MUST follow this EXACT format with section separators and duration for easy parsing:

---
1. [Section Title]
Duration: [Target duration in minutes]
Overview: [Brief summary of the discussion points and topics for this section]
KEY FACTS:
- [3-5 specific facts, concepts, or points to cover]
- [3-5 specific topics to cover]
UNIQUE FOCUS: [Brief description of what makes this section distinct from others]
CARRYOVER: [Brief description of topics that build on previous sections]
---
1.1. [Subsection Title]
Duration: [Target duration in minutes]
Overview: [Brief summary of the discussion points for this subsection]
KEY FACTS:
- [3-5 specific facts, concepts, or points to cover]
- [3-5 specific topics to cover]
UNIQUE FOCUS: [Brief description of what makes this section distinct from others]
CARRYOVER: [Brief description of topics that build on previous sections]
---

1. Create a clear, hierarchical structure with main sections and subsections
2. Each section must include:
   - Section number (e.g., 1, 1.1, 2, etc.)
   - A descriptive title
   - Duration in minutes
   - Overview that summarizes the key points for that section
   - KEY FACTS: Include specific facts, concepts, or points to cover (1-2 key facts per minute of section duration)
   - UNIQUE FOCUS: Describe what makes this section distinct from others
   - CARRYOVER: Note any topics that build on previous sections (use "None" if this is the first section or completely independent)
3. Use horizontal rule separators (---) between each section for easy parsing
4. CRITICAL: Ensure all section durations add up to EXACTLY the target podcast length of ${targetDurationMinutes} minutes - this is a strict requirement
5. Organize content logically with natural flow between sections
6. Balance depth vs. breadth based on available time:
   - For podcasts under 15 minutes: Focus on 2-3 main sections with minimal subsections
   - For 15-30 minute podcasts: Use 3-5 main sections with relevant subsections
   - For 30+ minute podcasts: Develop 5-8 main sections with multiple subsections
   - Scale the number of key facts proportionally to section duration (1-2 facts per minute)
7. Distribute topics strategically to minimize redundancy across sections
8. Be realistic about what can be covered in the allocated time - fewer, well-developed topics are better than many rushed topics
9. Ensure the KEY FACTS for each section can be reasonably discussed in the allocated time

## Example Format:

---
1. Introduction
Duration: 3 minutes
Overview: Brief exchange of credentials and establishing expertise.
KEY FACTS: (3 facts for this 3-minute section, following the 1 fact per minute guideline)
- Host introduces guest's background and expertise
- Overview of what will be covered in the podcast
- Why this topic is relevant to the audience
UNIQUE FOCUS: Setting the foundation and establishing credibility
CARRYOVER: None
---
1.2. Topic Relevance
Duration: 2 minutes
Overview: Discussion of why this topic matters to the audience.
KEY FACTS: (2 facts for this 2-minute section, following the 1 fact per minute guideline)
- Current relevance and timeliness of the topic
- Impact on the target audience
UNIQUE FOCUS: Establishing importance and audience connection
CARRYOVER: Builds on guest's expertise established in introduction
---
2. Main Topic Section
Duration: 7 minutes
Overview: Detailed exploration of the central theme with expert insights.
KEY FACTS: (7 facts for this 7-minute section, following the 1 fact per minute guideline)
- Core concept explanation
- Expert analysis and insights
- Real-world examples or case studies
- Historical context of the topic
- Current trends and developments
- Common misconceptions
- Practical applications for listeners
UNIQUE FOCUS: Deep dive into the main subject matter
CARRYOVER: Expands on the topic relevance discussed earlier
---

DO NOT include actual dialogue or script. This is only an outline with clear section separators for parsing. Ensure KEY FACTS are specific and actionable, UNIQUE FOCUS explains what distinguishes each section, and CARRYOVER tracks topic continuity.`;
}

export function buildOutlineGenerationUser(documentContent, podcastDuration, podcastFocus) {
    if (podcastFocus && podcastFocus.trim().length > 0) {
        return `Generate a podcast outline based on the following focus & overall instructions: "${podcastFocus.trim()}"

Document content:
\`\`\` markdown
${documentContent}
\`\`\`

Create a well-organized outline that focuses specifically on the requested topic in a conversational podcast format. The outline MUST:
1) Begin with an Introduction section (first section) that sets context and introduces the guest.
2) End with an Outro/Conclusion section (final section) that wraps up, thanks the guest, and provides a sign-off.
3) Ensure the total duration is EXACTLY ${podcastDuration} minutes, with each section duration specified. This is a STRICT requirement - the sum of all section durations MUST equal ${podcastDuration} minutes, not more and not less.
4) Adapt the outline structure based on the total podcast duration:
   - For podcasts under 15 minutes: Use 2-3 main sections with minimal subsections
   - For 15-30 minute podcasts: Use 3-5 main sections with relevant subsections
   - For 30+ minute podcasts: Use 5-8 main sections with multiple subsections
5) Scale the detail level appropriately - include 1-2 key facts per minute for each section
6) Create subsections for any section longer than 5 minutes to improve structure
7) Be realistic about what can be covered in each section based on its duration
8) Do not attempt to cover too many topics in a short duration
9) If a section has X minutes, include only topics that can be meaningfully discussed in that timeframe`;
    }

    return `Generate a podcast outline based on the following document content:

\`\`\` markdown
${documentContent}
\`\`\`

Create a well-organized outline that covers the key information from this document in a conversational podcast format. The outline MUST:
1) Begin with an Introduction section (first section) that sets context and introduces the guest.
2) End with an Outro/Conclusion section (final section) that wraps up, thanks the guest, and provides a sign-off.
3) Ensure the total duration is EXACTLY ${podcastDuration} minutes, with each section duration specified. This is a STRICT requirement - the sum of all section durations MUST equal ${podcastDuration} minutes, not more and not less.
4) Adapt the outline structure based on the total podcast duration:
   - For podcasts under 15 minutes: Use 2-3 main sections with minimal subsections
   - For 15-30 minute podcasts: Use 3-5 main sections with relevant subsections
   - For 30+ minute podcasts: Use 5-8 main sections with multiple subsections
5) Scale the detail level appropriately - include 1-2 key facts per minute for each section
6) Create subsections for any section longer than 5 minutes to improve structure
7) Be realistic about what can be covered in each section based on its duration
8) Do not attempt to cover too many topics in a short duration
9) If a section has X minutes, include only topics that can be meaningfully discussed in that timeframe`;
}

// Verification prompts
export function buildOutlineVerificationSystem() {
    return `You are a podcast outline quality reviewer. Your job is to analyze a generated podcast outline for:

1. STRUCTURE QUALITY: Ensure the outline has a logical structure with appropriate sections
2. TIMING ACCURACY (IMPORTANT):
   - Verify that section durations add up to approximately the target podcast duration
   - A slight deviation of up to 2 minutes (over or under) is acceptable for podcasts 30+ minutes long
   - A slight deviation of up to 1 minute is acceptable for podcasts under 30 minutes
   - Any deviation larger than these thresholds should be flagged as an issue
   - Confirm the number and depth of sections are appropriate for the target duration:
     * Podcasts under 15 minutes: 2-3 main sections with minimal subsections
     * Podcasts 15-30 minutes: 3-5 main sections with relevant subsections
     * Podcasts 30+ minutes: 5-8 main sections with multiple subsections
   - Check that longer sections (5+ minutes) have appropriate subsections
   - Verify key facts scale proportionally to section duration (1-2 facts per minute)
3. TOPICAL COVERAGE: Check that the outline appears to cover the main topics with appropriate emphasis
4. FOCUS ALIGNMENT: Confirm the outline aligns with any user-specified focus/steer
5. FORMAT CORRECTNESS: Ensure the outline follows the required section numbering and separator format

Respond with a JSON object containing:
- "isValid": true if the outline meets all quality criteria (including acceptable duration range), false otherwise
- "issues": An array of specific issues found, each with:
  * "category": The category of the issue ("TIMING", "STRUCTURE", "CONTENT", "FORMAT", "FOCUS")
  * "description": Detailed description of the issue
  * "severity": "critical", "major", or "minor"
- "totalDuration": The calculated total duration from all sections
- "targetDuration": The specified target duration
- "durationDelta": The difference between total and target duration (can be positive or negative)
- "summary": A brief overall assessment

Example response for an invalid outline with these issues:

For a valid outline with acceptable duration, return a similar JSON structure with empty issues array.

NOTE: When presenting the outline to the user after verification, DO NOT include any code block syntax, language identifiers, duration summaries, or any text outside the official outline format.`;
}

export function buildOutlineVerificationUser(outlineText, documentContent, podcastDuration, podcastFocus) {
    return `Please review this podcast outline for quality and structure.

Target Podcast Duration: ${podcastDuration} minutes
${podcastFocus ? `Podcast Focus: ${podcastFocus}\n` : ''}

--- GENERATED OUTLINE ---
${outlineText}

--- ORIGINAL DOCUMENT CONTENT ---
${documentContent}

Verify if this outline has a logical structure, well-balanced sections, and aligns with the target duration and focus. Respond in the required JSON format.`;
}

// Improvement prompts
export function buildOutlineImproveSystem(baseSystemPrompt) {
    return `${baseSystemPrompt}

IMPORTANT INSTRUCTIONS FOR OUTLINE EDITING:

1. MAKE TARGETED CHANGES ONLY - Only modify specific sections mentioned in the feedback. Do not rewrite or restructure unaffected sections.
2. PRESERVE ORIGINAL STRUCTURE - Keep the same section numbering scheme and overall organization unless specific issues were identified.
3. MAINTAIN FORMAT INTEGRITY - Your response MUST follow the exact format with section separators (---), section numbers, titles, durations, and overviews.
4. PRESERVE SECTION DETAILS - Keep the same level of detail in section overviews as the original outline.
5. MAINTAIN APPROPRIATE DURATIONS - The sum of all section durations should add up to approximately the target podcast length:
   - For podcasts under 30 minutes, aim for +/- 1 minute of the target
   - For podcasts 30+ minutes, aim for +/- 2 minutes of the target
   - Always prioritize fixing significant duration discrepancies first
6. MAINTAIN APPROPRIATE STRUCTURE - Ensure structure follows the duration-based guidelines:
   - For podcasts under 15 minutes: 2-3 main sections with minimal subsections
   - For 15-30 minute podcasts: 3-5 main sections with relevant subsections
   - For 30+ minute podcasts: 5-8 main sections with multiple subsections
   - Longer sections (5+ minutes) should have appropriate subsections
   - KEY FACTS should scale proportionally (1-2 per minute of section duration)

- BE REALISTIC about what can be discussed in the allocated time - ensure each section's content and KEY FACTS can be reasonably covered in its duration
- Do not try to cover too many topics in short sections - depth is better than breadth

CRITICAL FORMATTING RULES:
- NEVER include markdown code block syntax (\`\`\`) in your response
- NEVER include 'markdown' or any other language identifiers in your response
- NEVER include duration summaries or any other comments outside the outline format
- DO NOT add any explanatory text or formatting notes
- ONLY include the exact outline format with section separators (---), numbers, titles, durations, and content

Warning: If your response significantly restructures or simplifies the outline beyond addressing the specific feedback, it will be rejected.`;
}

export function buildOutlineImproveUser(originalOutlineText, feedback, documentContent, podcastDuration, podcastFocus) {
    return `You are a podcast outline editor. I have a podcast outline that needs targeted edits based on specific feedback. Your job is to make PRECISE EDITS to address the feedback while preserving the original structure and format.

Target Podcast Duration: ${podcastDuration} minutes
${podcastFocus ? `Podcast Focus: ${podcastFocus}\n` : ''}

--- ORIGINAL OUTLINE ---
\`\`\` markdown
${originalOutlineText}
\`\`\`

--- FEEDBACK ON ISSUES ---
\`\`\` json
${feedback}
\`\`\`

--- ORIGINAL DOCUMENT CONTENT ---
\`\`\` markdown
${documentContent}
\`\`\`

IMPORTANT INSTRUCTIONS:

1. DO NOT REWRITE the entire outline. Make surgical changes ONLY to the specific parts mentioned in the feedback.
2. If the feedback points to issues in specific sections, ONLY modify those sections.
3. MAINTAIN ORIGINAL STRUCTURE - Your edited outline should have approximately the same number of sections and subsections as the original (${originalOutlineText.split('---').length - 1} sections).
4. PRESERVE all section separators (---), numbering, and format from the original outline.
5. KEEP DETAILED OVERVIEWS - Do not shorten or oversimplify section overviews.
6. ENSURE DURATION ACCURACY - The total duration should be approximately ${podcastDuration} minutes (within +/- 1 minute for podcasts under 30 minutes, or within +/- 2 minutes for longer podcasts). Fix any significant timing discrepancies first.
7. BE REALISTIC WITH CONTENT - For each section, only include topics that can be reasonably covered in the allocated time. Fewer well-developed topics are better than many rushed topics.
8. Return the COMPLETE outline with your targeted edits incorporated.

FORMATTING REQUIREMENTS (EXTREMELY IMPORTANT):
- DO NOT include code block syntax or language identifiers anywhere in your response
- DO NOT add any summary text, explanations, or annotations outside of the outline format
- DO NOT include any total duration summaries at the end
- ONLY provide the raw outline format with section separators (---), section numbers, titles, durations, and content
- Your response should begin with --- and contain ONLY the outline`;
}
