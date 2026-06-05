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
  X,
  Sparkles,
  Users
} from 'lucide-react';
import { db } from '../../offline/db';
import { syncEngine } from '../../sync/syncEngine';
import { Transaction, Shop, Market, AuditLog, AppUser, KmedaOfficer, KmedaGalleryItem } from '../../types';
import { DEFAULT_OFFICERS, DEFAULT_GALLERY_ITEMS } from '../auth/AuthModule';
import { encryptData, decryptData, maskCNIC, maskIMEI, validateAndCleanCNIC, formatCNICInput } from '../../utils/security';
import ImeiVerifyPortal from '../../components/ImeiVerifyPortal';

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

  // Portal Customization States
  const [officers, setOfficers] = useState<KmedaOfficer[]>([]);
  const [galleryItems, setGalleryItems] = useState<KmedaGalleryItem[]>([]);
  
  // Officer form states
  const [editingOfficer, setEditingOfficer] = useState<KmedaOfficer | null>(null);
  const [offName, setOffName] = useState('');
  const [offNameUrdu, setOffNameUrdu] = useState('');
  const [offDesignation, setOffDesignation] = useState('');
  const [offDesignationUrdu, setOffDesignationUrdu] = useState('');
  const [offContact, setOffContact] = useState('');
  const [offStatus, setOffStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Gallery form states
  const [editingGallery, setEditingGallery] = useState<KmedaGalleryItem | null>(null);
  const [galTitle, setGalTitle] = useState('');
  const [galTitleUrdu, setGalTitleUrdu] = useState('');
  const [galImageUrl, setGalImageUrl] = useState('');
  const [galDescription, setGalDescription] = useState('');
  const [galDescriptionUrdu, setGalDescriptionUrdu] = useState('');

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

    try {
      let localOfficers = await db.getConfig<KmedaOfficer[]>('kmeda_officers');
      if (!localOfficers || localOfficers.length === 0) {
        localOfficers = DEFAULT_OFFICERS;
        await db.setConfig('kmeda_officers', DEFAULT_OFFICERS);
      }
      setOfficers(localOfficers);
    } catch (e) {
      console.error("Failed loading customization officers:", e);
    }

    try {
      let localGallery = await db.getConfig<KmedaGalleryItem[]>('kmeda_gallery');
      if (!localGallery || localGallery.length === 0) {
        localGallery = DEFAULT_GALLERY_ITEMS;
        await db.setConfig('kmeda_gallery', DEFAULT_GALLERY_ITEMS);
      }
      setGalleryItems(localGallery);
    } catch (e) {
      console.error("Failed loading customization gallery:", e);
    }

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
      setStolenSuccessMessage("Success: New snatched / stolen mobile record registered globally.");
      
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

  // Portal Customization Actions
  const handleSaveOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offName || !offDesignation || !offContact) {
      alert("Please enter Name, Designation and Phone Number.");
      return;
    }

    try {
      let updatedOfficers = [...officers];
      if (editingOfficer) {
        // Update
        updatedOfficers = updatedOfficers.map(o => o.id === editingOfficer.id ? {
          ...o,
          name: offName,
          nameUrdu: offNameUrdu || undefined,
          designation: offDesignation,
          designationUrdu: offDesignationUrdu || undefined,
          contactNumber: offContact,
          status: offStatus
        } : o);
        setDashboardMessage(`Officer ${offName} updated successfully.`);
      } else {
        // Create
        const newOff: KmedaOfficer = {
          id: `off-${Math.random().toString(36).substr(2, 9)}`,
          name: offName,
          nameUrdu: offNameUrdu || undefined,
          designation: offDesignation,
          designationUrdu: offDesignationUrdu || undefined,
          contactNumber: offContact,
          status: offStatus
        };
        updatedOfficers.push(newOff);
        setDashboardMessage(`Officer ${offName} registered successfully.`);
      }

      await db.setConfig('kmeda_officers', updatedOfficers);
      setEditingOfficer(null);
      setOffName('');
      setOffNameUrdu('');
      setOffDesignation('');
      setOffDesignationUrdu('');
      setOffContact('');
      setOffStatus('ACTIVE');
      await fetchGlobalDatabase();
    } catch (err) {
      console.error(err);
      alert("Failed to save officer data.");
    }
  };

  const handleEditOfficerClick = (off: KmedaOfficer) => {
    setEditingOfficer(off);
    setOffName(off.name);
    setOffNameUrdu(off.nameUrdu || '');
    setOffDesignation(off.designation);
    setOffDesignationUrdu(off.designationUrdu || '');
    setOffContact(off.contactNumber);
    setOffStatus(off.status);
  };

  const handleDeleteOfficer = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this cabinet officer?")) {
      return;
    }
    try {
      const updated = officers.filter(o => o.id !== id);
      await db.setConfig('kmeda_officers', updated);
      setDashboardMessage("Officer deleted.");
      await fetchGlobalDatabase();
    } catch (err) {
      console.error(err);
    }
  };

  // Gallery Management
  const handleSaveGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galTitle || !galImageUrl || !galDescription) {
      alert("Please enter Gallery Title, Image URL, and Description.");
      return;
    }

    try {
      let updatedGallery = [...galleryItems];
      if (editingGallery) {
        // Update
        updatedGallery = updatedGallery.map(g => g.id === editingGallery.id ? {
          ...g,
          title: galTitle,
          titleUrdu: galTitleUrdu || undefined,
          imageUrl: galImageUrl,
          description: galDescription,
          descriptionUrdu: galDescriptionUrdu || undefined
        } : g);
        setDashboardMessage("Gallery item updated.");
      } else {
        // Create
        const newItem: KmedaGalleryItem = {
          id: `gal-${Math.random().toString(36).substr(2, 9)}`,
          title: galTitle,
          titleUrdu: galTitleUrdu || undefined,
          imageUrl: galImageUrl,
          description: galDescription,
          descriptionUrdu: galDescriptionUrdu || undefined,
          createdAt: new Date().toISOString()
        };
        updatedGallery.push(newItem);
        setDashboardMessage("Gallery item created.");
      }

      await db.setConfig('kmeda_gallery', updatedGallery);
      setEditingGallery(null);
      setGalTitle('');
      setGalTitleUrdu('');
      setGalImageUrl('');
      setGalDescription('');
      setGalDescriptionUrdu('');
      await fetchGlobalDatabase();
    } catch (err) {
      console.error(err);
      alert("Failed to save gallery item.");
    }
  };

  const handleEditGalleryClick = (item: KmedaGalleryItem) => {
    setEditingGallery(item);
    setGalTitle(item.title);
    setGalTitleUrdu(item.titleUrdu || '');
    setGalImageUrl(item.imageUrl);
    setGalDescription(item.description);
    setGalDescriptionUrdu(item.descriptionUrdu || '');
  };

  const handleDeleteGalleryItem = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this photo gallery item?")) {
      return;
    }
    try {
      const updated = galleryItems.filter(g => g.id !== id);
      await db.setConfig('kmeda_gallery', updated);
      setDashboardMessage("Gallery item removed successfully.");
      await fetchGlobalDatabase();
    } catch (err) {
      console.error(err);
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

        <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 pb-12" id="super-incident-centered-form">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">
              Global Incident Registry File
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
              <label className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider font-sans">Registry Category *</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStolenStatus('SNATCHED')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${stolenStatus === 'SNATCHED' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                >
                  Snatched
                </button>
                <button
                  type="button"
                  onClick={() => setStolenStatus('STOLEN')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${stolenStatus === 'STOLEN' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                >
                  Stolen
                </button>
              </div>
            </div>

            {/* Brand / Model / IMEIs */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-sans">Brand *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apple"
                  value={stolenBrand}
                  onChange={(e) => setStolenBrand(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 font-medium text-slate-805 replace-placeholder focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-sans">Model *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. iPhone 15"
                  value={stolenModel}
                  onChange={(e) => setStolenModel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 font-medium text-slate-805 replace-placeholder focus:outline-none focus:bg-white focus:border-blue-500"
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
                className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 font-mono tracking-widest font-bold text-slate-850 focus:outline-none focus:bg-white focus:border-blue-500"
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
                className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 font-mono tracking-widest text-slate-805 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            {/* Owner Identity */}
            <div className="border-t border-slate-100 pt-3">
              <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider mb-2">Complainant Information</p>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-sans">Complainant *</label>
                    <input
                      type="text"
                      required
                      placeholder="Name of owner"
                      value={stolenOwnerName}
                      onChange={(e) => setStolenOwnerName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-slate-805 focus:outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-sans">Contact No *</label>
                    <input
                      type="text"
                      required
                      placeholder="Phone contact"
                      value={stolenOwnerContact}
                      onChange={(e) => setStolenOwnerContact(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 font-mono text-slate-805 focus:outline-none focus:bg-white focus:border-blue-500"
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
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 font-mono text-slate-855 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Legal Information */}
            <div className="border-t border-slate-100 pt-3">
              <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider mb-2">Legal FIR Coordinates</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-sans">FIR No.</label>
                  <input
                    type="text"
                    placeholder="e.g. 998/2026"
                    value={stolenFir}
                    onChange={(e) => setStolenFir(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-slate-805 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-550 font-bold block uppercase tracking-wider font-sans">Incident Date *</label>
                  <input
                    type="date"
                    required
                    value={stolenDate}
                    onChange={(e) => setStolenDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 text-slate-850 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="space-y-1 mt-2">
                <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-sans">Police Station Jurisdiction</label>
                <input
                  type="text"
                  placeholder="e.g. Clifton PS, Defence PS"
                  value={stolenPS}
                  onChange={(e) => setStolenPS(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2 text-slate-850 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs uppercase font-sans tracking-wider duration-150 cursor-pointer text-center border border-rose-500/10 shadow-sm"
            >
              Log Snatched Record File
            </button>
          </form>
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

  if (activeTab === 'super-customization') {
    return (
      <div className="space-y-8 animate-fadeIn" id="super-customization-scope">
        {/* Header Title */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold uppercase tracking-wider flex items-center gap-2 font-mono">
              <Sparkles className="w-5 h-5 text-indigo-200" /> Public Portal Customization Hub
            </h2>
            <p className="text-xs text-indigo-100 leading-normal max-w-xl">
              Dynamically design the public landing page. Modify executive cabinet members, update names (like Zia Mehsood), and upload verified compliance photos or activity highlights.
            </p>
          </div>
          <span className="bg-white/10 border border-white/20 text-white px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest">
            PORTAL DESIGN
          </span>
        </div>

        {dashboardMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl text-xs font-sans font-semibold">
            {dashboardMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* SECTION 1: CABIN OFFICERS MANAGEMENT */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-105 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-indigo-650" /> Cabinet Representative Officers
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Add, update, or deactivate members of the regulatory committee displayed on the landing page and emergency dialers.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveOfficer} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-4 text-xs font-sans">
              <h4 className="font-bold text-slate-800 uppercase text-[10.5px] border-b border-slate-205 pb-1 font-mono">
                {editingOfficer ? "✏️ Edit Officer / عہدیدار کی ترمیم کریں" : "➕ Add New Liaison Officer / نیا عہدیدار شامل کریں"}
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Officer Name (English) *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Zia Khan Mehsood"
                    value={offName}
                    onChange={(e) => setOffName(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-550 font-bold uppercase block text-right font-sans" dir="rtl">نام (اردو)</label>
                  <input 
                    type="text" 
                    placeholder="مثال: ضیاء خان محسود"
                    value={offNameUrdu}
                    onChange={(e) => setOffNameUrdu(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg px-3 py-2 text-slate-800 text-xs text-right focus:outline-none focus:border-blue-500 font-sans"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Designation (English) *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. President Market Saddar"
                    value={offDesignation}
                    onChange={(e) => setOffDesignation(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-550 font-bold uppercase block text-right font-sans" dir="rtl">عہدہ (اردو)</label>
                  <input 
                    type="text" 
                    placeholder="مثال: صدر مارکیٹ صدر"
                    value={offDesignationUrdu}
                    onChange={(e) => setOffDesignationUrdu(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg px-3 py-2 text-slate-800 text-xs text-right focus:outline-none focus:border-blue-500 font-sans"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-550 font-bold uppercase">Contact Phone *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. 0333-2819389"
                    value={offContact}
                    onChange={(e) => setOffContact(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Operational Status</label>
                  <select 
                    value={offStatus}
                    onChange={(e) => setOffStatus(e.target.value as any)}
                    className="w-full bg-white border border-slate-250 rounded-lg px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="ACTIVE">🟢 Active representative</option>
                    <option value="INACTIVE">🔴 Inactive representative</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold font-mono uppercase tracking-wider text-[10.5px] transition cursor-pointer"
                >
                  {editingOfficer ? "Update Officer Profile" : "Add Officer Register"}
                </button>
                {editingOfficer && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingOfficer(null);
                      setOffName('');
                      setOffNameUrdu('');
                      setOffDesignation('');
                      setOffDesignationUrdu('');
                      setOffContact('');
                      setOffStatus('ACTIVE');
                    }}
                    className="px-3 bg-slate-200 hover:bg-slate-350 text-slate-700 rounded-lg font-bold font-mono uppercase text-[10.5px] cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* List */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Current Representatives List</h4>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                {officers && officers.length > 0 ? (
                  officers.map(off => (
                    <div key={off.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 font-sans">{off.name}</strong>
                          {off.nameUrdu && <span className="text-indigo-700 font-bold font-sans text-[11px]">({off.nameUrdu})</span>}
                          <span className={`px-1.5 py-0.2 rounded text-[7.5px] uppercase font-bold ${off.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' : 'bg-slate-100 text-slate-500'}`}>
                            {off.status}
                          </span>
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {off.designation} {off.designationUrdu ? `• ${off.designationUrdu}` : ''}
                        </div>
                        <div className="text-slate-400 font-mono text-[9.5px] mt-0.5">
                          Dialer Hotline: {off.contactNumber}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button 
                          onClick={() => handleEditOfficerClick(off)}
                          className="p-1 px-2 text-[10px] uppercase font-bold font-mono bg-indigo-50 border border-indigo-150 text-indigo-700 rounded hover:bg-indigo-100 cursor-pointer"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteOfficer(off.id)}
                          className="p-1 px-2 text-[10px] uppercase font-bold font-mono bg-rose-50 border border-rose-150 text-rose-700 rounded hover:bg-rose-100 cursor-pointer"
                        >
                          Del
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-center py-6">No representatives registered.</p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: COMPLIANCE GALLERY MANAGEMENT */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-105 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-blue-600" /> Compliance Incident Gallery
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Add or manage public event pictures showing recovery handover and SOP merchant enforcement campaigns.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveGalleryItem} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-4 text-xs font-sans">
              <h4 className="font-bold text-slate-800 uppercase text-[10.5px] border-b border-slate-205 pb-1 font-mono">
                {editingGallery ? "✏️ Edit Gallery Photo / گیلری ترمیم کریں" : "➕ Upload Gallery Photo / نئی تصویر اپلوڈ کریں"}
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Photo Title (English) *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Device Recovery Handover"
                    value={galTitle}
                    onChange={(e) => setGalTitle(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-550 font-bold block uppercase text-right font-sans" dir="rtl">عنوان (اردو)</label>
                  <input 
                    type="text" 
                    placeholder="مثال: موبائل واپسی تقریب"
                    value={galTitleUrdu}
                    onChange={(e) => setGalTitleUrdu(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg px-3 py-2 text-slate-800 text-xs text-right focus:outline-none focus:border-blue-500"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-550 font-bold uppercase">Image Address (URL or Base64) *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="https://picsum.photos/seed/kmeda-handover/800/600"
                  value={galImageUrl}
                  onChange={(e) => setGalImageUrl(e.target.value)}
                  className="w-full bg-white border border-slate-250 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs focus:outline-none focus:border-blue-500"
                />
                
                {/* Visual template helpers */}
                <div className="pt-1 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[9px] text-slate-400 font-semibold uppercase">Quick Image presets:</span>
                  <button 
                    type="button"
                    onClick={() => setGalImageUrl("https://picsum.photos/seed/kmeda-ceremony/800/600")}
                    className="text-[9px] font-mono font-bold bg-white border border-slate-200 px-1.5 py-0.5 rounded text-indigo-705 hover:bg-slate-100 cursor-pointer"
                  >
                    Handover Ceremony
                  </button>
                  <button 
                    type="button"
                    onClick={() => setGalImageUrl("https://picsum.photos/seed/kmeda-meeting1/800/600")}
                    className="text-[9px] font-mono font-bold bg-white border border-slate-200 px-1.5 py-0.5 rounded text-indigo-705 hover:bg-slate-100 cursor-pointer"
                  >
                    Merchant SOP Forum
                  </button>
                  <button 
                    type="button"
                    onClick={() => setGalImageUrl("https://picsum.photos/seed/kmeda-techinspection/800/600")}
                    className="text-[9px] font-mono font-bold bg-white border border-slate-200 px-1.5 py-0.5 rounded text-indigo-705 hover:bg-slate-100 cursor-pointer"
                  >
                    IT Inspection Room
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Description (English) *</label>
                  <textarea 
                    required 
                    rows={2}
                    placeholder="Short summary of compliance inspection or handover details..."
                    value={galDescription}
                    onChange={(e) => setGalDescription(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-550 font-bold block uppercase text-right font-sans" dir="rtl">تفصیل (اردو)</label>
                  <textarea 
                    rows={2}
                    placeholder="تفصیل اردو میں تحریر کریں..."
                    value={galDescriptionUrdu}
                    onChange={(e) => setGalDescriptionUrdu(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg px-3 py-2 text-slate-800 text-xs text-right focus:outline-none focus:border-blue-500"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold font-mono uppercase tracking-wider text-[10.5px] transition cursor-pointer"
                >
                  {editingGallery ? "Update Event Photo" : "Commit to Portal Gallery"}
                </button>
                {editingGallery && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingGallery(null);
                      setGalTitle('');
                      setGalTitleUrdu('');
                      setGalImageUrl('');
                      setGalDescription('');
                      setGalDescriptionUrdu('');
                    }}
                    className="px-3 bg-slate-200 hover:bg-slate-350 text-slate-700 rounded-lg font-bold font-mono uppercase text-[10.5px] cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* List */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Current Photos list</h4>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {galleryItems && galleryItems.length > 0 ? (
                  galleryItems.map(item => (
                    <div key={item.id} className="p-3 bg-slate-50/70 border border-slate-200/50 rounded-xl flex gap-3 text-xs">
                      <div className="w-16 h-12 bg-slate-200 rounded-lg overflow-hidden shrink-0">
                        <img 
                          src={item.imageUrl} 
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-1">
                          <strong className="text-slate-900 truncate block">{item.title}</strong>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => handleEditGalleryClick(item)}
                              className="text-[9.5px] uppercase font-mono font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteGalleryItem(item.id)}
                              className="text-[9.5px] uppercase font-mono font-bold text-rose-600 hover:underline cursor-pointer"
                            >
                              Del
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-450 truncate mt-0.5">{item.description}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-center py-6">No gallery items uploaded.</p>
                )}
              </div>
            </div>
          </div>
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

      {/* 2. Analytical widgets - Figma Medical style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5" id="national-stats-strip">
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-slate-450 font-bold font-sans block tracking-tight">Secondary Markets</span>
              <h3 className="text-xl font-black text-slate-900 mt-1">{allMarkets.length} Labs</h3>
            </div>
            <div className="bg-blue-500/10 text-blue-600 p-2.5 rounded-xl border border-blue-50/50 shrink-0">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100/60 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Registered Hubs</span>
          </div>
        </div>
        
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-slate-450 font-bold font-sans block tracking-tight">Active Merchants</span>
              <h3 className="text-xl font-black text-slate-900 mt-1">{allShops.filter(s => s.status === 'APPROVED').length} Approved</h3>
            </div>
            <div className="bg-emerald-500/10 text-emerald-600 p-2.5 rounded-xl border border-emerald-50/50 shrink-0">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100/60 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Compliant Retailers</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-slate-450 font-bold font-sans block tracking-tight">Device Transactions</span>
              <h3 className="text-xl font-black text-slate-900 mt-1">{allTransactions.length} Trades</h3>
            </div>
            <div className="bg-purple-500/10 text-purple-600 p-2.5 rounded-xl border border-purple-50/50 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100/60 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Secure Logs Sync</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-slate-450 font-bold font-sans block tracking-tight">Blacklisted Index</span>
              <h3 className="text-xl font-black text-rose-600 mt-1">{reportedMobilesList.length} Units</h3>
            </div>
            <div className="bg-rose-500/10 text-rose-600 p-2.5 rounded-xl border border-rose-50/50 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100/60 flex items-center justify-between">
            <span className="text-[10px] text-rose-500 font-bold font-sans uppercase">CPLC Flagged Alerts</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-slate-450 font-bold font-sans block tracking-tight">Forensic Flags</span>
              <h3 className={`text-xl font-black mt-1 ${duplicateImeis.length > 0 ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}`}>
                {duplicateImeis.length} Alerts
              </h3>
            </div>
            <div className="bg-amber-500/10 text-amber-600 p-2.5 rounded-xl border border-amber-50/50 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100/60 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Double-Shop Check</span>
          </div>
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

      {/* Search & Verification Portal */}
      <ImeiVerifyPortal />

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
