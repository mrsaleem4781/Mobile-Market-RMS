/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { formatCNICInput } from '../../utils/security';
import { 
  Lock, 
  Smartphone, 
  User, 
  Mail, 
  ShieldCheck, 
  HelpCircle, 
  Sparkles,
  Building,
  Store,
  IdCard,
  Phone,
  ArrowRight,
  ShieldAlert,
  ArrowLeft,
  Users
} from 'lucide-react';
import { db } from '../../offline/db';
import { SEED_USERS, SEED_MARKETS } from '../../offline/seedData';
import { AppUser, UserRole, Market } from '../../types';

interface AuthModuleProps {
  onLoginSuccess: (user: AppUser) => void;
}

export default function AuthModule({ onLoginSuccess }: AuthModuleProps) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [enteredEmail, setEnteredEmail] = useState('');
  const [customUsers, setCustomUsers] = useState<AppUser[]>([]);
  
  // Registration Form States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('SHOPKEEPER');
  const [regCnic, setRegCnic] = useState('');
  const [regContact, setRegContact] = useState('');
  const [regMarketId, setRegMarketId] = useState('');
  const [regShopName, setRegShopName] = useState('');
  const [regShopAddress, setRegShopAddress] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load markets and custom registered merchants
  useEffect(() => {
    const loadData = async () => {
      const dbMarkets = await db.markets.toArray();
      setMarkets(dbMarkets.length > 0 ? dbMarkets : SEED_MARKETS);
      
      const allUsers = await db.users.toArray();
      const seedIds = SEED_USERS.map(u => u.id);
      const custom = allUsers.filter(u => !seedIds.includes(u.id));
      setCustomUsers(custom);
    };
    loadData();
  }, [isRegistering]);

  // Handle direct preset account login
  const handlePresetLogin = async (presetId: string) => {
    let profile = await db.users.get(presetId);
    if (!profile) {
      // Fallback to seed config
      const sUser = SEED_USERS.find(u => u.id === presetId);
      if (sUser) {
        profile = sUser;
        await db.users.put(sUser);
      }
    }
    
    if (profile) {
      onLoginSuccess(profile);
    } else {
      setStatusMessage("Error restoring user profile. Please reset or register.");
    }
  };

  // Log in using newly registered or searched email
  const handleCustomEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = enteredEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setStatusMessage("Please input your registered email address.");
      return;
    }

    // Search local database profiles
    let profile = await db.users.where('email').equalsIgnoreCase(cleanEmail).first();
    
    // Check presets if not found
    if (!profile) {
      profile = SEED_USERS.find(u => u.email.toLowerCase() === cleanEmail);
      if (profile) {
        await db.users.put(profile);
      }
    }

    if (profile) {
      onLoginSuccess(profile);
    } else {
      setStatusMessage(`No profile found matching "${enteredEmail}". Please register a new account below.`);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regCnic || !regContact) {
      setStatusMessage("Please fill in all mandatory compliance fields.");
      return;
    }

    const cleanedCnic = regCnic.replace(/[^0-9]/g, "");
    if (cleanedCnic.length !== 13) {
      setStatusMessage("CNIC must consist of exactly 13 digits (Format: XXXXX-XXXXXXX-X).");
      return;
    }
    const formattedCnic = cleanedCnic.slice(0, 5) + "-" + cleanedCnic.slice(5, 12) + "-" + cleanedCnic.slice(12, 13);

    const matchedMarket = markets.find(m => m.id === regMarketId);

    const newUserId = `usr-${Math.random().toString(36).substr(2, 9)}`;
    const newShopId = regRole === 'SHOPKEEPER' ? `shp-${Math.random().toString(36).substr(2, 9)}` : undefined;

    const newUser: AppUser = {
      id: newUserId,
      name: regName,
      email: regEmail.trim(),
      role: regRole,
      status: 'PENDING', // All custom registered accounts start in PENDING state
      cnic: formattedCnic,
      contactNumber: regContact,
      marketId: regMarketId || undefined,
      marketName: matchedMarket ? matchedMarket.name : undefined,
      shopId: newShopId,
      shopName: regRole === 'SHOPKEEPER' ? regShopName : undefined,
      shopAddress: regRole === 'SHOPKEEPER' ? regShopAddress : undefined,
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Write user to local IndexedDB profiles cache
      await db.users.put(newUser);

      // 2. If Shopkeeper, register corresponding Shop node in database as PENDING
      if (regRole === 'SHOPKEEPER' && newShopId) {
        const newShop = {
          id: newShopId,
          name: regShopName || `${regName}'s Mobile Shop`,
          marketId: regMarketId,
          marketName: matchedMarket ? matchedMarket.name : 'Unknown Market',
          ownerName: regName,
          contactNumber: regContact,
          cnic: formattedCnic,
          shopAddress: regShopAddress,
          status: 'PENDING' as const,
          createdAt: new Date().toISOString()
        };
        await db.shops.put(newShop);
        
        // Push shop registration to syncQueue too so it synchronizes once online!
        await db.syncQueue.put({
          id: `${newShopId}_create_${Date.now()}`,
          transactionId: newShopId,
          action: 'CREATE',
          payload: newShop,
          timestamp: new Date().toISOString(),
          retryCount: 0
        });
      }

      setStatusMessage(`Registration successfully recorded! Your profile status is currently PENDING. Note: To log in instantly for testing, you can approve your shop under Quaidabad Karachi Admin account or use other preset roles.`);
      
      // Auto switch back to login and focus the newly created user
      setTimeout(() => {
        setIsRegistering(false);
        setEnteredEmail(regEmail);
        setStatusMessage(null);
      }, 6000);

    } catch (err) {
      setStatusMessage("Failed to register profile locally. Please try again.");
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="bg-red-50 text-red-750 text-[9px] px-2 py-0.5 rounded-full font-bold border border-red-200">FEDERAL BUREAU</span>;
      case 'MARKET_ADMIN':
        return <span className="bg-amber-50 text-amber-750 text-[9px] px-2 py-0.5 rounded-full font-bold border border-amber-200 font-mono">MARKET INSPECTOR</span>;
      default:
        return <span className="bg-emerald-50 text-emerald-800 text-[9px] px-2 py-0.5 rounded-full font-bold border border-emerald-200 font-mono">MERCHANT / SHOP</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-4 py-8 relative selection:bg-emerald-100 selection:text-emerald-900 font-sans" id="auth-root">
      {/* Decorative Grid and Ambient Lights */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-70 -z-20"></div>
      <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-emerald-200/20 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-teal-200/20 rounded-full blur-3xl -z-10"></div>

      {/* Brand Header */}
      <div className="text-center mb-8 space-y-2 max-w-xl">
        <div className="inline-flex bg-slate-900 text-emerald-400 p-2.5 rounded-2xl shadow-sm border border-slate-800">
          <Smartphone className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight" id="main-brand-title">
          MOBILE MARKET COMPLIANCE PORTAL
        </h1>
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider font-mono">
          Secured Trade Operations, Anti-Theft Verification, & CPLC Registries
        </p>
      </div>

      {/* Main Panel Box */}
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-lg p-6 md:p-8 space-y-6 relative transition-all duration-300" id="auth-main-panel">
        
        {/* Toggle Switch Tabs (Extremely simple register and login navigation) */}
        <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
          <button
            type="button"
            onClick={() => { setIsRegistering(false); setStatusMessage(null); }}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold font-mono uppercase tracking-wide duration-150 flex items-center justify-center gap-2 cursor-pointer ${
              !isRegistering 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
            id="tab-login-btn"
          >
            <Lock className="w-3.5 h-3.5" />
            Sign In / Easy Login
          </button>
          <button
            type="button"
            onClick={() => { setIsRegistering(true); setStatusMessage(null); }}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold font-mono uppercase tracking-wide duration-150 flex items-center justify-center gap-2 cursor-pointer ${
              isRegistering 
                ? 'bg-white text-emerald-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
            id="tab-register-btn"
          >
            <Store className="w-3.5 h-3.5" />
            Register Mobile Shop
          </button>
        </div>

        {/* Global Notification Banner */}
        {statusMessage && (
          <div className="p-4 rounded-xl text-xs bg-slate-50 text-slate-800 border-l-4 border-emerald-500 leading-relaxed font-sans shadow-sm" id="auth-status-message">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 uppercase block mb-0.5">SYSTEM BULLETIN:</span>
                {statusMessage}
              </div>
            </div>
          </div>
        )}

        {/* Section Contents */}
        {!isRegistering ? (
          /* LOGIN FLOW */
          <div className="space-y-6 animate-fade-in" id="login-flow-container">
            
            {/* STAKEHOLDER PRESETS: Gorgeous, 1-Click login buttons */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold font-mono text-slate-400 block uppercase tracking-wider">
                  Quick Access Profiles (1-Click Safe Entry)
                </span>
                <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500 font-mono">DEMO INTEGRATED</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                {/* Seed: Shopkeeper Card */}
                <button
                  type="button"
                  onClick={() => handlePresetLogin('usr-shopkeeper-saleem')}
                  className="group bg-slate-50 hover:bg-emerald-50/40 border border-slate-200/80 hover:border-emerald-300 rounded-2xl p-4 text-left duration-200 shadow-2xs hover:shadow-xs flex flex-col justify-between h-34 cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 w-12 h-12 bg-emerald-500/5 rounded-full group-hover:scale-125 duration-300"></div>
                  <div className="flex items-center justify-between w-full">
                    <div className="bg-emerald-100 text-emerald-800 p-2 rounded-xl group-hover:bg-emerald-600 group-hover:text-white duration-150">
                      <Store className="w-4.5 h-4.5" />
                    </div>
                    {getRoleBadge('SHOPKEEPER')}
                  </div>
                  <div className="mt-4">
                    <h4 className="text-xs font-black text-slate-800 group-hover:text-slate-900 leading-tight">Muhammad Saleem</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Authorized Shopkeeper Quaidabad Karachi Market</p>
                  </div>
                </button>

                {/* Seed: Market Inspector Card */}
                <button
                  type="button"
                  onClick={() => handlePresetLogin('usr-mktadmin-quaid')}
                  className="group bg-slate-50 hover:bg-amber-50/40 border border-slate-200/80 hover:border-amber-300 rounded-2xl p-4 text-left duration-200 shadow-2xs hover:shadow-xs flex flex-col justify-between h-34 cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 w-12 h-12 bg-amber-500/5 rounded-full group-hover:scale-125 duration-300"></div>
                  <div className="flex items-center justify-between w-full">
                    <div className="bg-amber-100 text-amber-800 p-2 rounded-xl group-hover:bg-amber-600 group-hover:text-white duration-150">
                      <User className="w-4.5 h-4.5" />
                    </div>
                    {getRoleBadge('MARKET_ADMIN')}
                  </div>
                  <div className="mt-4">
                    <h4 className="text-xs font-black text-slate-800 group-hover:text-slate-900 leading-tight">Quaidabad Admin Karachi</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Regional Market Inspector Regulatory Office</p>
                  </div>
                </button>

                {/* Seed: Super Admin Card */}
                <button
                  type="button"
                  onClick={() => handlePresetLogin('usr-superadmin')}
                  className="group bg-slate-50 hover:bg-red-50/30 border border-slate-200/80 hover:border-red-300 rounded-2xl p-4 text-left duration-200 shadow-2xs hover:shadow-xs flex flex-col justify-between h-34 cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 w-12 h-12 bg-red-400/5 rounded-full group-hover:scale-125 duration-300"></div>
                  <div className="flex items-center justify-between w-full">
                    <div className="bg-red-100 text-red-800 p-2 rounded-xl group-hover:bg-red-600 group-hover:text-white duration-150">
                      <ShieldCheck className="w-4.5 h-4.5" />
                    </div>
                    {getRoleBadge('SUPER_ADMIN')}
                  </div>
                  <div className="mt-4">
                    <h4 className="text-xs font-black text-slate-800 group-hover:text-slate-900 leading-tight">National Bureau Admin</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Federal Audit Command Oversight Dashboard</p>
                  </div>
                </button>

              </div>
            </div>

            {/* CUSTOM REGISTERED USERS QUICK LIST */}
            {customUsers.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold font-mono text-slate-400 block uppercase tracking-wider">
                  New Local Profiles (Custom Registered Accounts)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {customUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handlePresetLogin(user.id)}
                      className="bg-slate-50/60 hover:bg-emerald-50/30 border border-slate-200/70 hover:border-emerald-300 rounded-xl p-3 flex items-center justify-between duration-150 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="bg-emerald-100/80 text-emerald-700 p-1.5 rounded-lg">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-left">
                          <h5 className="text-[11px] font-bold text-slate-800 leading-tight">{user.name}</h5>
                          <span className="text-[9px] text-slate-400 font-mono">{user.email}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[8px] bg-slate-200/70 text-slate-600 font-extrabold px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                          {user.role}
                        </span>
                        <span className={`text-[8.5px] font-bold ${user.status === 'APPROVED' ? 'text-emerald-600' : 'text-slate-400'}`}>
                          ● {user.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SEAMLESS SEARCH & LOGIN INPUT (Perfect for custom shopkeeper accounts) */}
            <div className="pt-4 border-t border-slate-100">
              <form onSubmit={handleCustomEmailLogin} className="space-y-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5 font-mono uppercase">
                    Or Sign In using Email Address
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    If you created a new merchant profile, input its assigned email below to login.
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                    <input
                      type="email"
                      value={enteredEmail}
                      onChange={(e) => setEnteredEmail(e.target.value)}
                      placeholder="Enter registered email address (e.g., asif@gmail.com)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white font-medium"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wide flex items-center gap-1.5 duration-150 cursor-pointer shadow-xs active:scale-[0.98]"
                    id="btn-email-signin"
                  >
                    Login
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                </div>
              </form>
            </div>

            {/* STATIC REGULATORY INFO NOTE */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/50 space-y-2.5">
              <h5 className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 font-mono uppercase tracking-wide">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> CPLC INDIVIDUAL SECURITY RULES
              </h5>
              <p className="text-[10px] text-slate-500 leading-normal">
                This verification platform operates in direct cooperation with <strong>Citizen Police Liaison Committee (CPLC)</strong> to monitor legal ownership metrics of second-hand cellphones. All device registries are digitally cryptographed before transmission.
              </p>
            </div>

          </div>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleRegister} className="space-y-4 animate-fade-in" id="reg-form-container">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5 uppercase font-mono">
                <Store className="w-4.5 h-4.5 text-emerald-600" /> Create Trade Compliance account
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 font-medium font-mono uppercase">
                Submit merchant data to start registering device resale ledgers locally
              </p>
            </div>

            {/* Name and Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wider block">Full Name (Matching ID Card)</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Asif Raza"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-500 focus:bg-white transition-all font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wider block">Email Address (Login ID)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. asif@gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-500 focus:bg-white transition-all font-sans"
                  />
                </div>
              </div>
            </div>

            {/* CNIC and Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 font-mono">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">CNIC / Citizen Card No.</label>
                <div className="relative">
                  <IdCard className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    required
                    value={regCnic}
                    onChange={(e) => setRegCnic(formatCNICInput(e.target.value))}
                    placeholder="e.g. 42101-1234567-3"
                    maxLength={15}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1 font-mono">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Contact Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    required
                    value={regContact}
                    onChange={(e) => setRegContact(e.target.value)}
                    placeholder="e.g. 03001234567"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Role and Market */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">System Role Type</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-500 cursor-pointer"
                >
                  <option value="SHOPKEEPER">🛒 Market Shopkeeper (Merchant)</option>
                  <option value="MARKET_ADMIN">👮 Market Regional Inspector (Inspector)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Select Assigned Market</label>
                <div className="relative">
                  <Building className="absolute left-3 top-2 text-slate-400 w-4 h-4" />
                  <select
                    value={regMarketId}
                    onChange={(e) => setRegMarketId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-500 cursor-pointer"
                  >
                    <option value="">Choose Local Hub...</option>
                    {markets.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Shop Details Context for Shopkeeper */}
            {regRole === 'SHOPKEEPER' && (
              <div className="space-y-3 pt-3 border-t border-dashed border-slate-200">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wider block">Shop Trade Name</label>
                  <input
                    type="text"
                    required
                    value={regShopName}
                    onChange={(e) => setRegShopName(e.target.value)}
                    placeholder="e.g. Al-Razzaq Mobile Zone"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-550 focus:bg-white transition-all font-sans"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wider block">Shop Floor Address & Booth number</label>
                  <input
                    type="text"
                    required
                    value={regShopAddress}
                    onChange={(e) => setRegShopAddress(e.target.value)}
                    placeholder="e.g. Shop G-15, Ground Floor, Quaidabad Mobile Market, Karachi"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-550 focus:bg-white transition-all font-sans"
                  />
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl shadow-sm text-xs font-mono uppercase tracking-wider duration-150 cursor-pointer text-center"
                id="btn-registrations-ledger"
              >
                Submit Trade Registration Ledger
              </button>
              
              <button
                type="button"
                onClick={() => { setIsRegistering(false); setStatusMessage(null); }}
                className="w-full bg-transparent hover:bg-slate-50 text-slate-650 font-bold py-2 px-4 rounded-xl text-xs font-mono uppercase tracking-wide duration-150 cursor-pointer flex items-center justify-center gap-1.5"
                id="btn-return-login"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to Login Options
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
