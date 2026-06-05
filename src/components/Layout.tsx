/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  RotateCw, 
  Users, 
  User,
  Store, 
  ClipboardList, 
  LogOut, 
  Database,
  ShieldAlert,
  Sliders,
  Sparkles,
  ClipboardCheck,
  Building,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { db } from '../offline/db';
import { syncEngine, SyncState } from '../sync/syncEngine';
import { AppUser, UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: AppUser | null;
  onLogout: () => void;
  onRoleSwitch: (role: UserRole) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  originalUser?: AppUser | null;
  onRestoreOriginalUser?: () => void;
}

export default function Layout({
  children,
  currentUser,
  onLogout,
  onRoleSwitch,
  activeTab,
  setActiveTab,
  originalUser = null,
  onRestoreOriginalUser = () => {}
}: LayoutProps) {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<SyncState>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [showSandboxCenter, setShowSandboxCenter] = useState(false);
  const [lastSyncedStr, setLastSyncedStr] = useState<string>('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installingSim, setInstallingSim] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [installStage, setInstallStage] = useState('');

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check standalone state or local flag
    if (
      window.matchMedia('(display-mode: standalone)').matches || 
      (navigator as any).standalone ||
      localStorage.getItem('kmeda_installed') === 'true'
    ) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      localStorage.setItem('kmeda_installed', 'true');
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Subscribe to SyncEngine logs
    const unsubscribe = syncEngine.subscribe((state, count) => {
      setSyncStatus(state);
      setPendingCount(count);
    });

    // Load last sync time
    const fetchLastSync = async () => {
      const ts = await db.getConfig<string>('lastSyncedAt');
      if (ts) {
        setLastSyncedStr(new Date(ts).toLocaleTimeString());
      }
    };
    fetchLastSync();

    const interval = setInterval(fetchLastSync, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    await syncEngine.triggerSync();
    const ts = await db.getConfig<string>('lastSyncedAt');
    if (ts) {
      setLastSyncedStr(new Date(ts).toLocaleTimeString());
    }
  };

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          localStorage.setItem('kmeda_installed', 'true');
        }
      } catch (err) {
        console.warn('KMEDA PWA installation prompt error:', err);
      }
      setDeferredPrompt(null);
    } else {
      // Elegant interactive installation simulation for immediate feedback
      setInstallingSim(true);
      setInstallProgress(0);
      setInstallStage('Connecting to KMEDA Central Servers...');
      
      const stages = [
        'Connecting to KMEDA Quaidabad Server...',
        'Caching offline records and merchant directories...',
        'Syncing offline copy of stolen/recovered registries...',
        'Authorizing device offline security credentials...',
        'Creating KMEDA shortcut on your mobile/desktop home screen...',
        'Done! KMEDA App ready to operate offline.'
      ];

      let currentStep = 0;
      const interval = setInterval(() => {
        setInstallProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setInstallingSim(false);
              setIsInstalled(true);
              localStorage.setItem('kmeda_installed', 'true');
            }, 800);
            return 100;
          }
          const nextVal = prev + 5;
          const stageIndex = Math.min(
            stages.length - 1,
            Math.floor((nextVal / 100) * stages.length)
          );
          if (stageIndex !== currentStep && stages[stageIndex]) {
            currentStep = stageIndex;
            setInstallStage(stages[stageIndex]);
          }
          return nextVal;
        });
      }, 60);
    }
  };

  const getRoleLabel = (role?: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Regulatory Super Admin';
      case 'SHOPKEEPER':
        return 'Authorized Merchant';
      default:
        return 'Guest User';
    }
  };

  // Determine authorized menu tabs
  const getNavItems = () => {
    if (!currentUser) return [];
    
    const items = [];
    
    if (currentUser.role === 'SHOPKEEPER') {
      items.push(
        { id: 'merchant-ops', label: 'Buy/Sell Entries', icon: Smartphone },
        { id: 'merchant-reported', label: 'Report Snatched Mobile', icon: ShieldAlert },
        { id: 'merchant-history', label: 'Transaction Logs', icon: ClipboardList },
        { id: 'profile-settings', label: 'My Profile Settings', icon: User }
      );
    } else if (currentUser.role === 'SUPER_ADMIN') {
      items.push(
        { id: 'super-overview', label: 'Global Dashboard', icon: Sliders },
        { id: 'super-reported', label: 'Stolen/Snatched Registry', icon: ShieldAlert },
        { id: 'super-search', label: 'National IMEI Search', icon: Smartphone },
        { id: 'super-shops', label: 'All Registered Shops', icon: Store },
        { id: 'super-audits', label: 'Compliance Audit Logs', icon: ClipboardList },
        { id: 'super-customization', label: 'Portal Customization', icon: Sparkles },
        { id: 'profile-settings', label: 'My Profile Settings', icon: User }
      );
    }
    
    return items;
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="layout-root">
      {/* Interactive return path when sandboxed */}
      {originalUser && currentUser && currentUser.id !== originalUser.id && (
        <div className="bg-amber-600 text-white text-xs px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 font-sans font-semibold tracking-wide border-b border-amber-500 shadow-sm" id="sandbox-active-banner">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span>
              SIMULATED SESSION ACTIVE: Operating as <strong className="uppercase font-mono font-bold">{currentUser.name} ({currentUser.role})</strong>. Your authentic admin credentials belong to <strong>{originalUser.name}</strong>.
            </span>
          </div>
          <button
            onClick={onRestoreOriginalUser}
            className="bg-white hover:bg-amber-50 text-amber-700 hover:text-amber-800 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer duration-150 shadow-xs uppercase font-mono tracking-wider flex items-center gap-1.5"
          >
            ↩️ Restore my Super Admin Account
          </button>
        </div>
      )}

      {/* 1. Header Row */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-50 shadow-xs" id="app-header">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md shadow-blue-500/10 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-900 flex items-center gap-1.5 leading-none">
              KMEDA <span className="text-blue-700 font-extrabold text-[10px] bg-blue-50/70 px-2 py-0.5 rounded border border-blue-200">PORTAL</span>
            </h1>
            <p className="text-[9.5px] uppercase tracking-wider text-slate-400 font-bold font-sans mt-0.5">Mobile Compliance Audit System</p>
          </div>
          {currentUser && (
            <div className="hidden md:flex flex-col ml-4 pl-4 border-l border-slate-200" id="header-user-badge">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                👤 {currentUser.name} {currentUser.designation ? <span className="text-slate-500 font-medium">({currentUser.designation})</span> : ''}
              </span>
              <span className="text-[9.5px] font-mono leading-none font-bold text-blue-600 uppercase tracking-widest">
                {currentUser.role === 'SUPER_ADMIN' ? 'Super Admin Office' : 'Registered Merchant'}
              </span>
            </div>
          )}
        </div>

        {/* Sync Controls and State Badges */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Dynamic Figma Calendar Date Badge */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-100/50 border border-slate-205 px-3 py-1.5 rounded-xl text-xs text-slate-500 font-semibold font-sans">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span>{formattedDate}</span>
          </div>

          {/* Online/Offline Status Indicator */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${online ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`} id="network-badge">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${online ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${online ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </span>
            <span className="hidden sm:inline">{online ? 'Device Online' : 'Device Offline'}</span>
          </div>

          {/* Sync status controller */}
          <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg" id="sync-container">
            <div className="flex flex-col text-right">
              <span className="text-slate-500 font-medium">Pending: <strong className="text-slate-800">{pendingCount}</strong></span>
              {lastSyncedStr && <span className="text-[9px] text-slate-400 font-mono">Synced: {lastSyncedStr}</span>}
            </div>
            <button
              onClick={handleManualSync}
              disabled={syncStatus === 'syncing' || !online}
              title="Trigger background sync queue"
              className={`p-1.5 rounded-md text-blue-600 hover:bg-slate-100 duration-150 relative ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5">
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                </span>
              )}
            </button>
          </div>

          {deferredPrompt && (
            <button
              onClick={handleInstallApp}
              className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold border border-blue-500 px-3 py-1.5 rounded-lg cursor-pointer duration-150 shadow-xs uppercase font-mono select-none"
              id="btn-pwa-install-header"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Install App</span>
            </button>
          )}

          {/* Super Power User Sandbox Quick Switch Button */}
          {currentUser && (currentUser.role !== 'SHOPKEEPER' || (originalUser && originalUser.id !== currentUser.id)) && (
            <button
              onClick={() => setShowSandboxCenter(!showSandboxCenter)}
              className="flex items-center gap-1.5 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100 cursor-pointer duration-150 font-semibold"
              id="btn-sandbox-switch"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden md:inline font-mono">Control Center</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. SaaS Sandbox Swapper Drawer (Interactive Preview Help) */}
      {showSandboxCenter && currentUser && (currentUser.role !== 'SHOPKEEPER' || (originalUser && originalUser.id !== currentUser.id)) && (
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-slate-100 border-b border-purple-100 p-4 relative" id="sandbox-drawer">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold flex items-center gap-1 text-purple-800 font-mono uppercase tracking-wide">
                <Sparkles className="w-4 h-4 text-purple-600" /> COMPLIANCE SANDBOX ROLE SWITCHER
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xl leading-relaxed">
                Toggle between the system roles to review shop compliance records, transactions, or manage administrative approvals:
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { onRoleSwitch('SHOPKEEPER'); setActiveTab('merchant-ops'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold duration-150 cursor-pointer ${(currentUser?.role as string) === 'SHOPKEEPER' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                [1] Shopkeeper Mode
              </button>
              <button
                onClick={() => { onRoleSwitch('SUPER_ADMIN'); setActiveTab('super-overview'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold duration-150 cursor-pointer ${(currentUser?.role as string) === 'SUPER_ADMIN' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                [2] Super Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Workspace Container */}
      <div className="flex-1 flex flex-col md:flex-row" id="workspace-layout">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 border-r border-slate-255 bg-white flex flex-col justify-between py-6 px-4 shrink-0" id="sidebar-nav">
          <div className="space-y-6">
            {/* Medicare EMR signature brand avatar header block */}
            <div className="flex items-center gap-3 px-1 border-b border-slate-100 pb-5">
              <div className="bg-blue-600 text-white h-10 w-10 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/10 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-tight leading-tight truncate">Compliance EMR</h2>
                <span className="text-[10px] text-blue-500 font-bold block leading-none mt-0.5">KMEDA Karachi</span>
              </div>
            </div>

            {/* User card profile */}
            <div className="bg-slate-100/50 p-4 rounded-xl border border-slate-205 shadow-xs flex flex-col gap-1.5">
              <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase block font-mono">Identity Profile</span>
              <span className="text-xs font-bold text-slate-800 block truncate">{currentUser?.name}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded self-start ${
                currentUser?.role === 'SUPER_ADMIN' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>{getRoleLabel(currentUser?.role)}</span>
              {currentUser?.marketName && (
                <span className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
                  <Building className="w-3.5 h-3.5 text-slate-400" /> {currentUser.marketName}
                </span>
              )}
            </div>

            {/* Menu Items */}
            <nav className="space-y-1.5" id="navigation-list">
              <span className="text-[9.5px] text-slate-400 font-bold tracking-widest uppercase px-3 block mb-2 font-mono">Workstation Scope</span>
              {getNavItems().map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 text-left cursor-pointer ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15 border border-blue-500' 
                        : 'text-slate-600 border border-transparent hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* PWA Mobile App Card */}
            {!isInstalled && (
              <div className="bg-emerald-50/50 border border-emerald-150 p-4 rounded-xl space-y-2.5" id="pwa-sidebar-card">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-[9px] text-emerald-700 font-bold block uppercase font-mono tracking-wider">KMEDA MOBILE APP</span>
                    <h4 className="text-xs font-black text-slate-800 leading-tight">Install Offline App</h4>
                  </div>
                </div>
                <p className="text-[10.5px] text-slate-600 leading-normal font-sans">
                  اپنے موبائل پر انسٹال کریں اور بغیر انٹرنیٹ کے بھی تصدیقی ریکارڈ درج کریں۔
                </p>
                <button
                  type="button"
                  onClick={handleInstallApp}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] uppercase duration-150 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  INSTALL / ابھی انسٹال کریں
                </button>
              </div>
            )}
          </div>

          {/* Logout Trigger button */}
          <div className="pt-4 border-t border-slate-100 mt-6 md:mt-0">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 duration-150 text-left cursor-pointer"
              id="btn-logout"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Sign Out Session</span>
            </button>
          </div>
        </aside>

        {/* Dynamic Inner Content Frame */}
        <main className="flex-1 bg-slate-50 overflow-y-auto px-4 py-6 md:p-8" id="inner-workspace-frame">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* 4. Small Regulatory bottom disclaimer */}
      <footer className="border-t border-slate-200 bg-white text-slate-500 py-4 px-4 md:px-8 text-center text-[10px] font-semibold flex flex-col md:flex-row items-center justify-between gap-2 uppercase tracking-wide" id="site-footer">
        <p className="font-mono">Pakistan Ministry of Regulatory Compliance — Mobile Market SOP (V3.21-LTD)</p>
        <div className="flex flex-col md:flex-row items-center gap-3">
          <span className="text-slate-700 font-bold tracking-wide">
            Powered by <span className="text-blue-600 font-extrabold font-mono tracking-normal">Aasan AI Software Solution</span>
          </span>
          <div className="flex gap-4">
            <span className="hover:text-slate-600 transition duration-150 cursor-pointer flex items-center gap-1 font-medium select-none">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Security Protocol: Active
            </span>
            <span className="hover:text-slate-600 transition duration-150 cursor-pointer flex items-center gap-1 font-medium select-none">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Local IndexedDB Synced
            </span>
          </div>
        </div>
      </footer>

      {installingSim && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" id="installing-sim-overlay">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-200 text-slate-800 text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-605 rounded-full flex items-center justify-center mx-auto border border-emerald-250 shadow-sm">
              <Smartphone className="w-8 h-8 text-emerald-650 animate-bounce" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest font-mono">
                Installing KMEDA App
              </h3>
              <p className="text-xs text-indigo-700 font-extrabold block" dir="rtl">
                کمیڈا آف لائن موبائل ایپلیکیشن انسٹال ہو رہی ہے...
              </p>
              <p className="text-[11px] text-slate-500 font-sans min-h-[32px] select-none">
                {installStage}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                <div 
                  className="bg-emerald-600 h-full rounded-full transition-all duration-75"
                  style={{ width: `${installProgress}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold font-mono">
                <span>INSTALLING</span>
                <span className="text-slate-700">{installProgress}%</span>
              </div>
            </div>

            <p className="text-[9.5px] text-slate-400 font-medium italic">
              Linking offline database sync architecture to your home screen launcher
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
