// Centralized prompt builders for Outline generation/verification/improvement

// Generation prompts
export function buildOutlineGenerationSystem(host, guest, targetDurationMinutes) {
    return `You are a podcast outline generator.
        
Create a structured outline for a podcast discussion between a host named "${host.name || 'Host'}" 
(${host.personality ? `personality: ${host.personality}` : ''}) 
and a guest named "${guest.name || 'Guest'}" (${guest.personality ? `personality: ${guest.personality}` : ''}).

IMPORTANT: The target duration for the entire podcast is ${targetDurationMinutes} minutes. You must structure the outline so that each section has an appropriate amount of time allocation, adding up to ${targetDurationMinutes} minutes total.

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
   - KEY FACTS: List 3-5 specific facts, concepts, or points to cover in this section
   - UNIQUE FOCUS: Describe what makes this section distinct from others
   - CARRYOVER: Note any topics that build on previous sections (use "None" if this is the first section or completely independent)
3. Use horizontal rule separators (---) between each section for easy parsing
4. Ensure all section durations add up to the target podcast length
5. Organize content logically with natural flow between sections
6. Balance depth vs. breadth based on available time
7. Distribute topics strategically to minimize redundancy across sections

## Example Format:

---
1. Introduction
Duration: 3 minutes
Overview: Brief exchange of credentials and establishing expertise.
KEY FACTS:
- Host introduces guest's background and expertise
- Overview of what will be covered in the podcast
- Why this topic is relevant to the audience
UNIQUE FOCUS: Setting the foundation and establishing credibility
CARRYOVER: None
---
1.2. Topic Relevance
Duration: 2 minutes
Overview: Discussion of why this topic matters to the audience.
KEY FACTS:
- Current relevance and timeliness of the topic
- Impact on the target audience
- Brief preview of key insights to come
UNIQUE FOCUS: Establishing importance and audience connection
CARRYOVER: Builds on guest's expertise established in introduction
---
2. Main Topic Section
Duration: 7 minutes
Overview: Detailed exploration of the central theme with expert insights.
KEY FACTS:
- Core concept explanation
- Expert analysis and insights
- Real-world examples or case studies
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
3) Ensure the total duration is exactly ${podcastDuration} minutes, with each section duration specified.`;
    }

    return `Generate a podcast outline based on the following document content:

\`\`\` markdown
${documentContent}
\`\`\`

Create a well-organized outline that covers the key information from this document in a conversational podcast format. The outline MUST:
1) Begin with an Introduction section (first section) that sets context and introduces the guest.
2) End with an Outro/Conclusion section (final section) that wraps up, thanks the guest, and provides a sign-off.
3) Ensure the total duration is exactly ${podcastDuration} minutes, with each section duration specified.`;
}

// Verification prompts
export function buildOutlineVerificationSystem() {
    return `You are a podcast outline quality reviewer. Your job is to analyze a generated podcast outline for:

1. STRUCTURE QUALITY: Ensure the outline has a logical structure with appropriate sections
2. TIMING ACCURACY: Verify that section durations add up to the target podcast duration
3. TOPICAL COVERAGE: Check that the outline appears to cover the main topics with appropriate emphasis
4. FOCUS ALIGNMENT: Confirm the outline aligns with any user-specified focus/steer
5. FORMAT CORRECTNESS: Ensure the outline follows the required section numbering and separator format

Respond with a JSON object containing:
- "isValid": true if the outline meets all quality criteria, false otherwise
- "feedback": specific issues found (if isValid is false) or confirmation (if isValid is true)

If the outline is high quality and factually accurate, respond with {"isValid": true, "feedback": "Outline is accurate and well-structured."}`;
}

export function buildOutlineVerificationUser(outlineText, documentContent, podcastDuration, podcastFocus) {
    return `Please review this podcast outline for quality and structure.

Target Podcast Duration: ${podcastDuration} minutes
${podcastFocus ? `Podcast Focus: ${podcastFocus}\n` : ''}

--- GENERATED OUTLINE ---
\`\`\` markdown
${outlineText}
\`\`\`

--- ORIGINAL DOCUMENT CONTENT ---
\`\`\` markdown
${documentContent}
\`\`\`

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
5. MAINTAIN APPROPRIATE DURATIONS - Ensure all section durations still add up to the target podcast length.

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
\`\`\` markdown
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
6. ENSURE DURATION ACCURACY - Make sure all section durations add up to exactly ${podcastDuration} minutes.
7. Return the COMPLETE outline with your targeted edits incorporated.`;
}
