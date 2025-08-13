// Podcastinator App - IndexedDB Audio Blob Store

class AudioBlobStore {
    constructor(dbName = 'podcastinator', storeName = 'audio') {
        this.dbName = dbName;
        this.storeName = storeName;
        this.db = null;
    }

    async open() {
        if (this.db) {
            return this.db;
        }

        const self = this;

        return new Promise(function resolveOpen(resolve, reject) {
            const request = indexedDB.open(self.dbName, 1);

            request.onupgradeneeded = function handleUpgrade(event) {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(self.storeName)) {
                    const store = db.createObjectStore(self.storeName, { keyPath: 'id' });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };

            request.onsuccess = function handleSuccess() {
                self.db = request.result;
                resolve(self.db);
            };

            request.onerror = function handleError() {
                reject(request.error);
            };
        });
    }

    async save(id, blob, meta = {}) {
        const db = await this.open();
        const self = this;

        return new Promise(function resolveSave(resolve, reject) {
            const tx = db.transaction(self.storeName, 'readwrite');
            const store = tx.objectStore(self.storeName);
            const record = {
                id: id,
                blob: blob,
                meta: meta,
                createdAt: Date.now()
            };

            store.put(record);

            tx.oncomplete = function handleComplete() {
                resolve();
            };

            tx.onerror = function handleTxError() {
                reject(tx.error);
            };
        });
    }

    async load(id) {
        const db = await this.open();
        const self = this;

        return new Promise(function resolveLoad(resolve, reject) {
            const tx = db.transaction(self.storeName, 'readonly');
            const store = tx.objectStore(self.storeName);
            const request = store.get(id);

            request.onsuccess = function handleGetSuccess() {
                resolve(request.result || null);
            };

            request.onerror = function handleGetError() {
                reject(request.error);
            };
        });
    }

    async delete(id) {
        const db = await this.open();
        const self = this;

        return new Promise(function resolveDelete(resolve, reject) {
            const tx = db.transaction(self.storeName, 'readwrite');
            const store = tx.objectStore(self.storeName);
            store.delete(id);

            tx.oncomplete = function handleComplete() {
                resolve();
            };

            tx.onerror = function handleTxError() {
                reject(tx.error);
            };
        });
    }

    async estimate() {
        if (navigator.storage && navigator.storage.estimate) {
            try {
                return await navigator.storage.estimate();
            } catch (e) {
                return null;
            }
        }

        return null;
    }

    async requestPersistence() {
        if (navigator.storage && navigator.storage.persist) {
            try {
                return await navigator.storage.persist();
            } catch (e) {
                return false;
            }
        }

        return false;
    }
}

export default AudioBlobStore;
