// Podcastinator App - Usage Counter
import StorageManager from '../utils/storage.js';
import NotificationsManager from '../ui/notifications.js';

class UsageCounter {
    constructor(storageManager, apiManager) {
        this.storageManager = storageManager;
        this.apiManager = apiManager;
        this.notifications = new NotificationsManager();
        
        // Default model costs per 1k tokens (in USD)
        this.defaultCosts = {
            // Content models
            'gpt-4.1': { input: 0.01, output: 0.03 },
            'gpt-4.1-mini': { input: 0.005, output: 0.015 },
            'gpt-4.1-nano': { input: 0.0025, output: 0.0075 },
            'o3': { input: 0.005, output: 0.015 },
            'o4-mini': { input: 0.0025, output: 0.0075 },
            'gpt-4o': { input: 0.005, output: 0.015 },
            'gpt-4o-mini': { input: 0.0015, output: 0.005 },
            'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
            'gpt-3.5-turbo-16k': { input: 0.001, output: 0.002 },
            
            // Audio models
            'tts-1': 0.015,  // per 1k characters
            'tts-1-hd': 0.03, // per 1k characters
            'gpt-4o-mini-tts': 0.015  // per 1k characters
        };
        
        // Load usage data from storage
        const savedUsage = this.storageManager.load('usageData', {});
        this.usage = savedUsage.usage || {};
        
        // Load cost data from storage or use defaults
        const savedCosts = this.storageManager.load('costData', {});
        this.costs = savedCosts.costs || JSON.parse(JSON.stringify(this.defaultCosts));
        
        this.isDrawerOpen = false;
    }

    /**
     * Initialize the usage counter
     */
    init() {
    
        this.createUsageDrawer();
        this.setupEventListeners();
        this.populateUsageTable();
        
        console.log('💰 Usage Counter initialized');
    }
    
    /**
     * Create the usage counter drawer in the DOM
     */
    createUsageDrawer() {
    
        // Create drawer container
        const drawer = document.createElement('div');
        drawer.id = 'usage-drawer';
        drawer.className = 'usage-drawer';
        
        // Create gripper with hamburger icon
        const gripper = document.createElement('div');
        gripper.className = 'usage-gripper';
        gripper.innerHTML = '<div class="hamburger-icon"><span></span><span></span><span></span></div>';
        
        // Create drawer content
        const content = document.createElement('div');
        content.className = 'usage-content';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'usage-header';
        header.innerHTML = '<h2>OpenAI API Usage Counter</h2>';
        
        // Create table
        const table = document.createElement('table');
        table.className = 'usage-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Model</th>
                    <th>Cost per 1K tokens (input)</th>
                    <th>Cost per 1K tokens (output)</th>
                    <th>Used tokens</th>
                    <th>Estimated cost</th>
                </tr>
            </thead>
            <tbody id="usage-table-body">
                <!-- Will be populated dynamically -->
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="4" class="total-label">Total Estimated Cost</td>
                    <td id="total-cost">$0.00</td>
                </tr>
            </tfoot>
        `;
        
        // Create footer with reset button
        const footer = document.createElement('div');
        footer.className = 'usage-footer';
        
        const resetButton = document.createElement('button');
        resetButton.id = 'reset-usage';
        resetButton.className = 'btn-secondary';
        resetButton.textContent = 'Reset Usage Data';
        
        const resetCostsButton = document.createElement('button');
        resetCostsButton.id = 'reset-costs';
        resetCostsButton.className = 'btn-secondary';
        resetCostsButton.textContent = 'Reset to Default Costs';
        
        footer.appendChild(resetButton);
        footer.appendChild(resetCostsButton);
        
        // Assemble drawer
        content.appendChild(header);
        content.appendChild(table);
        content.appendChild(footer);
        drawer.appendChild(gripper);
        drawer.appendChild(content);
        
        // Add to DOM
        document.body.appendChild(drawer);
    }
    
    /**
     * Setup event listeners for the usage drawer
     */
    setupEventListeners() {
    
        const self = this;
        
        // Toggle drawer on gripper click
        const gripper = document.querySelector('.usage-gripper');
        if (gripper) {
            gripper.addEventListener('click', function() {
                self.toggleDrawer();
            });
        }
        
        // Reset usage data
        const resetButton = document.getElementById('reset-usage');
        if (resetButton) {
            resetButton.addEventListener('click', function() {
                self.resetUsage();
            });
        }
        
        // Reset costs to defaults
        const resetCostsButton = document.getElementById('reset-costs');
        if (resetCostsButton) {
            resetCostsButton.addEventListener('click', function() {
                self.resetCosts();
            });
        }
    }
    
    /**
     * Toggle the drawer open/closed state
     */
    toggleDrawer() {
    
        const drawer = document.getElementById('usage-drawer');
        if (drawer) {
            this.isDrawerOpen = !this.isDrawerOpen;
            drawer.classList.toggle('open', this.isDrawerOpen);
        }
    }
    
    /**
     * Populate the usage table with current data
     */
    populateUsageTable() {
    
        const tableBody = document.getElementById('usage-table-body');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        let totalCost = 0;
        
        // Define TTS models list including gpt-4o-mini-tts
        const ttsModels = ['tts-1', 'tts-1-hd', 'gpt-4o-mini-tts'];
        
        // Combine all model names from both costs and usage
        const allModels = new Set([
            ...Object.keys(this.costs),
            ...Object.keys(this.usage)
        ]);
        
        allModels.forEach(model => {
            // Skip TTS models - they'll be handled separately
            if (ttsModels.includes(model)) return;
            
            const row = document.createElement('tr');
            const usageData = this.usage[model] || { input: 0, output: 0 };
            const costData = this.costs[model] || this.defaultCosts[model] || { input: 0, output: 0 };
            
            // Calculate estimated cost
            const inputCost = (usageData.input / 1000) * costData.input;
            const outputCost = (usageData.output / 1000) * costData.output;
            const estimatedCost = inputCost + outputCost;
            totalCost += estimatedCost;
            
            row.innerHTML = `
                <td>${model}</td>
                <td><input type="number" class="cost-input" data-model="${model}" data-type="input" value="${costData.input}" step="0.0001" min="0"></td>
                <td><input type="number" class="cost-input" data-model="${model}" data-type="output" value="${costData.output}" step="0.0001" min="0"></td>
                <td>${usageData.input || 0} / ${usageData.output || 0}</td>
                <td>$${estimatedCost.toFixed(4)}</td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Add TTS models
        ttsModels.forEach(model => {
            const row = document.createElement('tr');
            const usageData = this.usage[model] || { characters: 0 };
            const costPerChar = this.costs[model] || this.defaultCosts[model] || 0;
            
            // Calculate estimated cost (TTS is charged per 1K characters)
            const estimatedCost = (usageData.characters / 1000) * costPerChar;
            totalCost += estimatedCost;
            
            row.innerHTML = `
                <td>${model}</td>
                <td colspan="2"><input type="number" class="cost-input" data-model="${model}" value="${costPerChar}" step="0.0001" min="0"></td>
                <td>${usageData.characters || 0} chars</td>
                <td>$${estimatedCost.toFixed(4)}</td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Update total cost
        document.getElementById('total-cost').textContent = `$${totalCost.toFixed(4)}`;
        
        // Add event listeners to cost input fields
        const costInputs = document.querySelectorAll('.cost-input');
        const self = this;
        costInputs.forEach(function(input) {
            input.addEventListener('change', function() {
                self.updateCost(this.dataset.model, this.dataset.type, parseFloat(this.value));
            });
        });
    }
    
    /**
     * Update cost value when user edits an input field
     * @param {string} model - Model identifier
     * @param {string} type - Input or output (for language models)
     * @param {number} value - New cost value
     */
    updateCost(model, type, value) {
    
        // Handle TTS models (single value)
        if (model === 'tts-1' || model === 'tts-1-hd') {
            this.costs[model] = value;
        } else {
            // Handle language models (input/output values)
            if (!this.costs[model]) {
                this.costs[model] = { input: 0, output: 0 };
            }
            this.costs[model][type] = value;
        }
        
        // Save to storage
        this.storageManager.save('costData', { costs: this.costs });
        
        // Update table to recalculate costs
        this.populateUsageTable();
        
        this.notifications.showSuccess('Cost updated successfully');
    }
    
    /**
     * Track token usage from an API call
     * @param {string} model - Model identifier
     * @param {number} inputTokens - Input tokens used
     * @param {number} outputTokens - Output tokens used
     */
    trackTokenUsage(model, inputTokens, outputTokens) {
    
        if (!this.usage[model]) {
            this.usage[model] = { input: 0, output: 0 };
        }
        
        this.usage[model].input += inputTokens;
        this.usage[model].output += outputTokens;
        
        // Save to storage
        this.storageManager.save('usageData', { usage: this.usage });
        
        // Update table
        this.populateUsageTable();
    }
    
    /**
     * Track TTS character usage
     * @param {string} model - TTS model identifier
     * @param {number} characters - Number of characters processed
     */
    trackTTSUsage(model, characters) {
    
        if (!this.usage[model]) {
            this.usage[model] = { characters: 0 };
        }
        
        this.usage[model].characters += characters;
        
        // Save to storage
        this.storageManager.save('usageData', { usage: this.usage });
        
        // Update table
        this.populateUsageTable();
    }
    
    /**
     * Reset usage data to zero
     */
    resetUsage() {
    
        this.usage = {};
        this.storageManager.save('usageData', { usage: this.usage });
        this.populateUsageTable();
        
        this.notifications.showSuccess('Usage data reset successfully');
    }
    
    /**
     * Reset costs to default values
     */
    resetCosts() {
    
        this.costs = JSON.parse(JSON.stringify(this.defaultCosts));
        this.storageManager.save('costData', { costs: this.costs });
        this.populateUsageTable();
        
        this.notifications.showSuccess('Costs reset to default values');
    }
}

export default UsageCounter;
