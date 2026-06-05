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
import KmedaHub from './components/KmedaHub';
import AuthModule from './modules/auth/AuthModule';
import ShopkeeperDashboard from './modules/shopkeeper/ShopkeeperDashboard';
import SuperAdminDashboard from './modules/superAdmin/SuperAdminDashboard';
import UserProfileSettings from './components/UserProfileSettings';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [originalUser, setOriginalUser] = useState<AppUser | null>(null);
  const [activeTab, setActiveTab] = useState<string>('merchant-ops');
  const [isDbReady, setIsDbReady] = useState(false);

  const handleUserUpdate = async (updatedUser: AppUser) => {
    setCurrentUser(updatedUser);
    if (originalUser && originalUser.id === updatedUser.id) {
      setOriginalUser(updatedUser);
      await db.setConfig('originalUser', updatedUser);
    }
    await db.setConfig('currentUser', updatedUser);
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        // 1. Check if old seed data exists and needs upgrade to Quaidabad-only
        const hasOldSeed = await db.markets.get('mkt-kara-saddar');
        const superadmin = await db.users.get('usr-superadmin');
        const hasNoPassword = superadmin && !superadmin.password;
        const hasStolenSeed = await db.reportedMobiles.get('st-001');
        
        if (hasOldSeed || hasNoPassword || !hasStolenSeed) {
          console.log("Old databases, missing passwords, or uninitialized stolen registry detected. Restoring secure master seed directories...");
          await db.clearAllData();
          await bootstrapSeedData(true);
        } else {
          await bootstrapSeedData();
        }
        
        // 2. Do not auto-load persistent session to ensure login screen is shown on reload/open
        await db.setConfig('currentUser', null);
        await db.setConfig('originalUser', null);
        // const savedUser = await db.getConfig<AppUser>('currentUser');
        // if (savedUser) {
        //   setCurrentUser(savedUser);
        //   setInitialTabForRole(savedUser.role);
        // }
        
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
    } else if (role === 'SUPER_ADMIN') {
      setActiveTab('super-overview');
    }
  };

  const handleLoginSuccess = async (user: AppUser) => {
    setCurrentUser(user);
    setOriginalUser(user);
    setInitialTabForRole(user.role);
    await db.setConfig('currentUser', user);
    await db.setConfig('originalUser', user);
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    setOriginalUser(null);
    await db.setConfig('currentUser', null);
    await db.setConfig('originalUser', null);
  };

  const handleRestoreOriginalUser = async () => {
    if (originalUser) {
      setCurrentUser(originalUser);
      setInitialTabForRole(originalUser.role);
      await db.setConfig('currentUser', originalUser);
    }
  };

  const handleSandboxRoleSwitch = async (role: UserRole) => {
    // Sandbox bypass: switch current model simulation directly!
    // This allows seamless testing of approvals etc.
    let targetUser: AppUser | undefined;
    
    if (role === 'SHOPKEEPER') {
      targetUser = await db.users.get('usr-shopkeeper-saleem');
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
      originalUser={originalUser}
      onRestoreOriginalUser={handleRestoreOriginalUser}
    >
      {activeTab === 'kmeda-hub' && <KmedaHub />}

      {activeTab === 'profile-settings' && (
        <UserProfileSettings currentUser={currentUser} onUserUpdate={handleUserUpdate} />
      )}

      {/* Contextual dashboard panels rendering based on User SaaS roles */}
      {activeTab !== 'kmeda-hub' && activeTab !== 'profile-settings' && currentUser.role === 'SHOPKEEPER' && (
        <ShopkeeperDashboard currentUser={currentUser} activeTab={activeTab} />
      )}
      {activeTab !== 'kmeda-hub' && activeTab !== 'profile-settings' && currentUser.role === 'SUPER_ADMIN' && (
        <SuperAdminDashboard currentUser={currentUser} activeTab={activeTab} />
      )}
    </Layout>
  );
}
