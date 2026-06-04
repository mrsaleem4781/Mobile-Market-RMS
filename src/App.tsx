/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { db } from './offline/db';
import { bootstrapSeedData } from './offline/seedData';
import { syncEngine } from './sync/syncEngine';
import { AppUser, UserRole } from './types';
import Layout from './components/Layout';
import AuthModule from './modules/auth/AuthModule';
import ShopkeeperDashboard from './modules/shopkeeper/ShopkeeperDashboard';
import MarketAdminDashboard from './modules/marketAdmin/MarketAdminDashboard';
import SuperAdminDashboard from './modules/superAdmin/SuperAdminDashboard';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [activeTab, setActiveTab] = useState<string>('merchant-ops');
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        // 1. Check if old seed data exists and needs upgrade to Quaidabad-only
        const hasOldSeed = await db.markets.get('mkt-kara-saddar');
        if (hasOldSeed) {
          console.log("Old seed markets detected. Performing clean migration to Quaidabad Mobile Market...");
          await db.clearAllData();
          await bootstrapSeedData(true);
        } else {
          await bootstrapSeedData();
        }
        
        // 2. Load active persistent session if logged in
        const savedUser = await db.getConfig<AppUser>('currentUser');
        if (savedUser) {
          setCurrentUser(savedUser);
          // Set standard starting tab matching role
          setInitialTabForRole(savedUser.role);
        }
        
        // 3. Kick off sync engine auto background processor
        syncEngine.startPeriodicSync();
        setIsDbReady(true);
      } catch (err) {
        console.error("Critical IndexedDB applet error on setup: ", err);
        setIsDbReady(true); // fall through gracefully so UI renders
      }
    };
    initApp();

    return () => {
      syncEngine.stopPeriodicSync();
    };
  }, []);

  const setInitialTabForRole = (role: UserRole) => {
    if (role === 'SHOPKEEPER') {
      setActiveTab('merchant-ops');
    } else if (role === 'MARKET_ADMIN') {
      setActiveTab('market-shops');
    } else if (role === 'SUPER_ADMIN') {
      setActiveTab('super-overview');
    }
  };

  const handleLoginSuccess = async (user: AppUser) => {
    setCurrentUser(user);
    setInitialTabForRole(user.role);
    await db.setConfig('currentUser', user);
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    await db.setConfig('currentUser', null);
  };

  const handleSandboxRoleSwitch = async (role: UserRole) => {
    // Sandbox bypass: switch current model simulation directly!
    // This allows seamless testing of approvals etc.
    let targetUser: AppUser | undefined;
    
    if (role === 'SHOPKEEPER') {
      targetUser = await db.users.get('usr-shopkeeper-saleem');
    } else if (role === 'MARKET_ADMIN') {
      targetUser = await db.users.get('usr-mktadmin-quaid');
    } else if (role === 'SUPER_ADMIN') {
      targetUser = await db.users.get('usr-superadmin');
    }

    if (targetUser) {
      setCurrentUser(targetUser);
      setInitialTabForRole(role);
      await db.setConfig('currentUser', targetUser);
    }
  };

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-emerald-500 font-sans" id="loading-screen">
        <div className="space-y-4 text-center">
          <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">Initializing Sandbox Regulatory Directories...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthModule onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Layout
      currentUser={currentUser}
      onLogout={handleLogout}
      onRoleSwitch={handleSandboxRoleSwitch}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      {/* Contextual dashboard panels rendering based on User SaaS roles */}
      {currentUser.role === 'SHOPKEEPER' && (
        <ShopkeeperDashboard currentUser={currentUser} activeTab={activeTab} />
      )}
      {currentUser.role === 'MARKET_ADMIN' && (
        <MarketAdminDashboard currentUser={currentUser} activeTab={activeTab} />
      )}
      {currentUser.role === 'SUPER_ADMIN' && (
        <SuperAdminDashboard currentUser={currentUser} activeTab={activeTab} />
      )}
    </Layout>
  );
}
