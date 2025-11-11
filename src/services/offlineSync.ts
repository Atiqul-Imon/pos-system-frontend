// Offline Sync Service
// Handles offline data storage and synchronization

interface PendingSync {
  id: string;
  type: 'transaction' | 'inventory' | 'customer' | 'product';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retries: number;
}

class OfflineSyncService {
  private dbName = 'pos-offline-db';
  private version = 1;
  private db: IDBDatabase | null = null;
  private syncQueue: PendingSync[] = [];

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.loadSyncQueue();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('transactions')) {
          db.createObjectStore('transactions', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('inventory')) {
          db.createObjectStore('inventory', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('customers')) {
          db.createObjectStore('customers', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' });
        }
      };
    });
  }

  private async loadSyncQueue(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    const request = store.getAll();

    request.onsuccess = () => {
      this.syncQueue = request.result || [];
    };
  }

  // Add item to sync queue
  async addToSyncQueue(
    type: PendingSync['type'],
    action: PendingSync['action'],
    data: any
  ): Promise<string> {
    if (!this.db) {
      await this.init();
    }

    const syncItem: PendingSync = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      action,
      data,
      timestamp: Date.now(),
      retries: 0
    };

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.add(syncItem);

      request.onsuccess = () => {
        this.syncQueue.push(syncItem);
        resolve(syncItem.id);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Store data offline
  async storeOffline(storeName: string, data: any): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get offline data
  async getOffline(storeName: string, id?: string): Promise<any> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);

      if (id) {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    });
  }

  // Get sync queue
  getSyncQueue(): PendingSync[] {
    return [...this.syncQueue];
  }

  // Remove from sync queue
  async removeFromSyncQueue(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.delete(id);

      request.onsuccess = () => {
        this.syncQueue = this.syncQueue.filter(item => item.id !== id);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Check if online
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Sync when back online
  async syncWhenOnline(syncFunction: (item: PendingSync) => Promise<boolean>): Promise<void> {
    if (!this.isOnline()) {
      // Register for online event
      window.addEventListener('online', () => {
        this.syncWhenOnline(syncFunction);
      });
      return;
    }

    const queue = this.getSyncQueue();
    if (queue.length === 0) return;

    console.log(`🔄 Syncing ${queue.length} pending items...`);

    for (const item of queue) {
      try {
        const success = await syncFunction(item);
        if (success) {
          await this.removeFromSyncQueue(item.id);
          console.log(`✅ Synced: ${item.type} - ${item.action}`);
        } else {
          // Increment retries
          item.retries++;
          if (item.retries > 5) {
            // Remove after 5 failed retries
            await this.removeFromSyncQueue(item.id);
            console.warn(`⚠️ Removed after 5 retries: ${item.id}`);
          }
        }
      } catch (error) {
        console.error(`❌ Sync error for ${item.id}:`, error);
        item.retries++;
      }
    }
  }
}

export const offlineSync = new OfflineSyncService();

// Initialize on import
if (typeof window !== 'undefined') {
  offlineSync.init().catch(console.error);
}

