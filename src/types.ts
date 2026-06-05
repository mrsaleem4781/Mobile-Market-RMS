/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'SUPER_ADMIN' | 'SHOPKEEPER';

export type AccountStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AppUser {
  id: string; // auth uid
  name: string;
  email: string;
  password?: string;
  designation?: string;
  securityQuestion?: string;
  securityAnswer?: string;
  role: UserRole;
  status: AccountStatus;
  cnic?: string;
  contactNumber?: string;
  shopId?: string;
  shopName?: string;
  marketId?: string;
  marketName?: string;
  shopAddress?: string;
  createdAt: string;
}

export interface Market {
  id: string;
  name: string;
  location: string;
}

export interface Shop {
  id: string;
  name: string;
  marketId: string;
  marketName: string;
  ownerName: string;
  contactNumber: string;
  cnic: string;
  status: AccountStatus;
  shopAddress?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: 'BUY' | 'SELL';
  mobileModel: string;
  imei1: string;
  imei2: string;
  
  // Buyer Details
  buyerName: string;
  buyerCnic: string;
  buyerContact: string;
  buyerAddress?: string;
  
  // Seller Details
  sellerName: string;
  sellerCnic: string;
  sellerContact: string;
  
  // Shop Info
  shopId: string;
  shopName: string;
  marketId: string;
  marketName: string;
  
  dateTime: string;
  photoUrl?: string; // Base64 when offline or url when online
  
  // Offline-Sync metadata
  syncStatus: 'pending' | 'synced' | 'failed';
  syncError?: string;
  lastAttempt?: string;
  
  createdAt: string;
  updatedAt: string;
  createdBy: string; // User ID
  createdByName: string; // User Name
  
  // Flags for suspicious patterns
  isDuplicateImeiFlagged?: boolean;
  isSuspiciousFlagged?: boolean;
}

export interface SyncQueueItem {
  id: string; // unique queue item id
  transactionId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  timestamp: string;
  retryCount: number;
  lastError?: string;
}

export interface AuditLog {
  id: string;
  transactionId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  details: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  timestamp: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export interface SystemState {
  id?: string;
  online: boolean;
  currentUser: AppUser | null;
  deviceId: string;
  lastSyncedAt?: string;
}

export interface ReportedMobile {
  id: string;
  imei1: string;
  imei2?: string;
  brand: string;
  model: string;
  ownerName: string;
  ownerContact: string;
  ownerCnic: string;
  firNumber?: string;
  policeStation?: string;
  incidentDate: string;
  reportedAt: string;
  reportedBy: string; // User ID
  reportedByName: string; // User Name
  status: 'STOLEN' | 'SNATCHED' | 'RECOVERED';
}

export interface KmedaOfficer {
  id: string;
  name: string;
  nameUrdu?: string;
  designation: string; // e.g. "President / صدر"
  designationUrdu?: string;
  contactNumber: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface KmedaGalleryItem {
  id: string;
  title: string;
  titleUrdu?: string;
  imageUrl: string;
  description: string;
  descriptionUrdu?: string;
  createdAt: string;
}


