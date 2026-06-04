/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../offline/db';
import { firebaseService } from '../services/firebaseService';
import { Transaction, SyncQueueItem, AuditLog, Shop, Market } from '../types';

export type SyncState = 'idle' | 'syncing' | 'completed' | 'failed' | 'paused';

class SyncEngine {
  private isProcessing = false;
  private statusListeners: ((state: SyncState, pendingCount: number) => void)[] = [];
  private currentStatus: SyncState = 'idle';
  private syncTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  private handleNetworkChange(online: boolean) {
    console.log(`SyncEngine: Network status changed to ${online ? 'ONLINE' : 'OFFLINE'}`);
    if (online) {
      this.triggerSync();
    } else {
      this.updateStatus('paused');
    }
  }

  // Subscribe to sync status updates
  subscribe(callback: (state: SyncState, pendingCount: number) => void) {
    this.statusListeners.push(callback);
    // Initial call
    this.getPendingCount().then((count) => {
      callback(this.currentStatus, count);
    });
    return () => {
      this.statusListeners = this.statusListeners.filter((cb) => cb !== callback);
    };
  }

  private async getPendingCount(): Promise<number> {
    try {
      return await db.syncQueue.count();
    } catch {
      return 0;
    }
  }

  private updateStatus(state: SyncState) {
    this.currentStatus = state;
    this.getPendingCount().then((count) => {
      this.statusListeners.forEach((listener) => listener(state, count));
    });
  }

  // Enqueue a transaction action
  async enqueueTransaction(transaction: Transaction, action: 'CREATE' | 'UPDATE' | 'DELETE') {
    // 1. Save or update locally first for absolute instant local response (Offline First!)
    if (action === 'CREATE' || action === 'UPDATE') {
      await db.transactions.put(transaction);
    } else if (action === 'DELETE') {
      await db.transactions.delete(transaction.id);
    }

    // 2. Put into pending queue matching the sync requirements
    const queueId = `${transaction.id}_${action.toLowerCase()}_${Date.now()}`;
    const queueItem: SyncQueueItem = {
      id: queueId,
      transactionId: transaction.id,
      action,
      payload: transaction,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };
    
    await db.syncQueue.put(queueItem);
    this.updateStatus(this.currentStatus);

    // 3. Kick off sync process in the background immediately
    this.triggerSync();
  }

  // Start background periodic sync (e.g., every 60 seconds)
  startPeriodicSync() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => {
      this.triggerSync();
    }, 60000); // 1 minute
    
    // Initial trigger
    this.triggerSync();
  }

  stopPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // Synchronize all queues to Firestore cloud
  async triggerSync(): Promise<boolean> {
    if (this.isProcessing) return false;
    
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline || !firebaseService.isConfigured()) {
      this.updateStatus('paused');
      return false;
    }

    const queueItems = await db.syncQueue.orderBy('timestamp').toArray();
    if (queueItems.length === 0) {
      this.updateStatus('idle');
      return true;
    }

    this.isProcessing = true;
    this.updateStatus('syncing');
    console.log(`SyncEngine: Commencing sync loop for ${queueItems.length} elements.`);

    let successCount = 0;

    for (const item of queueItems) {
      try {
        if (item.action === 'CREATE' || item.action === 'UPDATE') {
          // Sync Transaction
          const transaction = await db.transactions.get(item.transactionId);
          if (transaction) {
            await firebaseService.syncTransactionToCloud(transaction);
            
            // Mark locally as Synced
            transaction.syncStatus = 'synced';
            transaction.syncError = undefined;
            transaction.lastAttempt = new Date().toISOString();
            await db.transactions.put(transaction);
          }
        } else if (item.action === 'DELETE') {
          // If we had a remote delete (rare but supported in sync blueprint)
          // We would invoke firebaseService to delete it if exists.
        }

        // Remove from local sync queue
        await db.syncQueue.delete(item.id);
        successCount++;
      } catch (error: any) {
        console.error(`SyncEngine: Failed syncing item ${item.id}`, error);
        
        // Update retry attempt logs
        item.retryCount += 1;
        item.lastError = error?.message || String(error);
        
        // Mark transaction record itself as failed
        const transaction = await db.transactions.get(item.transactionId);
        if (transaction) {
          transaction.syncStatus = 'failed';
          transaction.syncError = item.lastError;
          transaction.lastAttempt = new Date().toISOString();
          await db.transactions.put(transaction);
        }

        if (item.retryCount >= 5) {
          // Remove from queue after multiple attempts to prevent head-of-line blocking, 
          // but flag the transaction locally as sync_failed for manual edit intervention.
          await db.syncQueue.delete(item.id);
        } else {
          await db.syncQueue.put(item);
        }
      }
    }

    // Now, let's pull all general structural syncs if empty (markets, shops, users) 
    // to keep master directories cached on device local memory
    await this.refreshLocalCaches();

    this.isProcessing = false;
    const remainingCount = await this.getPendingCount();
    
    if (remainingCount > 0) {
      this.updateStatus('failed');
      return false;
    } else {
      await db.setConfig('lastSyncedAt', new Date().toISOString());
      this.updateStatus('completed');
      return true;
    }
  }

  // Pull markets, shops, and approved listings to local IndexedDB to enable complete offline queries
  private async refreshLocalCaches() {
    if (!firebaseService.isConfigured()) return;
    try {
      console.log("SyncEngine: Syncing directory cache from Firestore db...");
      
      const [cloudMarkets, cloudShops, cloudUsers] = await Promise.all([
        firebaseService.fetchAllMarketsFromCloud(),
        firebaseService.fetchAllShopsFromCloud(),
        firebaseService.fetchAllUsersFromCloud()
      ]);

      if (cloudMarkets.length > 0) {
        await db.markets.clear();
        await db.markets.bulkPut(cloudMarkets);
      }
      
      if (cloudShops.length > 0) {
        await db.shops.clear();
        await db.shops.bulkPut(cloudShops);
      }

      if (cloudUsers.length > 0) {
        await db.users.clear();
        await db.users.bulkPut(cloudUsers);
      }

      console.log("SyncEngine: Directory caches refreshed.");
    } catch (e) {
      console.warn("SyncEngine: Failed refreshing cached structures (this is expected if Firestore is still provisioning):", e);
    }
  }

  // Manual trigger to pull all cloud transactions down to sync device state
  async pullMergeFromCloud() {
    if (!firebaseService.isConfigured()) return;
    try {
      const cloudTransactions = await firebaseService.fetchAllTransactionsFromCloud();
      for (const tx of cloudTransactions) {
        // Simple conflict handler: Prefer more recently updated entity
        const localTx = await db.transactions.get(tx.id);
        if (!localTx || new Date(tx.updatedAt) > new Date(localTx.updatedAt)) {
          // Save cloud state locally
          await db.transactions.put({
            ...tx,
            syncStatus: 'synced'
          });
        }
      }
    } catch (error) {
      console.error("SyncEngine: Error merging cloud collection:", error);
    }
  }
}

export const syncEngine = new SyncEngine();
