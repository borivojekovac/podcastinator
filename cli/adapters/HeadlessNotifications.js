// HeadlessNotifications - console-backed notifications for CLI

class HeadlessNotifications {
    showInfo(message, id) {
        console.log(`[INFO]${id ? ' [' + id + ']' : ''} ${message}`);
    }

    showSuccess(message, id) {
        console.log(`[SUCCESS]${id ? ' [' + id + ']' : ''} ${message}`);
    }

    showError(message, id) {
        console.error(`[ERROR]${id ? ' [' + id + ']' : ''} ${message}`);
    }

    clearNotification(id) {
        // no-op in CLI
    }
}

export default HeadlessNotifications;
