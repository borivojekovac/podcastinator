// HeadlessContentState - minimal ContentStateManager replacement for CLI

class HeadlessContentState {
    constructor(initial = {}) {
        this.state = {
            hasApiKey: false,
            hasDocument: false,
            hasHostCharacter: false,
            hasGuestCharacter: false,
            hasOutline: false,
            hasScript: false,
            hasAudio: false,
            ...initial
        };
    }

    init() {
        // no-op
    }

    updateState(key, value) {
        if (Object.prototype.hasOwnProperty.call(this.state, key)) {
            this.state[key] = !!value;
        }
    }

    saveState() {
        // no-op
    }

    getState() {
        return { ...this.state };
    }

    updateSections() {
        // no-op (no DOM in CLI)
    }
}

export default HeadlessContentState;
