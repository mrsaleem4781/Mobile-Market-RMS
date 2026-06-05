/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './db';
import { encryptData } from '../utils/security';
import { Market, Shop, Transaction, AppUser, AuditLog, ReportedMobile } from '../types';

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
    password: 'admin123',
    securityQuestion: 'birth_city',
    securityAnswer: 'islamabad',
    role: 'SUPER_ADMIN',
    status: 'APPROVED',
    cnic: '42101-9999999-1',
    contactNumber: '051111222333',
    createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'usr-shopkeeper-saleem',
    name: 'Muhammad Saleem',
    email: 'mrsaleem4781@gmail.com', // Pre-configuring matching user email from runtime context!
    password: 'saleem123',
    securityQuestion: 'birth_city',
    securityAnswer: 'karachi',
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

export const SEED_REPORTED_MOBILES: ReportedMobile[] = [
  {
    id: 'st-001',
    imei1: '860492040123456',
    imei2: '860492040123457',
    brand: 'Samsung',
    model: 'Galaxy S23 Ultra',
    ownerName: 'Ali Raza',
    ownerContact: '03129876543',
    ownerCnic: '42101-9876543-1',
    firNumber: '102/2026',
    policeStation: 'Gulshan-e-Iqbal',
    incidentDate: '2026-05-10',
    reportedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    reportedBy: 'usr-superadmin',
    reportedByName: 'Super Admin Bureau',
    status: 'SNATCHED'
  },
  {
    id: 'st-002',
    imei1: '359344211100999',
    imei2: '359344211100998',
    brand: 'Apple',
    model: 'iPhone 14 Pro',
    ownerName: 'Kamran Khan',
    ownerContact: '03451122334',
    ownerCnic: '42101-1122334-9',
    firNumber: '29/2026',
    policeStation: 'Saddar',
    incidentDate: '2026-05-28',
    reportedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    reportedBy: 'usr-shopkeeper-saleem',
    reportedByName: 'Muhammad Saleem',
    status: 'STOLEN'
  },
  {
    id: 'st-003',
    imei1: '351122334455667',
    imei2: '351122334455668',
    brand: 'Tecno',
    model: 'Spark 20C',
    ownerName: 'Minhaj Gulfam (Central President)',
    ownerContact: '0300-9876543',
    ownerCnic: '42101-8877665-1',
    firNumber: '1029-A/CPLC',
    policeStation: 'Quaidabad',
    incidentDate: '2026-05-02',
    reportedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    reportedBy: 'usr-mktadmin-quaid',
    reportedByName: 'Zia Khan Mehsood',
    status: 'RECOVERED'
  },
  {
    id: 'st-004',
    imei1: '352233445566778',
    brand: 'Tecno',
    model: 'Spark Go 2',
    ownerName: 'Local Citizen (Muhammad Asif)',
    ownerContact: '0313-1122334',
    ownerCnic: '42101-5544332-9',
    firNumber: 'Diary #443/PS',
    policeStation: 'Quaidabad Division',
    incidentDate: '2026-05-12',
    reportedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    reportedBy: 'usr-mktadmin-quaid',
    reportedByName: 'Zia Khan Mehsood',
    status: 'RECOVERED'
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

      await db.reportedMobiles.clear();
      await db.reportedMobiles.bulkPut(SEED_REPORTED_MOBILES);
      
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
