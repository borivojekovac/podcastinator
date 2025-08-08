---
description: Standard development workflow
---

1. analyse @./doc/feature-spec.md to understand broader app context
2. analyse @./doc/progress.md to understand what has already been developed
3. in case there are discrepancies between the user's request and either feature spec or progress, explain this to user and offer to either update documentation or the request before continuing.
4. build a step by step plan to achieve requested goal and present the plan to the user; explain the expected outcome and request confirmation before starting development
5. develop the change, closely following this step by step plan
6. if developed code starts deviating from the plan, stop, explain the deviation to the user, present options to user to update the plan and / or relevant documentation, and wait confirmation from the user before continuing with development
7. once development is complete as planned, update @./doc/progress.md and README.md and report results to user.

**IMPORTANT NOTES**
- if you're having issues modifying a file due to inability to uniquely identify a part of the file to be updated due to redundant code, stop and request from user to alter the code to make it identifiable, instead of looking for shell and other workarounds yourself.