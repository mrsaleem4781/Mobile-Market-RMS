/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './db';
import { encryptData } from '../utils/security';
import { Market, Shop, Transaction, AppUser, AuditLog } from '../types';

export const SEED_MARKETS: Market[] = [
  { id: 'mkt-kara-quaid', name: 'Quaidabad Mobile Market, Karachi', location: 'Quaidabad, Karachi, Sindh' }
];

export const SEED_SHOPS: Shop[] = [
  {
    id: 'shp-alpha-comm',
    name: 'Alpha Communications & Mobiles',
    marketId: 'mkt-kara-quaid',
    marketName: 'Quaidabad Mobile Market, Karachi',
    ownerName: 'Muhammad Saleem',
    contactNumber: '03001234567',
    cnic: '42101-1234567-3',
    status: 'APPROVED',
    shopAddress: 'Shop No. 42-B, Ground Floor, Quaidabad Mobile Market, Karachi',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'shp-star-telecom',
    name: 'Star Telecom Quaidabad',
    marketId: 'mkt-kara-quaid',
    marketName: 'Quaidabad Mobile Market, Karachi',
    ownerName: 'Zain Ul Abideen',
    contactNumber: '03335551212',
    cnic: '37405-1112223-5',
    status: 'PENDING',
    shopAddress: 'Shop No. 12-A, Ground Floor, Quaidabad Mobile Market, Karachi',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const SEED_TRANSACTIONS = (userId: string): Transaction[] => [
  {
    id: 'tx-001',
    type: 'BUY',
    mobileModel: 'Samsung Galaxy S24 Ultra',
    imei1: '358249622915834',
    imei2: '358249622915835',
    buyerName: 'Muhammad Saleem (Shopkeeper)',
    buyerCnic: encryptData('42101-1234567-3'),
    buyerContact: encryptData('03001234567'),
    sellerName: 'Tariq Butt',
    sellerCnic: encryptData('35202-8877665-3'),
    sellerContact: encryptData('03214455667'),
    shopId: 'shp-alpha-comm',
    shopName: 'Alpha Communications & Mobiles',
    marketId: 'mkt-kara-quaid',
    marketName: 'Quaidabad Mobile Market, Karachi',
    dateTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    syncStatus: 'synced',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: userId,
    createdByName: 'Muhammad Saleem'
  },
  {
    id: 'tx-002',
    type: 'SELL',
    mobileModel: 'iPhone 15 Pro Max',
    imei1: '359344211100234',
    imei2: '359344211100235',
    buyerName: 'Fahad Khan',
    buyerCnic: encryptData('42201-9988776-5'),
    buyerContact: encryptData('03348899001'),
    sellerName: 'Muhammad Saleem (Shopkeeper)',
    sellerCnic: encryptData('42101-1234567-3'),
    sellerContact: encryptData('03001234567'),
    shopId: 'shp-alpha-comm',
    shopName: 'Alpha Communications & Mobiles',
    marketId: 'mkt-kara-quaid',
    marketName: 'Quaidabad Mobile Market, Karachi',
    dateTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    syncStatus: 'synced',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: userId,
    createdByName: 'Muhammad Saleem'
  }
];

export const SEED_USERS: AppUser[] = [
  {
    id: 'usr-superadmin',
    name: 'Super Admin Bureau',
    email: 'admin@compliance.gov.pk',
    role: 'SUPER_ADMIN',
    status: 'APPROVED',
    cnic: '42101-9999999-1',
    contactNumber: '051111222333',
    createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'usr-mktadmin-quaid',
    name: 'Quaidabad Admin Karachi',
    email: 'quaidabad@compliance.gov.pk',
    role: 'MARKET_ADMIN',
    status: 'APPROVED',
    marketId: 'mkt-kara-quaid',
    marketName: 'Quaidabad Mobile Market, Karachi',
    cnic: '42101-5555555-5',
    contactNumber: '03215555555',
    createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'usr-shopkeeper-saleem',
    name: 'Muhammad Saleem',
    email: 'mrsaleem4781@gmail.com', // Pre-configuring matching user email from runtime context!
    role: 'SHOPKEEPER',
    status: 'APPROVED',
    shopId: 'shp-alpha-comm',
    shopName: 'Alpha Communications & Mobiles',
    marketId: 'mkt-kara-quaid',
    marketName: 'Quaidabad Mobile Market, Karachi',
    cnic: '42101-1234567-3',
    contactNumber: '03001234567',
    shopAddress: 'Shop No. 42-B, Ground Floor, Quaidabad Mobile Market, Karachi',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export async function bootstrapSeedData(force = false) {
  try {
    const marketCount = await db.markets.count();
    if (marketCount === 0 || force) {
      await db.markets.clear();
      await db.markets.bulkPut(SEED_MARKETS);
      
      await db.shops.clear();
      await db.shops.bulkPut(SEED_SHOPS);
      
      await db.users.clear();
      await db.users.bulkPut(SEED_USERS);
      
      // Seed default transactions matching Saleem (the current developer account)
      const txnCount = await db.transactions.count();
      if (txnCount === 0 || force) {
        await db.transactions.clear();
        await db.transactions.bulkPut(SEED_TRANSACTIONS('usr-shopkeeper-saleem'));
      }
      
      // Set baseline state
      await db.setConfig('seeded', true);
      await db.setConfig('lastSyncedAt', new Date().toISOString());
      console.log('IndexedDB database seeded with baseline regulatory directories.');
    }
  } catch (error) {
    console.error('Failed seeding indexedDB offline store:', error);
  }
}
