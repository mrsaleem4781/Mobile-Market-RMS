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
  Store, 
  ClipboardList, 
  LogOut, 
  Database,
  ShieldAlert,
  Sliders,
  Sparkles,
  ClipboardCheck,
  Building
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
}

export default function Layout({
  children,
  currentUser,
  onLogout,
  onRoleSwitch,
  activeTab,
  setActiveTab
}: LayoutProps) {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<SyncState>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [showSandboxCenter, setShowSandboxCenter] = useState(false);
  const [lastSyncedStr, setLastSyncedStr] = useState<string>('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check standalone state
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
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
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
    } catch (err) {
      console.warn('MMRMS installation prompt error:', err);
    }
    setDeferredPrompt(null);
  };

  const getRoleLabel = (role?: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Regulatory Super Admin';
      case 'MARKET_ADMIN':
        return 'Market Inspector / Admin';
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
        { id: 'kmeda-hub', label: 'KMEDA Quaidabad Hub', icon: Sparkles },
        { id: 'merchant-reported', label: 'Report Snatched Mobile', icon: ShieldAlert },
        { id: 'merchant-history', label: 'Transaction Logs', icon: ClipboardList }
      );
    } else if (currentUser.role === 'MARKET_ADMIN') {
      items.push(
        { id: 'market-shops', label: 'Market Shops Registry', icon: Store },
        { id: 'kmeda-hub', label: 'KMEDA Quaidabad Hub', icon: Sparkles },
        { id: 'market-approvals', label: 'Merchant Approvals', icon: ClipboardCheck },
        { id: 'market-reports', label: 'Market Compliance', icon: Building }
      );
    } else if (currentUser.role === 'SUPER_ADMIN') {
      items.push(
        { id: 'super-overview', label: 'Global Dashboard', icon: Sliders },
        { id: 'kmeda-hub', label: 'KMEDA Quaidabad Hub', icon: Sparkles },
        { id: 'super-reported', label: 'Stolen/Snatched Registry', icon: ShieldAlert },
        { id: 'super-search', label: 'National IMEI Search', icon: Smartphone },
        { id: 'super-shops', label: 'All Registered Shops', icon: Store },
        { id: 'super-audits', label: 'Compliance Audit Logs', icon: ClipboardList }
      );
    }
    
    return items;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="layout-root">
      {/* 1. Header Row */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-50 shadow-xs" id="app-header">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 text-white p-2 rounded-lg shadow-sm">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-1.5 leading-none">
              KMEDA <span className="text-emerald-700 font-extrabold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/50">QUAIDABAD PORTAL</span>
            </h1>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold font-mono mt-0.5">Karachi Mobile & Electronics Dealers Association</p>
          </div>
        </div>

        {/* Sync Controls and State Badges */}
        <div className="flex items-center gap-2 md:gap-4">
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
              className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold border border-emerald-500 px-3 py-1.5 rounded-lg cursor-pointer duration-150 shadow-xs uppercase font-mono select-none"
              id="btn-pwa-install-header"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Install App</span>
            </button>
          )}

          {/* Super Power User Sandbox Quick Switch Button */}
          {currentUser && currentUser.role !== 'SHOPKEEPER' && (
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
      {showSandboxCenter && currentUser && currentUser.role !== 'SHOPKEEPER' && (
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
        <aside className="w-full md:w-64 border-r border-slate-200 bg-white flex flex-col justify-between py-6 px-4 shrink-0" id="sidebar-nav">
          <div className="space-y-6">
            {/* User card profile */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col gap-1.5">
              <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase block font-mono">Identity Profile</span>
              <span className="text-xs font-bold text-slate-800 block truncate">{currentUser?.name}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded self-start ${
                currentUser?.role === 'SUPER_ADMIN' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                currentUser?.role === 'MARKET_ADMIN' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>{getRoleLabel(currentUser?.role)}</span>
              {currentUser?.marketName && (
                <span className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
                  <Building className="w-3.5 h-3.5 text-slate-400" /> {currentUser.marketName}
                </span>
              )}
            </div>

            {/* Menu Items */}
            <nav className="space-y-1" id="navigation-list">
              <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase px-3 block mb-2 font-mono">Workstation Scope</span>
              {getNavItems().map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold duration-150 text-left cursor-pointer ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-600' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* PWA Mobile App Card */}
            {!isInstalled && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 shadow-2xs space-y-2.5" id="pwa-sidebar-card">
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-100 text-emerald-800 p-1.5 rounded-lg">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold block uppercase font-mono tracking-wider">Mobile App</span>
                    <h4 className="text-xs font-bold text-slate-800 leading-tight">Install MMRMS App</h4>
                  </div>
                </div>
                <p className="text-[10px] text-slate-550 leading-normal font-medium">
                  Take this database registry to your market floor. PWA provides optimized performance and seamless offline sync.
                </p>
                {deferredPrompt ? (
                  <button
                    onClick={handleInstallApp}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] uppercase font-mono tracking-wider duration-150 shadow-xs cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    INSTALL DIRECTLY
                  </button>
                ) : (
                  <div className="text-[9.5px] text-slate-500 font-semibold leading-relaxed bg-white border border-slate-200 p-2.5 rounded-lg">
                    💡 <strong>Install on mobile:</strong> Open this URL in browser, tap <strong className="text-slate-800">Menu / Share</strong>, and click <strong className="text-emerald-700">Add to Home screen</strong>.
                  </div>
                )}
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
    </div>
  );
}
