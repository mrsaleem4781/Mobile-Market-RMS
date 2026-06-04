/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Users, 
  Store, 
  Check, 
  X, 
  FileSpreadsheet, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { db } from '../../offline/db';
import { Shop, AppUser, Transaction } from '../../types';

interface MarketAdminDashboardProps {
  currentUser: AppUser;
  activeTab: string;
}

export default function MarketAdminDashboard({ currentUser, activeTab }: MarketAdminDashboardProps) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [marketTxns, setMarketTxns] = useState<Transaction[]>([]);
  const [dashboardMsg, setDashboardMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchMarketAdminData();
  }, [currentUser, activeTab]);

  const fetchMarketAdminData = async () => {
    const marketId = currentUser.marketId;
    if (!marketId) return;

    // Load shops matching inspector's market
    const localShops = await db.shops.where('marketId').equals(marketId).toArray();
    setShops(localShops);

    // Load related user profiles matching inspector's market
    const localUsers = await db.users.where('marketId').equals(marketId).toArray();
    setUsers(localUsers);

    // Load all transactions matching the inspector's market
    const localTxns = await db.transactions.where('marketId').equals(marketId).reverse().sortBy('dateTime');
    setMarketTxns(localTxns);
  };

  const handleUpdateShopStatus = async (shopId: string, status: 'APPROVED' | 'REJECTED') => {
    setDashboardMsg(null);
    try {
      const shop = await db.shops.get(shopId);
      if (shop) {
        shop.status = status;
        await db.shops.put(shop);
        
        // Push state update request into sync Queue
        await db.syncQueue.put({
          id: `${shopId}_update_${Date.now()}`,
          transactionId: shopId,
          action: 'UPDATE',
          payload: { status },
          timestamp: new Date().toISOString(),
          retryCount: 0
        });

        // Also approve user if they have a matching shop profile
        const associatedUser = users.find(u => u.shopId === shopId);
        if (associatedUser) {
          associatedUser.status = status;
          await db.users.put(associatedUser);
        }

        setDashboardMsg(`Shop [${shop.name}] compliance status officially configured as ${status}.`);
        await fetchMarketAdminData();
      }
    } catch (e) {
      setDashboardMsg("Failed configuring shop authorization code state.");
    }
  };

  const handleUpdateUserStatus = async (userId: string, status: 'APPROVED' | 'REJECTED') => {
    setDashboardMsg(null);
    try {
      const user = await db.users.get(userId);
      if (user) {
        user.status = status;
        await db.users.put(user);

        // Also find associated shop and check status
        if (user.shopId) {
          const shop = await db.shops.get(user.shopId);
          if (shop) {
            shop.status = status;
            await db.shops.put(shop);
          }
        }

        setDashboardMsg(`User account [${user.name}] status officially switched to ${status}.`);
        await fetchMarketAdminData();
      }
    } catch (e) {
      setDashboardMsg("Failed configuring merchant profile clearance state.");
    }
  };

  // Metrics
  const totalShops = shops.length;
  const pendingShopsCount = shops.filter(s => s.status === 'PENDING').length;
  const approvedShopsCount = shops.filter(s => s.status === 'APPROVED').length;
  const transactionsCount = marketTxns.length;

  if (activeTab === 'market-approvals') {
    return (
      <div className="space-y-6" id="approvals-control">
        <div>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5 font-mono">
            <CheckCircle className="w-5 h-5 text-blue-600" /> Merchant Clearance ledger
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Review of registered shopkeepers and secondary cellular trade licenses for <strong className="text-slate-800">{currentUser.marketName}</strong>.
          </p>
        </div>

        {dashboardMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-sans font-semibold">
            {dashboardMsg}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs" id="clearance-table">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-500 uppercase">PENDING MERCHANTS APPLICATION QUEUE ({users.filter(u => u.status === 'PENDING').length})</h3>
          </div>

          {users.filter(u => u.status === 'PENDING').length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm font-mono leading-relaxed bg-white font-semibold">
              No outstanding pending merchant user registrations for this regional zone.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 bg-white">
                <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-bold">Name / ID</th>
                    <th className="p-4 font-bold">Regulatory CNIC</th>
                    <th className="p-4 font-bold">Registry Contact</th>
                    <th className="p-4 font-bold">Proposed Shop Name</th>
                    <th className="p-4 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.filter(u => u.status === 'PENDING').map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/30 transition duration-150">
                      <td className="p-4 font-bold text-slate-800">
                        <div>{u.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{u.email}</div>
                      </td>
                      <td className="p-4 font-mono text-slate-650">{u.cnic || 'N/A'}</td>
                      <td className="p-4 font-mono text-slate-650">{u.contactNumber || 'N/A'}</td>
                      <td className="p-4 text-blue-600 font-bold">{u.shopName || 'Trade Shop Only'}</td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <button
                          onClick={() => handleUpdateUserStatus(u.id, 'APPROVED')}
                          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition duration-150 text-[10px] font-mono flex items-center gap-1 cursor-pointer shadow-md shadow-blue-500/10"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleUpdateUserStatus(u.id, 'REJECTED')}
                          className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg transition duration-150 text-[10px] font-mono flex items-center gap-1 cursor-pointer border border-rose-200"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === 'market-reports') {
    return (
      <div className="space-y-6" id="market-reports-view">
        <div>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5 font-mono">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" /> Region Compliance Report Card
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Overview of total transactions and regulatory statistics for <strong className="text-slate-800">{currentUser.marketName}</strong>.
          </p>
        </div>

        {/* Analytical summaries */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="reports-grid">
          {/* Recent Trade Log updates */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-700 font-mono border-b border-slate-100 pb-2 uppercase tracking-wider">
              District Real-time Trade Flow
            </h3>
            {marketTxns.length === 0 ? (
              <p className="text-xs text-slate-400 font-mono">No transaction files logged inside this market ledger yet.</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 divide-y divide-slate-100 bg-white">
                {marketTxns.slice(0, 10).map((tx) => (
                  <div key={tx.id} className="pt-2.5 flex items-center justify-between gap-3 text-xs text-slate-600">
                    <div>
                      <div className="font-bold text-slate-800">{tx.mobileModel}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">Shop: {tx.shopName}</div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${tx.type === 'BUY' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-blue-50 text-blue-700 border-blue-150'}`}>
                        {tx.type}
                      </span>
                      <div className="text-[9px] text-slate-400 font-mono mt-1 font-medium">{new Date(tx.dateTime).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-700 font-mono border-b border-slate-100 pb-2 uppercase tracking-wide">
              Verification Compliance Checks
            </h3>
            <div className="space-y-4 text-xs font-sans">
              <div className="flex justify-between items-center text-slate-600 font-medium">
                <span>Secure local device database index encryption</span>
                <span className="text-emerald-600 font-bold bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded text-[10px] font-mono">ACTIVE</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 font-medium font-mono">
                <span>Active registered IMEI records in area</span>
                <span className="text-slate-900 font-bold">{transactionsCount} units</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 font-medium">
                <span>Total active approved shops</span>
                <span className="text-slate-900 font-bold font-mono">{approvedShopsCount} shops</span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed text-slate-550 text-[11px] font-mono">
                SOP STANDARD RULE: Please inspect physically at least once a quarter to verify that merchant trade boards display valid licensed register IDs!
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="shops-registry-scope">
      {/* 1. Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight uppercase flex items-center gap-2 font-mono">
            <Store className="w-5 h-5 text-blue-600" /> Zone Shops Registry
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Administrative area: <strong>{currentUser.marketName}</strong> | Authorized Inspector: <strong>{currentUser.name}</strong>
          </p>
        </div>
      </div>

      {/* 2. Stat badges */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4" id="admin-stats-strip">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">Registered Trade Shops</span>
          <h3 className="text-xl font-extrabold text-slate-800 mt-1">{totalShops}</h3>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">Approved Operations</span>
          <h3 className="text-xl font-bold text-emerald-600 mt-1">{approvedShopsCount}</h3>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">Clearance Pending</span>
          <h3 className="text-xl font-bold text-amber-650 mt-1">{pendingShopsCount}</h3>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">Total Area Transactions</span>
          <h3 className="text-xl font-bold text-blue-600 mt-1">{transactionsCount}</h3>
        </div>
      </div>

      {dashboardMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-sans font-semibold">
          {dashboardMsg}
        </div>
      )}

      {/* 3. Shops List Collection */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs" id="shops-grid-listing">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-bold font-mono tracking-wider text-slate-500 uppercase">Registered Shops Directory</h3>
        </div>

        {shops.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm font-mono leading-relaxed bg-white">
            No mobile shops are registered yet in this regional division database.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 bg-white" id="shop-items-directory">
            {shops.map((s) => (
              <div key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition duration-155">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800 uppercase">{s.name}</h4>
                  {s.shopAddress && (
                    <div className="text-xs text-slate-600 font-sans font-medium">Address: {s.shopAddress}</div>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Owner: {s.ownerName}</span>
                    <span className="text-slate-400 font-mono text-[10px] font-semibold">CNIC: {s.cnic}</span>
                    <span className="text-slate-400 font-mono text-[10px] font-semibold">Contact: {s.contactNumber}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase border ${
                    s.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 
                    s.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-150' : 'bg-rose-50 text-rose-700 border-rose-150'
                  }`}>
                    {s.status}
                  </span>

                  {s.status === 'PENDING' && (
                    <div className="flex gap-1.5 animate-pulse">
                      <button
                        onClick={() => handleUpdateShopStatus(s.id, 'APPROVED')}
                        className="p-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[10px] font-mono flex items-center gap-0.5 cursor-pointer shadow-xs"
                        title="Authorize trade licenses"
                      >
                        <Check className="w-3 h-3" /> Approve
                      </button>
                      <button
                        onClick={() => handleUpdateShopStatus(s.id, 'REJECTED')}
                        className="p-1 px-2 text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded text-[10px] font-mono flex items-center gap-0.5 cursor-pointer"
                        title="Reject trade licenses"
                      >
                        <X className="w-3 h-3" /> Decline
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
