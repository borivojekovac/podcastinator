// HeadlessStorage - drop-in replacement for browser StorageManager using in-memory map

class HeadlessStorage {
    constructor(prefix = 'Podcastinator') {
        this.prefix = prefix;
        this.store = new Map();
    }

    load(key, defaultValue = null) {
        const full = `${this.prefix}-${key}`;
        if (this.store.has(full)) {
            return this.store.get(full);
        }
        return defaultValue;
    }

    save(key, data) {
        const full = `${this.prefix}-${key}`;
        this.store.set(full, data);
    }

    remove(key) {
        const full = `${this.prefix}-${key}`;
        this.store.delete(full);
    }
}

export default HeadlessStorage;
