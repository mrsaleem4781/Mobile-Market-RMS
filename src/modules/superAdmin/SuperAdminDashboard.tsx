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
import { encryptData, decryptData, maskCNIC, maskIMEI, validateAndCleanCNIC, formatCNICInput } from '../../utils/security';

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

  // Reported stolen/snatched mobile states
  const [reportedMobilesList, setReportedMobilesList] = useState<any[]>([]);
  const [stolenBrand, setStolenBrand] = useState('');
  const [stolenModel, setStolenModel] = useState('');
  const [stolenImei1, setStolenImei1] = useState('');
  const [stolenImei2, setStolenImei2] = useState('');
  const [stolenOwnerName, setStolenOwnerName] = useState('');
  const [stolenOwnerContact, setStolenOwnerContact] = useState('');
  const [stolenOwnerCnic, setStolenOwnerCnic] = useState('');
  const [stolenFir, setStolenFir] = useState('');
  const [stolenPS, setStolenPS] = useState('');
  const [stolenDate, setStolenDate] = useState('');
  const [stolenStatus, setStolenStatus] = useState<'STOLEN' | 'SNATCHED' | 'RECOVERED'>('SNATCHED');
  const [stolenMessage, setStolenMessage] = useState<string | null>(null);
  const [stolenSuccessMessage, setStolenSuccessMessage] = useState<string | null>(null);

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

    const reps = await db.reportedMobiles.toArray();
    setReportedMobilesList(reps.reverse());

    analyzeSuspiciousPatterns(txs);
  };

  const handleReportStolenMobileAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStolenMessage(null);
    setStolenSuccessMessage(null);

    const cleanImei = stolenImei1.replace(/[^0-9]/g, '');
    if (!stolenBrand || !stolenModel || cleanImei.length < 14 || !stolenOwnerName || !stolenOwnerContact || !stolenOwnerCnic || !stolenDate) {
      setStolenMessage("Please complete all mandatory credentials (brand, model, 14-15 digit IMEI, owner data).");
      return;
    }

    const cleanCnicObj = validateAndCleanCNIC(stolenOwnerCnic);
    if (!cleanCnicObj.isValid) {
      setStolenMessage("Owner's CNIC must contain exactly 13 digits (XXXXX-XXXXXXX-X).");
      return;
    }

    try {
      const reportId = `report-${Math.random().toString(36).substr(2, 9)}`;
      const newReport = {
        id: reportId,
        imei1: cleanImei,
        imei2: stolenImei2.replace(/[^0-9]/g, '') || undefined,
        brand: stolenBrand,
        model: stolenModel,
        ownerName: stolenOwnerName,
        ownerContact: stolenOwnerContact,
        ownerCnic: cleanCnicObj.formatted,
        firNumber: stolenFir || undefined,
        policeStation: stolenPS || undefined,
        incidentDate: stolenDate,
        reportedAt: new Date().toISOString(),
        reportedBy: currentUser.id,
        reportedByName: currentUser.name,
        status: stolenStatus as any
      };

      await db.reportedMobiles.put(newReport);
      setStolenSuccessMessage("✔️ Success: New snatched / stolen mobile record registered globally.");
      
      // Clear Form
      setStolenBrand('');
      setStolenModel('');
      setStolenImei1('');
      setStolenImei2('');
      setStolenOwnerName('');
      setStolenOwnerContact('');
      setStolenOwnerCnic('');
      setStolenFir('');
      setStolenPS('');
      setStolenDate('');
      
      await fetchGlobalDatabase();
    } catch (err) {
      setStolenMessage("Failed to register database record.");
    }
  };

  const handleToggleReportedStatus = async (reportId: string, currentStatus: string) => {
    try {
      const report = await db.reportedMobiles.get(reportId);
      if (report) {
        report.status = currentStatus === 'RECOVERED' ? 'SNATCHED' : 'RECOVERED';
        await db.reportedMobiles.put(report);
        setDashboardMessage(`Device [${report.brand} ${report.model}] status updated to ${report.status}.`);
        await fetchGlobalDatabase();
      }
    } catch (err) {
      setDashboardMessage("Failed to update status.");
    }
  };

  const handleDeleteReportedMobile = async (reportId: string) => {
    if (!window.confirm("Are you sure you want to delete this stolen/snatched record from system indexes?")) {
      return;
    }
    try {
      await db.reportedMobiles.delete(reportId);
      setDashboardMessage("Stolen record deleted successfully from master database.");
      await fetchGlobalDatabase();
    } catch (err) {
      setDashboardMessage("Failed deleting reported mobile index.");
    }
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

  const handleUpdateShopStatus = async (shopId: string, status: 'APPROVED' | 'REJECTED') => {
    setDashboardMessage(null);
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
        const allUsers = await db.users.toArray();
        const associatedUser = allUsers.find(u => u.shopId === shopId);
        if (associatedUser) {
          associatedUser.status = status;
          await db.users.put(associatedUser);
        }

        setDashboardMessage(`Shop [${shop.name}] compliance status officially configured as ${status}.`);
        await fetchGlobalDatabase();
      }
    } catch (e) {
      setDashboardMessage("Failed configuring shop authorization code state.");
    }
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

        {dashboardMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-sans font-semibold">
            {dashboardMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="all-shops-cards">
          {allShops.map((shp) => (
            <div key={shp.id} className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between hover:border-blue-300 transition duration-155 shadow-xs">
              <div>
                <div className="flex justify-between items-start gap-3">
                  <h4 className="text-sm font-bold text-slate-800 tracking-tight leading-tight uppercase font-mono">{shp.name}</h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold border ${
                    shp.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {shp.status === 'APPROVED' ? '🟢 ACTIVE' : '🔴 INACTIVE / SUSPENDED'}
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

              {/* Action operations directly managed by Super Admin */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
                {shp.status !== 'APPROVED' ? (
                  <button
                    onClick={() => handleUpdateShopStatus(shp.id, 'APPROVED')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] font-mono flex items-center gap-1 cursor-pointer transition shadow-xs"
                  >
                    <Check className="w-3 h-3" /> ACTIVATE MERCHANT
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdateShopStatus(shp.id, 'REJECTED')}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg border border-rose-200 text-[10px] font-mono flex items-center gap-1 cursor-pointer transition"
                  >
                    <X className="w-3 h-3" /> SUSPEND / DEACTIVATE MERCHANT
                  </button>
                )}
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

  if (activeTab === 'super-reported') {
    return (
      <div className="space-y-6 animate-fadeIn" id="super-reported-scope">
        <div className="bg-gradient-to-r from-rose-600 to-red-800 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold uppercase tracking-wider flex items-center gap-2 font-mono">
              <ShieldAlert className="w-5 h-5 animate-pulse text-white" /> National Stolen / Snatched Master Database
            </h2>
            <p className="text-xs text-rose-100 leading-normal max-w-xl">
              Log, search, correct, or resolve snatched smartphone indices. Changes commit instantly to SQLite and live IndexedDB caches.
            </p>
          </div>
          <span className="bg-white/10 border border-white/20 text-white px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest">
            SUPER AUTHORITY ACCESS
          </span>
        </div>

        {dashboardMessage && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-sans font-semibold animate-fadeIn">
            {dashboardMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
          {/* Form Panel (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-800 font-mono uppercase tracking-wider">
                ⚖️ Global Incident Registry File
              </h3>
            </div>

            {stolenMessage && (
              <div className="p-3 bg-rose-50 text-rose-800 border-l-4 border-rose-500 text-[11px] font-medium rounded-lg">
                {stolenMessage}
              </div>
            )}

            {stolenSuccessMessage && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500 text-[11px] font-medium rounded-lg">
                {stolenSuccessMessage}
              </div>
            )}

            <form onSubmit={handleReportStolenMobileAdmin} className="space-y-4 text-xs">
              {/* Status Selector */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider font-mono">Registry Category *</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStolenStatus('SNATCHED')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold font-mono transition-colors cursor-pointer ${stolenStatus === 'SNATCHED' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-50 border border-slate-205 text-slate-600 hover:bg-slate-100'}`}
                  >
                    🚨 SNATCHED
                  </button>
                  <button
                    type="button"
                    onClick={() => setStolenStatus('STOLEN')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold font-mono transition-colors cursor-pointer ${stolenStatus === 'STOLEN' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-50 border border-slate-205 text-slate-600 hover:bg-slate-100'}`}
                  >
                    ⚠️ STOLEN
                  </button>
                </div>
              </div>

              {/* Brand / Model / IMEIs */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-mono">Brand *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apple"
                    value={stolenBrand}
                    onChange={(e) => setStolenBrand(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-mono">Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. iPhone 15"
                    value={stolenModel}
                    onChange={(e) => setStolenModel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold block font-mono uppercase tracking-wider">IMEI Slot 1 (14-15 Digits) *</label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  placeholder="Primary IMEI number"
                  value={stolenImei1}
                  onChange={(e) => setStolenImei1(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 font-mono tracking-widest font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold block font-mono uppercase tracking-wider">IMEI Slot 2 (Optional)</label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="Secondary IMEI slot"
                  value={stolenImei2}
                  onChange={(e) => setStolenImei2(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 font-mono tracking-widest text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              {/* Owner Identity */}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider mb-2">Complainant Information</p>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-mono">complainant *</label>
                      <input
                        type="text"
                        required
                        placeholder="Name of owner"
                        value={stolenOwnerName}
                        onChange={(e) => setStolenOwnerName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-mono">Contact No *</label>
                      <input
                        type="text"
                        required
                        placeholder="Phone contact"
                        value={stolenOwnerContact}
                        onChange={(e) => setStolenOwnerContact(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 font-mono text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold block font-mono uppercase tracking-wider">CNIC Identity *</label>
                    <input
                      type="text"
                      required
                      placeholder="13 Numeric digits"
                      maxLength={15}
                      value={stolenOwnerCnic}
                      onChange={(e) => setStolenOwnerCnic(formatCNICInput(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 font-mono text-slate-850 focus:outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Legal Information */}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider mb-2">Legal FIR Coordinates</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-mono">FIR No.</label>
                    <input
                      type="text"
                      placeholder="e.g. 998/2026"
                      value={stolenFir}
                      onChange={(e) => setStolenFir(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-mono">Incident Date *</label>
                    <input
                      type="date"
                      required
                      value={stolenDate}
                      onChange={(e) => setStolenDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="space-y-1 mt-2">
                  <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-mono">Police Station Jurisdiction</label>
                  <input
                    type="text"
                    placeholder="e.g. Clifton PS, Defence PS"
                    value={stolenPS}
                    onChange={(e) => setStolenPS(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs uppercase font-mono tracking-wider duration-150 cursor-pointer text-center border border-rose-500/10 shadow-sm"
              >
                Log Snatched Record File
              </button>
            </form>
          </div>

          {/* List Panel (8 cols) */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2.5 flex justify-between items-center gap-4">
                <h3 className="text-xs font-bold text-slate-805 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  📁 Current Stolen Databases Archive ({reportedMobilesList.length})
                </h3>
                <span className="text-[10px] text-slate-400 font-bold font-mono">REAL-TIME SEARCHABLE INDEX</span>
              </div>

              {reportedMobilesList.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-mono text-xs">
                  Global archive is ready but records list is empty.
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[640px] overflow-y-auto pr-1">
                  {reportedMobilesList.map((rep) => (
                    <div key={rep.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-350 hover:bg-slate-50 lg:p-5 transition-all duration-155 space-y-3">
                      <div className="flex justify-between items-start gap-4 flex-wrap">
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                            <span>{rep.brand} {rep.model}</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-mono tracking-wider font-bold border ${
                              rep.status === 'RECOVERED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              rep.status === 'SNATCHED' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {rep.status}
                            </span>
                          </h4>
                          <p className="text-[10.5px] text-slate-500 font-mono mt-1">
                            IMEI One: <span className="font-bold text-slate-800">{rep.imei1}</span>
                            {rep.imei2 && <span> | IMEI Two: <span className="font-bold text-slate-800">{rep.imei2}</span></span>}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono font-bold self-end md:self-auto">{new Date(rep.reportedAt).toLocaleDateString()}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-705 bg-white border border-slate-200/60 rounded-xl p-3 font-medium">
                        <div>Complainant: <strong className="text-slate-905">{rep.ownerName}</strong></div>
                        <div>CNIC Identity: <strong className="text-slate-905">{maskCNIC(rep.ownerCnic)}</strong></div>
                        <div>Contact Phone: <strong className="text-slate-905 font-mono">{rep.ownerContact}</strong></div>
                        <div>Origin PS: <strong className="text-rose-700">{rep.policeStation || 'N/A'} PS</strong></div>
                      </div>

                      {rep.firNumber && (
                        <div className="text-[10px] bg-rose-50/40 border border-rose-100 rounded-lg px-3 py-1.5 text-rose-800 font-mono flex flex-col sm:flex-row justify-between gap-1">
                          <span>FIR OFFICIAL REGISTRY CODE: <strong className="font-bold">{rep.firNumber}</strong></span>
                          <span>INCIDENT DATE: <strong className="font-bold">{rep.incidentDate}</strong></span>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2 gap-2 border-t border-dashed border-slate-220">
                        <span className="text-[9.5px] text-slate-400 font-mono font-bold">
                          Registered by {rep.reportedByName}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleReportedStatus(rep.id, rep.status)}
                            className={`px-3 py-1 rounded text-[10px] font-mono tracking-wide font-bold transition duration-150 cursor-pointer ${
                              rep.status === 'RECOVERED' 
                                ? 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200' 
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {rep.status === 'RECOVERED' ? '⚠️ Reopen Case' : '✔️ Resolve & Recover'}
                          </button>
                          <button
                            onClick={() => handleDeleteReportedMobile(rep.id)}
                            className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded border border-rose-200 text-[10px] font-mono transition duration-150 cursor-pointer font-bold"
                          >
                            Delete Record
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="national-stats-strip">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold font-mono uppercase block tracking-wider">Secondary Markets</span>
          <h3 className="text-xl font-extrabold text-slate-800 mt-1.5 leading-none">{allMarkets.length} locations</h3>
          <p className="text-[10px] text-slate-405 mt-2 font-medium font-mono uppercase">Master register areas</p>
        </div>
        
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold font-mono uppercase block tracking-wider">Active Merchants</span>
          <h3 className="text-xl font-extrabold text-slate-800 mt-1.5 leading-none">{allShops.filter(s => s.status === 'APPROVED').length} active shops</h3>
          <p className="text-[10px] text-slate-405 mt-2 font-medium font-mono uppercase">Licensed sellers</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold font-mono uppercase block tracking-wider">Device Transactions</span>
          <h3 className="text-xl font-extrabold text-slate-800 mt-1.5 leading-none">{allTransactions.length} units traded</h3>
          <p className="text-[10px] text-slate-405 mt-2 font-medium font-mono uppercase">Buy/Sell logs synced</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold font-mono block uppercase tracking-wider">Stolen Devices Database</span>
          <h3 className="text-xl font-extrabold text-rose-600 mt-1.5 leading-none">{reportedMobilesList.length} blocked</h3>
          <p className="text-[10px] text-rose-500 mt-2 font-bold font-mono uppercase">CPLC Sindh flagged</p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold font-mono uppercase block tracking-wider">Active Duplicate IMEIs</span>
          <h3 className={`text-xl font-extrabold mt-1.5 font-mono leading-none ${duplicateImeis.length > 0 ? 'text-rose-600 animate-pulse' : 'text-emerald-650'}`}>
            {duplicateImeis.length} units
          </h3>
          <p className="text-[10px] text-slate-455 mt-2 font-medium font-mono uppercase">Forensic flags</p>
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
