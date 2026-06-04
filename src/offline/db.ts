/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Dexie, { type Table } from 'dexie';
import { Transaction, SyncQueueItem, AuditLog, Shop, Market, AppUser } from '../types';

export class MobileMarketDB extends Dexie {
  transactions!: Table<Transaction, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  auditLogs!: Table<AuditLog, string>;
  shops!: Table<Shop, string>;
  markets!: Table<Market, string>;
  users!: Table<AppUser, string>;
  config!: Table<{ key: string; value: any }, string>;

  constructor() {
    super('MobileMarketDB');
    this.version(1).stores({
      transactions: 'id, type, imei1, imei2, shopId, marketId, buyerCnic, sellerCnic, syncStatus, dateTime, createdBy',
      syncQueue: 'id, transactionId, action, timestamp',
      auditLogs: 'id, transactionId, action, userId, timestamp',
      shops: 'id, marketId, name, status',
      markets: 'id, name',
      users: 'id, email, role, status, marketId',
      config: 'key'
    });
  }

  // Helper to read simple configuration key-value
  async getConfig<T>(key: string, defaultValueRef?: T): Promise<T | undefined> {
    const item = await this.config.get(key);
    return item ? (item.value as T) : defaultValueRef;
  }

  // Helper to write/update simple configuration key-value
  async setConfig(key: string, value: any): Promise<void> {
    await this.config.put({ key, value });
  }

  // Wipe all databases (e.g., on extreme data reset, logouts, or diagnostic recovery)
  async clearAllData(): Promise<void> {
    await Promise.all([
      this.transactions.clear(),
      this.syncQueue.clear(),
      this.auditLogs.clear(),
      this.shops.clear(),
      this.markets.clear(),
      this.users.clear(),
      this.config.clear()
    ]);
  }
}

export const db = new MobileMarketDB();
