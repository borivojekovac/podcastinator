/**
 * FullscreenTextControl Module
 * Adds a toggle button to textareas that enables fullscreen editing mode
 */
export default class FullscreenTextControl {
    /**
     * Initialize fullscreen controls on specified textareas
     */
    constructor() {
        this.activeFullscreenElement = null;
        this.backdrop = this.createBackdrop();
        document.body.appendChild(this.backdrop);
    }

    /**
     * Create the fullscreen backdrop element
     * @returns {HTMLElement} The backdrop element
     */
    createBackdrop() {
        const backdrop = document.createElement('div');
        backdrop.className = 'fullscreen-backdrop';
        return backdrop;
    }

    /**
     * Attach fullscreen controls to a textarea
     * @param {HTMLTextAreaElement} textarea - The textarea to attach controls to
     */
    attachTo(textarea) {
        // Skip if already has controls
        if (textarea.parentElement.classList.contains('fullscreen-control-container')) {
            return;
        }

        // Create container to wrap the textarea for proper button positioning
        const container = document.createElement('div');
        container.className = 'fullscreen-control-container';
        
        // Replace the textarea with our container
        textarea.parentNode.insertBefore(container, textarea);
        container.appendChild(textarea);
        
        // Create the toggle button with expand icon
        const toggleButton = document.createElement('button');
        toggleButton.className = 'fullscreen-toggle';
        toggleButton.setAttribute('type', 'button');
        toggleButton.setAttribute('aria-label', 'Toggle fullscreen');
        toggleButton.innerHTML = this.getExpandIcon();
        
        // Add the button to our container
        container.appendChild(toggleButton);
        
        // Set up click handler
        const clickHandler = this;
        toggleButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            clickHandler.toggleFullscreen(textarea, toggleButton);
        });
        
        // Escape key handler to exit fullscreen
        this.setupEscapeKeyHandler(textarea);
    }

    /**
     * Get the SVG icon for the expand button
     * @returns {string} SVG markup for expand icon
     */
    getExpandIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M3,3 L9,3 L9,5 L5,5 L5,9 L3,9 L3,3 Z M3,21 L3,15 L5,15 L5,19 L9,19 L9,21 L3,21 Z M21,3 L21,9 L19,9 L19,5 L15,5 L15,3 L21,3 Z M21,21 L15,21 L15,19 L19,19 L19,15 L21,15 L21,21 Z" />
        </svg>`;
    }

    /**
     * Get the SVG icon for the collapse button
     * @returns {string} SVG markup for collapse icon
     */
    getCollapseIcon() {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M15,3 L21,3 L21,9 L19,9 L19,5 L15,5 L15,3 Z M3,21 L9,21 L9,19 L5,19 L5,15 L3,15 L3,21 Z M21,21 L15,21 L15,19 L19,19 L19,15 L21,15 L21,21 Z M3,3 L9,3 L9,5 L5,5 L5,9 L3,9 L3,3 Z" />
        </svg>`;
    }

    /**
     * Setup escape key handler to exit fullscreen mode
     * @param {HTMLTextAreaElement} textarea - The textarea element
     */
    setupEscapeKeyHandler(textarea) {
        const escapeHandler = this;
        textarea.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && textarea.classList.contains('textarea-fullscreen-mode')) {
                const button = textarea.nextElementSibling;
                escapeHandler.toggleFullscreen(textarea, button);
            }
        });
    }
    
    // positionToggleButton method removed as positioning is now handled by CSS

    /**
     * Toggle the fullscreen state of a textarea
     * @param {HTMLTextAreaElement} textarea - The textarea to toggle
     * @param {HTMLButtonElement} button - The toggle button
     */
    toggleFullscreen(textarea, button) {
        const isEnteringFullscreen = !textarea.classList.contains('textarea-fullscreen-mode');
        
        // Store the original scroll position and height before going fullscreen
        if (isEnteringFullscreen) {
            textarea.dataset.originalHeight = textarea.style.height || '';
            textarea.dataset.originalScrollTop = textarea.scrollTop;
            
            // If another element is already in fullscreen, exit that first
            if (this.activeFullscreenElement && this.activeFullscreenElement !== textarea) {
                const activeButton = this.activeFullscreenElement.nextElementSibling;
                this.toggleFullscreen(this.activeFullscreenElement, activeButton);
            }
            
            this.activeFullscreenElement = textarea;
            
            // Show the backdrop and apply fullscreen mode
            this.backdrop.classList.add('active');
            textarea.classList.add('textarea-fullscreen-mode');
            button.classList.add('exit-fullscreen');
            button.innerHTML = this.getCollapseIcon();
            
            // Focus the textarea after a brief delay (for animation)
            setTimeout(() => {
                textarea.focus();
                textarea.scrollTop = parseInt(textarea.dataset.originalScrollTop || 0);
            }, 300);
        } else {
            // Exit fullscreen
            this.backdrop.classList.remove('active');
            textarea.classList.remove('textarea-fullscreen-mode');
            button.classList.remove('exit-fullscreen');
            button.innerHTML = this.getExpandIcon();
            
            // Restore original height if it was set
            if (textarea.dataset.originalHeight) {
                textarea.style.height = textarea.dataset.originalHeight;
            }
            
            this.activeFullscreenElement = null;
        }
    }

    /**
     * Initialize fullscreen controls on all text areas in the application
     */
    static initializeAll() {
        const control = new FullscreenTextControl();
        
        // Apply to all specified textareas
        const textareas = [
            // Voice instructions
            document.getElementById('host-voice-instructions'),
            document.getElementById('guest-voice-instructions'),
            // Character backstories
            document.getElementById('host-backstory'),
            document.getElementById('guest-backstory'),
            // Content generators
            document.getElementById('outline-text'),
            document.getElementById('script-text'),
            // Podcast focus
            document.getElementById('podcast-focus')
        ];
        
        // Apply controls to each textarea if it exists
        textareas.forEach(textarea => {
            if (textarea) {
                control.attachTo(textarea);
            }
        });
        
        return control;
    }
}
