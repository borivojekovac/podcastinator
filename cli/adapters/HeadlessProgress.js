// HeadlessProgress - no-op progress for CLI, logs optional percentages

class HeadlessProgress {
    updateProgress(containerId, percentage) {
        // Optional: console.log(`[progress:${containerId}] ${Math.round(percentage)}%`);
    }

    resetProgress(containerId) {
        // no-op
    }

    showProgress(containerId) {
        // no-op
    }

    hideProgress(containerId) {
        // no-op
    }
}

export default HeadlessProgress;
