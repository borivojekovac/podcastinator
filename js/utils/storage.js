// Podcastinator App - Storage Manager
class StorageManager {
    constructor(storageKeyPrefix = 'Podcastinator') {
        this.storageKeyPrefix = storageKeyPrefix;
    }

    /**
     * Load data from local storage
     * @param {string} key - Storage key suffix
     * @param {any} defaultValue - Default value if nothing is stored
     * @returns {any} - Parsed data from storage or default value
     */
    load(key, defaultValue = null) {
    
        const fullKey = `${this.storageKeyPrefix}-${key}`;
        const saved = localStorage.getItem(fullKey);
        
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error(`Error parsing stored data for ${fullKey}:`, e);
                return defaultValue;
            }
        }
        
        return defaultValue;
    }

    /**
     * Save data to local storage
     * @param {string} key - Storage key suffix
     * @param {any} data - Data to store
     */
    save(key, data) {
    
        const fullKey = `${this.storageKeyPrefix}-${key}`;
        try {
            localStorage.setItem(fullKey, JSON.stringify(data));
        } catch (e) {
            console.error(`Error saving data to ${fullKey}:`, e);
        }
    }

    /**
     * Remove data from local storage
     * @param {string} key - Storage key suffix
     */
    remove(key) {
    
        const fullKey = `${this.storageKeyPrefix}-${key}`;
        localStorage.removeItem(fullKey);
    }
}

export default StorageManager;
