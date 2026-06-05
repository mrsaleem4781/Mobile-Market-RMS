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
import ImeiVerifyPortal from '../../components/ImeiVerifyPortal';

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

  // CPLC & Police Verification Checker States (Handled inside ImeiVerifyPortal)

  // Stolen Device Report Registry States
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
  const [stolenStatus, setStolenStatus] = useState<'STOLEN' | 'SNATCHED'>('SNATCHED');
  const [stolenMessage, setStolenMessage] = useState<string | null>(null);
  const [stolenSuccessMessage, setStolenSuccessMessage] = useState<string | null>(null);
  const [reportedMobilesList, setReportedMobilesList] = useState<any[]>([]);

  const fetchReportedMobilesList = async () => {
    try {
      const list = await db.reportedMobiles.toArray();
      setReportedMobilesList(list.reverse());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'merchant-reported') {
      fetchReportedMobilesList();
    }
  }, [activeTab]);

  const handleReportStolenMobile = async (e: React.FormEvent) => {
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
        status: stolenStatus
      };

      await db.reportedMobiles.put(newReport);
      setStolenSuccessMessage("✔️ Success: Mobile theft / snatching incident recorded successfully.");
      
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
      
      fetchReportedMobilesList();
    } catch (err) {
      setStolenMessage("Failed to register database record.");
    }
  };

  // Removed duplicate IMEI verify handler - encapsulated in ImeiVerifyPortal

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
      // 1. Check if IMEI is registered in snatched/stolen database
      const matchedReported = await db.reportedMobiles
        .where('imei1')
        .equals(cleaned)
        .or('imei2')
        .equals(cleaned)
        .first();

      if (matchedReported) {
        setImeiDuplicateWarning(`🚨 POLICE & CPLC CRITICAL CHECK Match: This device (IMEI ${cleaned}) is registered in the Security Database as ${matchedReported.status}! Owner: ${matchedReported.ownerName}, FIR: ${matchedReported.firNumber || 'N/A'}. DO NOT PURCHASE OR SELL!`);
        return;
      }

      // 2. Check existing transactions
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

  if (activeTab === 'merchant-reported') {
    return (
      <div className="space-y-6 animate-fadeIn" id="reported-scope">
        <div className="bg-gradient-to-r from-rose-500 to-rose-700 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold uppercase tracking-wider flex items-center gap-2 font-mono">
              <AlertTriangle className="w-5 h-5 text-white animate-pulse" /> Snatched & Stolen Mobile Registry
            </h2>
            <p className="text-xs text-rose-100 leading-normal max-w-xl">
              Report new stolen or snatched mobile phone records directly to the registry database. These IMEIs are instantly blocked across the system to prevent illegal buy and sell activities.
            </p>
          </div>
          <span className="bg-white/10 border border-white/20 text-white px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold self-start md:self-auto uppercase tracking-widest">
            REGULATOR PORTAL
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
          {/* Section 1: Record a Report Form (5 Cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-800 font-mono uppercase tracking-wider flex items-center gap-1.5">
                ⚖️ Record Theft Incident File
              </h3>
            </div>

            {stolenMessage && (
              <div className="p-3 bg-rose-50 text-rose-800 border-l-4 border-rose-500 text-[11px] font-medium rounded-lg animate-shake">
                {stolenMessage}
              </div>
            )}

            {stolenSuccessMessage && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500 text-[11px] font-medium rounded-lg">
                {stolenSuccessMessage}
              </div>
            )}

            <form onSubmit={handleReportStolenMobile} className="space-y-4 text-xs">
              {/* Type toggle status */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider font-mono">Incident Status *</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStolenStatus('SNATCHED')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold font-mono transition-colors cursor-pointer ${stolenStatus === 'SNATCHED' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-50 border border-slate-205 text-slate-600 hover:bg-slate-100'}`}
                  >
                    🚨 SNATCHED (Robbery)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStolenStatus('STOLEN')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold font-mono transition-colors cursor-pointer ${stolenStatus === 'STOLEN' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-50 border border-slate-205 text-slate-600 hover:bg-slate-100'}`}
                  >
                    ⚠️ STOLEN (Theft/Lost)
                  </button>
                </div>
              </div>

              {/* Brand & Model */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-mono">Brand *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Samsung, Apple"
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
                    placeholder="e.g. S24, iPhone 15"
                    value={stolenModel}
                    onChange={(e) => setStolenModel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              {/* IMEI 1 and 2 */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold block font-mono uppercase tracking-wider">Primary IMEI (14-15 Digits) *</label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  placeholder="Enter primary electronic IMEI"
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
                  placeholder="Enter secondary IMEI if available"
                  value={stolenImei2}
                  onChange={(e) => setStolenImei2(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 font-mono tracking-widest text-slate-850 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="border-t border-slate-100 pt-3 shrink-0">
                <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider mb-2">Owner Identity Credentials</p>
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-mono">Owner Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Name on CNIC card"
                        value={stolenOwnerName}
                        onChange={(e) => setStolenOwnerName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-mono">Owner Phone *</label>
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
                    <label className="text-[10px] text-slate-500 font-bold block font-mono uppercase tracking-wider">Owner CNIC Number *</label>
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

              <div className="border-t border-slate-100 pt-3 shrink-0">
                <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider mb-2">Legal Incident Records</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-mono">FIR / Diary No.</label>
                    <input
                      type="text"
                      placeholder="e.g. 104/26"
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
                <div className="space-y-1 mt-2.5">
                  <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-mono">Police Station Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Saddar PS, Quaidabad PS"
                    value={stolenPS}
                    onChange={(e) => setStolenPS(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs uppercase font-mono tracking-wider duration-150 cursor-pointer text-center shadow-md hover:shadow-lg"
              >
                🚨 Log Incident & Synchronize
              </button>
            </form>
          </div>

          {/* Section 2: Active Stolen Registry (7 Cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2.5 flex justify-between items-center gap-4">
                <h3 className="text-xs font-bold text-slate-800 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  📁 Active Snatched Registry List ({reportedMobilesList.length})
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold font-mono uppercase">REGULATORY CONTROL</span>
              </div>

              {reportedMobilesList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-mono text-xs">
                  No active snatching reports recorded inside the registry database currently.
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[640px] overflow-y-auto pr-1">
                  {reportedMobilesList.map((rep) => (
                    <div key={rep.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50/80 transition-all duration-150 space-y-2.5">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                            <span>{rep.brand} {rep.model}</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-mono tracking-wider uppercase font-bold border ${rep.status === 'SNATCHED' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                              {rep.status}
                            </span>
                          </h4>
                          <p className="text-[10px] text-slate-500 font-mono mt-1 leading-none">
                            IMEI One: <span className="font-bold text-slate-800">{rep.imei1}</span>
                            {rep.imei2 && <span> | IMEI Two: <span className="font-bold text-slate-800">{rep.imei2}</span></span>}
                          </p>
                        </div>
                        <span className="text-[9.5px] text-slate-400 font-mono font-bold">{new Date(rep.reportedAt).toLocaleDateString()}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700 bg-white border border-slate-200/60 rounded-xl p-3 font-medium">
                        <div>Owner: <strong className="text-slate-900">{rep.ownerName}</strong></div>
                        <div>CNIC: <strong className="text-slate-900">{maskCNIC(rep.ownerCnic)}</strong></div>
                        <div>Contact: <strong className="text-slate-900 font-mono">{rep.ownerContact}</strong></div>
                        <div>Police Stn: <strong className="text-rose-700">{rep.policeStation || 'N/A'} PS</strong></div>
                      </div>

                      {rep.firNumber && (
                        <div className="text-[10px] bg-rose-50/50 border border-rose-100 rounded-lg px-3 py-1.5 text-rose-800 font-mono flex flex-col sm:flex-row justify-between gap-1">
                          <span>FIR REPORT SYSTEM CODE: <strong className="font-bold">{rep.firNumber}</strong></span>
                          <span>INCIDENT DATE: <strong className="font-bold">{rep.incidentDate}</strong></span>
                        </div>
                      )}

                      <div className="text-[9px] text-slate-400 font-mono font-bold text-right uppercase">
                        Scribe Log: {rep.reportedByName} ({rep.id})
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

      {/* CPLC Sindh Stolen Device Checker */}
      <ImeiVerifyPortal />

      {/* 2. Quick statistics banner - Clean Figma Medicare Style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6" id="stats-banner">
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl flex items-center justify-between shadow-xs hover:shadow-md transition">
          <div className="space-y-1.5">
            <span className="text-xs text-slate-450 font-bold block tracking-tight">Total Acquisitions (Buy)</span>
            <h3 className="text-3xl font-black text-slate-900 leading-none">{totalBuy}</h3>
          </div>
          <div className="bg-emerald-500/10 text-emerald-600 h-14 w-14 rounded-2xl flex items-center justify-center border border-emerald-50 shadow-xs shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald-650" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl flex items-center justify-between shadow-xs hover:shadow-md transition">
          <div className="space-y-1.5">
            <span className="text-xs text-slate-450 font-bold block tracking-tight">Total Disposals (Sell)</span>
            <h3 className="text-3xl font-black text-slate-900 leading-none">{totalSell}</h3>
          </div>
          <div className="bg-blue-500/10 text-blue-600 h-14 w-14 rounded-2xl flex items-center justify-center border border-blue-50 shadow-xs shrink-0">
            <TrendingDown className="w-6 h-6 text-blue-655" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl flex items-center justify-between shadow-xs hover:shadow-md transition">
          <div className="space-y-1.5">
            <span className="text-xs text-slate-450 font-bold block tracking-tight">Pending Sync Queue</span>
            <h3 className="text-3xl font-black text-amber-600 leading-none {pendingSync > 0 ? 'animate-pulse' : ''}">{pendingSync}</h3>
          </div>
          <div className="bg-amber-500/10 text-amber-600 h-14 w-14 rounded-2xl flex items-center justify-center border border-amber-55/70 shadow-xs shrink-0">
            <Clock className={`w-6 h-6 text-amber-600 ${pendingSync > 0 ? 'animate-pulse' : ''}`} />
          </div>
        </div>
      </div>

      {/* 3. Overview of recent entries */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs" id="recent-listings">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="space-y-0.5">
            <h3 className="text-[10px] font-bold tracking-wider text-slate-500 uppercase font-mono">
              {searchQuery ? `Search Results (${filteredTransactions.length} matches)` : `Recent Daily Actions (${filteredTransactions.slice(0, 5).length})`}
            </h3>
            <span className="text-slate-400 text-[10px] font-mono font-medium block">Last updated: Just now</span>
          </div>

          {/* Compact Local Entry Filter Bar */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search local transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-205 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-sans"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1.5 p-0.5 text-xs text-slate-400 hover:text-slate-650 font-black cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
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
