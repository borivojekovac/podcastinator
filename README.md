# Podcastinator ▶️

**Transform your documents into engaging audio podcasts using AI-powered characters**

Podcastinator is a single-page web application that converts text and markdown documents into professional audio podcasts. Using OpenAI's GPT and text-to-speech APIs, it creates engaging conversations between AI-generated host and guest characters.

## Features

- **📄 Document Upload**: Upload plain text and markdown documents
- **🤖 AI Characters**: Create custom host and guest personas with unique voices
- **⏱️ Duration Control**: Specify target podcast length and section timing
- **🔍 Content Focus**: Tailor podcast content to specific topics or themes
- **📝 Smart Script Generation**: AI-powered outline and script creation
- **🤔 Self-Improving Content**: Automated verification and iterative refinement of outlines and scripts
- **🌐 Multi-Language Support**: Generate scripts in multiple languages based on TTS compatibility
- **🎵 Audio Generation**: Convert scripts to high-quality audio podcasts
- **💰 Usage Tracking**: Monitor API token usage and estimate costs
- **💾 Auto-Save**: All progress saved locally in browser storage
- **📱 Mobile-Friendly**: Responsive design works on all devices

## Quick Start

### Prerequisites
- Modern web browser
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))

### Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Start the development server:

```bash
npm start
```

4. Open http://localhost:8080 in your browser
5. Enter your OpenAI API key to get started
6. **Debug Mode**: Add `?debug` to the URL to unlock all sections for testing

### Usage

1. **Set up OpenAI API**: Enter your API key
2. **Upload Document**: Drag & drop or browse for text/markdown files
3. **Create Characters**: Define host and guest personalities and voices
4. **Generate Outline**:
   - Set target podcast duration in minutes
   - Optionally specify a content focus
   - Generate structured outline with section durations
   - Automatic iterative verification and refinement of outline (up to 3 improvement cycles)
5. **Generate Script**: 
   - Select your preferred language from supported options
   - Create detailed script based on outline timing
   - Automatic iterative verification and improvement of script quality (up to 3 improvement cycles)
   - Factual accuracy verification against original document
6. **Generate Audio**: Convert script to podcast audio
7. **Download**: Save your finished podcast
8. **Monitor Usage**: Access the usage counter by clicking the hamburger icon at the top of the screen to track token usage and estimate costs

## Development Status

See `doc/progress.md` for detailed development status.

## Project Structure

```
Podcastinator/
├── index.html          # Main application page
├── style.css           # Responsive styles with design system
├── css/                # Component-specific styles
│   └── components/     # UI component stylesheets
├── js/                 # Modular JavaScript files
│   ├── api/            # OpenAI API integration
│   ├── characters/     # Character management
│   ├── content/        # Content generation (outline, script, audio)
│   ├── document/       # Document handling
│   ├── lib/            # External libraries
│   ├── ui/             # UI components and managers
│   ├── usage/          # API usage tracking
│   └── utils/          # Utility classes
├── package.json        # Project configuration
├── doc/
│   ├── feature-spec.md # Detailed feature specifications
│   ├── progress.md     # Development progress tracking
│   └── style-guide.md  # Design system and style guidelines
└── README.md           # This file
```

## Contributing

1. Check `doc/feature-spec.md` for detailed requirements
2. Follow the design system in `doc/style-guide.md`
3. Follow the development workflow in `doc/progress.md`
4. Test locally with `npm start`
5. Use debug mode (`?debug`) for unlocking all the sections
6. Submit pull requests with clear descriptions

## Technical Details

### Local Storage

Podcastinator persists all user data in the browser's local storage for a seamless experience. The following data is stored:

- **API Key**: Securely stored after validation
- **Model Selections**: All model preferences (GPT-4o, TTS, etc.)
- **Document Data**: Uploaded document information
- **Character Details**: Host and guest configurations
- **Generated Content**: Scripts and audio URLs
- **Usage Data**: Token usage tracking for each model
- **Cost Settings**: Custom pricing for each model

Data is automatically saved as you interact with the application and persists between browser sessions.

### Keyboard Navigation

The application supports keyboard navigation for improved accessibility:

- `Tab` - Move between form elements
- `Enter` - Activate buttons and submit forms
- `Space` - Toggle dropdowns and checkboxes
- `Escape` - Close any open dialogs or dropdowns

## Development

### Prerequisites

- Node.js 16+ and npm
- Modern web browser
- OpenAI API key

### Testing

- Use `?debug` parameter to enable all sections for testing
- Check browser console (F12) for debug information
- Test responsive design using browser dev tools

### Code Style

- Follow existing code style and patterns
- Use semantic HTML5 elements
- Follow BEM naming convention for CSS classes
- Document complex logic with JSDoc comments

## Troubleshooting

### Common Issues

- **API Key Not Working**: Ensure your OpenAI API key has sufficient credits and proper permissions
- **Loading Issues**: Clear browser cache if the app doesn't load correctly
- **Missing Features**: Check if you're in debug mode (`?debug`) for all features
- **Usage Drawer Not Showing**: Click the gripper/hamburger icon at the top of screen to toggle the usage drawer

## License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

Built with ❤️ using Windsurf and OpenAI API