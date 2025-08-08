// Podcastinator App - Retry Manager
/**
 * Handles retry logic with exponential backoff for API calls
 */
class RetryManager {
    constructor(options = {}) {
        // Maximum number of retry attempts
        this.maxRetries = options.maxRetries || 3;
        
        // Base delay in milliseconds (increases exponentially)
        this.baseDelay = options.baseDelay || 1000;
        
        // Maximum delay in milliseconds
        this.maxDelay = options.maxDelay || 10000;
        
        // Jitter factor (0-1) to add randomness to delays
        this.jitter = options.jitter || 0.25;
        
        // Callback for retry notifications
        this.onRetry = options.onRetry || null;
        
        // Callback to check if operation should be cancelled
        this.shouldCancel = options.shouldCancel || null;
    }

    /**
     * Execute an async function with retry logic
     * @param {Function} fn - Async function to execute
     * @param {Function} isRetryableError - Function to determine if error is retryable
     * @returns {Promise<any>} - Result of the function
     */
    async execute(fn, isRetryableError) {
        let attempt = 0;
        
        while (true) {
            try {
                return await fn();
            } catch (error) {
                attempt++;
                
                // Check if we should retry
                const shouldRetry = 
                    attempt <= this.maxRetries && 
                    (isRetryableError ? isRetryableError(error) : this.isNetworkError(error));
                
                // If we shouldn't retry, rethrow the error
                if (!shouldRetry) {
                    throw error;
                }
                
                // Check if operation should be cancelled
                if (this.shouldCancel && this.shouldCancel()) {
                    throw new Error('Operation cancelled during retry');
                }
                
                // Calculate delay with exponential backoff and jitter
                const delay = this.calculateDelay(attempt);
                
                // Notify about retry if callback exists
                if (this.onRetry) {
                    this.onRetry({
                        error,
                        attempt,
                        delay,
                        maxRetries: this.maxRetries
                    });
                }
                
                // Wait before retrying
                await this.wait(delay);
                
                // Check again if operation should be cancelled after waiting
                if (this.shouldCancel && this.shouldCancel()) {
                    throw new Error('Operation cancelled during retry');
                }
            }
        }
    }
    
    /**
     * Calculate delay with exponential backoff and jitter
     * @param {number} attempt - Current attempt number (1-based)
     * @returns {number} - Delay in milliseconds
     */
    calculateDelay(attempt) {
        // Exponential backoff: baseDelay * 2^(attempt-1)
        let delay = this.baseDelay * Math.pow(2, attempt - 1);
        
        // Apply jitter to prevent thundering herd
        if (this.jitter > 0) {
            const jitterAmount = delay * this.jitter;
            delay += Math.random() * jitterAmount;
        }
        
        // Cap at maximum delay
        return Math.min(delay, this.maxDelay);
    }
    
    /**
     * Wait for specified milliseconds
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise<void>}
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Check if an error is likely a network/connectivity error
     * @param {Error} error - The error to check
     * @returns {boolean} - True if it's a network error
     */
    isNetworkError(error) {
        // Check for common network error patterns
        const errorString = String(error).toLowerCase();
        
        // Network error indicators
        const networkErrorPatterns = [
            'network error',
            'failed to fetch',
            'connection refused',
            'connection reset',
            'connection closed',
            'timeout',
            'socket hang up',
            'econnrefused',
            'econnreset',
            'etimedout',
            'internet disconnected'
        ];
        
        // Check for network error patterns in error message
        return networkErrorPatterns.some(pattern => errorString.includes(pattern));
    }
}

export default RetryManager;
