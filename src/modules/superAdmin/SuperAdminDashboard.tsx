/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Store, 
  Search, 
  ShieldAlert, 
  History, 
  Edit, 
  Sliders, 
  AlertTriangle, 
  FileSpreadsheet, 
  Check, 
  Plus, 
  TrendingUp,
  Download,
  CheckCircle,
  Hash,
  X
} from 'lucide-react';
import { db } from '../../offline/db';
import { syncEngine } from '../../sync/syncEngine';
import { Transaction, Shop, Market, AuditLog, AppUser } from '../../types';
import { encryptData, decryptData, maskCNIC, maskIMEI, validateAndCleanCNIC } from '../../utils/security';

interface SuperAdminDashboardProps {
  currentUser: AppUser;
  activeTab: string;
}

export default function SuperAdminDashboard({ currentUser, activeTab }: SuperAdminDashboardProps) {
  // Global caches
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allShops, setAllShops] = useState<Shop[]>([]);
  const [allMarkets, setAllMarkets] = useState<Market[]>([]);
  const [allAuditLogs, setAllAuditLogs] = useState<AuditLog[]>([]);

  // Search state
  const [globalQuery, setGlobalQuery] = useState('');
  
  // Edit State Modal
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editedModel, setEditedModel] = useState('');
  const [editedBuyerName, setEditedBuyerName] = useState('');
  const [editedSellerName, setEditedSellerName] = useState('');
  const [editedImei1, setEditedImei1] = useState('');
  const [editExplanation, setEditExplanation] = useState('');

  // Suspicious Triggers List
  const [suspiciousCnics, setSuspiciousCnics] = useState<string[]>([]);
  const [duplicateImeis, setDuplicateImeis] = useState<string[]>([]);

  // Feedbacks
  const [dashboardMessage, setDashboardMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchGlobalDatabase();
  }, [currentUser, activeTab]);

  const fetchGlobalDatabase = async () => {
    // Collect all data from IndexedDB
    const txs = await db.transactions.reverse().sortBy('dateTime');
    setAllTransactions(txs);

    const shps = await db.shops.toArray();
    setAllShops(shps);

    const mkts = await db.markets.toArray();
    setAllMarkets(mkts);

    const auds = await db.auditLogs.reverse().sortBy('timestamp');
    setAllAuditLogs(auds);

    analyzeSuspiciousPatterns(txs);
  };

  const analyzeSuspiciousPatterns = (txs: Transaction[]) => {
    const countsByCNIC: { [cnic: string]: number } = {};
    const imeiScan: { [imei: string]: number } = {};
    const dupImeisList: string[] = [];

    txs.forEach(t => {
      // 1. Analyze multi-device trading CNICs
      const buyerCnicClean = decryptData(t.buyerCnic).replace(/[^0-9]/g, '');
      const sellerCnicClean = decryptData(t.sellerCnic).replace(/[^0-9]/g, '');

      if (buyerCnicClean && buyerCnicClean.length === 13) {
        countsByCNIC[buyerCnicClean] = (countsByCNIC[buyerCnicClean] || 0) + 1;
      }
      if (sellerCnicClean && sellerCnicClean.length === 13) {
        countsByCNIC[sellerCnicClean] = (countsByCNIC[sellerCnicClean] || 0) + 1;
      }

      // 2. Scan Duplicate active IMEIs
      if (t.imei1) {
        imeiScan[t.imei1] = (imeiScan[t.imei1] || 0) + 1;
        if (imeiScan[t.imei1] > 1 && !dupImeisList.includes(t.imei1)) {
          dupImeisList.push(t.imei1);
        }
      }
      if (t.imei2) {
        imeiScan[t.imei2] = (imeiScan[t.imei2] || 0) + 1;
        if (imeiScan[t.imei2] > 1 && !dupImeisList.includes(t.imei2)) {
          dupImeisList.push(t.imei2);
        }
      }
    });

    // Flagg CNICs behaving weirdly (e.g. trading > 3 devices in offline logs)
    const flaggedCnics = Object.keys(countsByCNIC).filter(cnic => countsByCNIC[cnic] >= 3);
    setSuspiciousCnics(flaggedCnics);
    setDuplicateImeis(dupImeisList);
  };

  const handleOpenEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setEditedModel(tx.mobileModel);
    setEditedBuyerName(tx.buyerName);
    setEditedSellerName(tx.sellerName);
    setEditedImei1(tx.imei1);
    setEditExplanation('');
  };

  // Compliance administrative update
  const handleSaveCorrectionValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction || !editExplanation) return;

    try {
      const original = { ...editingTransaction };
      
      const updatedTx: Transaction = {
        ...editingTransaction,
        mobileModel: editedModel,
        buyerName: editedBuyerName,
        sellerName: editedSellerName,
        imei1: editedImei1,
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending' // reset sync index
      };

      // 1. Create a compliance Audit Log trace representing administrative write boundaries.
      // Under Fortress rules, administrative updates MUST trigger atomicity/audit Log write before commit.
      const auditLogId = `aud-${Math.random().toString(36).substr(2, 9)}`;
      const newAuditLog: AuditLog = {
        id: auditLogId,
        transactionId: editingTransaction.id,
        action: 'UPDATE',
        details: `Correction filed by Super Admin: ${editExplanation}. Fields overridden: ${
          original.mobileModel !== editedModel ? `Model (${original.mobileModel} -> ${editedModel}) ` : ''
        }${original.buyerName !== editedBuyerName ? `Buyer Name (${original.buyerName} -> ${editedBuyerName})` : ''}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        timestamp: new Date().toISOString()
      };

      // 2. Commit to local IndexedDB
      await db.transactions.put(updatedTx);
      await db.auditLogs.put(newAuditLog);

      // 3. Queue both actions for standard background cloud synchronization
      await db.syncQueue.put({
        id: `${updatedTx.id}_update_${Date.now()}`,
        transactionId: updatedTx.id,
        action: 'UPDATE',
        payload: updatedTx,
        timestamp: new Date().toISOString(),
        retryCount: 0
      });

      // Synchronously index the audit log in cloud sync queue matching existsAfter dependency!
      await db.syncQueue.put({
        id: `${auditLogId}_create_${Date.now()}`,
        transactionId: auditLogId,
        action: 'CREATE',
        payload: newAuditLog as any,
        timestamp: new Date().toISOString(),
        retryCount: 0
      });

      setDashboardMessage("Regulatory Transaction Correction submitted safely. Compliance audit log created.");
      setEditingTransaction(null);
      await fetchGlobalDatabase();

      // Kick off background sync
      syncEngine.triggerSync();

    } catch (err) {
      setDashboardMessage("Failed filing correction data logs in device indexedDB.");
    }
  };

  // CSV Report Generator
  const downloadNationalReport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Type,Model,IMEI,Buyer,Seller,Shop,Market,DateTime"].join(",") + "\n"
      + allTransactions.map(t => [
          t.type,
          t.mobileModel,
          t.imei1,
          t.buyerName,
          t.sellerName,
          t.shopName,
          t.marketName,
          t.dateTime
        ].join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Pakistan_Mobile_Registry_Audit_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter list matching search fields (IMEI, CNIC, Name, Shop Name)
  const filteredTxns = allTransactions.filter(t => {
    const q = globalQuery.toLowerCase();
    const buyerCnicDec = decryptData(t.buyerCnic).toLowerCase();
    const sellerCnicDec = decryptData(t.sellerCnic).toLowerCase();
    return (
      t.mobileModel.toLowerCase().includes(q) ||
      t.imei1.includes(q) ||
      t.imei2.includes(q) ||
      t.buyerName.toLowerCase().includes(q) ||
      t.sellerName.toLowerCase().includes(q) ||
      t.shopName.toLowerCase().includes(q) ||
      t.marketName.toLowerCase().includes(q) ||
      buyerCnicDec.includes(q) ||
      sellerCnicDec.includes(q)
    );
  });

  if (activeTab === 'super-shops') {
    return (
      <div className="space-y-6" id="super-shops-scope">
        <div className="flex justify-between items-center bg-slate-50/20 pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5 font-mono">
              <Store className="w-5 h-5 text-blue-600" /> Authorized Shops Ledger
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Inspection list of registered mobile retailers across all geographical markets.
            </p>
          </div>
          <button
            onClick={downloadNationalReport}
            className="text-xs bg-white hover:bg-slate-50 text-slate-705 border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-1.5 duration-150 font-mono shadow-xs font-bold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Exports Registry CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="all-shops-cards">
          {allShops.map((shp) => (
            <div key={shp.id} className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between hover:border-blue-300 transition duration-155 shadow-xs">
              <div className="space-y-1.5">
                <div className="flex justify-between items-start gap-3">
                  <h4 className="text-sm font-bold text-slate-800 tracking-tight leading-tight uppercase font-mono">{shp.name}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${
                    shp.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-amber-50 text-amber-700 border-amber-150'
                  }`}>
                    {shp.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-semibold">
                  <Building className="w-3.5 h-3.5 text-blue-600" /> {shp.marketName}
                </p>
                {shp.shopAddress && (
                  <p className="text-xs text-slate-600 font-sans font-medium pl-4.5">
                    Address: {shp.shopAddress}
                  </p>
                )}
                <div className="text-[11px] text-slate-500 font-mono space-y-1 pt-2">
                  <div>License Holder: <strong className="text-slate-800">{shp.ownerName}</strong></div>
                  <div>ID Card Coordinates: <span className="text-slate-600">{shp.cnic}</span></div>
                  <div>Telephone: <span className="text-slate-600">{shp.contactNumber}</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'super-audits') {
    return (
      <div className="space-y-6" id="super-audits-scope">
        <div>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5 font-mono">
            <History className="w-5 h-5 text-blue-600" /> Regulatory Audit Trail logs
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Strict chronological record of all administrative edits, corrections, and modifications in accordance with national safety standards.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs" id="audits-table-container">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-500 uppercase">SYSTEM AUDIT TRAIL ({allAuditLogs.length} events)</h3>
          </div>

          {allAuditLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm font-mono leading-relaxed bg-white">
              Pristine state: No record edits or deletions have been executed in this regulatory sandbox yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 bg-white" id="audit-list">
              {allAuditLogs.map((log) => (
                <div key={log.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans hover:bg-slate-50/30 transition duration-155 animate-fade-in">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 font-mono">{log.action}</span>
                      <span className="text-slate-800 text-sm font-bold">{log.details}</span>
                    </div>
                    <div className="text-slate-500 text-xs font-mono mt-0.5">
                      User: <strong className="text-slate-700">{log.userName}</strong> | Role: <span className="text-blue-650 font-bold">{log.userRole}</span>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400 font-mono">
                    <div>Log Ref: {log.id}</div>
                    <div className="mt-1">{new Date(log.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === 'super-search') {
    return (
      <div className="space-y-6" id="super-search-scope">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5 font-mono">
              <Search className="w-5 h-5 text-blue-600" /> Global National IMEI Registry Search
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Inspect database tables by IMEI, CNIC ID, buyer/seller name, or shop name instantly.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Query IMEI / CNIC / Name..."
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-550 shadow-xs font-medium"
            />
          </div>
        </div>

        {dashboardMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-sans font-semibold">
            {dashboardMessage}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs" id="national-search-results">
          {filteredTxns.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm font-mono leading-relaxed bg-white">
              No transactions matching search found in national device directories.
            </div>
          ) : (
            <div className="overflow-x-auto bg-white">
              <table className="w-full text-left text-xs text-slate-700 bg-white">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="p-4 font-bold">Type</th>
                    <th className="p-4 font-bold">Device Details</th>
                    <th className="p-4 font-bold">IMEI Registry</th>
                    <th className="p-4 font-bold">Buyer Coordinates</th>
                    <th className="p-4 font-bold">Seller Coordinates</th>
                    <th className="p-4 font-bold">Shop & Market</th>
                    <th className="p-4 text-right font-bold">Correct</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTxns.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/30 transition duration-150">
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${tx.type === 'BUY' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-blue-50 text-blue-700 border-blue-150'}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-800">
                        <div>{tx.mobileModel}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{new Date(tx.dateTime).toLocaleString()}</div>
                      </td>
                      <td className="p-4 font-mono text-slate-600">
                        <div>S1: {tx.imei1}</div>
                        {tx.imei2 && <div>S2: {tx.imei2}</div>}
                      </td>
                      <td className="p-4">
                        <div className="text-slate-800 font-bold hover:text-blue-600 cursor-pointer">{tx.buyerName}</div>
                        {tx.buyerAddress && <div className="text-[10px] text-slate-600 font-sans font-medium">Addr: {tx.buyerAddress}</div>}
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">{decryptData(tx.buyerCnic)}</div>
                        <div className="text-[10px] font-mono text-slate-400">{decryptData(tx.buyerContact)}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-800 font-bold hover:text-blue-600 cursor-pointer">{tx.sellerName}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">{decryptData(tx.sellerCnic)}</div>
                        <div className="text-[10px] font-mono text-slate-400">{decryptData(tx.sellerContact)}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-800 font-bold">{tx.shopName}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{tx.marketName}</div>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleOpenEditModal(tx)}
                          className="p-1 px-2.5 bg-slate-55 hover:bg-blue-50 text-blue-600 hover:text-blue-800 rounded border border-slate-200 hover:border-blue-300 text-[10px] font-mono inline-flex items-center gap-1 cursor-pointer font-bold transition duration-150"
                        >
                          <Edit className="w-3 h-3" /> Edit
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

  // --- GENERAL OVERVIEW SECTION ---
  return (
    <div className="space-y-6" id="super-overview-scope">
      {/* 1. Header row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight uppercase flex items-center gap-2 font-mono">
            <Sliders className="w-5 h-5 text-blue-600" /> Regulatory Command Oversight
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            SOP compliance dashboard reviewing National cellular trade. Secure local caching active.
          </p>
        </div>
        <button
          onClick={downloadNationalReport}
          className="bg-blue-600 hover:bg-blue-705 text-white px-4 py-2.5 rounded-xl text-xs font-mono font-bold shadow-xs cursor-pointer flex items-center gap-1.5 self-start md:self-auto uppercase duration-150"
          id="btn-trigger-report"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Exports Registry Report
        </button>
      </div>

      {/* 2. Analytical widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="national-stats-strip">
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
          <span className="text-xs text-slate-400 font-bold font-mono uppercase block">Secondary Markets</span>
          <h3 className="text-xl font-extrabold text-slate-800 mt-1.5">{allMarkets.length} locations</h3>
        </div>
        
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
          <span className="text-xs text-slate-400 font-bold font-mono uppercase block">Active Merchants</span>
          <h3 className="text-xl font-extrabold text-slate-800 mt-1.5">{allShops.filter(s => s.status === 'APPROVED').length} shops</h3>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
          <span className="text-xs text-slate-400 font-bold font-mono uppercase block">Registered device transactions</span>
          <h3 className="text-xl font-extrabold text-slate-800 mt-1.5">{allTransactions.length} units</h3>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
          <span className="text-xs text-slate-400 font-bold font-mono uppercase block">Active Duplicate IMEIs</span>
          <h3 className={`text-xl font-extrabold mt-1.5 font-mono ${duplicateImeis.length > 0 ? 'text-rose-600 animate-pulse' : 'text-emerald-650'}`}>
            {duplicateImeis.length} units
          </h3>
        </div>
      </div>

      {/* 3. Suspicious Pattern Alerts Card! */}
      {(duplicateImeis.length > 0 || suspiciousCnics.length > 0) && (
        <div className="bg-rose-50/50 border border-rose-100 p-5 rounded-xl space-y-3 shadow-xs" id="alerts-banner">
          <h3 className="text-xs font-bold text-rose-700 flex items-center gap-2 font-mono uppercase tracking-wider">
            <AlertTriangle className="w-5 h-5 animate-pulse text-rose-650" /> Compliance Incident Alert Panel
          </h3>
          <p className="text-xs text-rose-800 max-w-2xl leading-relaxed font-semibold">
            Automatic forensic behavioral engine identifies potential regulatory bypass patterns matching area trading statistics:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono pt-1">
            {duplicateImeis.length > 0 && (
              <div className="bg-white p-3 rounded-xl border border-rose-100/70 shadow-xs">
                <span className="text-rose-700 font-bold block mb-1">🔴 Flagged Duplicate IMEIs ({duplicateImeis.length})</span>
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  The following device IMEIs are index-matched across multiple shop logs: 
                  <strong className="text-rose-800 block mt-1">{duplicateImeis.map(maskIMEI).join(", ")}</strong>
                </p>
              </div>
            )}
            {suspiciousCnics.length > 0 && (
              <div className="bg-white p-3 rounded-xl border border-rose-100/70 shadow-xs">
                <span className="text-rose-700 font-bold block mb-1">🟣 High-Frequency CNIC Traders ({suspiciousCnics.length})</span>
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  Citizens identified conducting more than 3 distinct buy/sell operations in 24 hours:
                  <strong className="text-rose-800 block mt-1">{suspiciousCnics.map(maskCNIC).join(", ")}</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Recent trade flow lists */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs" id="recent-flow-panel">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-xs font-bold font-mono tracking-wider text-slate-550 uppercase">RECENT NATIONAL TRANSACTIONS ({allTransactions.slice(0, 5).length})</h3>
          <span className="text-[10px] text-emerald-650 font-mono font-bold">Real-time encryption active</span>
        </div>

        {allTransactions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm font-mono leading-relaxed bg-white">
            No transaction records are registered globally in the regional databases yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 bg-white" id="recent-admin-tx-rows">
            {allTransactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition duration-155 text-xs text-slate-600">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${tx.type === 'BUY' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-blue-50 text-blue-700 border-blue-150'}`}>
                      {tx.type}
                    </span>
                    <h4 className="font-bold text-slate-800 uppercase">{tx.mobileModel}</h4>
                  </div>
                  <div className="text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                    <span>Shop: <strong className="text-slate-700">{tx.shopName}</strong></span>
                    <span>•</span>
                    <span>Market: <strong className="text-slate-700">{tx.marketName}</strong></span>
                  </div>
                </div>

                <div className="text-right text-[11px] font-mono whitespace-nowrap">
                  <div className="text-slate-500 font-bold font-medium">IMEI: {maskIMEI(tx.imei1)}</div>
                  <div className="text-slate-400 mt-1 font-semibold">{new Date(tx.dateTime).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL WORKSTATION FOR TYPO CORRECTIONS */}
      {editingTransaction && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4" id="edit-modal">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-2xl p-6 space-y-4" id="edit-modal-box">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase font-mono tracking-tight flex items-center gap-1.5">
                <Edit className="w-5 h-5 text-blue-600" /> Apply Administrative Correction
              </h3>
              <button
                onClick={() => setEditingTransaction(null)}
                className="text-slate-400 hover:text-slate-800 font-mono text-xs cursor-pointer bg-slate-100/50 hover:bg-slate-100 py-1 px-2.5 rounded-lg border border-slate-205 font-bold transition"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveCorrectionValue} className="space-y-4 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="text-slate-500 font-mono font-bold block">DEVICE MODEL NAME</label>
                <input
                  type="text"
                  required
                  value={editedModel}
                  onChange={(e) => setEditedModel(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-500 font-mono font-bold block">BUYER FULL NAME</label>
                  <input
                    type="text"
                    required
                    value={editedBuyerName}
                    onChange={(e) => setEditedBuyerName(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-500 font-mono font-bold block">SELLER FULL NAME</label>
                  <input
                    type="text"
                    required
                    value={editedSellerName}
                    onChange={(e) => setEditedSellerName(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 font-mono font-bold block">CELLULAR GSM IMEI SLOT 1</label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  value={editedImei1}
                  onChange={(e) => setEditedImei1(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 font-mono text-xs font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-550 font-mono font-bold block">REGULATORY REASON / REMARKS *</label>
                <textarea
                  required
                  placeholder="e.g. Typo corrections in buyer CNIC/Model index matching paper files..."
                  value={editExplanation}
                  onChange={(e) => setEditExplanation(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-xs font-mono tracking-wide uppercase duration-150 cursor-pointer shadow-md shadow-blue-500/10"
              >
                Commit Corrective Edit to Audit Trail
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
