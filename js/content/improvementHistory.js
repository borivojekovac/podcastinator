// Podcastinator App - Improvement History Module

/**
 * ImprovementHistory class
 * Tracks history of script improvement attempts and persistent issues
 */
class ImprovementHistory {
    
    /**
     * Create a new ImprovementHistory instance
     */
    constructor() {
    
        // Array to store all improvement attempts
        this.attempts = [];
        
        // Map to track persistent issues that appear in multiple iterations
        // Key: Issue signature, Value: {count, lastSeen, issueObject}
        this.persistentIssues = new Map();
        
        // Metrics to track improvement effectiveness
        this.metrics = {
            totalIssuesResolved: 0,
            improvementRates: []
        };
    }
    
    /**
     * Generate a unique signature for an issue to track it across attempts
     * @param {Object} issue - The issue object
     * @returns {string} - A unique signature for the issue
     */
    generateIssueSignature(issue) {
    
        // Create a signature based on issue type, priority, and a portion of the description
        // This helps identify similar issues across iterations
        const descriptionSummary = issue.description ? 
            issue.description.substring(0, 50).replace(/\s+/g, ' ').trim() : '';
        
        const locationSummary = issue.location ? 
            issue.location.substring(0, 30).replace(/\s+/g, ' ').trim() : '';
        
        return `${issue.type || 'unknown'}-${issue.priority || 'unknown'}-${descriptionSummary}-${locationSummary}`;
    }
    
    /**
     * Add a new improvement attempt to history
     * @param {Array} issues - The issues identified in this attempt
     * @param {string} improvedText - The improved text from this attempt
     * @param {string} sectionId - Identifier for the section being improved
     * @param {Array} priorityTiers - The priority tiers addressed in this attempt
     */
    addAttempt(issues, improvedText, sectionId, priorityTiers) {
    
        // Record this attempt
        const attempt = {
            issues: JSON.parse(JSON.stringify(issues)), // Deep copy to avoid reference issues
            improvedText,
            sectionId,
            priorityTiers,
            timestamp: Date.now(),
            attemptNumber: this.attempts.length + 1
        };
        
        this.attempts.push(attempt);
        
        // Update persistent issues tracking
        this.updatePersistentIssues(issues);
        
        // Calculate improvement metrics if there are previous attempts
        if (this.attempts.length > 1) {
            this.calculateImprovementMetrics();
        }
        
        return attempt;
    }
    
    /**
     * Update the tracking of persistent issues
     * @param {Array} issues - The current set of issues
     */
    updatePersistentIssues(issues) {
    
        // Mark all current persistent issues as not seen in this iteration
        for (const [signature, issueData] of this.persistentIssues.entries()) {
            this.persistentIssues.set(signature, {
                ...issueData,
                seenInCurrentIteration: false
            });
        }
        
        // Process current issues
        if (Array.isArray(issues)) {
            issues.forEach(issue => {
                const signature = this.generateIssueSignature(issue);
                
                if (this.persistentIssues.has(signature)) {
                    // Update existing issue
                    const existingIssue = this.persistentIssues.get(signature);
                    this.persistentIssues.set(signature, {
                        count: existingIssue.count + 1,
                        lastSeen: this.attempts.length,
                        issueObject: issue,
                        seenInCurrentIteration: true
                    });
                } else {
                    // Add new issue
                    this.persistentIssues.set(signature, {
                        count: 1,
                        lastSeen: this.attempts.length,
                        issueObject: issue,
                        seenInCurrentIteration: true
                    });
                }
            });
        }
    }
    
    /**
     * Calculate metrics on improvement effectiveness
     * @returns {Object} - The calculated metrics
     */
    calculateImprovementMetrics() {
    
        if (this.attempts.length < 2) {
            return {
                improvementRate: 100,
                issuesResolved: 0,
                issuesRemaining: this.attempts[0]?.issues?.length || 0
            };
        }
        
        // Get the two most recent attempts
        const previousAttempt = this.attempts[this.attempts.length - 2];
        const currentAttempt = this.attempts[this.attempts.length - 1];
        
        // Count issues in previous and current attempts
        const previousIssueCount = previousAttempt.issues?.length || 0;
        const currentIssueCount = currentAttempt.issues?.length || 0;
        
        // Calculate issues resolved
        const issuesResolved = Math.max(0, previousIssueCount - currentIssueCount);
        
        // Calculate improvement rate as percentage of issues resolved
        let improvementRate = previousIssueCount > 0 ? 
            (issuesResolved / previousIssueCount) * 100 : 0;
        
        // If issues increased, use negative improvement rate
        if (currentIssueCount > previousIssueCount) {
            improvementRate = -((currentIssueCount - previousIssueCount) / previousIssueCount) * 100;
        }
        
        // Update metrics
        this.metrics.totalIssuesResolved += issuesResolved;
        this.metrics.improvementRates.push(improvementRate);
        
        const metrics = {
            improvementRate,
            issuesResolved,
            issuesRemaining: currentIssueCount
        };
        
        return metrics;
    }
    
    /**
     * Get persistent issues that have appeared multiple times
     * @param {number} minOccurrences - Minimum number of occurrences to consider an issue persistent
     * @returns {Array} - Array of persistent issues with their counts
     */
    getPersistentIssues(minOccurrences = 2) {
    
        const persistent = [];
        
        for (const [signature, issueData] of this.persistentIssues.entries()) {
            if (issueData.count >= minOccurrences) {
                persistent.push({
                    issue: issueData.issueObject,
                    count: issueData.count,
                    lastSeen: issueData.lastSeen
                });
            }
        }
        
        // Sort by count (most frequent first) and then by last seen
        return persistent.sort((a, b) => {
            if (b.count !== a.count) {
                return b.count - a.count;
            }
            return b.lastSeen - a.lastSeen;
        });
    }
    
    /**
     * Determine whether improvement attempts should continue
     * @param {number} maxAttempts - Maximum number of improvement attempts
     * @param {number} minImprovementRate - Minimum acceptable improvement rate percentage
     * @returns {boolean} - True if improvements should continue, false if they should stop
     */
    shouldContinueImprovement(maxAttempts = 3, minImprovementRate = 10) {
    
        // Stop if maximum attempts reached
        if (this.attempts.length >= maxAttempts) {
            console.log(`Maximum attempts (${maxAttempts}) reached. Stopping improvement cycle.`);
            return false;
        }
        
        // Continue if no attempts yet
        if (this.attempts.length < 1) {
            return true;
        }
        
        // Check last improvement rate
        const lastAttemptMetrics = this.calculateImprovementMetrics();
        const improvementRate = lastAttemptMetrics.improvementRate;
        
        // If improvement rate is below threshold, consider stopping
        if (improvementRate < minImprovementRate) {
            console.log(`Improvement rate (${improvementRate.toFixed(2)}%) is below minimum threshold (${minImprovementRate}%). Consider stopping improvement cycle.`);
            return false;
        }
        
        // Continue improvements
        return true;
    }
    
    /**
     * Generate a summary of improvement history for inclusion in prompts
     * @param {number} maxAttemptsToInclude - Maximum number of previous attempts to include
     * @returns {string} - Formatted history summary for inclusion in prompts
     */
    generateHistorySummary(maxAttemptsToInclude = 2) {
    
        if (this.attempts.length === 0) {
            return '';
        }
        
        let historySummary = `\n\n--- PREVIOUS IMPROVEMENT ATTEMPTS ---\n`;
        historySummary += `There have been ${this.attempts.length} previous improvement attempts.\n\n`;
        
        // Get persistent issues
        const persistentIssues = this.getPersistentIssues(2);
        if (persistentIssues.length > 0) {
            historySummary += `Persistent issues that haven't been fully resolved:\n`;
            persistentIssues.slice(0, 5).forEach((item, index) => {
                historySummary += `${index + 1}. ${item.issue.type} (${item.issue.priority}): ${item.issue.description} (appeared ${item.count} times)\n`;
            });
            historySummary += '\n';
        }
        
        // Include details from recent attempts (limit to avoid token overload)
        const recentAttempts = this.attempts.slice(-maxAttemptsToInclude);
        recentAttempts.forEach((attempt, index) => {
            const attemptNumber = this.attempts.length - recentAttempts.length + index + 1;
            historySummary += `Attempt #${attemptNumber} (focused on ${attempt.priorityTiers.join(', ')} issues):\n`;
            historySummary += `- Issues addressed: ${attempt.issues.length}\n`;
            
            // Add a few example issues
            if (attempt.issues.length > 0) {
                historySummary += `- Example issues:\n`;
                attempt.issues.slice(0, 2).forEach(issue => {
                    historySummary += `  * ${issue.type} (${issue.priority}): ${issue.description}\n`;
                });
            }
            
            historySummary += '\n';
        });
        
        // Add improvement metrics
        if (this.metrics.improvementRates.length > 0) {
            const recentRate = this.metrics.improvementRates[this.metrics.improvementRates.length - 1];
            historySummary += `Recent improvement rate: ${recentRate.toFixed(2)}% issues resolved\n`;
            historySummary += `Total issues resolved across all attempts: ${this.metrics.totalIssuesResolved}\n`;
        }
        
        return historySummary;
    }
    
    /**
     * Get the full history of attempts
     * @returns {Array} - All recorded improvement attempts
     */
    getAttempts() {
    
        return this.attempts;
    }
    
    /**
     * Get improvement metrics
     * @returns {Object} - Current improvement metrics
     */
    getMetrics() {
    
        return this.metrics;
    }
}

export default ImprovementHistory;
