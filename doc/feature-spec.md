# feature spec

## app overview

Application is a simple SPA web app which enables users to convert text documents (plain text or markdown) containing research, articles or book content into audio podcasts. It features a character builder used to add backstory, personality and voice style to virtual host and guest characters. Based on the characters and the document, the app first generates a structured podcast outline with section separators, then creates a detailed podcast script which is converted into audio using OpenAI's TTS engine.

## app features

### user interface & flow

The user interface is a minimalistic, simple page web app, where components are arranged vertically and following the workflow, step by step:

1. define OpenAI API credentials
2. upload the document
3. build host character
4. build guest character
5. generate podcast script
6. convert podcast script into audio

The app is built using HTML, CSS and JavaScript, is responsive and mobile-friendly, runs fully in the browser; it does not require any server-side code and is locally tested using "npx http-server -a localhost -p 8080 -o ./".

All sections except section 1 are initially disabled; as a section is completed, the next section is enabled. All input is persisted in the browser's local storage, so that browser refresh affects nothing.

### openai api credentials

The openai api credentials are used to authenticate requests to the OpenAI API. The credentials are persisted in the browser's local storage, so that browser refresh affects nothing. input is validated to ensure that the API key is not empty, and is not visible in the UI (password input).

### document upload

The document upload enables users to upload plain text (.txt) or markdown (.md/.markdown) files containing research, articles, or book content for conversion into audio podcasts. Users can choose to drag and drop a document, or can browse for a document to upload. The system processes the text content directly without encoding/decoding, making it more reliable for AI processing. Uploaded document content is persisted in the browser's local storage, so that browser refresh affects nothing.

### character builder

Character builder is a reusable component, reused to define both host and guest characters.

It enables users to:
- enter character name
- choose a personality type from a variety offered in a combo box
- choose voice type from a variety of male and female voices offered by OpenAI 4o model.

There is a big backstory text input where user can manually fill-in character's backstory, and on top of it there is also a small text box and a "generate" button, which enable user to generate a backstory using a simple steer and an OpenAI LLM. Generated backstory is then available for user to modify manually or to re-generate.

### podcast script generator

The podcast script generator enables users to generate a podcast script based on the uploaded document and the characters defined in the character builder. Podcast generation is done in two distinct steps, each with its own dedicated UI section:

1. outline generation
2. script generation

#### Outline Generation

The outline is a structured text document that contains hierarchically numbered sections and subsections, with each section containing:
- A section number (e.g., 1, 1.1, 2, etc.)
- A descriptive title
- An overview that summarizes the key points for that section

Each main section is clearly demarcated with horizontal rule separators (---) for easy parsing by the script generation system. The outline follows this exact format:

```
---
1. Section Title
Duration: 2 minutes
Overview: Section overview text
---
1.1. Subsection Title
Duration: 5 minutes
Overview: Subsection overview text
---
2. Next Section Title
Duration: 1 minute
Overview: Next section overview text
---
```

Outlines are generated using OpenAI's models and can be manually edited by the user if needed. The outline generation process includes a progress indicator and can be canceled if necessary.

#### Script Generation

The script is a much longer text, theoretically not limited in size, and is generated in steps from the structured outline. Each section of the script corresponds to a section in the outline. The script includes actual dialogue between the host and guest characters, formatted with speaker attributions.

In each step, the next section of the script is generated and appended to the existing script. There is a progress bar indicating how far the generation has come, and a "cancel" button which enables users to stop the generation process. The completed script is available for user to modify manually or to regenerate if needed.

### podcast audio generator

The podcast audio generator enables users to generate a podcast audio based on the script generated in the previous step. Audio is generated using an OpenAI LLM, one chunk at a time (e.g. host's chunk, guest's chunk, host's chunk, etc.); all the chunks are combined into a single audio file and silence of user-defined length is inserted between chunks. There is a progress bar indicating generation progress, and a "cancel" button which enables user to cancel the generation process. Audio is then available for user to download.