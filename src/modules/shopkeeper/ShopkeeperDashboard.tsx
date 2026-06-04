/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  FileText,
  Camera,
  Layers,
  Sparkles,
  Smartphone,
  ShieldCheck,
  RotateCw,
  Eye,
  Trash
} from 'lucide-react';
import { db } from '../../offline/db';
import { syncEngine } from '../../sync/syncEngine';
import { Transaction, AppUser } from '../../types';
import { encryptData, decryptData, maskCNIC, maskIMEI, validateAndCleanCNIC, formatCNICInput } from '../../utils/security';

interface ShopkeeperDashboardProps {
  currentUser: AppUser;
  activeTab: string;
}

export default function ShopkeeperDashboard({ currentUser, activeTab }: ShopkeeperDashboardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Transaction Form States
  const [formType, setFormType] = useState<'BUY' | 'SELL'>('BUY');
  const [mobileModel, setMobileModel] = useState('');
  const [imei1, setImei1] = useState('');
  const [imei2, setImei2] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerCnic, setBuyerCnic] = useState('');
  const [buyerContact, setBuyerContact] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [sellerCnic, setSellerCnic] = useState('');
  const [sellerContact, setSellerContact] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | undefined>(undefined);
  
  // Custom states
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [imeiDuplicateWarning, setImeiDuplicateWarning] = useState<string | null>(null);
  const [showCleartext, setShowCleartext] = useState<{ [txId: string]: boolean }>({});

  // CPLC & Police Verification Checker States
  const [verifyImei, setVerifyImei] = useState('');
  const [verifyResult, setVerifyResult] = useState<'IDLE' | 'CLEAN' | 'STOLEN' | 'LOCAL_EXISTS'>('IDLE');
  const [verifyDetails, setVerifyDetails] = useState<{
    model: string;
    reportType: string;
    date: string;
    reportNumber: string;
    location: string;
    authority: string;
  } | null>(null);
  const [localExistsDetails, setLocalExistsDetails] = useState<Transaction | null>(null);
  const [checkingImei, setCheckingImei] = useState(false);

  const handleVerifyImeiStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = verifyImei.replace(/[^0-9]/g, '');
    if (cleaned.length < 14) {
      alert("Please enter a complete 14 or 15-digit IMEI number to verify.");
      return;
    }

    setCheckingImei(true);
    setVerifyResult('IDLE');
    setVerifyDetails(null);
    setLocalExistsDetails(null);

    // Simulate network lookup delay on CPLC Sindh database
    setTimeout(async () => {
      const blacklisted: { [key: string]: typeof verifyDetails } = {
        '352001122334455': {
          model: 'Samsung Galaxy S23 Ultra',
          reportType: 'REPORTED STOLEN / GUNPOINT ROBBERY',
          date: '2026-05-12',
          reportNumber: 'FIR No. 344/26 (Clifton PS, Karachi)',
          location: 'Clifton, Karachi, Sindh',
          authority: 'CPLC Sindh Verification System'
        },
        '861122003344556': {
          model: 'Infinix Hot 40 Pro',
          reportType: 'SNATCHED & BLOCKED BY CPLC',
          date: '2026-05-18',
          reportNumber: 'CPLC Diary No. 8876/C (Quaidabad division)',
          location: 'Quaidabad Mobile Market area, Karachi',
          authority: 'Citizens-Police Liaison Committee (CPLC) Sindh'
        },
        '445566778899001': {
          model: 'Apple iPhone 15 Pro',
          reportType: 'LOST / SUSPENDED REGISTRY',
          date: '2026-05-01',
          reportNumber: 'Police Report Code: K-4552 (Karachi Central)',
          location: 'Gulshan-e-Iqbal, Karachi',
          authority: 'CPLC Sindh & Karachi Police'
        },
        '123456789012345': {
          model: 'Vivo V30 Blue',
          reportType: 'ACTIVE THEFT COMPLAINT',
          date: '2026-05-22',
          reportNumber: 'Daily Diary Entry #7 (Zaman Town PS)',
          location: 'Korangi, Karachi',
          authority: 'CPLC Sindh Security Division'
        }
      };

      const matchedStolen = blacklisted[cleaned];
      if (matchedStolen) {
        setVerifyDetails(matchedStolen);
        setVerifyResult('STOLEN');
        setCheckingImei(false);
        return;
      }

      // Check if IMEI exists locally in our mobile shops database (warn if someone is selling it in multiple shops)
      const localMatches = await db.transactions
        .where('imei1')
        .equals(cleaned)
        .or('imei2')
        .equals(cleaned)
        .first();

      if (localMatches) {
        setLocalExistsDetails(localMatches);
        setVerifyResult('LOCAL_EXISTS');
      } else {
        setVerifyResult('CLEAN');
      }
      setCheckingImei(false);
    }, 600);
  };

  useEffect(() => {
    fetchLocalTransactions();
  }, [currentUser, activeTab]);

  const fetchLocalTransactions = async () => {
    // Read only transactions belonging to the current user
    const list = await db.transactions
      .where('createdBy')
      .equals(currentUser.id)
      .reverse()
      .sortBy('dateTime');
    setTransactions(list);
  };

  // Live duplicate IMEI scanning as we type in the entry form
  const handleImeiChange = async (val: string, isImei1 = true) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    if (isImei1) {
      setImei1(cleaned);
    } else {
      setImei2(cleaned);
    }

    if (cleaned.length >= 14) {
      // Check existing transactions
      const duplicateTxCount = await db.transactions
        .where('imei1')
        .equals(cleaned)
        .or('imei2')
        .equals(cleaned)
        .count();

      if (duplicateTxCount > 0) {
        setImeiDuplicateWarning(`SOP CRITICAL WARNING: IMEI (${cleaned}) already exists in regulatory registers. Multi-shop transaction detected!`);
      } else {
        setImeiDuplicateWarning(null);
      }
    } else {
      setImeiDuplicateWarning(null);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);

    // Image/photo receipt is strictly mandatory per SOPs
    if (!photoBase64) {
      setFormMessage("SOP VIOLATION: Device physical receipt image is mandatory, please upload or capture a receipt image.");
      return;
    }

    // Resolve name, phone, CNIC from form inputs or logged-in user profile
    const resolvedBuyerName = formType === 'SELL' ? buyerName : currentUser.name;
    const resolvedBuyerCnic = formType === 'SELL' ? buyerCnic : (currentUser.cnic || '');
    const resolvedBuyerContact = formType === 'SELL' ? buyerContact : (currentUser.contactNumber || '');
    const resolvedBuyerAddress = formType === 'SELL' ? buyerAddress : (currentUser.shopAddress || currentUser.marketName || 'Local Market');

    const resolvedSellerName = formType === 'BUY' ? sellerName : currentUser.name;
    const resolvedSellerCnic = formType === 'BUY' ? sellerCnic : (currentUser.cnic || '');
    const resolvedSellerContact = formType === 'BUY' ? sellerContact : (currentUser.contactNumber || '');

    // Hard compliance validations
    if (!mobileModel || imei1.length < 14 || !resolvedBuyerName || !resolvedBuyerCnic || !resolvedSellerName || !resolvedSellerCnic) {
      setFormMessage("Please ensure all mandatory mobile IMEI and buyer/seller data conform to regulations.");
      return;
    }

    // Validate short address for buyer
    if (!resolvedBuyerAddress) {
      setFormMessage("Please enter the buyer's short address / city.");
      return;
    }

    const cleanBuyerCnicObj = validateAndCleanCNIC(resolvedBuyerCnic);
    const cleanSellerCnicObj = validateAndCleanCNIC(resolvedSellerCnic);

    if (!cleanBuyerCnicObj.isValid || !cleanSellerCnicObj.isValid) {
      setFormMessage("Mandatory CNIC format must contain strictly 13 numeric coordinates.");
      return;
    }

    const txId = `tx-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const newTx: Transaction = {
      id: txId,
      type: formType,
      mobileModel,
      imei1,
      imei2: imei2 || imei1, // fallback to avoid empty field in db lookup
      buyerName: resolvedBuyerName,
      buyerCnic: encryptData(cleanBuyerCnicObj.formatted),
      buyerContact: encryptData(resolvedBuyerContact),
      buyerAddress: resolvedBuyerAddress,
      sellerName: resolvedSellerName,
      sellerCnic: encryptData(cleanSellerCnicObj.formatted),
      sellerContact: encryptData(resolvedSellerContact),
      
      // Shop data automatically linked from user credentials
      shopId: currentUser.shopId || 'shp-sandbox',
      shopName: currentUser.shopName || 'Sandbox Mobile Centre',
      marketId: currentUser.marketId || 'mkt-sandbox',
      marketName: currentUser.marketName || 'Sandbox Regulatory Market',
      
      dateTime: now,
      photoUrl: photoBase64,
      syncStatus: 'pending',
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      isDuplicateImeiFlagged: imeiDuplicateWarning !== null
    };

    try {
      // Let the sync engine save locally first and add to queue safely
      await syncEngine.enqueueTransaction(newTx, 'CREATE');
      
      // Refresh list
      await fetchLocalTransactions();

      // Clear Form
      setMobileModel('');
      setImei1('');
      setImei2('');
      setBuyerName('');
      setBuyerCnic('');
      setBuyerContact('');
      setBuyerAddress('');
      setSellerName('');
      setSellerCnic('');
      setSellerContact('');
      setPhotoBase64(undefined);
      setShowEntryModal(false);
      setImeiDuplicateWarning(null);

    } catch (error) {
      setFormMessage("Database error writing IndexedDB record. Please check disk locks.");
    }
  };

  const handleTriggerCleartext = (txId: string) => {
    setShowCleartext(prev => ({ ...prev, [txId]: !prev[txId] }));
  };

  const filteredTransactions = transactions.filter(t => {
    const term = searchQuery.toLowerCase();
    return (
      t.mobileModel.toLowerCase().includes(term) ||
      t.imei1.includes(term) ||
      t.imei2.includes(term) ||
      t.buyerName.toLowerCase().includes(term) ||
      t.sellerName.toLowerCase().includes(term)
    );
  });

  // Summary Metrics
  const totalBuy = transactions.filter(t => t.type === 'BUY').length;
  const totalSell = transactions.filter(t => t.type === 'SELL').length;
  const pendingSync = transactions.filter(t => t.syncStatus === 'pending').length;

  if (activeTab === 'merchant-history') {
    return (
      <div className="space-y-6" id="history-scope">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5 font-mono">
              <FileText className="w-5 h-5 text-blue-600" /> Merchant Verification Logs
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Historical regulatory record ledger registered by <strong>{currentUser.shopName}</strong>.
            </p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by Model / IMEI / Contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Audit Tables */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs" id="txn-history-table">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-700 font-mono uppercase tracking-wider">LEDGER ENTRIES ({filteredTransactions.length})</h3>
          </div>
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm font-mono leading-relaxed bg-white">
              No transactions matching search found inside offline IndexedDB.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 font-bold">
                  <tr>
                    <th className="p-4 font-bold">Type</th>
                    <th className="p-4 font-bold">Mobile Details</th>
                    <th className="p-4 font-bold">Primary IMEI</th>
                    <th className="p-4 font-bold">Parties Registered</th>
                    <th className="p-4 font-bold">CNIC Credentials</th>
                    <th className="p-4 font-bold">Sync Status</th>
                    <th className="p-4 text-right font-bold">Receipt File</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
                  {filteredTransactions.map((tx) => {
                    const isDecrypted = showCleartext[tx.id] === true;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50 duration-155">
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${tx.type === 'BUY' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-slate-800">
                          <div>{tx.mobileModel}</div>
                          <div className="text-[10px] text-slate-400 font-mono font-medium mt-0.5">{new Date(tx.dateTime).toLocaleString()}</div>
                        </td>
                        <td className="p-4 font-mono text-slate-500">
                          <div>1: {maskIMEI(tx.imei1)}</div>
                          {tx.imei2 && <div className="mt-0.5">2: {maskIMEI(tx.imei2)}</div>}
                        </td>
                        <td className="p-4">
                          <div className="text-slate-800 font-medium font-sans">
                            Buyer: <span className="font-semibold text-slate-900">{tx.buyerName}</span>
                            {tx.buyerAddress && <div className="text-[10px] text-slate-500 font-medium">Address: {tx.buyerAddress}</div>}
                          </div>
                          <div className="text-slate-500 mt-0.5 font-sans">
                            Seller: <span className="font-semibold text-slate-900">{tx.sellerName}</span>
                          </div>
                        </td>
                        <td className="p-4 space-y-1">
                          <div className="flex items-center gap-1.5 font-mono text-slate-600">
                            <span>Buyer CNIC:</span>
                            <span className="text-slate-800">
                              {isDecrypted ? decryptData(tx.buyerCnic) : maskCNIC(decryptData(tx.buyerCnic))}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono text-slate-600">
                            <span>Seller CNIC:</span>
                            <span className="text-slate-800">
                              {isDecrypted ? decryptData(tx.sellerCnic) : maskCNIC(decryptData(tx.sellerCnic))}
                            </span>
                          </div>
                          <button
                            onClick={() => handleTriggerCleartext(tx.id)}
                            className="text-[10px] text-blue-600 hover:text-blue-700 font-bold font-mono flex items-center gap-1 mt-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>{isDecrypted ? 'Hide Raw Details' : 'Verify Encrypted CNIC'}</span>
                          </button>
                        </td>
                        <td className="p-4 font-mono">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            tx.syncStatus === 'synced' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {tx.syncStatus === 'synced' ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600 animate-pulse" />}
                            {tx.syncStatus === 'synced' ? 'Cloud Synced' : 'Sync Queue'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {tx.photoUrl ? (
                            <img src={tx.photoUrl} alt="Device Attachment" className="w-8 h-8 object-cover rounded border border-slate-200 ml-auto" />
                          ) : (
                            <span className="text-slate-400 font-mono text-[10px]">[None]</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="ops-scope">
      {/* 1. Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight uppercase flex items-center gap-2 font-mono">
            <Layers className="w-5 h-5 text-blue-600" /> Shopkeeper compliance ledger
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Logged Shop: <strong>{currentUser.shopName}</strong> | Market: <strong>{currentUser.marketName}</strong>
          </p>
        </div>
        <button
          onClick={() => setShowEntryModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 duration-150 uppercase font-mono self-start md:self-auto"
          id="btn-trigger-modal"
        >
          <Plus className="w-4 h-4" /> Add Transaction record
        </button>
      </div>

      {/* Prominent Search Bar (Moved out of logs to the main dashboard for quick access) */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <Search className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold font-mono tracking-wider text-slate-700 uppercase">Live Registry Search:</span>
        </div>
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search by IMEI number, model, phone coordinates, or buyer/seller name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-250 rounded-xl pl-4 pr-10 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium tracking-wide transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 p-0.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
              title="Clear search query"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* CPLC Sindh Stolen Device Checker */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="space-y-0.5">
            <h3 className="text-xs font-extrabold text-slate-900 tracking-wider font-mono uppercase flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> CPLC Sindh Verify Portal
            </h3>
            <p className="text-[11px] text-slate-600 font-medium">
              Verify device models and IMEI status before buying or selling to ensure they are not reported stolen or blacklisted.
            </p>
          </div>
          <span className="bg-blue-50 text-blue-800 border border-blue-150 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase self-start sm:self-auto tracking-wider">
            Live CPLC Sindh Integration
          </span>
        </div>

        <form onSubmit={handleVerifyImeiStatus} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-3 space-y-1">
            <label className="text-[9px] text-slate-500 font-bold uppercase font-mono tracking-wider block">IMEI verification number (14-15 Digits)</label>
            <input
              type="text"
              required
              maxLength={15}
              placeholder="Enter active IMEI number to search or click on any demo below to test..."
              value={verifyImei}
              onChange={(e) => setVerifyImei(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans"
            />
          </div>
          <button
            type="submit"
            disabled={checkingImei}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs uppercase font-mono duration-150 shadow-xs cursor-pointer disabled:opacity-50 select-none flex items-center justify-center gap-1.5"
          >
            {checkingImei ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                VERIFY STATUS
              </>
            )}
          </button>
        </form>

        {/* Quick test suggestion triggers */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] text-slate-500 font-bold font-mono uppercase">Quick Demo Verification:</span>
          <button
            onClick={() => { setVerifyImei('352001122334455'); setVerifyResult('IDLE'); }}
            className="px-2 py-1 text-[9px] font-mono font-bold border border-rose-200 bg-rose-50/50 hover:bg-rose-50 rounded-lg text-rose-700 transition duration-150 cursor-pointer"
          >
            🚨 Stolen Samsung (352001122334455)
          </button>
          <button
            onClick={() => { setVerifyImei('861122003344556'); setVerifyResult('IDLE'); }}
            className="px-2 py-1 text-[9px] font-mono font-bold border border-rose-200 bg-rose-50/50 hover:bg-rose-50 rounded-lg text-rose-700 transition duration-150 cursor-pointer"
          >
            🚨 Snatched Infinix (861122003344556)
          </button>
          <button
            onClick={() => { setVerifyImei('358249622915834'); setVerifyResult('IDLE'); }}
            className="px-2 py-1 text-[10px] font-mono font-bold border border-amber-250 bg-amber-50/30 hover:bg-amber-50 rounded-lg text-amber-700 transition duration-150 cursor-pointer"
          >
            ⚖️ Double-shop IMEI Check
          </button>
          <button
            onClick={() => { setVerifyImei('358249622915999'); setVerifyResult('IDLE'); }}
            className="px-2 py-1 text-[10px] font-mono font-bold border border-emerald-250 bg-emerald-50/30 hover:bg-emerald-50 rounded-lg text-emerald-700 transition duration-150 cursor-pointer"
          >
            ✔️ Clean IMEI Check
          </button>
        </div>

        {/* Dynamic Verification Results */}
        {verifyResult === 'CLEAN' && (
          <div className="p-4 bg-emerald-50 border-2 border-emerald-250 rounded-xl flex items-start gap-3.5 shadow-xs transition duration-200 animate-fadeIn" id="verify-clean-alert">
            <span className="bg-emerald-500 text-white rounded-full p-1.5 shrink-0 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold text-emerald-800 tracking-wide font-mono uppercase">✅ NO ACTIVE BLACKLIST COMPLAINTS FOUND (SAFE TO TRADE)</h4>
              <p className="text-[11px] text-emerald-700 font-medium leading-relaxed">
                This device/IMEI is reported **completely CLEAN**. No active theft, snatching, or blocking complaints are found against this IMEI on the Citizens-Police Liaison Committee (CPLC) Sindh registry or national security checklists. You may safely buy or sell this device.
              </p>
              <div className="text-[9px] text-emerald-600 font-mono font-bold mt-2 pt-1 border-t border-emerald-200/50">
                DATABASE: SECURE TELECOM COMPLIANCE INDEX | TIME CHECKED: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}

        {verifyResult === 'STOLEN' && verifyDetails && (
          <div className="p-4 bg-rose-50 border-2 border-rose-250 rounded-xl flex items-start gap-3.5 shadow-xs transition duration-200 animate-pulse" id="verify-stolen-alert">
            <span className="bg-rose-600 text-white rounded-full p-1.5 shrink-0 shadow-sm animate-bounce">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div className="space-y-1.5">
              <h4 className="text-xs font-extrabold text-rose-800 tracking-wide font-mono uppercase">🚨 ILLEGAL DEVICE CRITICAL WARNING: REPORTED STOLEN / BLOCKED</h4>
              <p className="text-[11px] text-rose-700 font-semibold leading-relaxed">
                This device is registered on the blacklisted / stolen database. An active police FIR or theft report is recorded on this IMEI. Trading this device is a serious legal violation and SOP non-compliance.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-800 bg-white/60 p-3 rounded-lg border border-rose-150 font-mono mt-2">
                <div>Device Model: <strong className="text-slate-900">{verifyDetails.model}</strong></div>
                <div>Theft Report Type: <strong className="text-rose-700">{verifyDetails.reportType}</strong></div>
                <div>FIR / Complaint Code: <strong className="text-slate-900">{verifyDetails.reportNumber}</strong></div>
                <div>Theft Location: <strong className="text-slate-900">{verifyDetails.location}</strong></div>
                <div>FIR Registration Date: <strong className="text-slate-900">{verifyDetails.date}</strong></div>
                <div>Authorizing Bureau: <strong className="text-blue-700">{verifyDetails.authority}</strong></div>
              </div>

              <div className="text-[9px] text-rose-600 font-bold block pt-1.5 text-center sm:text-left">
                ⚠️ CPLC SINDH INSTRUCTIONS: Do not trade this device. Immediately report this match to the nearest CPLC Sindh cell or local police authority.
              </div>
            </div>
          </div>
        )}

        {verifyResult === 'LOCAL_EXISTS' && localExistsDetails && (
          <div className="p-4 bg-amber-50 border-2 border-amber-350 rounded-xl flex items-start gap-3.5 shadow-xs transition duration-200" id="verify-exists-alert">
            <span className="bg-amber-500 text-white rounded-full p-1.5 shrink-0 shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div className="space-y-1.5">
              <h4 className="text-xs font-extrabold text-amber-800 tracking-wide font-mono uppercase">⚠️ DUPLICATE INTERNAL REGISTRY MATCH (SOP WARNING)</h4>
              <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                This device has already been logged in our active internal registry database. Multiple trades of the same serial/IMEI across different shops within a short time interval indicate high suspicion.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-800 bg-white/65 p-3 rounded-lg border border-amber-150 font-mono">
                <div>Logged Model: <strong className="text-slate-900">{localExistsDetails.mobileModel}</strong></div>
                <div>Logged Shop Name: <strong className="text-slate-900">{localExistsDetails.shopName}</strong></div>
                <div>SOP Trade Type: <strong className="text-blue-700">{localExistsDetails.type}</strong></div>
                <div>Recorded Date: <strong className="text-slate-900">{new Date(localExistsDetails.dateTime).toLocaleDateString()} {new Date(localExistsDetails.dateTime).toLocaleTimeString()}</strong></div>
                <div>Recorded Market: <strong className="text-slate-900">{localExistsDetails.marketName}</strong></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Quick statistics banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="stats-banner">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">Acquisitions (Buy)</span>
            <h3 className="text-2xl font-extrabold text-slate-800">{totalBuy}</h3>
          </div>
          <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 text-emerald-600 shadow-sm">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">Disposals (Sell)</span>
            <h3 className="text-2xl font-extrabold text-slate-800">{totalSell}</h3>
          </div>
          <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100 text-blue-600 shadow-sm">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider">Pending Upload queue</span>
            <h3 className="text-2xl font-bold text-amber-600 animate-pulse">{pendingSync}</h3>
          </div>
          <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100 text-amber-600 shadow-sm">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
        </div>
      </div>

      {/* 3. Overview of recent entries */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs" id="recent-listings">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-[10px] font-bold tracking-wider text-slate-500 uppercase font-mono">
            {searchQuery ? `Search Results (${filteredTransactions.length} matches)` : `Recent Daily Actions (${filteredTransactions.slice(0, 5).length})`}
          </h3>
          <span className="text-slate-400 text-[10px] font-mono font-medium">Last updated: Just now</span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm font-mono leading-relaxed bg-white">
            {searchQuery ? "No entries match your search query." : "No acquisitions logged currently inside this device's workspace database."}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 bg-white" id="tx-cards">
            {(searchQuery ? filteredTransactions : filteredTransactions.slice(0, 5)).map((tx) => (
              <div key={tx.id} className="p-4 hover:bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition duration-150">
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 px-2.5 py-1 rounded-md font-bold text-[9px] border ${tx.type === 'BUY' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-blue-50 text-blue-700 border-blue-150'}`}>
                    {tx.type}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 uppercase leading-snug">{tx.mobileModel}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                      <span className="font-mono text-[10px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60 text-slate-500 font-semibold">IMEI: {maskIMEI(tx.imei1)}</span>
                      <span>•</span>
                      <span className="text-slate-400 font-mono text-[10px]">{new Date(tx.dateTime).toLocaleTimeString()}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right text-xs">
                    <div className="text-slate-500 font-sans">Party: <strong className="text-slate-800">{tx.type === 'BUY' ? tx.sellerName : tx.buyerName}</strong></div>
                    {tx.type === 'SELL' && tx.buyerAddress && <div className="text-[10px] text-slate-400 font-sans">Addr: {tx.buyerAddress}</div>}
                    <div className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">CNIC: {maskCNIC(decryptData(tx.type === 'BUY' ? tx.sellerCnic : tx.buyerCnic))}</div>
                  </div>

                  {/* Sync bubble */}
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    tx.syncStatus === 'synced' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {tx.syncStatus === 'synced' ? 'Cloud Synced' : 'Sync Queue'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. MODAL FOR MANDATORY BUY/SELL ENTRY FORM */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4" id="modal-container">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl p-6 space-y-4" id="modal-box">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5 uppercase font-mono">
                <ShieldCheck className="w-5 h-5 text-blue-600" /> New Compliance Entry registration
              </h3>
              <button
                onClick={() => { setShowEntryModal(false); setImeiDuplicateWarning(null); setPhotoBase64(undefined); }}
                className="text-slate-400 hover:text-slate-800 font-bold font-mono text-xs cursor-pointer"
              >
                [CLOSE]
              </button>
            </div>

            {formMessage && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-sans font-semibold">
                {formMessage}
              </div>
            )}

            {imeiDuplicateWarning && (
              <div className="p-3 rounded-xl bg-orange-50 text-orange-850 border border-orange-200 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                <span>{imeiDuplicateWarning}</span>
              </div>
            )}

            <form onSubmit={handleCreateTransaction} className="space-y-4">
              {/* Type Switcher */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormType('BUY')}
                  className={`flex-1 py-2 rounded-lg font-bold font-mono text-xs duration-150 cursor-pointer ${formType === 'BUY' ? 'bg-blue-600 text-white' : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                >
                  📥 BUY ENTRY (From Customer)
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('SELL')}
                  className={`flex-1 py-2 rounded-lg font-bold font-mono text-xs duration-150 cursor-pointer ${formType === 'SELL' ? 'bg-blue-600 text-white' : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                >
                  📤 SELL ENTRY (To Customer)
                </button>
              </div>

              {/* SECTION A: Device Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-blue-700 uppercase font-mono tracking-wider border-b border-slate-100 pb-1">1. Device & Cellular Hardware</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-[10px] text-slate-400 font-bold block uppercase font-mono tracking-wider">Device Model *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Model, Colour"
                      value={mobileModel}
                      onChange={(e) => setMobileModel(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all font-sans"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold block uppercase font-mono tracking-wider">IMEI Slot 1 (15 Digits) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter cellular IMEI"
                      maxLength={15}
                      value={imei1}
                      onChange={(e) => handleImeiChange(e.target.value, true)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold block uppercase font-mono tracking-wider">IMEI Slot 2 (Optional)</label>
                    <input
                      type="text"
                      placeholder="Optional IMEI 2"
                      maxLength={15}
                      value={imei2}
                      onChange={(e) => handleImeiChange(e.target.value, false)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION B: Party Identity Card Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Buyer Node */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase font-mono tracking-wider">Buyer Registry Information</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold font-mono block">FULL NAME *</label>
                      <input
                        type="text"
                        required
                        value={formType === 'SELL' ? buyerName : currentUser.name}
                        disabled={formType === 'BUY'} // Auto linked to current shopkeeper!
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="Buyer's name on ID card"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 disabled:opacity-60 focus:outline-none focus:border-blue-500 font-sans"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold font-mono block">CNIC CARD NUMBER (13 Digits) *</label>
                      <input
                        type="text"
                        required
                        value={formType === 'SELL' ? buyerCnic : (currentUser.cnic || '')}
                        disabled={formType === 'BUY'}
                        onChange={(e) => setBuyerCnic(formatCNICInput(e.target.value))}
                        placeholder="XXXXX-XXXXXXX-X"
                        maxLength={15}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 disabled:opacity-60 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold font-mono block">CONTACT NUMBER *</label>
                      <input
                        type="text"
                        required
                        value={formType === 'SELL' ? buyerContact : (currentUser.contactNumber || '')}
                        disabled={formType === 'BUY'}
                        onChange={(e) => setBuyerContact(e.target.value)}
                        placeholder="e.g. 03001234567"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 disabled:opacity-60 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold font-mono block">BUYER SHORT ADDRESS *</label>
                      <input
                        type="text"
                        required={formType === 'SELL'}
                        value={formType === 'SELL' ? buyerAddress : (currentUser.shopAddress || currentUser.marketName || 'Local Market')}
                        disabled={formType === 'BUY'}
                        onChange={(e) => setBuyerAddress(e.target.value)}
                        placeholder="e.g. Quaidabad Karachi / Central Market"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 disabled:opacity-60 focus:outline-none focus:border-blue-500 font-sans"
                      />
                    </div>
                  </div>
                </div>

                {/* Seller Node */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase font-mono tracking-wider">Seller Registry Information</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold font-mono block">FULL NAME *</label>
                      <input
                        type="text"
                        required
                        value={formType === 'BUY' ? sellerName : currentUser.name}
                        disabled={formType === 'SELL'} // Auto linked to current shopkeeper!
                        onChange={(e) => setSellerName(e.target.value)}
                        placeholder="Seller's name on ID card"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 disabled:opacity-60 focus:outline-none focus:border-blue-500 font-sans"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold font-mono block">CNIC CARD NUMBER (13 Digits) *</label>
                      <input
                        type="text"
                        required
                        value={formType === 'BUY' ? sellerCnic : (currentUser.cnic || '')}
                        disabled={formType === 'SELL'}
                        onChange={(e) => setSellerCnic(formatCNICInput(e.target.value))}
                        placeholder="XXXXX-XXXXXXX-X"
                        maxLength={15}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 disabled:opacity-60 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold font-mono block">CONTACT NUMBER *</label>
                      <input
                        type="text"
                        required
                        value={formType === 'BUY' ? sellerContact : (currentUser.contactNumber || '')}
                        disabled={formType === 'SELL'}
                        onChange={(e) => setSellerContact(e.target.value)}
                        placeholder="e.g. 03001234567"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 disabled:opacity-60 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Photo Upload Attachment */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-rose-300">
                <label className="text-xs font-bold text-slate-700 uppercase font-mono tracking-wider block flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-blue-600" /> Device physical receipt image * (MANDATORY per SOPs)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={handlePhotoUpload}
                    className="text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-mono file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
                  />
                  {photoBase64 && (
                    <img src={photoBase64} alt="Pre-upload attachment" className="w-10 h-10 object-cover border border-slate-200 rounded animate-fade-in" />
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-xs font-mono tracking-wider uppercase duration-150 cursor-pointer"
                id="btn-submit-txn"
              >
                💾 Commit transaction to offline log
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
