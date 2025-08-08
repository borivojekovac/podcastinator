// Podcastinator App - Notifications Manager
class NotificationsManager {
    constructor() {
        this.notificationTimeouts = new Map();
        this.notificationDuration = 5000; // 5 seconds
    }

    /**
     * Create notification container if it doesn't exist
     * @private
     */
    _ensureContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Create a new notification element
     * @private
     * @param {string} type - Notification type (error, success, info)
     * @param {string} message - Message to display
     * @param {number} id - The notification ID
     * @returns {HTMLElement} The created notification element
     */
    _createNotification(type, message, id) {
        const container = this._ensureContainer();
        const notification = document.createElement('div');
        
        notification.id = `notification-${id}`;
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'error' ? '❌' : (type === 'info' ? 'ℹ️' : '✅')}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;
        
        container.appendChild(notification);
        
        // Trigger reflow to enable animation
        void notification.offsetWidth;
        
        return notification;
    }

    /**
     * Show a notification
     * @private
     * @param {string} type - Notification type (error, success, info)
     * @param {string} message - Message to display
     * @param {number} id - Optional ID for the notification
     * @returns {number} The notification ID
     */
    _showNotification(type, message, id = null) {
        // Generate an ID if not provided
        const notificationId = id || Date.now();
        
        // Clear any existing timeout for this notification ID
        if (this.notificationTimeouts.has(notificationId)) {
            clearTimeout(this.notificationTimeouts.get(notificationId));
        }

        // Create notification with ID
        const notification = this._createNotification(type, message, notificationId);
        const self = this;
        
        // Show notification
        notification.classList.add('show');
        
        // Auto-hide after duration
        const timeoutId = setTimeout(function() {
            self.clearNotification(notificationId);
        }, this.notificationDuration);
        
        this.notificationTimeouts.set(notificationId, timeoutId);
        
        return notificationId;
    }
    
    /**
     * Clear a notification by ID
     * @param {number} id - The notification ID to clear
     */
    clearNotification(id) {
        // Find the notification element
        const notification = document.getElementById(`notification-${id}`);
        
        if (notification) {
            // Remove show class and add hide class
            notification.classList.remove('show');
            notification.classList.add('hide');
            
            // Remove from DOM after animation completes
            notification.addEventListener('transitionend', function handler() {
                notification.removeEventListener('transitionend', handler);
                notification.remove();
            });
        }
        
        // Clear the timeout
        if (this.notificationTimeouts.has(id)) {
            clearTimeout(this.notificationTimeouts.get(id));
            this.notificationTimeouts.delete(id);
        }
    }

    /**
     * Show error notification
     * @param {string} message - Error message to display
     * @param {number} id - Optional ID for the notification
     * @returns {number} The notification ID
     */
    showError(message, id) {
        return this._showNotification('error', message, id);
    }

    /**
     * Show success notification
     * @param {string} message - Success message to display
     * @param {number} id - Optional ID for the notification
     * @returns {number} The notification ID
     */
    showSuccess(message, id) {
        return this._showNotification('success', message, id);
    }
    
    /**
     * Show info notification
     * @param {string} message - Info message to display
     * @param {number} id - Optional ID for the notification
     * @returns {number} The notification ID
     */
    showInfo(message, id) {
        return this._showNotification('info', message, id);
    }

    /**
     * Show a notification (legacy method)
     * @param {string} message - Message to display
     * @param {string} type - Type of notification ('success' or 'error')
     */
    showNotification(message, type) {
        this._showNotification(type, message);
    }
}

export default NotificationsManager;
